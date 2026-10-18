import XCTest
@testable import CareActivityKit
final class ActivityPreferencesTests: XCTestCase {
    func testNormalizesOnlyKnownIDs() { XCTAssertEqual(ActivityPreferences.normalized(["breathing", "unknown", "breathing"]), ["breathing"]) }
    func testToggleRoundTrip() { XCTAssertEqual(ActivityPreferences.toggling("breathing", in: ActivityPreferences.toggling("breathing", in: [])), []) }
    func testUnknownFavoriteCannotBeAdded() { XCTAssertTrue(ActivityPreferences.toggling("unknown", in: []).isEmpty) }
    func testSearchAllWords() { XCTAssertTrue(ActivityPreferences.matches("Call about the appointment", query: "  APPOINTMENT call ")); XCTAssertFalse(ActivityPreferences.matches("appointment", query: "call appointment")) }
    func testEmptySearchMatches() { XCTAssertTrue(ActivityPreferences.matches("A note", query: " \n ")) }
}
