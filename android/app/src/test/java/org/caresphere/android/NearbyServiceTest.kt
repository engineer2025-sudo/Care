package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
class NearbyServiceTest {
    @Test fun compatiblePrivateEndpointMustMatchResolvedHost() {
        assertEquals("192.168.2.3:45678",NearbyService.address("192.168.2.3",45678,"1",listOf("fe80::1","192.168.2.3")))
        assertNull(NearbyService.address("192.168.2.4",45678,"1",listOf("192.168.2.3")))
    }
    @Test fun unsupportedAndUnsafeAdvertisementsRejected() {
        listOf("8.8.8.8","127.0.0.1","169.254.1.1","10.0.0.1.invalid","010.0.0.1","::1").forEach { assertNull(NearbyService.address(it,45678,"1",listOf(it))) }
        assertNull(NearbyService.address("10.1.1.1",80,"1",listOf("10.1.1.1")))
        assertNull(NearbyService.address("10.1.1.1",45678,"2",listOf("10.1.1.1")))
    }
    @Test fun labelsBoundedAndControlCharactersRemoved() {
        assertEquals("CareSphere-123456",NearbyService.label("CareSphere-123456\n\u202e"))
        assertEquals(63,NearbyService.label("a".repeat(100)).length)
        assertEquals("_care-xfer._tcp.",NearbyService.TYPE)
    }
}
