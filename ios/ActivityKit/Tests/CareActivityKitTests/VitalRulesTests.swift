import XCTest
@testable import CareActivityKit

final class VitalRulesTests: XCTestCase {
    func testBloodPressureBounds() {
        XCTAssertTrue(VitalRules.valid(kind: "bp", first: 120, second: 80))
        XCTAssertTrue(VitalRules.valid(kind: "bp", first: 1, second: 1))
        XCTAssertTrue(VitalRules.valid(kind: "bp", first: 400, second: 300))
        XCTAssertFalse(VitalRules.valid(kind: "bp", first: 0, second: 80))
        XCTAssertFalse(VitalRules.valid(kind: "bp", first: 401, second: 80))
        XCTAssertFalse(VitalRules.valid(kind: "bp", first: 120, second: 0))
        XCTAssertFalse(VitalRules.valid(kind: "bp", first: 120, second: 301))
        XCTAssertFalse(VitalRules.valid(kind: "bp", first: 80, second: 120))
        XCTAssertFalse(VitalRules.valid(kind: "bp", first: 120, second: nil))
    }

    func testOxygenBoundsAndSingleValue() {
        XCTAssertTrue(VitalRules.valid(kind: "oxygen", first: 98, second: nil))
        XCTAssertTrue(VitalRules.valid(kind: "oxygen", first: 1, second: nil))
        XCTAssertTrue(VitalRules.valid(kind: "oxygen", first: 100, second: nil))
        XCTAssertFalse(VitalRules.valid(kind: "oxygen", first: 0, second: nil))
        XCTAssertFalse(VitalRules.valid(kind: "oxygen", first: 101, second: nil))
        XCTAssertFalse(VitalRules.valid(kind: "oxygen", first: 98, second: 40))
    }

    func testUnknownKindsRejected() {
        XCTAssertFalse(VitalRules.valid(kind: "heart", first: 120, second: 80))
        XCTAssertFalse(VitalRules.valid(kind: "", first: 120, second: 80))
    }
}
