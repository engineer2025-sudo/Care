import Foundation

// MARK: - Domain models shared across the app.
// All user content persists locally in CareStore's protected Application Support JSON store.

struct Routine: Identifiable, Codable, Equatable {
    var id: UUID
    var emoji: String
    var title: String
    /// Local calendar day on which the routine was last checked off.
    var completedDay: String?

    /// Old routine stores only had a Boolean. Persist both fields during the
    /// transition, but treat completion as current-day state everywhere.
    var isDone: Bool {
        get { completedDay == CareTime.dayKey() }
        set { completedDay = newValue ? CareTime.dayKey() : nil }
    }

    init(id: UUID = UUID(), emoji: String, title: String, completedDay: String? = nil) {
        self.id = id
        self.emoji = emoji
        self.title = title
        self.completedDay = completedDay
    }

    private enum CodingKeys: String, CodingKey {
        case id, emoji, title, completedDay, isDone
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        id = try values.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        emoji = try values.decodeIfPresent(String.self, forKey: .emoji) ?? "✨"
        title = try values.decodeIfPresent(String.self, forKey: .title) ?? ""
        let legacyDone = try values.decodeIfPresent(Bool.self, forKey: .isDone) ?? false
        completedDay = try values.decodeIfPresent(String.self, forKey: .completedDay)
            ?? (legacyDone ? CareTime.dayKey() : nil)
    }

    func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        try values.encode(id, forKey: .id)
        try values.encode(emoji, forKey: .emoji)
        try values.encode(title, forKey: .title)
        try values.encodeIfPresent(completedDay, forKey: .completedDay)
        try values.encode(isDone, forKey: .isDone)
    }
}

struct Medication: Identifiable, Codable, Equatable {
    var id: UUID
    var name: String
    var purpose: String
    var hour: Int      // 24-hour clock
    var minute: Int
    /// Local calendar day on which the user last marked this reminder taken.
    var takenDay: String?

    /// A check-in expires at local midnight; it is never a verified dose record.
    var isTaken: Bool {
        get { takenDay == CareTime.dayKey() }
        set { takenDay = newValue ? CareTime.dayKey() : nil }
    }

    var timeLabel: String { CareTime.label(hour: hour, minute: minute) }
    var shortName: String { name.split(separator: " (").first.map(String.init) ?? name }

    init(id: UUID = UUID(), name: String, purpose: String, hour: Int, minute: Int, takenDay: String? = nil) {
        self.id = id
        self.name = name
        self.purpose = purpose
        self.hour = hour
        self.minute = minute
        self.takenDay = takenDay
    }

    private enum CodingKeys: String, CodingKey {
        case id, name, purpose, hour, minute, takenDay, isTaken
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        id = try values.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        name = try values.decodeIfPresent(String.self, forKey: .name) ?? ""
        purpose = try values.decodeIfPresent(String.self, forKey: .purpose) ?? ""
        hour = try values.decodeIfPresent(Int.self, forKey: .hour) ?? 8
        minute = try values.decodeIfPresent(Int.self, forKey: .minute) ?? 0
        let legacyTaken = try values.decodeIfPresent(Bool.self, forKey: .isTaken) ?? false
        takenDay = try values.decodeIfPresent(String.self, forKey: .takenDay)
            ?? (legacyTaken ? CareTime.dayKey() : nil)
    }

    func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        try values.encode(id, forKey: .id)
        try values.encode(name, forKey: .name)
        try values.encode(purpose, forKey: .purpose)
        try values.encode(hour, forKey: .hour)
        try values.encode(minute, forKey: .minute)
        try values.encodeIfPresent(takenDay, forKey: .takenDay)
        try values.encode(isTaken, forKey: .isTaken)
    }
}

struct CareNote: Identifiable, Codable, Equatable {
    var id = UUID()
    var author: String
    var body: String
    var createdAt: Date = Date()
    /// On-device NaturalLanguage sentiment score (-1...1) for journal insights.
    var sentiment: Double?
}

/// Care focus chosen during onboarding — personalizes the whole app.
enum CareMode: String, Codable, CaseIterable, Identifiable {
    case senior, autism, both
    var id: String { rawValue }
    var label: String {
        switch self {
        case .senior: return "Senior Care"
        case .autism: return "Autism Support"
        case .both: return "Both"
        }
    }
    var emoji: String {
        switch self {
        case .senior: return "🌿"
        case .autism: return "🧩"
        case .both: return "💚"
        }
    }
}

struct EmergencyContact: Codable, Equatable {
    var name: String = ""
    var phone: String = ""
    var isEmpty: Bool { name.trimmingCharacters(in: .whitespaces).isEmpty }
}

struct CareProfile: Codable, Equatable {
    var birthDate: Date? = nil
    var careMode: CareMode = .both
    var emergencyContact = EmergencyContact()
    var dailyStepGoal: Int = 6000

    /// Age in whole years (nil when birth date not provided).
    var age: Int? {
        guard let birthDate else { return nil }
        return Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year
    }
}

struct MoodEntry: Identifiable, Codable, Equatable {
    var id = UUID()
    var day: String        // yyyy-MM-dd (one entry per calendar day)
    var score: Int         // 1...5
    var createdAt: Date = Date()
}

/// Open Jitsi rooms shared by the native and web clients. CareSphere does not
/// host these calls or provide attendance, scheduling, or moderation services.
struct CoffeeCircle: Identifiable {
    let id: Int
    let title: String
    let emoji: String
    let schedule: String
    let room: String
    var url: URL { URL(string: "https://meet.jit.si/\(room)")! }
}

let coffeeCircles: [CoffeeCircle] = [
    CoffeeCircle(id: 1, title: "Morning Sunshine Tea & Chat", emoji: "☕",
                 schedule: "Open room · no schedule", room: "CareSphere-MorningSunshineTea-Room2026"),
    CoffeeCircle(id: 2, title: "Classic Movie Trivia & Memories", emoji: "🎬",
                 schedule: "Open room · no schedule", room: "CareSphere-ClassicMovieTrivia-Room2026"),
    CoffeeCircle(id: 3, title: "Gentle Stretching & Breathing", emoji: "🌿",
                 schedule: "Open room · no schedule", room: "CareSphere-GentleStretchBreathing-Room2026"),
]

enum CareTime {
    static func date(hour: Int, minute: Int) -> Date {
        var comps = DateComponents()
        comps.hour = hour
        comps.minute = minute
        return Calendar.current.date(from: comps) ?? Date()
    }

    static func hourMinute(from date: Date) -> (hour: Int, minute: Int) {
        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)
        return (comps.hour ?? 8, comps.minute ?? 0)
    }

    static func label(hour: Int, minute: Int) -> String {
        var comps = DateComponents()
        comps.hour = hour
        comps.minute = minute
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        if let date = Calendar.current.date(from: comps) {
            return formatter.string(from: date)
        }
        return String(format: "%02d:%02d", hour, minute)
    }

    static func dayKey(_ date: Date = Date()) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }
}
