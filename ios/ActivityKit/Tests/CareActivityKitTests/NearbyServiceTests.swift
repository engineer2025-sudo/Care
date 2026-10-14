import XCTest
@testable import CareActivityKit
final class NearbyServiceTests: XCTestCase {
    func testCompatiblePrivateEndpointMustMatchResolvedHost() {
        XCTAssertEqual(NearbyService.address(ip: "192.168.2.3", port: 45678, version: "1", resolved: ["fe80::1", "192.168.2.3"]), "192.168.2.3:45678")
        XCTAssertNil(NearbyService.address(ip: "192.168.2.4", port: 45678, version: "1", resolved: ["192.168.2.3"]))
    }
    func testUnsupportedOrUnsafeAdvertisementsRejected() {
        for ip in ["8.8.8.8", "127.0.0.1", "169.254.1.1", "10.0.0.1.invalid", "010.0.0.1", "::1"] {
            XCTAssertNil(NearbyService.address(ip: ip, port: 45678, version: "1", resolved: [ip]))
        }
        XCTAssertNil(NearbyService.address(ip: "10.1.1.1", port: 80, version: "1", resolved: ["10.1.1.1"]))
        XCTAssertNil(NearbyService.address(ip: "10.1.1.1", port: 45678, version: "2", resolved: ["10.1.1.1"]))
    }
    func testLabelsBoundedAndControlCharactersRemoved() {
        XCTAssertEqual(NearbyService.label("CareSphere-123456\n\u{202e}"), "CareSphere-123456")
        XCTAssertEqual(NearbyService.label(String(repeating: "a", count: 100)).count, 63)
        XCTAssertEqual(NearbyService.type, "_care-xfer._tcp.")
    }
}
