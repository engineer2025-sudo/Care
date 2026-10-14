import Foundation
import Network
import Darwin

/// Small, bounded LAN transport. Only an already-encrypted transfer is offered.
/// No discovery, cloud relay, DNS lookup, redirects or background service.
public enum LocalTransferWire {
    public static let limit = 1_000_000
    public enum Failure: Error { case invalid, unavailable, stopped }
    public static func privateIPv4(_ host: String) -> Bool {
        let fields = host.split(separator: ".", omittingEmptySubsequences: false)
        guard fields.count == 4 else { return false }
        let bytes = fields.compactMap { Int($0) }
        guard bytes.count == 4, zip(fields, bytes).allSatisfy({ String($0.1) == $0.0 && (0...255).contains($0.1) }) else { return false }
        return bytes[0] == 10 || (bytes[0] == 172 && (16...31).contains(bytes[1])) || (bytes[0] == 192 && bytes[1] == 168)
    }
    public static func endpoint(address: String, code: String) throws -> URL {
        let address = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard code.utf8.count == 8, code.utf8.allSatisfy({ (48...57).contains($0) }),
              let c = URLComponents(string: "http://" + address), c.scheme == "http", c.user == nil, c.password == nil,
              c.query == nil, c.fragment == nil, c.path.isEmpty, let host = c.host, privateIPv4(host),
              let port = c.port, (1024...65535).contains(port), address == "\(host):\(port)",
              let url = URL(string: "http://\(host):\(port)/care/\(code)") else { throw Failure.invalid }
        return url
    }
    static func request(_ url: URL) -> Data {
        Data("GET \(url.path) HTTP/1.1\r\nHost: \(url.host!):\(url.port!)\r\nConnection: close\r\n\r\n".utf8)
    }
    static func validRequest(_ data: Data, code: String) -> Bool {
        guard data.count <= 4096, let text = String(data: data, encoding: .ascii), text.hasSuffix("\r\n\r\n") else { return false }
        return text.components(separatedBy: "\r\n").first == "GET /care/\(code) HTTP/1.1"
    }
    static func response(_ body: Data) -> Data {
        Data("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: \(body.count)\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n".utf8) + body
    }
    /// nil means incomplete. Length/status/header violations fail before allocating a body.
    static func parseResponse(_ data: Data) throws -> Data? {
        guard data.count <= limit + 4096 else { throw Failure.invalid }
        guard let boundary = data.range(of: Data("\r\n\r\n".utf8)) else {
            guard data.count <= 4096 else { throw Failure.invalid }; return nil
        }
        guard boundary.upperBound <= 4096, let header = String(data: data[..<boundary.lowerBound], encoding: .ascii) else { throw Failure.invalid }
        let lines = header.components(separatedBy: "\r\n")
        guard lines.first == "HTTP/1.1 200 OK" else { throw Failure.invalid }
        var fields: [String: String] = [:]
        for line in lines.dropFirst() {
            let parts = line.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
            guard parts.count == 2 else { throw Failure.invalid }
            let key = parts[0].lowercased(), value = parts[1].trimmingCharacters(in: .whitespaces)
            guard fields[key] == nil else { throw Failure.invalid }; fields[key] = value
        }
        guard fields["transfer-encoding"] == nil, fields["content-encoding"] == nil,
              fields["content-type"] == "application/json", let value = fields["content-length"],
              let length = Int(value), String(length) == value, (1...limit).contains(length) else { throw Failure.invalid }
        let body = data[boundary.upperBound...]
        guard body.count <= length else { throw Failure.invalid }
        return body.count == length ? Data(body) : nil
    }
    public static func addresses() -> [String] {
        var pointer: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&pointer) == 0 else { return [] }
        defer { freeifaddrs(pointer) }
        var result: [String] = [], current = pointer
        while let item = current {
            defer { current = item.pointee.ifa_next }
            let name = String(cString: item.pointee.ifa_name)
            guard ["en", "bridge", "ap"].contains(where: { name.hasPrefix($0) }),
                  let address = item.pointee.ifa_addr, address.pointee.sa_family == UInt8(AF_INET),
                  item.pointee.ifa_flags & UInt32(IFF_UP) != 0 else { continue }
            var buffer = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            if getnameinfo(address, socklen_t(address.pointee.sa_len), &buffer, socklen_t(buffer.count), nil, 0, NI_NUMERICHOST) == 0 {
                let host = String(cString: buffer)
                if privateIPv4(host) && !result.contains(host) { result.append(host) }
            }
        }
        return result
    }
}

public final class LocalTransferHost {
    private let queue = DispatchQueue(label: "CareSphere.local.offer")
    private var listener: NWListener?
    private var peers: [UUID: NWConnection] = [:]
    private var session: UUID?
    private var ended: (() -> Void)?
    public init() {}
    public func start(contents: Data, address: String, ready: @escaping (Result<(String, String), Error>) -> Void, ended: @escaping () -> Void) {
        queue.async { [self] in
            stopNow()
            do {
                guard (1...LocalTransferWire.limit).contains(contents.count), LocalTransferWire.privateIPv4(address) else { throw LocalTransferWire.Failure.invalid }
                let id = UUID(), code = String(format: "%08d", UInt32.random(in: 0..<100_000_000))
                let parameters = NWParameters.tcp
                parameters.requiredLocalEndpoint = .hostPort(host: .ipv4(IPv4Address(address)!), port: .any)
                let listener = try NWListener(using: parameters)
                self.listener = listener; session = id; self.ended = ended
                var replied = false, attempts = 0
                listener.stateUpdateHandler = { [weak self] state in
                    guard let self, self.session == id else { return }
                    switch state {
                    case .ready:
                        guard !replied, let port = listener.port else { return }; replied = true
                        DispatchQueue.main.async { ready(.success(("\(address):\(port.rawValue)", code))) }
                    case .failed(let error):
                        if !replied { replied = true; DispatchQueue.main.async { ready(.failure(error)) } }; self.stopNow()
                    case .cancelled: self.stopNow()
                    default: break
                    }
                }
                listener.newConnectionHandler = { [weak self] connection in
                    guard let self, self.session == id, self.peers.count < 3, attempts < 16 else { connection.cancel(); return }
                    attempts += 1
                    let peer = UUID(); self.peers[peer] = connection; connection.start(queue: self.queue)
                    self.readRequest(connection, peer: peer, code: code, contents: contents, buffer: Data())
                    self.queue.asyncAfter(deadline: .now() + 5) { [weak self] in self?.close(peer) }
                    if attempts == 16 { listener.cancel() } // existing response can finish; no more guesses
                }
                listener.start(queue: queue)
                queue.asyncAfter(deadline: .now() + 300) { [weak self] in if self?.session == id { self?.stopNow() } }
            } catch { DispatchQueue.main.async { ready(.failure(error)) } }
        }
    }
    private func readRequest(_ connection: NWConnection, peer: UUID, code: String, contents: Data, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4097 - buffer.count) { [weak self] data, _, complete, error in
            guard let self, self.peers[peer] != nil else { return }
            let bytes = buffer + (data ?? Data())
            guard bytes.count <= 4096, error == nil else { self.close(peer); return }
            if bytes.range(of: Data("\r\n\r\n".utf8)) != nil {
                let reply = LocalTransferWire.validRequest(bytes, code: code) ? LocalTransferWire.response(contents) : Data("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".utf8)
                connection.send(content: reply, completion: .contentProcessed { [weak self] _ in self?.close(peer) })
            } else if complete { self.close(peer) }
            else { self.readRequest(connection, peer: peer, code: code, contents: contents, buffer: bytes) }
        }
    }
    private func close(_ id: UUID) { peers.removeValue(forKey: id)?.cancel() }
    private func stopNow() {
        session = nil; listener?.stateUpdateHandler = nil; listener?.newConnectionHandler = nil; listener?.cancel(); listener = nil
        for peer in peers.values { peer.cancel() }; peers.removeAll()
        if let callback = ended { ended = nil; DispatchQueue.main.async(execute: callback) }
    }
    public func stop() { queue.async { [self] in stopNow() } }
}

public final class LocalTransferReceiver {
    private let queue = DispatchQueue(label: "CareSphere.local.receive")
    private var connection: NWConnection?
    private var session: UUID?
    private var callback: ((Result<Data, Error>) -> Void)?
    public init() {}
    public func receive(address: String, code: String, completion: @escaping (Result<Data, Error>) -> Void) {
        queue.async { [self] in
            finish(.failure(LocalTransferWire.Failure.stopped))
            do {
                let url = try LocalTransferWire.endpoint(address: address, code: code)
                let id = UUID(), connection = NWConnection(host: .ipv4(IPv4Address(url.host!)!), port: NWEndpoint.Port(rawValue: UInt16(url.port!))!, using: .tcp)
                session = id; self.connection = connection; callback = completion
                connection.stateUpdateHandler = { [weak self] state in
                    guard let self, self.session == id else { return }
                    switch state {
                    case .ready:
                        connection.send(content: LocalTransferWire.request(url), completion: .contentProcessed { [weak self] error in
                            guard let self, self.session == id else { return }
                            if let error { self.finish(.failure(error)) } else { self.read(connection, id: id, buffer: Data()) }
                        })
                    case .failed(let error): self.finish(.failure(error))
                    default: break
                    }
                }
                connection.start(queue: queue)
                queue.asyncAfter(deadline: .now() + 15) { [weak self] in if self?.session == id { self?.finish(.failure(LocalTransferWire.Failure.unavailable)) } }
            } catch { DispatchQueue.main.async { completion(.failure(error)) } }
        }
    }
    private func read(_ connection: NWConnection, id: UUID, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] bytes, _, complete, error in
            guard let self, self.session == id else { return }
            do {
                if let error { throw error }
                let data = buffer + (bytes ?? Data())
                if let body = try LocalTransferWire.parseResponse(data) { self.finish(.success(body)) }
                else if complete { throw LocalTransferWire.Failure.invalid }
                else { self.read(connection, id: id, buffer: data) }
            } catch { self.finish(.failure(error)) }
        }
    }
    private func finish(_ result: Result<Data, Error>) {
        session = nil; connection?.stateUpdateHandler = nil; connection?.cancel(); connection = nil
        if let callback { self.callback = nil; DispatchQueue.main.async { callback(result) } }
    }
    public func cancel() { queue.async { [self] in finish(.failure(LocalTransferWire.Failure.stopped)) } }
}
