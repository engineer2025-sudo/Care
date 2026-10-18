package org.caresphere.android

import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.Normalizer
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/** Never a transfer acknowledgment; not identity verification or a delivery guarantee. */
object ImportReceipt {
    private val timeFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(ZoneOffset.UTC)
    private val idPattern = Regex("^[A-Za-z0-9:._\\-]{1,120}$")
    private val timePattern = Regex("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")
    private val hex64 = Regex("^[0-9a-f]{64}$")
    private val uuidPattern = Regex("^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", RegexOption.IGNORE_CASE)

    fun fileSha256(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    private fun canonical(transfer: String, fileSha256: String, imported: List<String>, importedAt: String, source: String): String =
        listOf("CareSphere Import Receipt v1", transfer, fileSha256, imported.joinToString(","), importedAt, source).joinToString("|")

    private fun macKey(passphrase: String, salt: ByteArray): SecretKeySpec {
        require(salt.size == 16)
        val normalized = Normalizer.normalize(passphrase, Normalizer.Form.NFC)
        val bytes = normalized.toByteArray(Charsets.UTF_8)
        require(bytes.size in 12..1024)
        val spec = PBEKeySpec(normalized.toCharArray(), salt, 310000, 512)
        return try {
            // MAC key is PBKDF2 bytes 32–64 so the transfer AES key is never reused.
            val all = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
            SecretKeySpec(all.copyOfRange(32, 64), "HmacSHA256")
        } finally { spec.clearPassword() }
    }

    private fun sign(transfer: String, fileSha256: String, imported: List<String>, importedAt: String, source: String, salt: ByteArray, passphrase: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(macKey(passphrase, salt))
        return mac.doFinal(canonical(transfer, fileSha256, imported, importedAt, source).toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    }

    fun create(transfer: String, fileSha256: String, imported: List<String>, source: String, macSalt: ByteArray, passphrase: String, now: Instant = Instant.now()): JSONObject {
        val importedAt = timeFormat.format(now)
        validateFields(transfer, fileSha256, imported, importedAt, source, macSalt)
        return JSONObject()
            .put("format", "CareSphere Import Receipt").put("version", 1)
            .put("transfer", transfer).put("file_sha256", fileSha256)
            .put("imported", JSONArray(imported)).put("imported_at", importedAt)
            .put("source", source).put("mac_salt", Base64.getEncoder().encodeToString(macSalt))
            .put("mac", sign(transfer, fileSha256, imported, importedAt, source, macSalt, passphrase))
    }

    private fun validateFields(transfer: String, fileSha256: String, imported: List<String>, importedAt: String, source: String, macSalt: ByteArray) {
        require(uuidPattern.matches(transfer)) { "invalid transfer id" }
        require(hex64.matches(fileSha256)) { "invalid file hash" }
        require(imported.isNotEmpty() && imported.size <= 100 && imported.map{it}.toSet().size == imported.size) { "invalid imported ids" }
        imported.forEach { require(idPattern.matches(it)) { "invalid record id" } }
        require(timePattern.matches(importedAt)) { "invalid import time" }
        require(source == "file" || source == "nearby") { "invalid source" }
        require(macSalt.size == 16) { "invalid salt" }
    }

    fun verify(receipt: JSONObject, passphrase: String): JSONObject {
        require(receipt.optString("format") == "CareSphere Import Receipt" && receipt.optInt("version") == 1) { "unsupported receipt" }
        val imported = (0 until receipt.getJSONArray("imported").length()).map { receipt.getJSONArray("imported").getString(it) }
        val salt = Base64.getDecoder().decode(receipt.getString("mac_salt"))
        val mac = receipt.getString("mac")
        require(hex64.matches(mac)) { "invalid authentication code" }
        validateFields(receipt.getString("transfer"), receipt.getString("file_sha256"), imported, receipt.getString("imported_at"), receipt.getString("source"), salt)
        val expected = sign(receipt.getString("transfer"), receipt.getString("file_sha256"), imported, receipt.getString("imported_at"), receipt.getString("source"), salt, passphrase)
        require(MessageDigest.isEqual(expected.toByteArray(Charsets.US_ASCII), mac.toByteArray(Charsets.US_ASCII))) { "not verified" }
        return JSONObject().put("transfer", receipt.getString("transfer")).put("file_sha256", receipt.getString("file_sha256"))
            .put("imported", JSONArray(imported)).put("imported_at", receipt.getString("imported_at")).put("source", receipt.getString("source"))
    }

    fun verifyAgainstTransfer(receipt: JSONObject, passphrase: String, transferFile: ByteArray): JSONObject {
        val details = verify(receipt, passphrase)
        val fileMatches = fileSha256(transferFile) == details.getString("file_sha256")
        val envelope = JSONObject(String(transferFile, Charsets.UTF_8))
        val encrypted = TransferCrypto.Envelope(Base64.getDecoder().decode(envelope.getString("salt")), Base64.getDecoder().decode(envelope.getString("iv")), Base64.getDecoder().decode(envelope.getString("ciphertext")))
        val payload = JSONObject(String(TransferCrypto.open(encrypted, passphrase), Charsets.UTF_8))
        val ids = (0 until payload.getJSONArray("records").length()).map { payload.getJSONArray("records").getJSONObject(it).getString("id") }.toSet()
        val imported = (0 until details.getJSONArray("imported").length()).map { details.getJSONArray("imported").getString(it) }
        return details.put("fileMatches", fileMatches).put("importedPresent", imported.all { ids.contains(it) })
    }
}
