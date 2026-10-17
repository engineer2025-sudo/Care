package org.caresphere.android
import org.junit.Test
import org.junit.Assert.*
class ActivityRulesTest {
    @Test fun readsEightBitMeasurement() { assertEquals(72, ActivityRules.heartRate(byteArrayOf(0, 72))) }
    @Test fun readsLittleEndianMeasurement() { assertEquals(200, ActivityRules.heartRate(byteArrayOf(1, 200.toByte(), 0))) }
    @Test fun rejectsTruncatedPackets() { for (p in listOf(byteArrayOf(), byteArrayOf(0), byteArrayOf(1, 70))) assertNull(ActivityRules.heartRate(p)) }
    @Test fun rejectsNoContact() { assertNull(ActivityRules.heartRate(byteArrayOf(4, 72))); assertEquals(72, ActivityRules.heartRate(byteArrayOf(6,72))) }
    @Test fun rejectsOutOfRange() { assertNull(ActivityRules.heartRate(byteArrayOf(0,0))); assertNull(ActivityRules.heartRate(byteArrayOf(1,0,1))) }
    @Test fun allActivityAnswersExist() { for (i in 0..3) for (r in 0..100) { val round = ActivityRules.round(i,r); assertTrue(round.answer in round.options.indices); assertTrue(round.hint.isNotBlank()) } }
    @Test fun roundIndexWraps() { assertEquals(ActivityRules.round(0,0),ActivityRules.round(0,ActivityRules.sorting.size)) }
    @Test fun twelveUniqueActivities() { assertEquals(12,ActivityRules.titles.toSet().size) }
}
