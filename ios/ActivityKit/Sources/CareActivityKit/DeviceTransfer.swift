import Foundation
import CryptoKit
import CommonCrypto

public struct TransferRecord: Codable, Identifiable, Equatable {
    public var id: String
    public var type: String
    public var text: String
    public init(id: String, type: String, text: String) { self.id = id; self.type = type; self.text = text }
}
public struct TransferPayload: Codable, Equatable {
    public var version = 1
    public var id: String
    public var records: [TransferRecord]
    public init(id: String = UUID().uuidString, records: [TransferRecord]) { self.id = id; self.records = records }
}
/// Backend-free file format shared by native iOS, native Android and the web app.
public enum DeviceTransfer {
    public enum Failure: Error { case invalid, passphrase }
    private static let aad = Data("CareSphere transfer v1".utf8)
    private struct Envelope: Codable {
        var format = "CareSphere Transfer"
        var version = 1
        var iterations = 310000
        var salt: Data
        var iv: Data
        var ciphertext: Data
    }
    public static func validate(_ value: TransferPayload) throws {
        guard value.version == 1, value.id.count == 36, UUID(uuidString: value.id) != nil,
              (1...100).contains(value.records.count) else { throw Failure.invalid }
        var ids = Set<String>()
        for record in value.records {
            guard !record.id.isEmpty, record.id.utf16.count <= 120, !ids.contains(record.id),
                  ["note", "routine"].contains(record.type),
                  !record.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  record.text.utf16.count <= (record.type == "note" ? 4000 : 240) else { throw Failure.invalid }
            ids.insert(record.id)
        }
    }
    private static func key(_ password: String, salt: Data) throws -> SymmetricKey {
        let phrase = password.precomposedStringWithCanonicalMapping
        guard (12...1024).contains(phrase.utf8.count), salt.count == 16 else { throw Failure.passphrase }
        var bytes = [UInt8](repeating: 0, count: 32)
        let result = phrase.withCString { pass in
            salt.withUnsafeBytes { raw in
                CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2), pass, phrase.utf8.count,
                    raw.bindMemory(to: UInt8.self).baseAddress, 16,
                    CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), 310000, &bytes, 32)
            }
        }
        guard result == kCCSuccess else { throw Failure.invalid }
        return SymmetricKey(data: bytes)
    }
    public static func seal(_ payload: TransferPayload, password: String) throws -> Data {
        try validate(payload)
        let salt = Data((0..<16).map { _ in UInt8.random(in: .min ... .max) })
        let plain = try JSONEncoder().encode(payload)
        guard plain.count <= 699984 else { throw Failure.invalid }
        let box = try AES.GCM.seal(plain, using: key(password, salt: salt), authenticating: aad)
        return try JSONEncoder().encode(Envelope(salt: salt, iv: box.nonce.withUnsafeBytes { Data($0) }, ciphertext: box.ciphertext + box.tag))
    }
    public static func open(_ data: Data, password: String) throws -> TransferPayload {
        guard data.count <= 1_000_000 else { throw Failure.invalid }
        let envelope = try JSONDecoder().decode(Envelope.self, from: data)
        guard envelope.format == "CareSphere Transfer", envelope.version == 1, envelope.iterations == 310000,
              envelope.salt.count == 16, envelope.iv.count == 12,
              (16...700000).contains(envelope.ciphertext.count) else { throw Failure.invalid }
        let box = try AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: envelope.iv),
            ciphertext: envelope.ciphertext.dropLast(16), tag: envelope.ciphertext.suffix(16))
        let plain = try AES.GCM.open(box, using: key(password, salt: envelope.salt), authenticating: aad)
        let payload = try JSONDecoder().decode(TransferPayload.self, from: plain)
        try validate(payload)
        return payload
    }
}
