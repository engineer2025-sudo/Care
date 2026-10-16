package org.caresphere.android

import org.json.JSONArray
import org.json.JSONObject

/** Day-keyed self-report history: one entry per local day, oldest dropped past LIMIT. */
object MoodHistory {
    const val LIMIT = 365

    fun record(existing: JSONArray, day: String, label: String, at: String): JSONArray {
        val kept = JSONArray()
        for (i in 0 until existing.length()) {
            val row = existing.optJSONObject(i) ?: continue
            if (row.optString("day") != day && kept.length() < LIMIT - 1) kept.put(row)
        }
        kept.put(JSONObject().put("day", day).put("label", label).put("at", at))
        return kept
    }

    fun recent(existing: JSONArray, limit: Int): List<Pair<String, String>> =
        (existing.length() - 1 downTo 0).take(limit).map { i ->
            val row = existing.getJSONObject(i)
            row.optString("day") to row.optString("label")
        }
}
