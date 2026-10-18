import XCTest
@testable import CareActivityKit
final class LocalTransferTests: XCTestCase {
    func testOnlyCanonicalPrivateIPv4AndExplicitPorts() throws {
        XCTAssertEqual(try LocalTransferWire.endpoint(address: "192.168.4.2:12345", code: "00123456").path, "/care/00123456")
        for address in ["8.8.8.8:12345", "localhost:12345", "127.0.0.1:12345", "169.254.169.254:12345", "[::1]:12345", "192.168.1.2:80", "10.0.0.1:99999", "user@10.0.0.1:12345", "10.0.0.1:12345/path", "10.0.0.1:12345?x", "10.0.0.1:12345#x", "010.0.0.1:12345"] {
            XCTAssertThrowsError(try LocalTransferWire.endpoint(address: address, code: "00123456"), address)
        }
        XCTAssertThrowsError(try LocalTransferWire.endpoint(address: "10.0.0.1:12345", code: "1234567\n"))
    }
    func testResponseIsBoundedAndFragmentationSafe() throws {
        let body = Data("encrypted-test-only".utf8), response = LocalTransferWire.response(body)
        XCTAssertNil(try LocalTransferWire.parseResponse(Data(response.prefix(10))))
        XCTAssertNil(try LocalTransferWire.parseResponse(Data(response.dropLast())))
        XCTAssertEqual(try LocalTransferWire.parseResponse(response), body)
        XCTAssertThrowsError(try LocalTransferWire.parseResponse(Data(repeating: 65, count: 4097)))
        XCTAssertThrowsError(try LocalTransferWire.parseResponse(response + Data([0])))
    }
    func testRedirectsDuplicateLengthsAndOversizeFailClosed() {
        for header in ["HTTP/1.1 302 Found\r\nContent-Length: 1", "HTTP/1.1 200 OK\r\nContent-Length: 1000001", "HTTP/1.1 200 OK\r\nContent-Length: 1\r\ncontent-length: 1", "HTTP/1.1 200 OK\r\nContent-Length: 1\r\nTransfer-Encoding: chunked", "HTTP/1.1 200 OK\r\nContent-Length: -1"] {
            XCTAssertThrowsError(try LocalTransferWire.parseResponse(Data((header + "\r\nContent-Type: application/json\r\n\r\nx").utf8)))
        }
    }
    func testRequestNeedsExactCodeAndNoOtherRoute() {
        let good = Data("GET /care/00123456 HTTP/1.1\r\nHost: 10.0.0.1\r\n\r\n".utf8)
        XCTAssertTrue(LocalTransferWire.validRequest(good, code: "00123456"))
        XCTAssertFalse(LocalTransferWire.validRequest(good, code: "00123457"))
        XCTAssertFalse(LocalTransferWire.validRequest(Data("GET / HTTP/1.1\r\n\r\n".utf8), code: "00123456"))
    }
    func testLiveEncryptedHostReceiverAndExplicitStop() throws {
        guard let address = LocalTransferWire.addresses().first else { throw XCTSkip("Live LAN test requires a private IPv4 interface") }
        let payload = TransferPayload(records: [TransferRecord(id: "n:local", type: "note", text: "Local transport test only")])
        let bytes = try DeviceTransfer.seal(payload, password: "public local test phrase")
        let host = LocalTransferHost(), receiver = LocalTransferReceiver()
        let received = expectation(description: "encrypted bytes received"), ended = expectation(description: "offer stopped")
        host.start(contents: bytes, address: address, ready: { result in
            do {
                let info = try result.get()
                receiver.receive(address: info.0, code: info.1) { result in
                    do { XCTAssertEqual(try DeviceTransfer.open(try result.get(), password: "public local test phrase"), payload) }
                    catch { XCTFail("Local receive failed: \(error)") }
                    received.fulfill(); host.stop()
                }
            } catch { XCTFail("Local offer failed: \(error)"); received.fulfill(); host.stop() }
        }, ended: { ended.fulfill() })
        wait(for: [received, ended], timeout: 20)
        receiver.cancel(); host.stop()
    }
}
