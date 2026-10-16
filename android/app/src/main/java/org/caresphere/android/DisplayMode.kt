package org.caresphere.android

import android.content.Context

/**
 * Bare minimum mode: a display preference that hides explanatory and how-to copy
 * so screens show only controls and personal content. Status messages, empty
 * states and safety warnings use their own elements and stay visible.
 * Device-local only: never exported or restored with care records.
 */
object DisplayMode {
    private fun prefs(c: Context) = c.getSharedPreferences("interface", Context.MODE_PRIVATE)
    fun enabled(c: Context): Boolean = runCatching { prefs(c).getBoolean("bareMinimum", false) }.getOrDefault(false)
    fun set(c: Context, value: Boolean): Boolean = runCatching { prefs(c).edit().putBoolean("bareMinimum", value).commit() }.getOrDefault(false)
}
