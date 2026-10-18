package org.caresphere.android
/** Input-format bounds, NOT reference ranges or advice. */
object VitalRules {
    fun valid(kind:String, first:Int, second:Int?):Boolean=when(kind){
        "bp" -> first in 1..400 && second!=null && second in 1..300 && first>=second
        "oxygen" -> first in 1..100 && second==null
        else -> false
    }
}
