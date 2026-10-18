package org.caresphere.android

/** In-memory only. An old, failed or background authentication cannot unlock. */
class LockSession {
    var unlocked=false
        private set
    private var generation=0L
    fun begin():Long { generation++;return generation }
    fun invalidate(){generation++}
    fun lock(){invalidate();unlocked=false}
    fun complete(attempt:Long,verified:Boolean,foreground:Boolean):Boolean {
        if(attempt!=generation)return false
        generation++
        if(!verified || !foreground)return false
        unlocked=true;return true
    }
}
