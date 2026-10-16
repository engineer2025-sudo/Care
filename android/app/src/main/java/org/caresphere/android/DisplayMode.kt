package org.caresphere.android

import android.content.Context

/** Device-local only: never exported or restored with care records. */
object DisplayMode {
    private fun prefs(c: Context) = c.getSharedPreferences("interface", Context.MODE_PRIVATE)
    fun enabled(c: Context): Boolean = runCatching { prefs(c).getBoolean("bareMinimum", false) }.getOrDefault(false)
    fun set(c: Context, value: Boolean): Boolean = runCatching { prefs(c).edit().putBoolean("bareMinimum", value).commit() }.getOrDefault(false)
}
