import Foundation

public struct SosLocation: Equatable {
    public let latitude: Double
    public let longitude: Double
    public let recordedAt: String

    public init(latitude: Double, longitude: Double, recordedAt: String) {
        self.latitude = latitude
        self.longitude = longitude
        self.recordedAt = recordedAt
    }
}

/// Shared SOS wording plus the Apple Shortcuts hand-off. Apple does not let an app
/// send a text silently, so the person creates one Shortcut and CareSphere runs it.
public enum SosMessage {
    public static let shortcutName = "CareSphere SOS"

    public static func compose(displayName: String, location: SosLocation? = nil) -> String {
        let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        var message = name.isEmpty
            ? "CareSphere SOS: I am requesting help. Please check in now."
            : "CareSphere SOS: \(name) is requesting help. Please check in now."
        if let location {
            message += " Location recorded at \(location.recordedAt): https://www.google.com/maps?q=\(location.latitude),\(location.longitude)"
        }
        return message
    }

    public static func shortcutURL(message: String, name: String = shortcutName) -> URL? {
        var components = URLComponents()
        components.scheme = "shortcuts"
        components.host = "run-shortcut"
        components.queryItems = [
            URLQueryItem(name: "name", value: name),
            URLQueryItem(name: "input", value: "text"),
            URLQueryItem(name: "text", value: message)
        ]
        return components.url
    }

    public static func dialURL(phone: String) -> URL? {
        let trimmed = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        let digits = trimmed.filter { $0.isNumber }
        guard digits.count >= 7 else { return nil }
        let prefix = trimmed.hasPrefix("+") ? "+" : ""
        return URL(string: "tel:\(prefix)\(digits)")
    }

    public static func setupSteps(contactName: String) -> [String] {
        [
            "Open Shortcuts and create a new shortcut.",
            "Add Send Message, choose \(contactName), and set the message to Shortcut Input.",
            "Turn off Show When Run, name the shortcut CareSphere SOS, and save it."
        ]
    }
}
