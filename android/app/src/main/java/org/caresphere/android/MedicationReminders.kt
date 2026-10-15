package org.caresphere.android

import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import java.time.ZonedDateTime

/** Optional, inexact local notifications. No doses, names or instructions in notifications. */
object MedicationReminders {
    private const val CHANNEL="care-medications"
    private fun prefs(c:Context)=c.getSharedPreferences("medication-reminders",Context.MODE_PRIVATE)
    fun enabled(c:Context)=prefs(c).getBoolean("enabled",false)
    fun permitted(c:Context)=c.getSystemService(NotificationManager::class.java).areNotificationsEnabled() && (Build.VERSION.SDK_INT<33 || c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")==PackageManager.PERMISSION_GRANTED)
    private fun pending(c:Context,id:String)=PendingIntent.getBroadcast(c,0,Intent(c,MedicationReceiver::class.java).setAction("org.caresphere.MEDICATION_DUE").setData(Uri.fromParts("caremed",id,null)).putExtra("id",id),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    private fun cancel(c:Context, clearNotification:Boolean=true){
        val alarms=c.getSystemService(AlarmManager::class.java)
        prefs(c).getStringSet("ids",emptySet())!!.forEach{alarms.cancel(pending(c,it))}
        if(clearNotification)c.getSystemService(NotificationManager::class.java).cancel(701)
    }
    fun pause(c:Context):Boolean { cancel(c);return prefs(c).edit().putBoolean("enabled",false).commit() }
    fun enable(c:Context):Boolean {
        if(!permitted(c))return false
        if(!prefs(c).edit().putBoolean("enabled",true).commit())return false
        sync(c);return true
    }
    @Synchronized fun sync(c:Context, clearNotification:Boolean=true) {
        cancel(c,clearNotification)
        if(!enabled(c)||!permitted(c))return
        val data=CareData(c,false)
        if(data.error!=null||!data.json.optBoolean("medicationConfirmed"))return
        val meds=data.list("medications");val ids=mutableSetOf<String>()
        for(i in 0 until meds.length()){
            val med=meds.optJSONObject(i)?:continue
            val id=med.optString("id");val time=med.optString("time")
            if(id.isEmpty()||!MedicationRules.validTime(time)||med.optString("name").isBlank())continue
            val whenAt=MedicationRules.next(time,ZonedDateTime.now()).toInstant().toEpochMilli()
            c.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,whenAt,pending(c,id));ids.add(id)
        }
        prefs(c).edit().putStringSet("ids",ids).apply()
    }
    fun due(c:Context,id:String) {
        if(!enabled(c)||!permitted(c))return
        val data=CareData(c,false)
        if(data.error!=null||!data.json.optBoolean("medicationConfirmed"))return
        val meds=data.list("medications")
        if((0 until meds.length()).none{meds.optJSONObject(it)?.optString("id")==id})return
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
                if(intent.action=="org.caresphere.MEDICATION_DUE")MedicationReminders.due(context,intent.getStringExtra("id")?:"")
                else MedicationReminders.sync(context)
            } catch (_:Exception) { MedicationReminders.pause(context) } finally { token.finish() }
        }.start()
    }
}
