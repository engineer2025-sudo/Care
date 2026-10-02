import { STORAGE_KEY, parseCareStorage } from './careStorage.js'

export const CARE_STORAGE_SECURITY_EVENT = 'caresphere:storage-security-status'
export const CARE_STORAGE_DB_NAME = 'caresphere-secure-keys-v1'
export const CARE_STORAGE_DB_VERSION = 1
export const CARE_STORAGE_KEY_STORE = 'keys'
export const CARE_STORAGE_KEY_ID = 'care-data-aes-256-gcm-v1'
export const CARE_STORAGE_AAD = 'caresphere.v1'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const cache = {}
let securityStatus = { state: 'loading', message: 'Preparing encrypted local storage…' }
let cachedKey = null
let databasePromise = null
let writeQueue = Promise.resolve()

function setSecurityStatus(state, message) {
  securityStatus = { state, message }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CARE_STORAGE_SECURITY_EVENT, { detail: securityStatus }))
  }
}

export function getCareStorageCache() {
  return cache
}

export function getCareStorageSecurityStatus() {
  return { ...securityStatus }
}

function assertAes256Key(key) {
  const usages = Array.from(key?.usages || [])
  if (
    key?.algorithm?.name !== 'AES-GCM' ||
    key.algorithm.length !== 256 ||
    key.extractable !== false ||
    !usages.includes('encrypt') ||
    !usages.includes('decrypt')
  ) throw new Error('The saved local encryption key is not a non-extractable AES-256 key')
  return key
}

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

/** Encrypt a string with a non-extractable AES-256-GCM CryptoKey. */
export async function encryptCareStoragePayload(plaintext, key, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.subtle || !key) throw new Error('Web Crypto is unavailable')
  assertAes256Key(key)
  const iv = cryptoProvider.getRandomValues(new Uint8Array(12))
  const ciphertext = await cryptoProvider.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: encoder.encode(CARE_STORAGE_AAD),
      tagLength: 128,
    },
    key,
    encoder.encode(plaintext),
  )
  return {
    algorithm: 'AES-256-GCM',
    version: 1,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

/** Authenticate and decrypt a CareSphere AES-256-GCM envelope. */
export async function decryptCareStoragePayload(envelope, key, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.subtle || !key) throw new Error('Web Crypto is unavailable')
  assertAes256Key(key)
  if (
    !envelope ||
    envelope.algorithm !== 'AES-256-GCM' ||
    envelope.version !== 1 ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.ciphertext !== 'string'
  ) throw new Error('Unsupported encrypted CareSphere data')

  const plaintext = await cryptoProvider.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.iv),
      additionalData: encoder.encode(CARE_STORAGE_AAD),
      tagLength: 128,
    },
    key,
    base64ToBytes(envelope.ciphertext),
  )
  return decoder.decode(plaintext)
}

function openKeyDatabase() {
  if (databasePromise) return databasePromise
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable'))

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CARE_STORAGE_DB_NAME, CARE_STORAGE_DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CARE_STORAGE_KEY_STORE)) {
        request.result.createObjectStore(CARE_STORAGE_KEY_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open the local key store'))
    request.onblocked = () => reject(new Error('The local key store is blocked by another tab'))
  }).catch(error => {
    databasePromise = null
    throw error
  })
  return databasePromise
}

function readStoredKey(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CARE_STORAGE_KEY_STORE, 'readonly')
    const request = transaction.objectStore(CARE_STORAGE_KEY_STORE).get(CARE_STORAGE_KEY_ID)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('Could not read the local encryption key'))
    transaction.onabort = () => reject(transaction.error || new Error('Could not read the local encryption key'))
  })
}

async function getOrCreateKey() {
  if (cachedKey) return cachedKey
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable in this browser context')

  const db = await openKeyDatabase()
  const existingKey = await readStoredKey(db)
  if (existingKey) {
    assertAes256Key(existingKey)
    cachedKey = existingKey
    return existingKey
  }

  const candidate = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  // Recheck inside the serialized write transaction so two tabs cannot replace
  // each other's freshly generated key and make the other tab's ciphertext unreadable.
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CARE_STORAGE_KEY_STORE, 'readwrite')
    const store = transaction.objectStore(CARE_STORAGE_KEY_STORE)
    const request = store.get(CARE_STORAGE_KEY_ID)
    let selectedKey = null
    request.onsuccess = () => {
      if (request.result) {
        selectedKey = request.result
      } else {
        selectedKey = candidate
        store.put(candidate, CARE_STORAGE_KEY_ID)
      }
    }
    request.onerror = () => reject(request.error || new Error('Could not create the local encryption key'))
    transaction.oncomplete = () => {
      if (!selectedKey) {
        reject(new Error('The local encryption key was not saved'))
        return
      }
      try {
        assertAes256Key(selectedKey)
        cachedKey = selectedKey
        resolve(selectedKey)
      } catch (error) {
        reject(error)
      }
    }
    transaction.onerror = () => reject(transaction.error || new Error('Could not create the local encryption key'))
    transaction.onabort = () => reject(transaction.error || new Error('Could not create the local encryption key'))
  })
}

async function deleteStoredKey() {
  cachedKey = null
  const db = await openKeyDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CARE_STORAGE_KEY_STORE, 'readwrite')
    transaction.objectStore(CARE_STORAGE_KEY_STORE).delete(CARE_STORAGE_KEY_ID)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('Could not remove the local encryption key'))
    transaction.onabort = () => reject(transaction.error || new Error('Could not remove the local encryption key'))
  })
}

function replaceCache(values) {
  Object.keys(cache).forEach(key => delete cache[key])
  Object.assign(cache, values)
}

/**
 * Load CareSphere's browser data before React mounts. Existing plaintext v1
 * localStorage data is encrypted and replaced only after a successful write.
 */
export async function initializeCareStorage() {
  try {
    if (!globalThis.crypto?.subtle || !globalThis.indexedDB) {
      throw new Error('This browser does not provide the secure storage features CareSphere needs')
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      replaceCache({})
      // Open the database once so unsupported/blocked storage is detected early.
      await openKeyDatabase()
      setSecurityStatus('ready', 'AES-256-GCM encrypted local storage is ready on this device.')
      return cache
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Saved CareSphere data could not be read. It was left untouched to avoid data loss.')
    }

    if (parsed && typeof parsed === 'object' && parsed.algorithm === 'AES-256-GCM') {
      const db = await openKeyDatabase()
      const key = await readStoredKey(db)
      if (!key) throw new Error('The encryption key is missing. Saved data was left untouched.')
      assertAes256Key(key)
      const plaintext = await decryptCareStoragePayload(parsed, key)
      JSON.parse(plaintext) // Require valid JSON before accepting the decrypted bytes.
      replaceCache(parseCareStorage(plaintext))
      cachedKey = key
      setSecurityStatus('ready', 'AES-256-GCM encrypted local storage is ready on this device.')
      return cache
    }

    // Legacy CareSphere v1 stored plaintext JSON. Keep it in place unless the
    // authenticated encrypted replacement is successfully written.
    const legacyValues = parseCareStorage(raw)
    const serialized = JSON.stringify(legacyValues)
    const key = await getOrCreateKey()
    const encrypted = await encryptCareStoragePayload(serialized, key)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted))
    replaceCache(legacyValues)
    setSecurityStatus('ready', 'Existing local data was migrated to AES-256-GCM encrypted storage on this device.')
    return cache
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Secure local storage is unavailable.'
    setSecurityStatus('error', `${message} New changes will stay in memory and will not be saved.`)
    return cache
  }
}

/** Queue encrypted snapshots so rapid React state updates cannot finish out of order. */
export function persistCareStorage(values) {
  const serialized = JSON.stringify(values)
  writeQueue = writeQueue.then(async () => {
    if (securityStatus.state !== 'ready') return false
    try {
      const key = await getOrCreateKey()
      const encrypted = await encryptCareStoragePayload(serialized, key)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Secure local storage is unavailable.'
      setSecurityStatus('error', `${message} New changes will stay in memory and will not be saved.`)
      return false
    }
  }).catch(() => false)
  return writeQueue
}

/** Remove the encrypted browser record and its per-origin encryption key. */
export function eraseCareStorage() {
  writeQueue = writeQueue.then(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      replaceCache({})
      await deleteStoredKey()
      setSecurityStatus('ready', 'Saved care data and its local encryption key were removed.')
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CareSphere could not fully remove local data.'
      setSecurityStatus('error', `${message} Check browser storage before continuing.`)
      return false
    }
  }).catch(() => false)
  return writeQueue
}
