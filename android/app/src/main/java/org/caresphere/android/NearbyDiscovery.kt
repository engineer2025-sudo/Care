package org.caresphere.android

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.util.UUID

object NearbyService {
    const val TYPE = "_care-xfer._tcp."
    fun address(ip: String, port: Int, version: String, resolved: List<String>): String? {
        if(version != "1" || ip !in resolved || !LocalTransferWire.privateIPv4(ip) || port !in 1024..65535) return null
        return runCatching { LocalTransferWire.endpoint("$ip:$port","00000000"); "$ip:$port" }.getOrNull()
    }
    fun label(name: String) = name.filter { it.code in 32..126 }.take(63)
}

data class NearbyPeer(val id: String, val name: String, val address: String)

/** Main-thread, explicitly started DNS-SD. No codes, passphrases or care records in TXT. */
class NearbyDiscovery(context: Context, private val changed: () -> Unit) {
    private val manager = context.applicationContext.getSystemService(NsdManager::class.java)
    private fun system() = requireNotNull(manager)
    private var expiry: Runnable? = null
    private var activeResolver: NsdManager.ResolveListener? = null
    private val handler = Handler(Looper.getMainLooper())
    var scanning = false; private set
    var status = ""; private set
    var advertisementStatus = ""; private set
    var advertisedName = ""; private set
    val peers: List<NearbyPeer> get() = found.values.sortedBy { it.name }
    private val found = linkedMapOf<String,NearbyPeer>()
    private val services = linkedMapOf<String,NsdServiceInfo>()
    private val pending = ArrayDeque<NsdServiceInfo>()
    private var resolving = false
    private var generation = UUID.randomUUID()
    private var discovery: NsdManager.DiscoveryListener? = null
    private var registration: NsdManager.RegistrationListener? = null
    private fun key(info: NsdServiceInfo) = info.serviceType.trimEnd('.') + "|" + info.serviceName
    fun advertise(address: String) {
        stopAdvertisement()
        val endpoint = LocalTransferWire.endpoint(address,"00000000")
        val info = NsdServiceInfo().apply {
            serviceName = "CareSphere-" + UUID.randomUUID().toString().take(6).uppercase()
            serviceType = NearbyService.TYPE; port = endpoint.port
            setAttribute("v","1"); setAttribute("ipv4",endpoint.host)
        }
        val listener = object: NsdManager.RegistrationListener {
            override fun onServiceRegistered(serviceInfo: NsdServiceInfo) { handler.post {
                if(registration !== this) { runCatching { system().unregisterService(this) }; return@post }
                advertisedName = NearbyService.label(serviceInfo.serviceName)
                advertisementStatus = "Visible nearby as $advertisedName. The address/code method is also available."; changed()
            } }
            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) { handler.post {
                if(registration !== this) return@post
                registration = null; advertisedName = ""; advertisementStatus = "Nearby visibility is unavailable. Use the address and code instead."; changed()
            } }
            override fun onServiceUnregistered(serviceInfo: NsdServiceInfo) {}
            override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {}
        }
        registration = listener; advertisementStatus = "Making this offer visible nearby…"
        runCatching { system().registerService(info,NsdManager.PROTOCOL_DNS_SD,listener) }.onFailure {
            registration = null; advertisementStatus = "Nearby visibility is unavailable. Use the address and code instead."
        }
        changed()
    }
    fun stopAdvertisement() {
        val listener = registration; registration = null
        if(listener != null) runCatching { system().unregisterService(listener) }
        advertisedName = ""; advertisementStatus = ""
    }
    fun start() {
        stopSearch(); scanning = true; status = "Looking for open CareSphere offers on this network…"
        val token = generation
        val listener = object: NsdManager.DiscoveryListener {
            private var stopRetried = false
            override fun onDiscoveryStarted(type: String) {}
            override fun onDiscoveryStopped(type: String) { handler.post {
                if(discovery !== this) return@post
                stopSearch(); status = "Nearby search stopped. Search again or enter an address manually."; changed()
            } }
            override fun onStartDiscoveryFailed(type: String, errorCode: Int) { failed() }
            override fun onStopDiscoveryFailed(type: String, errorCode: Int) { handler.post { if(!stopRetried) { stopRetried = true; runCatching { system().stopServiceDiscovery(this) } } } }
            private fun failed() { handler.post {
                if(discovery !== this) return@post
                stopSearch(); status = "Nearby search is unavailable. Check Wi-Fi or enter the sender's address and code."; changed()
            } }
            override fun onServiceFound(info: NsdServiceInfo) { handler.post {
                if(discovery !== this || info.serviceType.trimEnd('.') != NearbyService.TYPE.trimEnd('.') || services.size >= 32 || services.containsKey(key(info))) return@post
                services[key(info)] = info; pending.addLast(info); resolveNext(token)
            } }
            override fun onServiceLost(info: NsdServiceInfo) { handler.post {
                if(discovery !== this) return@post
                services.remove(key(info)); found.remove(key(info)); changed()
            } }
        }
        discovery = listener
        runCatching { system().discoverServices(NearbyService.TYPE,NsdManager.PROTOCOL_DNS_SD,listener) }.onFailure {
            stopSearch(); status = "Nearby search is unavailable. Use the address and code instead."
        }
        if(scanning) {
            expiry = Runnable { if(generation == token) {
                stopSearch(); status = "Search ended after one minute. Search again or enter an address manually."; changed()
            } }
            handler.postDelayed(expiry!!,60_000)
        }
        changed()
    }
    @Suppress("DEPRECATION")
    private fun resolveNext(token: UUID) {
        if(token != generation || resolving || pending.isEmpty()) return
        val service = pending.removeFirst()
        if(services[key(service)] !== service) { resolveNext(token); return }
        resolving = true
        val listener = object: NsdManager.ResolveListener {
            override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) { handler.post { finish() } }
            override fun onServiceResolved(info: NsdServiceInfo) { handler.post {
                if(token != generation || activeResolver !== this) return@post
                if(services[key(service)] === service) {
                    val attributes = info.attributes
                    val bytes = attributes["ipv4"]
                    val version = attributes["v"]
                    if(bytes != null && bytes.size <= 15 && version?.contentEquals(byteArrayOf(49)) == true) {
                        val ip = String(bytes,Charsets.US_ASCII)
                        val resolved = if(Build.VERSION.SDK_INT >= 34) info.hostAddresses.mapNotNull { it.hostAddress } else listOfNotNull(info.host?.hostAddress)
                        NearbyService.address(ip,info.port,"1",resolved)?.let { address ->
                            found[key(service)] = NearbyPeer(key(service),NearbyService.label(info.serviceName),address)
                            status = "Choose the label shown on the sending phone. Labels are not verified identities. You still need its code and passphrase."
                        }
                    }
                }
                finish(); changed()
            } }
            private fun finish() { if(token == generation && activeResolver === this) { activeResolver = null; resolving = false; resolveNext(token) } }
        }
        activeResolver = listener
        runCatching { system().resolveService(service,listener) }.onFailure { activeResolver = null; resolving = false; resolveNext(token) }
    }
    fun stopSearch() {
        generation = UUID.randomUUID()
        expiry?.let { handler.removeCallbacks(it) }; expiry = null
        val resolver = activeResolver; activeResolver = null
        if(Build.VERSION.SDK_INT >= 34 && resolver != null) runCatching { system().stopServiceResolution(resolver) }
        val listener = discovery; discovery = null
        if(listener != null) runCatching { system().stopServiceDiscovery(listener) }
        services.clear(); found.clear(); pending.clear(); resolving = false; scanning = false; status = ""
    }
    fun stop() { stopSearch(); stopAdvertisement() }
}
