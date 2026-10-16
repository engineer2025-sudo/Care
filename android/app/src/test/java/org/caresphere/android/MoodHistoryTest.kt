package org.caresphere.android

import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MoodHistoryTest {
    @Test fun replacesSameDayAndAppendsNewDay() {
        var moods = MoodHistory.record(JSONArray(), "2026-10-15", "Good", "2026-10-15T08:00:00Z")
        moods = MoodHistory.record(moods, "2026-10-15", "Okay", "2026-10-15T18:00:00Z")
        moods = MoodHistory.record(moods, "2026-10-16", "Low", "2026-10-16T09:00:00Z")
        assertEquals(2, moods.length())
        assertEquals("Okay", moods.getJSONObject(0).getString("label"))
        assertEquals("Low", moods.getJSONObject(1).getString("label"))
    }

    @Test fun capsAtLimitKeepingNewest() {
        var moods = JSONArray()
        for (day in 1..400) {
            val key = "2026-01-%02d".format((day % 31) + 1)
            moods = MoodHistory.record(moods, "d$day", "Good", "at$day")
        }
        assertEquals(MoodHistory.LIMIT, moods.length())
        assertEquals("d400", moods.getJSONObject(moods.length() - 1).getString("day"))
    }

    @Test fun recentListsNewestFirst() {
        var moods = MoodHistory.record(JSONArray(), "2026-10-14", "Good", "a")
        moods = MoodHistory.record(moods, "2026-10-15", "Okay", "b")
        moods = MoodHistory.record(moods, "2026-10-16", "Low", "c")
        val recent = MoodHistory.recent(moods, 2)
        assertEquals(listOf("2026-10-16" to "Low", "2026-10-15" to "Okay"), recent)
        assertTrue(MoodHistory.recent(moods, 5).size == 3)
    }
}
