package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
class BackupCipherTest {
    @Test fun roundTripAndNoPlaintext() {
        val plain="Private care note".toByteArray();val password="a long test-only phrase".toCharArray()
        val sealed=BackupCipher.seal(plain,password)
        assertArrayEquals(plain,BackupCipher.open(sealed,password))
        assertFalse(String(sealed).contains("Private care note"))
    }
    @Test fun rejectsWrongPasswordAndTampering() {
        val sealed=BackupCipher.seal("Note".toByteArray(),"correct test phrase".toCharArray())
        assertTrue(runCatching{BackupCipher.open(sealed,"wrong test phrase!".toCharArray())}.isFailure)
        sealed[sealed.lastIndex]=(sealed.last().toInt() xor 1).toByte()
        assertTrue(runCatching{BackupCipher.open(sealed,"correct test phrase".toCharArray())}.isFailure)
    }
    @Test fun rejectsShortPasswordAndForeignFormat() {
        assertTrue(runCatching{BackupCipher.seal(byteArrayOf(1),"short".toCharArray())}.isFailure)
        assertTrue(runCatching{BackupCipher.open(ByteArray(100),"correct test phrase".toCharArray())}.isFailure)
    }
}
