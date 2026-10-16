package org.caresphere.android

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

/** Offline search over the built-in safety notes. Nothing is fetched or uploaded. */
class ReferencesActivity : ToolActivity() {
    private val results by lazy { LinearLayout(this).apply { orientation = LinearLayout.VERTICAL } }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        begin(tx("Health references"))
        text(tx("Search built-in general references offline."))
        page.addView(EditText(this).apply {
            hint = tx("Search")
            setTextColor(ink)
            setHintTextColor(if (dark) Color.rgb(150, 165, 150) else Color.rgb(110, 120, 110))
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) = updateResults(s?.toString() ?: "")
            })
        })
        page.addView(results)
        updateResults("")
    }

    private fun line(value: String, size: Float) {
        results.addView(TextView(this).apply {
            text = value
            textSize = size
            setTextColor(ink)
            setPadding(0, dp(10), 0, dp(4))
            setTextIsSelectable(true)
        })
    }

    private fun action(label: String, action: () -> Unit) {
        results.addView(Button(this).apply {
            text = label
            isAllCaps = false
            setTextColor(ink)
            backgroundTintList = android.content.res.ColorStateList.valueOf(if (dark) Color.rgb(45, 62, 49) else Color.rgb(233, 240, 232))
            minHeight = dp(52)
            setOnClickListener { action() }
        }, LinearLayout.LayoutParams(-1, -2))
    }

    private fun updateResults(query: String) {
        results.removeAllViews()
        val hits = if (query.isBlank()) ReferenceSearch.CARE_BASICS else ReferenceSearch.search(query)
        if (hits.isEmpty()) {
            line(tx("No matching references"), 18f)
            return
        }
        line(tx("Sources found") + ": " + hits.size, 16f)
        hits.forEach { entry ->
            line(entry.title, 20f)
            line(entry.excerpt, 15f)
            line(entry.publisher, 14f)
            action(tx("Open link")) {
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(entry.url))) }
                    .onFailure { message("No browser is available. Open this link on a device with a browser: " + entry.url) }
            }
        }
    }
}
