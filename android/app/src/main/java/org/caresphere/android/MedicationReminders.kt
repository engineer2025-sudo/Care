package org.caresphere.android

import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import java.time.ZonedDateTime
import java.time.LocalDate
import org.json.JSONObject

/** Optional, inexact local notifications. No doses, names or instructions in notifications. */
object MedicationReminders {
    private const val CHANNEL="care-medications"
    private fun prefs(c:Context)=c.getSharedPreferences("medication-reminders",Context.MODE_PRIVATE)
    fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
    fun permitted(c:Context)=c.getSystemService(NotificationManager::class.java).areNotificationsEnabled() && c.getSystemService(NotificationManager::class.java).getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE && (Build.VERSION.SDK_INT<33 || c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")==PackageManager.PERMISSION_GRANTED)
    private fun pending(c:Context,id:String,snooze:Boolean=false)=PendingIntent.getBroadcast(c,0,Intent(c,MedicationReceiver::class.java).setAction("org.caresphere.MEDICATION_DUE").setData(Uri.fromParts(if(snooze)"caremed-snooze" else "caremed",id,null)).putExtra("id",id).putExtra("snooze",snooze),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    private fun cancel(c:Context, clearNotification:Boolean=true){
        val alarms=c.getSystemService(AlarmManager::class.java)
        prefs(c).getStringSet("ids",emptySet())!!.forEach{alarms.cancel(pending(c,it));alarms.cancel(pending(c,it,true))}
        if(clearNotification)c.getSystemService(NotificationManager::class.java).cancel(701)
    }
    @Synchronized fun pause(c:Context):Boolean { val saved=prefs(c).edit().putBoolean("enabled",false).remove("snoozes").commit();cancel(c);return saved }
    @Synchronized fun enable(c:Context):Boolean {
        if(!permitted(c))return false
        if(!prefs(c).edit().putBoolean("enabled",true).commit())return false
        return try{sync(c);true}catch(_:Exception){pause(c);false}
    }
    private fun snoozes(c:Context)=runCatching{JSONObject(prefs(c).getString("snoozes","{}")!!)}.getOrDefault(JSONObject())
    fun snoozedUntil(c:Context,id:String):Long? {
        val row=snoozes(c).optJSONObject(id)?:return null
        return row.optLong("at").takeIf{SnoozeRules.current(it,row.optString("day"),System.currentTimeMillis(),LocalDate.now().toString())}
    }
    @Synchronized fun cancelSnooze(c:Context,id:String):Boolean {
        val rows=snoozes(c);rows.remove(id)
        c.getSystemService(AlarmManager::class.java).cancel(pending(c,id,true))
        return prefs(c).edit().putString("snoozes",rows.toString()).commit()
    }
    @Synchronized fun snooze(c:Context,id:String):Boolean {
        if(!enabled(c)||!permitted(c))return false
        val data=CareData(c,false)
        if(data.error!=null||!data.json.optBoolean("medicationConfirmed"))return false
        val meds=data.list("medications")
        val med=(0 until meds.length()).mapNotNull{meds.optJSONObject(it)}.firstOrNull{it.optString("id")==id}?:return false
        if(med.optString("takenOn")==LocalDate.now().toString())return false
        val now=ZonedDateTime.now();val next=now.plusMinutes(10)
        // Never carry a previous day's check-in/reminder into a new medication day.
        if(next.toLocalDate()!=now.toLocalDate())return false
        val rows=snoozes(c).put(id,JSONObject().put("at",next.toInstant().toEpochMilli()).put("day",now.toLocalDate().toString()))
        if(!prefs(c).edit().putString("snoozes",rows.toString()).commit())return false
        return try{sync(c);true}catch(_:Exception){pause(c);false}
    }
    @Synchronized fun sync(c:Context, clearNotification:Boolean=true) {
        cancel(c,clearNotification)
        if(!enabled(c)||!permitted(c))return
        val data=CareData(c,false)
        if(data.error!=null||!data.json.optBoolean("medicationConfirmed"))return
        val meds=data.list("medications")
        val valid=(0 until meds.length()).mapNotNull{meds.optJSONObject(it)}.filter{
            it.optString("id").isNotEmpty()&&MedicationRules.validTime(it.optString("time"))&&it.optString("name").isNotBlank()
        }
        val snoozed=snoozes(c);val keep=JSONObject();val now=System.currentTimeMillis();val today=LocalDate.now().toString()
        valid.forEach{med->
            val id=med.getString("id");val row=snoozed.optJSONObject(id)
            if(row!=null&&med.optString("takenOn")!=today&&SnoozeRules.current(row.optLong("at"),row.optString("day"),now,today))keep.put(id,row)
        }
        // Persist cancellation identities BEFORE scheduling; safe across process death.
        check(prefs(c).edit().putStringSet("ids",valid.map{it.getString("id")}.toSet()).putString("snoozes",keep.toString()).commit())
        valid.forEach{med->
            val whenAt=MedicationRules.next(med.getString("time"),ZonedDateTime.now()).toInstant().toEpochMilli()
            c.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,whenAt,pending(c,med.getString("id")))
            keep.optJSONObject(med.getString("id"))?.let{row->c.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,row.getLong("at"),pending(c,med.getString("id"),true))}
        }
    }
    @android.annotation.SuppressLint("MissingPermission") // permitted() checks POST_NOTIFICATIONS and notification settings.
    @Synchronized fun due(c:Context,id:String,snoozed:Boolean=false) {
        if(!enabled(c)||!permitted(c))return
        val data=CareData(c,false)
        if(data.error!=null||!data.json.optBoolean("medicationConfirmed"))return
        val meds=data.list("medications")
        val medication=(0 until meds.length()).mapNotNull{meds.optJSONObject(it)}.firstOrNull{it.optString("id")==id}?:return
        if(medication.optString("takenOn")==java.time.LocalDate.now().toString()){sync(c,false);return}
        if(snoozed){
            val row=snoozes(c).optJSONObject(id)?:return
            if(!SnoozeRules.deliver(row.optLong("at"),row.optString("day"),System.currentTimeMillis(),LocalDate.now().toString()))return
            if(!cancelSnooze(c,id))return
        }
        val manager=c.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL,AppLanguage.text(c,"Medication reminders"),NotificationManager.IMPORTANCE_DEFAULT))
        val open=PendingIntent.getActivity(c,701,Intent(c,MedicationActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        manager.notify(701,Notification.Builder(c,CHANNEL).setSmallIcon(org.caresphere.android.R.drawable.ic_care)
            .setContentTitle("CareSphere").setContentText(AppLanguage.text(c,"Open your confirmed medication schedule."))
            .setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(open).setAutoCancel(true).build())
        sync(c,false)
    }
}
class MedicationReceiver:BroadcastReceiver(){
    override fun onReceive(context:Context,intent:Intent){
        val token=goAsync()
        Thread {
            try {
                if(intent.action=="org.caresphere.MEDICATION_DUE")MedicationReminders.due(context,intent.getStringExtra("id")?:"",intent.getBooleanExtra("snooze",false))
                else MedicationReminders.sync(context)
            } catch (_:Exception) { MedicationReminders.pause(context) } finally { token.finish() }
        }.start()
    }
}
