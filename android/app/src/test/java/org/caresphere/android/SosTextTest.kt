package org.caresphere.android

import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SosTextTest {
    @Test fun messageWithoutLocationIsTheSharedWording() {
        assertEquals(
            "CareSphere SOS: I am requesting help. Please check in now.",
            SosText.compose()
        )
    }

    @Test fun locationAddsAMapsLinkAndTheRecordedTime() {
        val message = SosText.compose("37.12345,-122.54321", "3:42 PM")
        assertTrue(message.endsWith("Location recorded at 3:42 PM: https://www.google.com/maps?q=37.12345,-122.54321"))
        assertTrue(message.startsWith("CareSphere SOS: I am requesting help."))
    }

    @Test fun locationWithoutATimeIsLabelledHonestly() {
        assertTrue(SosText.compose("1.0,2.0").contains("at an unrecorded time"))
    }

    @Test fun theLogKeepsNewestFirstAndCapsAtTwenty() {
        var log = JSONArray()
        for (i in 1..25) log = SosText.record(log, SosText.entry("sms", "i", "t$i"))
        assertEquals(SosText.LOG_LIMIT, log.length())
        assertEquals("t25", log.getJSONObject(0).getString("at"))
        assertEquals("t6", log.getJSONObject(19).getString("at"))
    }

    @Test fun anEmptyLogHasNoLatestEntry() {
        assertNull(SosText.latest(JSONArray()))
    }

    @Test fun statusLinesNeverClaimReceiptOrReading() {
        val sent = SosText.sentToCarrier("Sam")
        assertTrue(sent.contains("handed to your carrier"))
        assertTrue(sent.contains("cannot confirm"))
        assertTrue(!sent.contains("delivered to"))
        assertTrue(SosText.failed("Sam").contains("was not sent"))
    }
}
