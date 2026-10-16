package org.caresphere.android

import android.Manifest
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Bundle
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Call and reviewed share only. CareSphere never contacts anyone automatically. */
class SosActivity : ToolActivity() {
    private var includeLocation = false
    private var fix: Location? = null
    private var locating = false
    private val locationPermission = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        if (grants.values.any { it }) requestFix()
        else {
            includeLocation = false
            render()
            message(tx("Location unavailable or permission denied. You can still share an SOS message without coordinates."))
        }
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        render()
    }

    private fun stamp(time: Instant) =
        DateTimeFormatter.ofLocalizedDateTime(java.time.format.FormatStyle.SHORT).withZone(ZoneId.systemDefault()).format(time)

    private fun render() {
        begin(tx("Emergency SOS"))
        text(tx("Need urgent help?"), 24f)
        text(tx("In the United States, call 911 for immediate danger. Outside the US, use the local emergency number. CareSphere does not contact anyone automatically."))
        button(tx("Call 911")) {
            runCatching { startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:911"))) }
                .onFailure { message(tx("No dialer is available on this device.")) }
        }
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

    private fun hasLocationPermission() =
        checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED

    private fun locationLine(): String = when {
        locating -> tx("Getting location…")
        includeLocation && fix != null -> tx("Location ready to share") + ": " + "%.5f, %.5f".format(fix!!.latitude, fix!!.longitude) + " (" + stamp(fix!!.time.let { Instant.ofEpochMilli(it) }) + ")"
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
        runCatching { @Suppress("DEPRECATION") manager.requestSingleUpdate(provider, listener, mainLooper) }
            .onFailure {
                locating = false
                render()
                message(tx("Location unavailable or permission denied. You can still share an SOS message without coordinates."))
            }
    }

    private fun shareMessage(): String {
        var message = "CareSphere SOS: I am requesting help. Please check in now."
        if (includeLocation) fix?.let {
            val maps = "https://www.google.com/maps?q=${it.latitude},${it.longitude}"
            message += " Location recorded at ${stamp(Instant.ofEpochMilli(it.time))}: $maps"
        }
        return message
    }
}
