package org.caresphere.android

import java.security.SecureRandom
import java.text.Normalizer
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import javax.crypto.spec.GCMParameterSpec

/** Identical cryptographic wire format to DeviceTransfer.swift and deviceTransfer.js. */
object TransferCrypto {
    data class Envelope(val salt: ByteArray, val iv: ByteArray, val ciphertext: ByteArray)
    private val aad = "CareSphere transfer v1".toByteArray(Charsets.UTF_8)
    private fun key(password: String, salt: ByteArray): SecretKeySpec {
        val normalized = Normalizer.normalize(password, Normalizer.Form.NFC)
        require(normalized.toByteArray(Charsets.UTF_8).size in 12..1024 && salt.size == 16)
        val spec = PBEKeySpec(normalized.toCharArray(), salt, 310000, 256)
        return try { SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded, "AES") } finally { spec.clearPassword() }
    }
    fun seal(plaintext: ByteArray, password: String): Envelope {
        require(plaintext.size <= 699984)
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key(password,salt)); cipher.updateAAD(aad)
        return Envelope(salt, cipher.iv, cipher.doFinal(plaintext))
    }
    fun open(e: Envelope, password: String): ByteArray {
        require(e.salt.size == 16 && e.iv.size == 12 && e.ciphertext.size in 16..700000)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(password,e.salt), GCMParameterSpec(128,e.iv)); cipher.updateAAD(aad)
        return cipher.doFinal(e.ciphertext)
    }
}
