package org.caresphere.android

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Bundle
import android.telephony.SmsManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Instant SMS through the phone's carrier, or a reviewed draft. CareSphere has no server. */
class SosActivity : ToolActivity() {
    private var includeLocation = false
    private var fix: Location? = null
    private var locating = false
    private var sending = false
    private var sendStatus: String? = null
    private var partsTotal = 0
    private var partsOk = 0
    private var partsFailed = 0
    private var delivered = false
    private var registered = false

    private val locationPermission = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        if (grants.values.any { it }) requestFix()
        else {
            includeLocation = false
            render()
            message(tx("Location unavailable or permission denied. You can still share an SOS message without coordinates."))
        }
    }

    private val smsPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) sendNow()
        else {
            sendStatus = tx("SMS permission was not granted. You can still choose a messaging app and send the draft yourself.")
            render()
        }
    }

    private val smsReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != ACTION_DELIVERED && !sending) return
            when (intent.action) {
                ACTION_SENT -> {
                    val ok = resultCode == android.app.Activity.RESULT_OK
                    if (ok) partsOk++ else partsFailed++
                    if (partsOk + partsFailed >= partsTotal) finishSend()
                }
                ACTION_DELIVERED -> {
                    delivered = true
                    render()
                }
            }
        }
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        render()
    }

    override fun onStart() {
        super.onStart()
        if (registered) return
        val filter = IntentFilter().apply { addAction(ACTION_SENT); addAction(ACTION_DELIVERED) }
        ContextCompat.registerReceiver(this, smsReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        registered = true
    }

    override fun onStop() {
        if (registered) runCatching { unregisterReceiver(smsReceiver) }
        registered = false
        super.onStop()
    }

    private fun stamp(time: Instant) =
        DateTimeFormatter.ofLocalizedDateTime(java.time.format.FormatStyle.SHORT).withZone(ZoneId.systemDefault()).format(time)

    private fun contact(): Pair<String, String> {
        val profile = CareData(this, false).json
        return EmergencyContact.cleanName(profile.optString("contactName")) to
            EmergencyContact.cleanPhone(profile.optString("contactPhone"))
    }

    private fun canSendSms() =
        packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY) &&
            checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

    private fun render() {
        begin(tx("Emergency SOS"))
        text(tx("Need urgent help?"), 24f)
        text(tx("In the United States, call 911 for immediate danger. Outside the US, use the local emergency number. CareSphere does not contact anyone automatically."))
        button(tx("Call 911")) {
            runCatching { startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:911"))) }
                .onFailure { message(tx("No dialer is available on this device.")) }
        }

        val (contactName, contactPhone) = contact()
        val hasContact = EmergencyContact.usable(contactName, contactPhone)
        text(tx("Send it now"), 22f)
        if (!hasContact) {
            text(tx("Add an emergency contact in Settings & privacy first. Until then you can share the message yourself below."))
        } else if (!packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
            text(tx("This device cannot send text messages. Share the message below or call your contact instead."))
        } else {
            text(tx("CareSphere sends one text through your phone's carrier, with no server or account. Delivery depends on your carrier and your contact's phone; CareSphere cannot confirm they received or read it."))
            sendStatus?.let { text(it) }
            if (delivered) text(tx("Your carrier reported delivery to your contact's phone."), 15f)
            button(if (sending) tx("Sending…") else AppLanguage.format(this, "Send now to {0}", contactName)) {
                if (sending) return@button
                sendStatus = null
                delivered = false
                if (canSendSms()) sendNow()
                else smsPermission.launch(Manifest.permission.SEND_SMS)
                render()
            }.isEnabled = hasContact && !sending
            button(AppLanguage.format(this, "Call {0}", contactName)) {
                runCatching { startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$contactPhone"))) }
                    .onFailure { message(tx("No dialer is available on this device.")) }
            }
        }
        recentAttempts()

        text(tx("Share a request for help"), 22f)
        text(tx("Choose a messaging app and recipient, then review and send the message yourself. CareSphere cannot confirm delivery or a response."))
        text(locationLine())
        button(if (locating) tx("Getting location…") else if (fix == null) tx("Add my location (optional)") else tx("Refresh my location")) {
            if (!locating) {
                includeLocation = true
                when {
                    hasLocationPermission() -> requestFix()
                    else -> locationPermission.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
                }
                render()
            }
        }
        if (includeLocation) button(tx("Remove location from message")) { includeLocation = false; fix = null; render() }
        text(tx("Message preview"), 20f)
        text(shareMessage())
        button(tx("Choose how to share")) {
            runCatching {
                startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, shareMessage()), tx("Choose how to share")))
            }.onFailure { message(tx("No sharing app is available on this device.")) }
        }
        text(tx("No medical profile is attached. Only the name and optional location shown above are included."))
    }

    private fun recentAttempts() {
        val log = CareData(this, false).list("sosLog")
        if (log.length() == 0) return
        text(tx("Recent SOS attempts"), 20f)
        for (i in 0 until minOf(3, log.length())) {
            val entry = log.optJSONObject(i) ?: continue
            val time = runCatching { stamp(Instant.parse(entry.optString("at"))) }.getOrElse { entry.optString("at") }
            val outcome = when (entry.optString("outcome")) {
                "carrier" -> tx("handed to carrier")
                "failed" -> tx("not sent")
                else -> entry.optString("outcome")
            }
            text("$time · ${tx("text message")} · $outcome", 15f)
        }
    }

    private fun finishSend() {
        val (contactName, _) = contact()
        sending = false
        sendStatus = if (partsFailed == 0) SosText.sentToCarrier(contactName) else SosText.failed(contactName)
        val data = CareData(this, false)
        data.put("sosLog", SosText.record(data.list("sosLog"), SosText.entry("sms", if (partsFailed == 0) "carrier" else "failed", Instant.now().toString())))
        render()
    }

    private fun sendNow() {
        val (contactName, contactPhone) = contact()
        if (!EmergencyContact.usable(contactName, contactPhone)) return
        if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            smsPermission.launch(Manifest.permission.SEND_SMS)
            return
        }
        @Suppress("DEPRECATION")
        val manager = SmsManager.getDefault()
        val parts = manager.divideMessage(shareMessage())
        partsTotal = parts.size
        partsOk = 0
        partsFailed = 0
        delivered = false
        val sent = ArrayList<PendingIntent>()
        val delivery = ArrayList<PendingIntent>()
        for (index in parts.indices) {
            sent.add(PendingIntent.getBroadcast(this, 100 + index, Intent(ACTION_SENT).setPackage(packageName),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            delivery.add(PendingIntent.getBroadcast(this, 200 + index, Intent(ACTION_DELIVERED).setPackage(packageName),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
        }
        sending = true
        sendStatus = tx("Sending…")
        render()
        try {
            manager.sendMultipartTextMessage(contactPhone, null, parts, sent, delivery)
        } catch (e: Exception) {
            sending = false
            sendStatus = SosText.failed(contactName)
            val data = CareData(this, false)
            data.put("sosLog", SosText.record(data.list("sosLog"), SosText.entry("sms", "failed", Instant.now().toString())))
            render()
        }
    }

    private fun hasLocationPermission() =
        checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun locationLine(): String = when {
        locating -> tx("Getting location…")
        includeLocation && fix != null -> tx("Location ready to share") + ": " + "%.5f, %.5f".format(fix!!.latitude, fix!!.longitude) + " (" + stamp(Instant.ofEpochMilli(fix!!.time)) + ")"
        else -> tx("Add my location (optional)")
    }

    private fun requestFix() {
        if (!hasLocationPermission()) return
        val manager = getSystemService(LOCATION_SERVICE) as LocationManager
        fix = try {
            manager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        } catch (e: SecurityException) {
            null
        }
        if (fix != null) { locating = false; render(); return }
        locating = true
        render()
        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                fix = location
                locating = false
                manager.removeUpdates(this)
                render()
            }
            @Deprecated("Deprecated in API 29")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }
        val provider = when {
            manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
            manager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
            else -> null
        }
        if (provider == null) {
            locating = false
            render()
            message(tx("Location unavailable or permission denied. You can still share an SOS message without coordinates."))
            return
        }
        try {
            @Suppress("DEPRECATION") manager.requestSingleUpdate(provider, listener, mainLooper)
        } catch (e: SecurityException) {
            locating = false
            render()
            message(tx("Location unavailable or permission denied. You can still share an SOS message without coordinates."))
        }
    }

    private fun shareMessage(): String {
        val coordinates = if (includeLocation) fix?.let { "%.5f,%.5f".format(it.latitude, it.longitude) } else null
        val recordedAt = if (coordinates != null) fix?.let { stamp(Instant.ofEpochMilli(it.time)) } else null
        return SosText.compose(coordinates, recordedAt)
    }

    private companion object {
        const val ACTION_SENT = "org.caresphere.android.SMS_SENT"
        const val ACTION_DELIVERED = "org.caresphere.android.SMS_DELIVERED"
    }
}
