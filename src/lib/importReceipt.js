// Passphrase-authenticated import receipts. Backend-free and interoperable with
// the native iPhone/Android implementations. A receipt records what was actually
// imported after decryption — never a transfer acknowledgment — and proves it only
// to parties who know that transfer's passphrase. Not identity verification and
// not a delivery guarantee.
import { decryptTransfer } from './deviceTransfer.js'

const enc = new TextEncoder()
const RECEIPT_FORMAT = 'CareSphere Import Receipt'
const RECEIPT_CANONICAL = 'CareSphere Import Receipt v1'
const ITERATIONS = 310000
const ID_PATTERN = /^[A-Za-z0-9:._-]{1,120}$/
const TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const HEX64 = /^[0-9a-f]{64}$/

const b64 = (a) => { let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s) }
const bytes = (s) => { if (typeof s !== 'string' || !(/^[A-Za-z0-9+/]*={0,2}$/).test(s)) throw Error('Invalid receipt encoding.'); return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) }
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export function formatImportedAt(date = new Date()) {
  return date.toISOString().replace(/\.\d+Z$/, 'Z')
}

export async function sha256Hex(data) {
  const raw = typeof data === 'string' ? enc.encode(data) : data
  return hex(await crypto.subtle.digest('SHA-256', raw))
}

function canonical(fields) {
  return [RECEIPT_CANONICAL, fields.transfer, fields.fileSha256, fields.imported.join(','), fields.importedAt, fields.source].join('|')
}

async function macKey(passphrase, salt) {
  if (typeof passphrase !== 'string') throw Error('Enter the transfer passphrase.')
  const input = enc.encode(passphrase.normalize('NFC'))
  if (input.length < 12 || input.length > 1024) throw Error('Use the transfer passphrase (12–1,024 UTF-8 bytes).')
  if (salt.length !== 16) throw Error('Invalid receipt salt.')
  const base = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits'])
  // 64 PBKDF2 bytes: the transfer AES key uses the first half; the receipt MAC
  // key is the independent second half (separate purposes, no key reuse).
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, 512))
  return crypto.subtle.importKey('raw', bits.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function parseFields(value) {
  const r = parseJSON(value)
  if (!r || r.format !== RECEIPT_FORMAT || r.version !== 1) throw Error('This is not a supported CareSphere import receipt.')
  const imported = r.imported
  if (!Array.isArray(imported) || imported.length < 1 || imported.length > 100) throw Error('The receipt lists no valid imported records.')
  if (new Set(imported).size !== imported.length || imported.some((id) => typeof id !== 'string' || !ID_PATTERN.test(id))) throw Error('The receipt lists invalid record IDs.')
  if (typeof r.transfer !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(r.transfer)) throw Error('The receipt has no valid transfer ID.')
  if (typeof r.file_sha256 !== 'string' || !HEX64.test(r.file_sha256)) throw Error('The receipt has no valid file hash.')
  if (typeof r.imported_at !== 'string' || !TIME_PATTERN.test(r.imported_at)) throw Error('The receipt has no valid import time.')
  if (r.source !== 'file' && r.source !== 'nearby') throw Error('The receipt has no valid source.')
  const salt = bytes(r.mac_salt)
  if (salt.length !== 16) throw Error('The receipt has no valid salt.')
  return { format: RECEIPT_FORMAT, version: 1, transfer: r.transfer, fileSha256: r.file_sha256, imported: [...imported], importedAt: r.imported_at, source: r.source, salt }
}

function parseJSON(value) {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { throw Error('This is not a CareSphere import receipt.') }
}

function parseReceipt(value) {
  const raw = parseJSON(value)
  const fields = parseFields(raw)
  const mac = raw.mac
  if (typeof mac !== 'string' || !HEX64.test(mac)) throw Error('The receipt has no valid authentication code.')
  return { ...fields, mac }
}

export async function createImportReceipt({ transfer, fileSha256, imported, source, macSalt, passphrase, now = new Date() }) {
  const fields = parseFields({
    format: RECEIPT_FORMAT, version: 1, transfer, file_sha256: fileSha256,
    imported, imported_at: formatImportedAt(now), source,
    mac_salt: b64(macSalt instanceof Uint8Array ? macSalt : Uint8Array.from(macSalt)),
  })
  const key = await macKey(passphrase, fields.salt)
  const mac = hex(await crypto.subtle.sign('HMAC', key, enc.encode(canonical(fields))))
  return { format: RECEIPT_FORMAT, version: 1, transfer: fields.transfer, file_sha256: fields.fileSha256, imported: fields.imported, imported_at: fields.importedAt, source: fields.source, mac_salt: b64(fields.salt), mac }
}

export async function verifyImportReceipt(value, passphrase) {
  const parsed = parseReceipt(value)
  const key = await macKey(passphrase, parsed.salt)
  const expected = hex(await crypto.subtle.sign('HMAC', key, enc.encode(canonical(parsed))))
  let diff = 0
  for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ parsed.mac.charCodeAt(i)
  if (diff) throw Error('Receipt not verified. Wrong passphrase or a changed receipt. Nothing about this import is confirmed.')
  return { transfer: parsed.transfer, fileSha256: parsed.fileSha256, imported: parsed.imported, importedAt: parsed.importedAt, source: parsed.source }
}

// Optional deeper check: bind a verified receipt to the exact transfer file it
// refers to (file hash and record IDs). Requires the same passphrase.
export async function verifyReceiptAgainstTransfer(value, passphrase, transferFile) {
  const parsed = parseReceipt(value)
  const details = await verifyImportReceipt(value, passphrase)
  const raw = typeof transferFile === 'string' ? enc.encode(transferFile) : transferFile
  const fileMatches = (await sha256Hex(raw)) === details.fileSha256
  const text = new TextDecoder('utf-8', { fatal: true }).decode(raw)
  const payload = await decryptTransfer(text, passphrase)
  return { ...details, fileMatches, importedPresent: parsed.imported.every((id) => payload.records.some((r) => r.id === id)), transferPayload: payload }
}
