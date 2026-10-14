package org.caresphere.android

import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/** Portable, passphrase-protected Android backup. No Keystore key is exported. */
object BackupCipher {
    private val marker = "CareSphere-Android-backup-1\n".toByteArray(Charsets.UTF_8)
    private fun key(password: CharArray, salt: ByteArray): SecretKeySpec {
        require(password.size in 12..1024)
        val spec = PBEKeySpec(password, salt, 310000, 256)
        return try { SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded, "AES") }
        finally { spec.clearPassword() }
    }
    fun seal(data: ByteArray, password: CharArray): ByteArray {
        require(data.size <= 6_000_000)
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key(password, salt)); cipher.updateAAD(marker)
        return marker + salt + cipher.iv + cipher.doFinal(data)
    }
    fun open(data: ByteArray, password: CharArray): ByteArray {
        require(data.size in (marker.size + 44)..6_100_000 && data.copyOfRange(0, marker.size).contentEquals(marker))
        val offset = marker.size
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(password, data.copyOfRange(offset, offset + 16)), GCMParameterSpec(128, data.copyOfRange(offset + 16, offset + 28)))
        cipher.updateAAD(marker)
        return cipher.doFinal(data.copyOfRange(offset + 28, data.size))
    }
}
