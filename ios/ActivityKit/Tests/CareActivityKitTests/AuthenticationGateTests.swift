import XCTest
@testable import CareActivityKit
final class AuthenticationGateTests: XCTestCase {
    func testUnavailableAndFailedAuthenticationStayLocked() {
        XCTAssertFalse(AuthenticationGate.accepts(canEvaluate:false,verified:true))
        XCTAssertFalse(AuthenticationGate.accepts(canEvaluate:true,verified:false))
        XCTAssertTrue(AuthenticationGate.accepts(canEvaluate:true,verified:true))
    }
    func testLateAndBackgroundSuccessStayLocked() {
        XCTAssertFalse(AuthenticationGate.accepts(canEvaluate:true,verified:true,currentAttempt:false))
        XCTAssertFalse(AuthenticationGate.accepts(canEvaluate:true,verified:true,foreground:false))
    }
}
