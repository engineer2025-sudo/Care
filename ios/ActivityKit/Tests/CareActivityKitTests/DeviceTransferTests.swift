import XCTest
@testable import CareActivityKit
final class DeviceTransferTests: XCTestCase {
    private let password = "public café test phrase"
    private func sample() -> TransferPayload { TransferPayload(records: [TransferRecord(id: "n:one", type: "note", text: "Personal text")]) }
    func testWebInteropFixtureAndUnicodeNormalization() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "transfer", withExtension: "json", subdirectory: "Fixtures"))
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let data = try JSONSerialization.data(withJSONObject: XCTUnwrap(object["envelope"]))
        let payload = try DeviceTransfer.open(data, password: "public cafe\u{301} test phrase")
        XCTAssertEqual(payload.records.count, 2); XCTAssertEqual(payload.records[0].text, "Transfer fixture — café")
        XCTAssertEqual(payload.records[1].type, "routine")
    }
    func testRoundTripDoesNotExposeText() throws {
        let payload = sample(); let data = try DeviceTransfer.seal(payload, password: password)
        XCTAssertEqual(try DeviceTransfer.open(data, password: password), payload)
        XCTAssertFalse(String(decoding: data, as: UTF8.self).contains("Personal text"))
    }
    func testWrongPasswordAndChangedCiphertextFail() throws {
        let data = try DeviceTransfer.seal(sample(), password: password)
        XCTAssertThrowsError(try DeviceTransfer.open(data, password: "a different passphrase"))
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        var ciphertext = try XCTUnwrap(Data(base64Encoded: try XCTUnwrap(object["ciphertext"] as? String)))
        ciphertext[0] ^= 1; object["ciphertext"] = ciphertext.base64EncodedString()
        XCTAssertThrowsError(try DeviceTransfer.open(JSONSerialization.data(withJSONObject: object), password: password))
    }
    func testRejectsUnexpectedTypesDuplicateIDsAndEmptyRecords() throws {
        XCTAssertThrowsError(try DeviceTransfer.validate(TransferPayload(records: [])))
        XCTAssertThrowsError(try DeviceTransfer.validate(TransferPayload(records: [TransferRecord(id: "x", type: "medication", text: "not allowed")])))
        XCTAssertThrowsError(try DeviceTransfer.validate(TransferPayload(records: [TransferRecord(id: "x", type: "note", text: "first"), TransferRecord(id: "x", type: "note", text: "second")])))
    }
    func testRejectsShortPassphraseAndOversizedRecords() throws {
        XCTAssertThrowsError(try DeviceTransfer.seal(sample(), password: "short"))
        XCTAssertThrowsError(try DeviceTransfer.validate(TransferPayload(records: [TransferRecord(id: "r", type: "routine", text: String(repeating: "a", count: 241))])))
    }
}
