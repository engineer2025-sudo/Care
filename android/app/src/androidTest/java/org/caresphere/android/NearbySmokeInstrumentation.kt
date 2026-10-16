package org.caresphere.android

import android.app.Activity
import android.app.Instrumentation
import android.content.Intent
import android.os.Bundle
import org.json.JSONObject
import java.util.Base64
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Test APK only: exercises real Android NSD with independent publisher/browser instances. */
class NearbySmokeInstrumentation : Instrumentation() {
    override fun onCreate(arguments: Bundle?) { super.onCreate(arguments); start() }
    private fun checkpoint(value:String){sendStatus(0,Bundle().apply{putString("stream","CareSphere check: $value\n")})}
    override fun onStart() {
        var publisher: NearbyDiscovery? = null
        var browser: NearbyDiscovery? = null
        var host: LocalTransferHost? = null
        var outcome = Activity.RESULT_CANCELED
        var report = "FAIL: native DNS-SD test did not complete"
        try {
            checkpoint("launch and native discovery")
            startActivitySync(Intent(targetContext,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
            val wifi = java.net.NetworkInterface.getByName("wlan0")?.inetAddresses?.let { java.util.Collections.list(it) }?.mapNotNull { it.hostAddress }?.firstOrNull { LocalTransferWire.privateIPv4(it) }
            val ip = wifi ?: LocalTransferWire.addresses().firstOrNull() ?: error("No private IPv4 interface in emulator")
            val pass = "public nearby instrumentation phrase"
            val plain = "{\"version\":1,\"id\":\"${UUID.randomUUID()}\",\"records\":[{\"id\":\"n:test\",\"type\":\"note\",\"text\":\"Instrumentation only\"}]}".toByteArray()
            val encrypted = TransferCrypto.seal(plain,pass)
            val body = JSONObject().put("format","CareSphere Transfer").put("version",1).put("iterations",310000)
                .put("salt",Base64.getEncoder().encodeToString(encrypted.salt))
                .put("iv",Base64.getEncoder().encodeToString(encrypted.iv))
                .put("ciphertext",Base64.getEncoder().encodeToString(encrypted.ciphertext)).toString().toByteArray()
            val server = LocalTransferHost(); host = server
            val offer = server.start(body,ip){}
            val found = CountDownLatch(1)
            val advertised = CountDownLatch(1)
            var peer: NearbyPeer? = null
            runOnMainSync {
                publisher = NearbyDiscovery(targetContext){ if(publisher?.advertisedName?.isNotEmpty() == true) advertised.countDown() }
                browser = NearbyDiscovery(targetContext){
                    browser?.peers?.firstOrNull { it.address == offer.first }?.let { peer = it; found.countDown() }
                }
                publisher!!.advertise(offer.first)
            }
            check(advertised.await(15,TimeUnit.SECONDS)) { "NSD publication failed: ${publisher?.advertisementStatus}" }
            runOnMainSync { browser!!.start() }
            check(found.await(45,TimeUnit.SECONDS)) { "No real NSD result. publisher=${publisher?.advertisementStatus}, browser=${browser?.status}" }
            val chosen = checkNotNull(peer)
            check(chosen.name == publisher!!.advertisedName)
            val received = LocalTransferReceiver().use { it.receive(chosen.address,offer.second) }
            check(received.contentEquals(body))
            val json = JSONObject(String(received,Charsets.UTF_8))
            fun decoded(key:String) = Base64.getDecoder().decode(json.getString(key))
            val opened = TransferCrypto.open(TransferCrypto.Envelope(decoded("salt"),decoded("iv"),decoded("ciphertext")),pass)
            check(opened.contentEquals(plain))
            runOnMainSync { browser!!.stop(); publisher!!.stop() }
            check(browser!!.peers.isEmpty() && !browser!!.scanning && publisher!!.advertisedName.isEmpty())
            server.close()
            check(runCatching { LocalTransferReceiver().use { it.receive(chosen.address,offer.second) } }.isFailure)
            checkpoint("QR, storage and reminder regressions")
            uiAutomation.grantRuntimePermission(targetContext.packageName,"android.permission.POST_NOTIFICATIONS")
            val bitmap=ConnectionQR.image(offer.first,offer.second)
            val image=java.io.ByteArrayOutputStream();bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,image);bitmap.recycle()
            check(ConnectionQR.read(image.toByteArray())==offer)
            // Storage and reminder checks run on the instrumentation thread so a failed
            // check reports as a clean FAIL result instead of crashing the app process
            // from the main looper (which hides the reason and returns code 0).
            val data=CareData(targetContext,false)
            data.put("storageRegressionMarker","saved")
            check(data.error==null)
            val obstacle=java.io.File(targetContext.filesDir,"care.enc.new")
            check(obstacle.mkdir())
            try {
                data.put("storageRegressionMarker","must-not-look-saved")
                check(data.error!=null && data.json.getString("storageRegressionMarker")=="saved")
            } finally { obstacle.delete() }
            val persisted=CareData(targetContext,false)
            check(persisted.json.getString("storageRegressionMarker")=="saved")
            persisted.put("medications",org.json.JSONArray().put(JSONObject().put("id",UUID.randomUUID().toString()).put("name","Public notification test only").put("time","09:30").put("takenOn","")))
            persisted.put("medicationConfirmed",true)
            check(persisted.error==null){"Setup medication data could not be saved: ${persisted.error}"}
            check(MedicationReminders.permitted(targetContext)){"Notifications are not permitted before enable()"}
            check(MedicationReminders.enable(targetContext)){"Reminders did not enable"}
            val medID=persisted.list("medications").getJSONObject(0).getString("id")
            val reread=CareData(targetContext,false)
            check(reread.error==null&&reread.json.optBoolean("medicationConfirmed")&&reread.list("medications").length()==1){"Setup medication data did not persist"}
            MedicationReminders.due(targetContext,medID)
            // Poll instead of a single immediate read: the first notification after
            // channel creation can be observed slightly late on a loaded emulator.
            val expectedText=AppLanguage.text(targetContext,"Open your confirmed medication schedule.")
            val manager=targetContext.getSystemService(android.app.NotificationManager::class.java)
            var notifications=manager.activeNotifications.toList()
            val noticeDeadline=System.currentTimeMillis()+10_000
            while(!notifications.any{it.id==701}&&System.currentTimeMillis()<noticeDeadline){Thread.sleep(250);notifications=manager.activeNotifications.toList()}
            check(notifications.any{it.id==701 && it.notification.extras.getString(android.app.Notification.EXTRA_TEXT)==expectedText}){
                "Missing medication notice 701 with text '$expectedText'. enabled=${MedicationReminders.enabled(targetContext)} permitted=${MedicationReminders.permitted(targetContext)} active=${notifications.map{it.id to it.notification.extras.getString(android.app.Notification.EXTRA_TEXT)}}"
            }
            val medDay=java.time.LocalDateTime.now()
            if(medDay.plusMinutes(10).toLocalDate()==medDay.toLocalDate()){
                check(MedicationReminders.snooze(targetContext,medID)){"Snooze was refused for a confirmed, untaken medication"}
                val until=checkNotNull(MedicationReminders.snoozedUntil(targetContext,medID)){"Snooze time was not stored"}
                MedicationReminders.sync(targetContext)
                check(MedicationReminders.snoozedUntil(targetContext,medID)==until){"Snooze did not survive reminder sync"}
                check(MedicationReminders.cancelSnooze(targetContext,medID)){"Snooze could not be cancelled"}
                check(MedicationReminders.snoozedUntil(targetContext,medID)==null){"Cancelled snooze still active"}
            }
            val snapshot=persisted.json.toString()
            persisted.restoreSnapshot(snapshot)
            check(!persisted.json.optBoolean("medicationConfirmed") && !MedicationReminders.enabled(targetContext))
            val file=java.io.File(targetContext.filesDir,"care.enc");val before=file.readBytes()
            try{
                file.writeBytes(byteArrayOf(1,2,3))
                val locked=CareData(targetContext,false);check(!locked.canWrite)
                locked.put("storageRegressionMarker","forbidden")
                check(file.readBytes().contentEquals(byteArrayOf(1,2,3)))
            }finally{file.writeBytes(before)}
            checkpoint("protected activity entry points")
            // Screen-lock UI coverage uses the real app activities, not a fake view.
            // The separate shell smoke test verifies actual system credential success/cancel.
            var lockEnabled=false
            runOnMainSync { lockEnabled=AppLock.setEnabled(targetContext,true);AppLock.session.lock() }
            check(lockEnabled){"App lock preference could not be enabled"}
            val protectedScreens=mutableListOf<Activity>()
            try {
                for(type in listOf(MainActivity::class.java,SupportActivity::class.java,MedicationActivity::class.java,HealthHistoryActivity::class.java)){
                    checkpoint(type.simpleName)
                    val screen=startActivitySync(Intent(targetContext,type).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                    protectedScreens.add(screen)
                    // Collect view facts on the main thread, then assert here so a failed
                    // expectation is reported with its message instead of crashing the app.
                    var gateVisible=false
                    var unlockPresent=false
                    var failClosed=false
                    var secureWindow=false
                    runOnMainSync {
                        fun containsGate(view:android.view.View):Boolean {
                            if(view is android.widget.TextView && view.isShown && view.text.toString()=="CareSphere is locked")return true
                            return view is android.view.ViewGroup && (0 until view.childCount).any{containsGate(view.getChildAt(it))}
                        }
                        fun unlockButton(view:android.view.View):android.widget.Button? {
                            if(view is android.widget.Button && view.text.toString()=="Unlock CareSphere")return view
                            if(view is android.view.ViewGroup)for(i in 0 until view.childCount)unlockButton(view.getChildAt(i))?.let{return it}
                            return null
                        }
                        gateVisible=containsGate(screen.window.decorView)
                        val button=unlockButton(screen.window.decorView)
                        unlockPresent=button!=null
                        val secureDevice=targetContext.getSystemService(android.app.KeyguardManager::class.java).isDeviceSecure
                        if(button!=null&&!secureDevice){
                            button.performClick()
                            failClosed=containsGate(screen.window.decorView) && !AppLock.session.unlocked
                        } else failClosed=true
                        secureWindow=screen.window.attributes.flags and android.view.WindowManager.LayoutParams.FLAG_SECURE != 0
                    }
                    check(gateVisible){"Lock shield missing on ${type.simpleName}"}
                    check(unlockPresent){"Unlock control missing on ${type.simpleName}"}
                    check(failClosed){"Unlock without system authentication exposed ${type.simpleName}"}
                    check(secureWindow){"Screenshot flag missing on ${type.simpleName}"}
                }
                outcome = Activity.RESULT_OK
                report = "PASS: native DNS-SD publish/discover/resolve, private endpoint validation, encrypted socket transfer/decryption, and explicit stop; QR image roundtrip; Keystore save rollback/corruption protection; restored medication reminders paused; app-lock shield and screenshot flag on every protected entry point."
            } finally {
                var disabled=false
                runOnMainSync{disabled=AppLock.setEnabled(targetContext,false);AppLock.session.lock();protectedScreens.reversed().forEach{runCatching{it.finish()}}}
                if(!disabled){outcome=Activity.RESULT_CANCELED;report="FAIL: app lock preference could not be disabled during cleanup"}
            }
        } catch(error: Throwable) {
            report = "FAIL: ${error.javaClass.simpleName}: ${error.message}"
        } finally {
            runOnMainSync { runCatching{browser?.stop()};runCatching{publisher?.stop()} }
            runCatching{host?.close()}
        }
        finish(outcome,Bundle().apply { putString("stream",report) })
    }
}
