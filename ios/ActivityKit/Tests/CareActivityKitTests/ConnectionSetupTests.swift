import XCTest
@testable import CareActivityKit
final class ConnectionSetupTests:XCTestCase {
    func testPortableRoundTrip() throws {
        let text="CARESPHERE-CONNECT-1|192.168.1.5:12345|01234567"
        XCTAssertEqual(try ConnectionSetup.encode(address:"192.168.1.5:12345",code:"01234567"),text)
        XCTAssertEqual(try ConnectionSetup.parse(text).1,"01234567")
    }
    func testRejectsUnexpectedDestinations() {
        for value in ["CARESPHERE-CONNECT-1|example.com:12345|01234567", "CARESPHERE-CONNECT-1|8.8.8.8:12345|01234567", "CARESPHERE-CONNECT-1|192.168.1.5:12345|01234567|secret", "CARESPHERE-CONNECT-1|192.168.1.5:12345|1234567", "CARESPHERE-CONNECT-1|192.168.1.5:12345/path|01234567"] {
            XCTAssertThrowsError(try ConnectionSetup.parse(value))
        }
    }
}
