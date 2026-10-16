package org.caresphere.android

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.util.Base64

class ImportReceiptTest {
    // Shared cross-platform test vector (deviceTransfer.js / DeviceTransfer.swift use the same values).
    private val vectorPassphrase = "public cafe\u0301 test phrase"
    private val vectorSalt = Base64.getDecoder().decode("AAECAwQFBgcICQoLDA0ODw==")
    private val vectorTransfer = "11111111-2222-4333-8444-555555555555"
    private val vectorFileSha = "d2107c01c87726f19cb06651822d4f1750ab08ee25a4f9d7f7b9f2245da781c0"
    private val vectorImported = listOf("n:alpha", "n:beta", "r:gamma")
    private val vectorMac = "fd504b0878012a2a20e5530759e5286418d7201e12aa0be975c4b76cf2b58558"

    @Test fun receiptMacMatchesSharedCrossPlatformVector() {
        val receipt = ImportReceipt.create(vectorTransfer, vectorFileSha, vectorImported, "file", vectorSalt, vectorPassphrase, Instant.parse("2026-10-15T12:34:56Z"))
        assertEquals(vectorMac, receipt.getString("mac"))
        assertEquals("2026-10-15T12:34:56Z", receipt.getString("imported_at"))
        assertEquals("AAECAwQFBgcICQoLDA0ODw==", receipt.getString("mac_salt"))
        val details = ImportReceipt.verify(receipt, vectorPassphrase)
        assertEquals(vectorTransfer, details.getString("transfer"))
        assertEquals(3, details.getJSONArray("imported").length())
        assertEquals("n:alpha", details.getJSONArray("imported").getString(0))
    }

    @Test fun wrongPassphraseAndAnyTamperingAreRejected() {
        val receipt = ImportReceipt.create(vectorTransfer, vectorFileSha, vectorImported, "file", vectorSalt, vectorPassphrase, Instant.parse("2026-10-15T12:34:56Z"))
        try {
            ImportReceipt.verify(receipt, "a completely wrong password")
            throw AssertionError("expected wrong-passphrase rejection")
        } catch (expected: IllegalArgumentException) { }
        for (change in listOf<(JSONObject) -> JSONObject>(
            { it.put("transfer", "22222222-2222-4333-8444-555555555555") },
            { it.put("imported", JSONArray(listOf("n:beta", "n:alpha", "r:gamma"))) },
            { it.put("imported", JSONArray(vectorImported + "n:extra")) },
            { it.put("imported_at", "2026-10-15T12:34:57Z") },
            { it.put("source", "nearby") },
            { it.put("file_sha256", "0".repeat(64)) },
            { it.put("mac", "0".repeat(64)) },
            { it.put("mac_salt", "AQECAwQFBgcICQoLDA0ODw==") },
            { it.put("version", 2) },
            { it.put("format", "Other") },
            { it.put("imported_at", "2026-10-15 12:34:56") },
            { it.put("imported", JSONArray(listOf("has space"))) },
            { it.put("imported", JSONArray(listOf("dup", "dup"))) },
        ) {
            try {
                ImportReceipt.verify(change(JSONObject(receipt.toString())), vectorPassphrase)
                throw AssertionError("expected rejection")
            } catch (expected: IllegalArgumentException) { }
        }
    }

    @Test fun fileHashMatchesKnownDigest() {
        // sha256("CareSphere cross-platform receipt vector") — same value as the shared vector.
        assertEquals(vectorFileSha, ImportReceipt.fileSha256("CareSphere cross-platform receipt vector".toByteArray(Charsets.UTF_8)))
    }

    @Test fun receiptBindingChecksFileHashAndRecordIds() {
        val payload = JSONObject().put("version", 1).put("id", vectorTransfer).put("records", JSONArray(
            listOf(
                JSONObject().put("id", "n:alpha").put("type", "note").put("text", "A note"),
                JSONObject().put("id", "r:gamma").put("type", "routine").put("text", "A routine"),
            )))
        val sealed = TransferCrypto.seal(payload.toString().toByteArray(Charsets.UTF_8), vectorPassphrase)
        val envelope = JSONObject().put("format", "CareSphere Transfer").put("version", 1).put("iterations", 310000)
            .put("salt", Base64.getEncoder().encodeToString(sealed.salt))
            .put("iv", Base64.getEncoder().encodeToString(sealed.iv))
            .put("ciphertext", Base64.getEncoder().encodeToString(sealed.ciphertext))
        val fileBytes = envelope.toString().toByteArray(Charsets.UTF_8)
        val receipt = ImportReceipt.create(vectorTransfer, ImportReceipt.fileSha256(fileBytes), listOf("n:alpha", "r:gamma"), "nearby", sealed.salt, vectorPassphrase, Instant.parse("2026-10-15T12:34:56Z"))
        val bound = ImportReceipt.verifyAgainstTransfer(receipt, vectorPassphrase, fileBytes)
        assertTrue(bound.getBoolean("fileMatches"))
        assertTrue(bound.getBoolean("importedPresent"))
    }
}
