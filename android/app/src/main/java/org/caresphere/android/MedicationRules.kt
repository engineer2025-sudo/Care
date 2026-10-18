package org.caresphere.android
import java.time.*

object MedicationRules {
    fun validTime(value:String)=Regex("(?:[01][0-9]|2[0-3]):[0-5][0-9]").matches(value)
    fun next(time:String, now:ZonedDateTime):ZonedDateTime {
        require(validTime(time))
        val local=LocalTime.parse(time)
        val today=now.toLocalDate().atTime(local).atZone(now.zone)
        return if(today.isAfter(now))today else now.toLocalDate().plusDays(1).atTime(local).atZone(now.zone)
    }
}
