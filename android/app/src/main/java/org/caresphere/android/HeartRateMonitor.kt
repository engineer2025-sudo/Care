package org.caresphere.android

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.pm.PackageManager
import android.os.*
import java.util.UUID

@SuppressLint("MissingPermission") // Entry points check runtime permissions; failures are surfaced.
class HeartRateMonitor(private val activity: Activity, private val changed: () -> Unit) {
    private val handler = Handler(Looper.getMainLooper())
    private val adapter get() = (activity.getSystemService(Activity.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
    private val serviceID = UUID.fromString("0000180d-0000-1000-8000-00805f9b34fb")
    private val measurementID = UUID.fromString("00002a37-0000-1000-8000-00805f9b34fb")
    private val descriptorID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    private var gatt: BluetoothGatt? = null
    private var scanner: BluetoothLeScanner? = null
    val devices = linkedMapOf<String, BluetoothDevice>()
    var bpm: Int? = null; private set
    var measuredAt: Long? = null; private set
    var status = "No monitor connected. Readings stay blank until a real device sends them."; private set
    var scanning = false; private set
    var connected = false; private set
    var busy = false; private set
    val permissions: Array<String> get() = if (Build.VERSION.SDK_INT >= 31)
        arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        else arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)
    fun permitted() = permissions.all { activity.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }
    private val expire = Runnable { bpm = null; measuredAt = null; status = "No fresh reading for 15 seconds. Check the monitor's contact and connection."; changed() }
    private val timeout = Runnable { disconnect("Connection timed out. Check the monitor and try again.") }
    private val scanTimeout = Runnable { stopScan(); status = if(devices.isEmpty()) "No heart-rate monitors found. Turn on broadcast mode and try again." else "Choose your monitor below."; changed() }
    private fun post(action: () -> Unit) { handler.post { action(); changed() } }
    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(type: Int, result: ScanResult) = post {
            if (scanning) devices[result.device.address] = result.device
        }
        override fun onScanFailed(errorCode: Int) = post {
            stopScan(); status = "Bluetooth scan failed ($errorCode). Check Bluetooth and permissions, then retry."
        }
    }
    fun scan() {
        disconnect()
        devices.clear()
        if (!permitted()) { status = "Bluetooth permission is required only to pair a monitor."; changed(); return }
        try {
            val a = adapter
            if (a == null || !a.isEnabled) { status = "Turn on Bluetooth in Android Settings, then retry."; changed(); return }
            scanner = a.bluetoothLeScanner
            check(scanner != null)
            scanning = true; busy = true; status = "Looking for heart-rate monitors. Choose your own device."
            scanner!!.startScan(listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(serviceID)).build()), ScanSettings.Builder().build(), scanCallback)
            handler.postDelayed(scanTimeout, 20_000)
        } catch (_: Exception) { stopScan(); status = "Could not start Bluetooth. Check permissions and, on Android 11 or earlier, Location services." }
        changed()
    }
    fun stopScan() {
        handler.removeCallbacks(scanTimeout)
        try { scanner?.stopScan(scanCallback) } catch (_: Exception) { }
        scanner = null; scanning = false; busy = false
    }
    fun connect(device: BluetoothDevice) {
        stopScan()
        if (!permitted()) { disconnect("Bluetooth permission was removed. Grant it and retry."); return }
        try {
            busy = true; status = "Connecting to ${device.name ?: "heart-rate monitor"}…"
            gatt = device.connectGatt(activity, false, callback, BluetoothDevice.TRANSPORT_LE)
            handler.postDelayed(timeout, 20_000)
        } catch (_: Exception) { disconnect("Connection could not start. Retry pairing.") }
        changed()
    }
    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, result: Int, state: Int) = post {
            if (g !== gatt) return@post
            if (result != BluetoothGatt.GATT_SUCCESS || state == BluetoothProfile.STATE_DISCONNECTED) { disconnect("Monitor disconnected. No current reading."); return@post }
            if (state == BluetoothProfile.STATE_CONNECTED) {
                try { if (!g.discoverServices()) disconnect("Couldn't discover monitor services.") }
                catch (_: Exception) { disconnect("Bluetooth access was interrupted.") }
            }
        }
        override fun onServicesDiscovered(g: BluetoothGatt, result: Int) = post {
            if (g !== gatt) return@post
            try {
                val c = g.getService(serviceID)?.getCharacteristic(measurementID)
                val d = c?.getDescriptor(descriptorID)
                if (result != BluetoothGatt.GATT_SUCCESS || c == null || d == null || !g.setCharacteristicNotification(c, true)) {
                    disconnect("This monitor did not provide the standard heart-rate notification service."); return@post
                }
                @Suppress("DEPRECATION")
                d.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                @Suppress("DEPRECATION")
                if (!g.writeDescriptor(d)) disconnect("Couldn't subscribe to heart-rate readings.")
            } catch (_: Exception) { disconnect("Bluetooth access was interrupted.") }
        }
        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, result: Int) = post {
            if (g !== gatt || descriptor.uuid != descriptorID) return@post
            if (result != BluetoothGatt.GATT_SUCCESS) { disconnect("Monitor rejected heart-rate notifications."); return@post }
            handler.removeCallbacks(timeout); busy = false; connected = true
            status = "Connected. Waiting for the monitor's first reading."
        }
        @Deprecated("Legacy callback used below Android 13")
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic) {
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT < 33) receive(g, c.uuid, c.value ?: byteArrayOf())
        }
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) = receive(g, c.uuid, value)
    }
    private fun receive(g: BluetoothGatt, id: UUID, bytes: ByteArray) = post {
        if (g !== gatt || id != measurementID || !connected) return@post
        val reading = ActivityRules.heartRate(bytes)
        bpm = reading; measuredAt = reading?.let { System.currentTimeMillis() }
        status = if (reading == null) "Monitor sent an invalid or no-contact reading. Adjust contact." else "Live Bluetooth reading · ${g.device.name ?: "heart-rate monitor"}"
        handler.removeCallbacks(expire)
        if (reading != null) handler.postDelayed(expire, 15_000)
    }
    fun disconnect(message: String = "Disconnected. No current reading.") {
        stopScan(); handler.removeCallbacks(timeout); handler.removeCallbacks(expire)
        val previous = gatt; gatt = null
        try { previous?.disconnect() } catch (_: Exception) { }
        try { previous?.close() } catch (_: Exception) { }
        connected = false; busy = false; bpm = null; measuredAt = null; status = message
        changed()
    }
    fun close() { disconnect(); handler.removeCallbacksAndMessages(null) }
}
