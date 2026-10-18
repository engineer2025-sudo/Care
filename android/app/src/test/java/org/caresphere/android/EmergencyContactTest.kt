package org.caresphere.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EmergencyContactTest {
    @Test fun phoneCleaningKeepsLeadingPlusAndDropsFormatting() {
        assertEquals("5551234567", EmergencyContact.cleanPhone(" (555) 123-4567 "))
        assertEquals("+15551234567", EmergencyContact.cleanPhone("+1 555 123 4567"))
        assertEquals("", EmergencyContact.cleanPhone("+"))
        assertEquals("5551234567", EmergencyContact.cleanPhone("55+51234567"))
    }

    @Test fun aContactNeedsANameAndSevenDigits() {
        assertTrue(EmergencyContact.usable("Sam", "(555) 123-4567"))
        assertFalse(EmergencyContact.usable("Sam", "12345"))
        assertFalse(EmergencyContact.usable("   ", "5551234567"))
    }

    @Test fun theDraftUriNeverClaimsDelivery() {
        assertEquals("smsto:+15551234567", EmergencyContact.smsUri("+1 (555) 123-4567"))
        assertFalse(EmergencyContact.smsUri("5551234567").contains("sent"))
    }

    @Test fun namesCollapseWhitespaceAndStayBounded() {
        assertEquals("Sam Lee", EmergencyContact.cleanName("  Sam   Lee  "))
        assertEquals(40, EmergencyContact.cleanName("x".repeat(80)).length)
    }
}
