package org.caresphere.android

import org.json.JSONArray
import org.json.JSONObject

/** SOS wording and the capped local attempt log. Never claims delivery or a response. */
object SosText {
    const val LOG_LIMIT = 20

    fun compose(location: String? = null, recordedAt: String? = null): String {
        var message = "CareSphere SOS: I am requesting help. Please check in now."
        if (location != null) {
            message += " Location recorded at " + (recordedAt ?: "an unrecorded time") +
                ": https://www.google.com/maps?q=$location"
        }
        return message
    }

    fun entry(method: String, outcome: String, at: String): JSONObject =
        JSONObject().put("method", method).put("outcome", outcome).put("at", at)

    fun record(log: JSONArray, entry: JSONObject): JSONArray {
        val updated = JSONArray()
        updated.put(entry)
        for (i in 0 until log.length()) if (updated.length() < LOG_LIMIT) updated.put(log.getJSONObject(i))
        return updated
    }

    fun latest(log: JSONArray): JSONObject? = if (log.length() == 0) null else log.optJSONObject(0)

    fun sentToCarrier(name: String) =
        "Message handed to your carrier for $name. Delivery depends on the carrier and the recipient's phone; CareSphere cannot confirm they received it."

    fun failed(name: String) = "The message was not sent to $name. Check your signal and SMS permission, then try again."
}
