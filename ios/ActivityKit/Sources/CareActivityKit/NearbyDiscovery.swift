import Foundation
import Combine
import Darwin

/// DNS-SD is an optional address shortcut, never an identity check or an import trigger.
public enum NearbyService {
    public static let type = "_care-xfer._tcp."
    public static func address(ip: String, port: Int, version: String, resolved: [String]) -> String? {
        guard version == "1", resolved.contains(ip), LocalTransferWire.privateIPv4(ip),
              (1024...65535).contains(port),
              (try? LocalTransferWire.endpoint(address: "\(ip):\(port)", code: "00000000")) != nil else { return nil }
        return "\(ip):\(port)"
    }
    public static func label(_ name: String) -> String {
        String(name.unicodeScalars.filter { (32...126).contains($0.value) }.prefix(63).map(String.init).joined())
    }
}

/// Use on the main thread, so Foundation's Bonjour delegates run on the UI run loop.
public final class NearbyAdvertisement: NSObject, ObservableObject, NetServiceDelegate {
    @Published public private(set) var name = ""
    @Published public private(set) var status = ""
    private var service: NetService?
    public func start(address: String) {
        stop()
        guard let endpoint = try? LocalTransferWire.endpoint(address: address, code: "00000000"), let host = endpoint.host, let port = endpoint.port else { return }
        let service = NetService(domain: "local.", type: NearbyService.type, name: "CareSphere-" + UUID().uuidString.prefix(6), port: Int32(port))
        self.service = service; service.delegate = self
        service.setTXTRecord(NetService.data(fromTXTRecord: ["v": Data("1".utf8), "ipv4": Data(host.utf8)]))
        status = "Making this offer visible nearby…"
        service.publish()
    }
    public func stop() {
        service?.delegate = nil; service?.stop(); service = nil; name = ""; status = ""
    }
    public func netServiceDidPublish(_ sender: NetService) {
        guard sender === service else { return }
        name = NearbyService.label(sender.name); status = "Visible nearby as \(name). The address/code method is also available."
    }
    public func netService(_ sender: NetService, didNotPublish errorDict: [String: NSNumber]) {
        guard sender === service else { return }
        sender.stop(); sender.delegate = nil; service = nil; name = ""
        status = "Nearby visibility is unavailable. Use the displayed address and code instead."
    }
}

public struct NearbyPeer: Identifiable, Equatable {
    public let id: String
    public let name: String
    public let address: String
}

public final class NearbyDiscovery: NSObject, ObservableObject, NetServiceBrowserDelegate, NetServiceDelegate {
    @Published public private(set) var peers: [NearbyPeer] = []
    @Published public private(set) var scanning = false
    @Published public private(set) var status = ""
    private var browser: NetServiceBrowser?
    private var services: [String: NetService] = [:]
    private var generation = UUID()
    public func start() {
        stop(); scanning = true; status = "Looking for open CareSphere offers on this network…"
        let browser = NetServiceBrowser(); self.browser = browser; browser.delegate = self
        browser.searchForServices(ofType: NearbyService.type, inDomain: "local.")
        let generation = self.generation
        DispatchQueue.main.asyncAfter(deadline: .now() + 60) { [weak self] in
            guard let self, self.generation == generation else { return }
            self.stop(); self.status = "Search ended after one minute. Search again or enter an address manually."
        }
    }
    public func stop() {
        generation = UUID(); browser?.delegate = nil; browser?.stop(); browser = nil
        for service in services.values { service.delegate = nil; service.stop() }
        services.removeAll(); peers = []; scanning = false; status = ""
    }
    private func key(_ service: NetService) -> String { service.domain + "|" + service.type + "|" + service.name }
    public func netServiceBrowserDidStopSearch(_ browser: NetServiceBrowser) {
        guard browser === self.browser else { return }
        stop(); status = "Nearby search stopped. Search again or enter an address manually."
    }
    public func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        guard browser === self.browser, service.domain == "local.", service.type == NearbyService.type,
              services.count < 32, services[key(service)] == nil else { return }
        services[key(service)] = service; service.delegate = self; service.resolve(withTimeout: 5)
    }
    public func netServiceBrowser(_ browser: NetServiceBrowser, didRemove service: NetService, moreComing: Bool) {
        guard browser === self.browser else { return }
        let id = key(service)
        if let old = services.removeValue(forKey: id) { old.delegate = nil; old.stop() }
        peers.removeAll { $0.id == id }
    }
    public func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
        guard browser === self.browser else { return }
        stop(); status = "Nearby search is unavailable. Check Local Network permission in Settings, or use the sender's address and code."
    }
    public func netServiceDidResolveAddress(_ sender: NetService) {
        let id = key(sender)
        guard services[id] === sender, let raw = sender.txtRecordData(), raw.count <= 1024 else { return }
        let txt = NetService.dictionary(fromTXTRecord: raw)
        guard let ipBytes = txt["ipv4"], ipBytes.count <= 15, let ip = String(data: ipBytes, encoding: .ascii),
              txt["v"] == Data("1".utf8) else { return }
        // Darwin sockaddr_in: length, family, port, then four network-order address bytes.
        let addresses = (sender.addresses ?? []).compactMap { data -> String? in
            let bytes = [UInt8](data)
            guard bytes.count >= 16, bytes[1] == UInt8(AF_INET) else { return nil }
            return bytes[4..<8].map(String.init).joined(separator: ".")
        }
        guard let address = NearbyService.address(ip: ip, port: sender.port, version: "1", resolved: addresses) else { return }
        peers.removeAll { $0.id == id }
        peers.append(NearbyPeer(id: id, name: NearbyService.label(sender.name), address: address))
        peers.sort { $0.name < $1.name }
        status = "Choose the label shown on the sending phone. Labels are not verified identities. You still need its code and passphrase."
    }
    public func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {
        guard services[key(sender)] === sender else { return }
        sender.delegate = nil; sender.stop()
        // Retain the key until removal or a new search, bounding failed resolutions too.
    }
}
