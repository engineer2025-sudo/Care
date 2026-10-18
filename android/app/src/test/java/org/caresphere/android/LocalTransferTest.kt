package org.caresphere.android
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.net.NetworkInterface
import java.util.Collections
class LocalTransferTest {
    @Test fun acceptsOnlyPrivateLiteralEndpoints() {
        assertEquals("/care/00123456",LocalTransferWire.endpoint("192.168.1.2:12345","00123456").path)
        listOf("8.8.8.8:12345","localhost:12345","10.0.0.1.invalid:12345","127.0.0.1:12345","169.254.169.254:12345","[::1]:12345","10.0.0.1:80","10.0.0.1:65536","user@10.0.0.1:12345","10.0.0.1:12345/path","10.0.0.1:12345?x","10.0.0.1:12345#x","010.0.0.1:12345").forEach {
            assertTrue(it,runCatching { LocalTransferWire.endpoint(it,"00123456") }.isFailure)
        }
        assertTrue(runCatching { LocalTransferWire.endpoint("10.0.0.1:12345","1234567\n") }.isFailure)
    }
    @Test fun rejectsOversizeRedirectsAndAmbiguousHeaders() {
        listOf("HTTP/1.1 302 Found\r\nContent-Length: 1","HTTP/1.1 200 OK\r\nContent-Length: 1000001","HTTP/1.1 200 OK\r\nContent-Length: 1\r\ncontent-length: 1","HTTP/1.1 200 OK\r\nContent-Length: 1\r\nTransfer-Encoding: chunked","HTTP/1.1 200 OK\r\nContent-Length: -1").forEach {
            assertTrue(runCatching { LocalTransferWire.readResponse(ByteArrayInputStream((it+"\r\nContent-Type: application/json\r\n\r\nx").toByteArray())) }.isFailure)
        }
        assertTrue(runCatching { LocalTransferWire.header(ByteArrayInputStream(ByteArray(4097){65})) }.isFailure)
    }
    @Test fun responseRequiresCompleteBody() {
        val header="HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 4\r\n\r\n"
        assertArrayEquals("test".toByteArray(),LocalTransferWire.readResponse(ByteArrayInputStream((header+"test").toByteArray())))
        assertTrue(runCatching { LocalTransferWire.readResponse(ByteArrayInputStream((header+"te").toByteArray())) }.isFailure)
    }
    private fun address():String {
        val ip=Collections.list(NetworkInterface.getNetworkInterfaces()).flatMap{Collections.list(it.inetAddresses)}.mapNotNull{it.hostAddress}.firstOrNull{LocalTransferWire.privateIPv4(it)}
        assumeTrue("Live socket test requires private IPv4",ip!=null);return ip!!
    }
    @Test fun liveRoundTripAndStop() {
        val host=LocalTransferHost();val body=LocalTransferTest::class.java.classLoader!!.getResourceAsStream("browser-transfer.caretransfer")!!.use{it.readBytes()}
        try {
            val info=host.start(body,address()){}
            assertArrayEquals(body,LocalTransferReceiver().use{it.receive(info.first,info.second)})
            host.close()
            assertTrue(runCatching{LocalTransferReceiver().use{it.receive(info.first,info.second)}}.isFailure)
        } finally { host.close() }
    }
    @Test fun wrongCodeAndExhaustedOfferFail() {
        val host=LocalTransferHost()
        try {
            val info=host.start("test encrypted envelope".toByteArray(),address()){}
            val wrong=if(info.second=="00000000")"00000001" else "00000000"
            repeat(16) { assertTrue(runCatching{LocalTransferReceiver().use{it.receive(info.first,wrong)}}.isFailure) }
            assertTrue(runCatching{LocalTransferReceiver().use{it.receive(info.first,info.second)}}.isFailure)
        } finally { host.close() }
    }
}
