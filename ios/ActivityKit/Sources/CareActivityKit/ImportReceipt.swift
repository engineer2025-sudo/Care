import Foundation
import CryptoKit
import CommonCrypto

/// Never a transfer acknowledgment; not identity verification or a delivery guarantee.
public enum ImportReceipt {
    public enum Failure: Error { case invalid, notVerified }

    public struct Receipt: Codable, Equatable {
        public var format = "CareSphere Import Receipt"
        public var version = 1
        public var transfer: String
        public var fileSha256: String
        public var imported: [String]
        public var importedAt: String
        public var source: String
        public var macSalt: String
        public var mac: String
        enum CodingKeys: String, CodingKey {
            case format, version, transfer, imported, mac
            case fileSha256 = "file_sha256"
            case importedAt = "imported_at"
            case source
            case macSalt = "mac_salt"
        }
        public init(transfer: String, fileSha256: String, imported: [String], importedAt: String, source: String, macSalt: String, mac: String) {
            self.transfer = transfer; self.fileSha256 = fileSha256; self.imported = imported
            self.importedAt = importedAt; self.source = source; self.macSalt = macSalt; self.mac = mac
        }
    }

    private static let idPattern = try! Regex("^[A-Za-z0-9:._\\-]{1,120}$")
    private static let timePattern = try! Regex("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")
    private static let hex64 = try! Regex("^[0-9a-f]{64}$")

    public static func formatTime(_ date: Date = Date()) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        return formatter.string(from: date)
    }

    public static func fileSha256(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static func canonical(_ transfer: String, _ fileSha256: String, _ imported: [String], _ importedAt: String, _ source: String) -> String {
        ["CareSphere Import Receipt v1", transfer, fileSha256, imported.joined(separator: ","), importedAt, source].joined(separator: "|")
    }

    private static func macKey(_ passphrase: String, salt: Data) throws -> SymmetricKey {
        let phrase = passphrase.precomposedStringWithCanonicalMapping
        guard (12...1024).contains(phrase.utf8.count), salt.count == 16 else { throw Failure.invalid }
        var bytes = [UInt8](repeating: 0, count: 64)
        let result = phrase.withCString { pass in
            salt.withUnsafeBytes { raw in
                CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2), pass, phrase.utf8.count,
                    raw.bindMemory(to: UInt8.self).baseAddress, 16,
                    CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), 310000, &bytes, 64)
            }
        }
        guard result == kCCSuccess else { throw Failure.invalid }
        // MAC key is PBKDF2 bytes 32–64 so the transfer AES key is never reused.
        return SymmetricKey(data: bytes[32..<64])
    }

    private static func sign(_ transfer: String, _ fileSha256: String, _ imported: [String], _ importedAt: String, _ source: String, salt: Data, passphrase: String) throws -> String {
        let key = try macKey(passphrase, salt: salt)
        let code = HMAC<SHA256>.authenticationCode(for: Data(canonical(transfer, fileSha256, imported, importedAt, source).utf8), using: key)
        return code.map { String(format: "%02x", $0) }.joined()
    }

    private static func validate(transfer: String, fileSha256: String, imported: [String], importedAt: String, source: String, salt: Data) throws {
        guard transfer.range(of: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", options: .regularExpression) != nil,
              fileSha256.wholeMatch(of: hex64) != nil,
              (1...100).contains(imported.count), Set(imported).count == imported.count,
              imported.allSatisfy({ $0.wholeMatch(of: idPattern) != nil }),
              importedAt.wholeMatch(of: timePattern) != nil,
              source == "file" || source == "nearby",
              salt.count == 16 else { throw Failure.invalid }
    }

    public static func create(transfer: String, fileSha256: String, imported: [String], source: String, macSalt: Data, passphrase: String, now: Date = Date()) throws -> Receipt {
        let importedAt = formatTime(now)
        try validate(transfer: transfer, fileSha256: fileSha256, imported: imported, importedAt: importedAt, source: source, salt: macSalt)
        let mac = try sign(transfer, fileSha256, imported, importedAt, source, salt: macSalt, passphrase: passphrase)
        return Receipt(transfer: transfer, fileSha256: fileSha256, imported: imported, importedAt: importedAt,
                       source: source, macSalt: macSalt.base64EncodedString(), mac: mac)
    }

    public static func verify(_ receipt: Receipt, passphrase: String) throws -> [String: String] {
        guard receipt.format == "CareSphere Import Receipt", receipt.version == 1 else { throw Failure.invalid }
        guard receipt.mac.wholeMatch(of: hex64) != nil, let salt = Data(base64Encoded: receipt.macSalt) else { throw Failure.invalid }
        try validate(transfer: receipt.transfer, fileSha256: receipt.fileSha256, imported: receipt.imported, importedAt: receipt.importedAt, source: receipt.source, salt: salt)
        let expected = try sign(receipt.transfer, receipt.fileSha256, receipt.imported, receipt.importedAt, receipt.source, salt: salt, passphrase: passphrase)
        var diff = 0
        for (a, b) in zip(Array(expected.utf8), Array(receipt.mac.utf8)) { diff |= Int(a) ^ Int(b) }
        guard diff == 0, expected.count == receipt.mac.count else { throw Failure.notVerified }
        return ["transfer": receipt.transfer, "imported_at": receipt.importedAt, "source": receipt.source, "count": String(receipt.imported.count)]
    }

    public static func parse(_ text: String) throws -> Receipt {
        guard let data = text.data(using: .utf8), let receipt = try? JSONDecoder().decode(Receipt.self, from: data) else { throw Failure.invalid }
        return receipt
    }

    public static func verifyAgainstTransfer(_ receipt: Receipt, passphrase: String, transferFile: Data) throws -> (details: [String: String], fileMatches: Bool, importedPresent: Bool) {
        let details = try verify(receipt, passphrase: passphrase)
        let fileMatches = fileSha256(transferFile) == receipt.fileSha256
        let payload = try DeviceTransfer.open(transferFile, password: passphrase)
        let ids = Set(payload.records.map { $0.id })
        return (details, fileMatches, receipt.imported.allSatisfy { ids.contains($0) })
    }
}
