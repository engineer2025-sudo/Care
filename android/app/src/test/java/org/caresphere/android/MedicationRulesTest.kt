package org.caresphere.android
import org.junit.Assert.*
import org.junit.Test
import java.time.*
class MedicationRulesTest {
    @Test fun strictClockFormat(){listOf("00:00","09:30","23:59").forEach{assertTrue(MedicationRules.validTime(it))};listOf("24:00","9:30","09:60","-1:00"," 09:30").forEach{assertFalse(MedicationRules.validTime(it))}}
    @Test fun nextReminderIsAlwaysFuture(){val now=ZonedDateTime.parse("2026-10-14T09:30:00-07:00[America/Los_Angeles]");assertEquals(now.plusDays(1),MedicationRules.next("09:30",now));assertTrue(MedicationRules.next("10:30",now).isAfter(now))}
    @Test fun daylightSavingGapUsesARealFutureInstant(){val now=ZonedDateTime.of(2026,3,8,1,0,0,0,ZoneId.of("America/Los_Angeles"));val next=MedicationRules.next("02:30",now);assertTrue(next.isAfter(now));assertEquals(3,next.hour)}
}
