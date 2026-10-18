import XCTest
@testable import CareActivityKit

final class ImportReceiptTests: XCTestCase {
    // Shared cross-platform test vector (deviceTransfer.js / ImportReceipt.kt use the same values).
    private let vectorPassphrase = "public cafe\u{301} test phrase"
    private let vectorSalt = Data(base64Encoded: "AAECAwQFBgcICQoLDA0ODw==")!
    private let vectorTransfer = "11111111-2222-4333-8444-555555555555"
    private let vectorFileSha = "d2107c01c87726f19cb06651822d4f1750ab08ee25a4f9d7f7b9f2245da781c0"
    private let vectorImported = ["n:alpha", "n:beta", "r:gamma"]
    private let vectorMac = "fd504b0878012a2a20e5530759e5286418d7201e12aa0be975c4b76cf2b58558"

    func testReceiptMacMatchesSharedCrossPlatformVector() throws {
        let receipt = try ImportReceipt.create(transfer: vectorTransfer, fileSha256: vectorFileSha, imported: vectorImported,
            source: "file", macSalt: vectorSalt, passphrase: vectorPassphrase, now: date("2026-10-15T12:34:56Z"))
        XCTAssertEqual(receipt.mac, vectorMac)
        XCTAssertEqual(receipt.importedAt, "2026-10-15T12:34:56Z")
        XCTAssertEqual(receipt.macSalt, "AAECAwQFBgcICQoLDA0ODw==")
        let details = try ImportReceipt.verify(receipt, passphrase: vectorPassphrase)
        XCTAssertEqual(details["transfer"], vectorTransfer)
        XCTAssertEqual(details["count"], "3")
    }

    func testWrongPassphraseAndTamperingAreRejected() throws {
        let receipt = try ImportReceipt.create(transfer: vectorTransfer, fileSha256: vectorFileSha, imported: vectorImported,
            source: "file", macSalt: vectorSalt, passphrase: vectorPassphrase, now: date("2026-10-15T12:34:56Z"))
        XCTAssertThrowsError(try ImportReceipt.verify(receipt, passphrase: "a completely wrong password"))
        var cases: [ImportReceipt.Receipt] = []
        var changed = receipt; changed.transfer = "22222222-2222-4333-8444-555555555555"; cases.append(changed)
        changed = receipt; changed.imported = ["n:beta", "n:alpha", "r:gamma"]; cases.append(changed)
        changed = receipt; changed.imported = vectorImported + ["n:extra"]; cases.append(changed)
        changed = receipt; changed.importedAt = "2026-10-15T12:34:57Z"; cases.append(changed)
        changed = receipt; changed.source = "nearby"; cases.append(changed)
        changed = receipt; changed.fileSha256 = String(repeating: "0", count: 64); cases.append(changed)
        changed = receipt; changed.mac = String(repeating: "0", count: 64); cases.append(changed)
        changed = receipt; changed.macSalt = "AQECAwQFBgcICQoLDA0ODw=="; cases.append(changed)
        changed = receipt; changed.version = 2; cases.append(changed)
        changed = receipt; changed.format = "Other"; cases.append(changed)
        changed = receipt; changed.importedAt = "2026-10-15 12:34:56"; cases.append(changed)
        changed = receipt; changed.imported = ["has space"]; cases.append(changed)
        changed = receipt; changed.imported = ["dup", "dup"]; cases.append(changed)
        for candidate in cases {
            XCTAssertThrowsError(try ImportReceipt.verify(candidate, passphrase: vectorPassphrase))
        }
    }

    func testFileHashMatchesKnownDigest() {
        XCTAssertEqual(ImportReceipt.fileSha256(Data("CareSphere cross-platform receipt vector".utf8)), vectorFileSha)
    }

    func testReceiptBindingChecksFileHashAndRecordIds() throws {
        let payload = TransferPayload(id: vectorTransfer, records: [
            TransferRecord(id: "n:alpha", type: "note", text: "A note"),
            TransferRecord(id: "r:gamma", type: "routine", text: "A routine"),
        ])
        let file = try DeviceTransfer.seal(payload, password: vectorPassphrase)
        let envelope = try XCTUnwrap(JSONSerialization.jsonObject(with: file) as? [String: Any])
        let salt = try XCTUnwrap(Data(base64Encoded: try XCTUnwrap(envelope["salt"] as? String)))
        let receipt = try ImportReceipt.create(transfer: vectorTransfer, fileSha256: ImportReceipt.fileSha256(file),
            imported: ["n:alpha", "r:gamma"], source: "nearby", macSalt: salt, passphrase: vectorPassphrase, now: date("2026-10-15T12:34:56Z"))
        let bound = try ImportReceipt.verifyAgainstTransfer(receipt, passphrase: vectorPassphrase, transferFile: file)
        XCTAssertTrue(bound.fileMatches)
        XCTAssertTrue(bound.importedPresent)
    }

    private func date(_ text: String) -> Date {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss'Z'"
        return formatter.date(from: text)!
    }
}
