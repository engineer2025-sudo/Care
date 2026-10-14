package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
import java.util.Base64
import java.util.Properties
class TransferCryptoTest {
    @Test fun readsTheWebFixtureWithUnicodeNormalization() {
        val fixture=Properties().apply { javaClass.classLoader!!.getResourceAsStream("transfer.properties")!!.use { load(it) } }
        fun bytes(name:String)=Base64.getDecoder().decode(fixture.getProperty(name))
        val encrypted=TransferCrypto.Envelope(bytes("salt"),bytes("iv"),bytes("ciphertext"))
        assertArrayEquals(bytes("plaintext64"),TransferCrypto.open(encrypted,"public cafe\u0301 test phrase"))
    }
    @Test fun roundTripAndWrongPassword() {
        val source="Care note café".toByteArray(Charsets.UTF_8)
        val encrypted=TransferCrypto.seal(source,"private transfer test phrase")
        assertArrayEquals(source,TransferCrypto.open(encrypted,"private transfer test phrase"))
        assertTrue(runCatching {TransferCrypto.open(encrypted,"different transfer phrase")}.isFailure)
    }
    @Test fun authenticationAndSizeValidation() {
        val encrypted=TransferCrypto.seal("Text".toByteArray(),"private transfer test phrase")
        encrypted.ciphertext[0]=(encrypted.ciphertext[0].toInt() xor 1).toByte()
        assertTrue(runCatching {TransferCrypto.open(encrypted,"private transfer test phrase")}.isFailure)
        assertTrue(runCatching {TransferCrypto.seal(ByteArray(700000),"private transfer test phrase")}.isFailure)
        assertTrue(runCatching {TransferCrypto.seal(ByteArray(1),"short")}.isFailure)
    }
}
