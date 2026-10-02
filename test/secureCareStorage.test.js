import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { decryptCareStoragePayload, encryptCareStoragePayload } from '../src/lib/secureCareStorage.js'

async function makeKey() {
  return webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

test('browser care payloads use a non-extractable 256-bit AES-GCM key and round-trip', async () => {
  const key = await makeKey()
  const plaintext = JSON.stringify({ notes: [{ note: 'Private note' }], routines: [] })
  const envelope = await encryptCareStoragePayload(plaintext, key, webcrypto)

  assert.equal(key.algorithm.name, 'AES-GCM')
  assert.equal(key.algorithm.length, 256)
  assert.equal(key.extractable, false)
  assert.equal(envelope.algorithm, 'AES-256-GCM')
  assert.equal(envelope.version, 1)
  assert.notEqual(envelope.ciphertext, plaintext)
  assert.equal(await decryptCareStoragePayload(envelope, key, webcrypto), plaintext)
})

test('browser storage rejects extractable keys and AES-GCM keys smaller than 256 bits', async () => {
  const aes128 = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt'])
  const extractable = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])

  await assert.rejects(() => encryptCareStoragePayload('data', aes128, webcrypto), /AES-256/)
  await assert.rejects(() => encryptCareStoragePayload('data', extractable, webcrypto), /AES-256/)
})

test('AES-GCM authentication rejects modified ciphertext and unsupported envelopes', async () => {
  const key = await makeKey()
  const envelope = await encryptCareStoragePayload('sensitive data', key, webcrypto)
  const damaged = { ...envelope, ciphertext: `${envelope.ciphertext[0] === 'A' ? 'B' : 'A'}${envelope.ciphertext.slice(1)}` }

  await assert.rejects(() => decryptCareStoragePayload(damaged, key, webcrypto))
  await assert.rejects(() => decryptCareStoragePayload({ ...envelope, version: 99 }, key, webcrypto))
})
