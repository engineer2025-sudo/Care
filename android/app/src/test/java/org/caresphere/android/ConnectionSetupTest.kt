package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
class ConnectionSetupTest {
    @Test fun portableRoundTrip(){val text="CARESPHERE-CONNECT-1|192.168.1.5:12345|01234567";assertEquals(text,ConnectionSetup.encode("192.168.1.5:12345","01234567"));assertEquals("01234567",ConnectionSetup.parse(text).second)}
    @Test fun rejectsUnexpectedDestinations(){listOf("CARESPHERE-CONNECT-1|example.com:12345|01234567","CARESPHERE-CONNECT-1|8.8.8.8:12345|01234567","CARESPHERE-CONNECT-1|192.168.1.5:12345|01234567|secret","CARESPHERE-CONNECT-1|192.168.1.5:12345|1234567","CARESPHERE-CONNECT-1|192.168.1.5:12345/path|01234567").forEach{try{ConnectionSetup.parse(it);fail(it)}catch(_:IllegalArgumentException){}}}
}
