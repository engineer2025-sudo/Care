import XCTest
@testable import CareActivityKit

final class SosMessageTests: XCTestCase {
    func testAnonymousMessageMatchesTheOtherPlatforms() {
        XCTAssertEqual(
            SosMessage.compose(displayName: "   "),
            "CareSphere SOS: I am requesting help. Please check in now."
        )
    }

    func testDisplayNameIsUsedWhenPresent() {
        XCTAssertEqual(
            SosMessage.compose(displayName: " Jamie "),
            "CareSphere SOS: Jamie is requesting help. Please check in now."
        )
    }

    func testLocationAddsTimeAndMapsLink() {
        let message = SosMessage.compose(
            displayName: "Jamie",
            location: SosLocation(latitude: 37.12345, longitude: -122.54321, recordedAt: "3:42 PM")
        )
        XCTAssertTrue(message.hasSuffix("Location recorded at 3:42 PM: https://www.google.com/maps?q=37.12345,-122.54321"))
    }

    func testShortcutURLCarriesTheMessageAsTextInput() throws {
        let message = SosMessage.compose(displayName: "Jamie")
        let url = SosMessage.shortcutURL(message: message)
        XCTAssertEqual(url?.scheme, "shortcuts")
        XCTAssertEqual(url?.host, "run-shortcut")
        let components = URLComponents(url: try XCTUnwrap(url), resolvingAgainstBaseURL: false)
        let items = Dictionary(uniqueKeysWithValues: (components?.queryItems ?? []).map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(items["name"], "CareSphere SOS")
        XCTAssertEqual(items["input"], "text")
        XCTAssertEqual(items["text"], message)
    }

    func testSetupStepsNameTheContact() {
        let steps = SosMessage.setupSteps(contactName: "Sam")
        XCTAssertEqual(steps.count, 3)
        XCTAssertTrue(steps[1].contains("Sam"))
        XCTAssertTrue(steps[2].contains("CareSphere SOS"))
    }
}
