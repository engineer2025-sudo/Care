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
    override fun onStart() {
        var publisher: NearbyDiscovery? = null
        var browser: NearbyDiscovery? = null
        var host: LocalTransferHost? = null
        var outcome = Activity.RESULT_CANCELED
        var report = "FAIL: native DNS-SD test did not complete"
        try {
            startActivitySync(Intent(targetContext,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
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
            val bitmap=ConnectionQR.image(offer.first,offer.second)
            val image=java.io.ByteArrayOutputStream();bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,image);bitmap.recycle()
            check(ConnectionQR.read(image.toByteArray())==offer)
            runOnMainSync {
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
                persisted.put("medicationConfirmed",true)
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
            }
            outcome = Activity.RESULT_OK
            report = "PASS: native DNS-SD publish/discover/resolve, private endpoint validation, encrypted socket transfer/decryption, and explicit stop; QR image roundtrip; Keystore save rollback/corruption protection; restored medication reminders paused."
        } catch(error: Throwable) {
            report = "FAIL: ${error.javaClass.simpleName}: ${error.message}"
        } finally {
            runOnMainSync { browser?.stop(); publisher?.stop() }
            host?.close()
        }
        finish(outcome,Bundle().apply { putString("stream",report) })
    }
}
