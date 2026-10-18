package org.caresphere.android

import java.io.*
import java.net.*
import java.security.SecureRandom
import java.util.*

/** Foreground-only LAN transport for an already encrypted .caretransfer envelope. */
object LocalTransferWire {
    const val LIMIT = 1_000_000
    fun privateIPv4(host: String): Boolean {
        val fields = host.split('.')
        val parts = fields.mapNotNull { it.toIntOrNull() }
        if(fields.size != 4 || parts.size != 4 || fields.zip(parts).any { (a,b) -> a != b.toString() || b !in 0..255 }) return false
        return parts[0] == 10 || parts[0] == 172 && parts[1] in 16..31 || parts[0] == 192 && parts[1] == 168
    }
    fun endpoint(address: String, code: String): URI {
        require(Regex("[0-9]{8}").matches(code))
        val value = address.trim(); val uri = URI("http://$value")
        require(uri.scheme == "http" && uri.host != null && privateIPv4(uri.host) && uri.port in 1024..65535)
        require(uri.rawUserInfo == null && uri.rawQuery == null && uri.rawFragment == null && uri.rawPath.isEmpty() && value == "${uri.host}:${uri.port}")
        return URI("http://$value/care/$code")
    }
    fun addresses(): List<String> = Collections.list(NetworkInterface.getNetworkInterfaces()).filter { device ->
        device.isUp && !device.isLoopback && !device.isPointToPoint && listOf("wlan", "ap", "swlan", "eth", "bridge", "br").any { device.name.startsWith(it) }
    }.flatMap { Collections.list(it.inetAddresses) }.filterIsInstance<Inet4Address>().mapNotNull { it.hostAddress }.filter { privateIPv4(it) }.distinct()
    internal fun header(input: InputStream): String {
        val bytes = ByteArrayOutputStream()
        while(bytes.size() < 4096) {
            val byte = input.read(); require(byte >= 0 && byte < 128); bytes.write(byte)
            if(byte == 10) { val value = bytes.toString("US-ASCII"); if(value.endsWith("\r\n\r\n")) return value }
        }
        throw IllegalArgumentException("Header too large")
    }
    internal fun readResponse(input: InputStream): ByteArray {
        val lines = header(input).removeSuffix("\r\n\r\n").split("\r\n")
        require(lines.first() == "HTTP/1.1 200 OK")
        val fields = mutableMapOf<String,String>()
        lines.drop(1).forEach { line ->
            val pieces = line.split(':', limit=2); require(pieces.size == 2)
            val key = pieces[0].lowercase(Locale.ROOT); require(!fields.containsKey(key)); fields[key] = pieces[1].trim()
        }
        require(!fields.containsKey("transfer-encoding") && !fields.containsKey("content-encoding") && fields["content-type"] == "application/json")
        val value = fields["content-length"] ?: throw IllegalArgumentException()
        val count = value.toInt(); require(count in 1..LIMIT && value == count.toString())
        return ByteArray(count).also { DataInputStream(input).readFully(it) }
    }
}

class LocalTransferHost : Closeable {
    private var server: ServerSocket? = null
    private var peer: Socket? = null
    private var closed = false
    private val timer = Timer(true)
    private var ended: (() -> Unit)? = null
    @Synchronized fun start(contents: ByteArray, address: String, onEnded: () -> Unit): Pair<String,String> {
        check(!closed && server == null); require(contents.size in 1..LocalTransferWire.LIMIT && LocalTransferWire.privateIPv4(address))
        val ip = InetAddress.getByAddress(address.split('.').map { it.toInt().toByte() }.toByteArray())
        val listener = ServerSocket().apply { reuseAddress = false; bind(InetSocketAddress(ip,0),3) }
        server = listener; ended = onEnded
        val code = String.format(Locale.ROOT,"%08d",SecureRandom().nextInt(100_000_000))
        val body = contents.copyOf()
        timer.schedule(object: TimerTask() { override fun run() { close() } },300_000)
        Thread {
            try {
                repeat(16) {
                    val client = listener.accept()
                    synchronized(this) { if(closed) { client.close(); return@Thread }; peer = client }
                    val deadline = object: TimerTask() { override fun run() { runCatching { client.close() } } }
                    timer.schedule(deadline,15000)
                    try { client.use {
                        client.soTimeout = 3000
                        val request = LocalTransferWire.header(client.getInputStream().buffered())
                        val valid = request.substringBefore("\r\n") == "GET /care/$code HTTP/1.1"
                        val output = client.getOutputStream()
                        if(valid) {
                            output.write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${body.size}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n".toByteArray(Charsets.US_ASCII))
                            output.write(body)
                        } else output.write("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".toByteArray(Charsets.US_ASCII))
                        output.flush()
                    } } catch(_: Exception) { /* Failed peer cannot change the offered records. */ }
                    finally { deadline.cancel(); synchronized(this) { if(peer === client) peer = null } }
                }
            } catch(_: Exception) { /* Stop/expiry closes accept. */ }
            finally { body.fill(0); close() }
        }.apply { isDaemon = true; name = "CareSphere local offer"; start() }
        return Pair("$address:${listener.localPort}",code)
    }
    @Synchronized override fun close() {
        if(closed) return
        closed = true; runCatching { server?.close() }; runCatching { peer?.close() }; server = null; peer = null; timer.cancel()
        ended?.also { ended = null; it() }
    }
}

class LocalTransferReceiver : Closeable {
    private var socket: Socket? = null
    private var closed = false
    fun receive(address: String, code: String): ByteArray {
        val uri = LocalTransferWire.endpoint(address,code)
        val client = Socket()
        synchronized(this) { check(!closed); socket = client }
        val deadline = Timer(true)
        deadline.schedule(object: TimerTask() { override fun run() { close() } },15000)
        try { return client.use {
            val ip = InetAddress.getByAddress(uri.host.split('.').map { it.toInt().toByte() }.toByteArray())
            it.connect(InetSocketAddress(ip,uri.port),5000); it.soTimeout = 5000
            it.getOutputStream().write("GET ${uri.path} HTTP/1.1\r\nHost: ${uri.host}:${uri.port}\r\nConnection: close\r\n\r\n".toByteArray(Charsets.US_ASCII))
            LocalTransferWire.readResponse(it.getInputStream().buffered())
        } } finally { deadline.cancel(); close() }
    }
    @Synchronized override fun close() { closed = true; runCatching { socket?.close() }; socket = null }
}
