package org.caresphere.android

/** One review reminder per entry. Not a dose or prescribed schedule change. */
object SnoozeRules {
    const val DELAY=10L*60*1000
    const val MAX_LATENESS=2L*60*60*1000
    fun current(at:Long,day:String,now:Long,today:String)=day==today && at>now && at<=now+DELAY
    fun deliver(at:Long,day:String,now:Long,today:String)=day==today && at<=now && at>=now-MAX_LATENESS
}
