import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createImportReceipt, verifyImportReceipt, verifyReceiptAgainstTransfer, formatImportedAt, sha256Hex } from '../src/lib/importReceipt.js'
import { decryptTransfer } from '../src/lib/deviceTransfer.js'
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/transfer.json', import.meta.url)))
const VECTOR = {
  passphrase: 'public cafe\u0301 test phrase',
  macSalt: Uint8Array.from(Buffer.from('000102030405060708090a0b0c0d0e0f', 'hex')),
  transfer: '11111111-2222-4333-8444-555555555555',
  fileSha256: 'd2107c01c87726f19cb06651822d4f1750ab08ee25a4f9d7f7b9f2245da781c0',
  imported: ['n:alpha', 'n:beta', 'r:gamma'],
  importedAt: '2026-10-15T12:34:56Z',
  source: 'file',
  mac: 'fd504b0878012a2a20e5530759e5286418d7201e12aa0be975c4b76cf2b58558',
}
test('receipt MAC matches the shared cross-platform test vector', async () => {
  const receipt = await createImportReceipt({
    transfer: VECTOR.transfer, fileSha256: VECTOR.fileSha256, imported: VECTOR.imported,
    source: VECTOR.source, macSalt: VECTOR.macSalt, passphrase: VECTOR.passphrase,
    now: new Date('2026-10-15T12:34:56.000Z'),
  })
  assert.equal(receipt.mac, VECTOR.mac)
  assert.equal(receipt.imported_at, '2026-10-15T12:34:56Z')
  assert.equal(receipt.mac_salt, 'AAECAwQFBgcICQoLDA0ODw==')
  const verified = await verifyImportReceipt(JSON.stringify(receipt), VECTOR.passphrase)
  assert.deepEqual(verified, { transfer: VECTOR.transfer, fileSha256: VECTOR.fileSha256, imported: VECTOR.imported, importedAt: VECTOR.importedAt, source: VECTOR.source })
})
test('wrong passphrase and any tampering are rejected', async () => {
  const receipt = await createImportReceipt({
    transfer: VECTOR.transfer, fileSha256: VECTOR.fileSha256, imported: VECTOR.imported,
    source: VECTOR.source, macSalt: VECTOR.macSalt, passphrase: VECTOR.passphrase,
    now: new Date('2026-10-15T12:34:56.000Z'),
  })
  await assert.rejects(verifyImportReceipt(receipt, 'a completely wrong password'))
  for (const change of [
    (r) => ({ ...r, transfer: '22222222-2222-4333-8444-555555555555' }),
    (r) => ({ ...r, imported: ['n:beta', 'n:alpha', 'r:gamma'] }),
    (r) => ({ ...r, imported: [...r.imported, 'n:extra'] }),
    (r) => ({ ...r, imported_at: '2026-10-15T12:34:57Z' }),
    (r) => ({ ...r, source: 'nearby' }),
    (r) => ({ ...r, file_sha256: '0'.repeat(64) }),
    (r) => ({ ...r, mac: r.mac.replace(/^./, (c) => (c === '0' ? '1' : '0')) }),
    (r) => ({ ...r, mac_salt: 'AQECAwQFBgcICQoLDA0ODw==' }),
    (r) => ({ ...r, version: 2 }),
    (r) => ({ ...r, format: 'Other' }),
    (r) => ({ ...r, imported_at: '2026-10-15 12:34:56' }),
    (r) => ({ ...r, imported: ['has space'] }),
    (r) => ({ ...r, imported: ['dup', 'dup'] }),
    (r) => ({ ...r, mac: 'ZZ' }),
    (r) => ({ ...r, file_sha256: 'nope' }),
    (r) => ({ ...r, imported_at: '2026-13-45T99:99:99Z' }),
  ]) {
    await assert.rejects(verifyImportReceipt(change(receipt), VECTOR.passphrase))
  }
  await assert.rejects(verifyImportReceipt('not json at all', VECTOR.passphrase))
  await assert.rejects(verifyImportReceipt(null, VECTOR.passphrase))
})
test('receipt binds the exact transfer file and its imported record IDs', async () => {
  const fileText = JSON.stringify(fixture.envelope)
  const fileSha256 = await sha256Hex(fileText)
  const salt = Uint8Array.from(Buffer.from(fixture.envelope.salt, 'base64'))
  const receipt = await createImportReceipt({
    transfer: fixture.payload.id, fileSha256, imported: ['r:fixture', 'n:fixture'],
    source: 'nearby', macSalt: salt, passphrase: fixture.password,
    now: new Date('2026-10-15T12:34:56.000Z'),
  })
  const bound = await verifyReceiptAgainstTransfer(receipt, fixture.password, fileText)
  assert.equal(bound.fileMatches, true)
  assert.equal(bound.importedPresent, true)
  assert.equal(bound.transferPayload.id, fixture.payload.id)
  const otherFile = JSON.stringify({ ...fixture.envelope, salt: fixture.envelope.salt.replace(/^./, 'A') })
  const mismatched = await verifyReceiptAgainstTransfer(receipt, fixture.password, otherFile).catch((e) => e)
  // A different file either fails to unlock or fails the hash binding — never both-true.
  if (mismatched && typeof mismatched === 'object' && !Array.isArray(mismatched) && 'fileMatches' in mismatched) assert.equal(mismatched.fileMatches, false)
  else assert.ok(mismatched instanceof Error)
})
test('timestamps are strict UTC seconds and receipts stay small', async () => {
  assert.match(formatImportedAt(new Date('2026-01-02T03:04:05.678Z')), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  const receipt = await createImportReceipt({
    transfer: VECTOR.transfer, fileSha256: VECTOR.fileSha256, imported: VECTOR.imported,
    source: 'file', macSalt: VECTOR.macSalt, passphrase: VECTOR.passphrase,
    now: new Date('2026-10-15T12:34:56.000Z'),
  })
  assert.ok(JSON.stringify(receipt).length < 2000)
  assert.equal(await decryptTransfer(JSON.stringify(fixture.envelope), 'public cafe\u0301 test phrase').then((p) => p.id), fixture.payload.id)
})
