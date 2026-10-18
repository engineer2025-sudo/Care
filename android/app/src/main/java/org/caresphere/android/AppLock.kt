package org.caresphere.android

import android.content.Context

/** Device-local preference: never exported/restored with care records. Main-thread session. */
object AppLock {
    val session=LockSession()
    private var started=0
    private var preferenceFailed=false
    private fun prefs(c:Context)=c.getSharedPreferences("app-lock",Context.MODE_PRIVATE)
    fun enabled(c:Context)=preferenceFailed||runCatching{prefs(c).getBoolean("enabled",false)}.getOrDefault(true)
    fun locked(c:Context)=enabled(c)&&!session.unlocked
    fun setEnabled(c:Context,value:Boolean):Boolean {
        val saved=runCatching{prefs(c).edit().putBoolean("enabled",value).commit()}.getOrDefault(false)
        preferenceFailed=!saved;return saved
    }
    fun start(){started++}
    fun stop(changingConfiguration:Boolean){started=(started-1).coerceAtLeast(0);if(started==0&&!changingConfiguration)session.lock()}
}
