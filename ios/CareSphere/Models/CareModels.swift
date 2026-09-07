import Foundation

// MARK: - Domain models shared across the app.
// All user content persists locally (JSON in the app's Documents directory).

struct Routine: Identifiable, Codable, Equatable {
    var id = UUID()
    var emoji: String
    var title: String
    var isDone: Bool = false
}

struct Medication: Identifiable, Codable, Equatable {
    var id = UUID()
    var name: String
    var purpose: String
    var hour: Int      // 24-hour clock
    var minute: Int
    var isTaken: Bool = false

    var timeLabel: String { CareTime.label(hour: hour, minute: minute) }
    var shortName: String { name.split(separator: " (").first.map(String.init) ?? name }
}

struct CareNote: Identifiable, Codable, Equatable {
    var id = UUID()
    var author: String
    var body: String
    var createdAt: Date = Date()
}

struct MoodEntry: Identifiable, Codable, Equatable {
    var id = UUID()
    var day: String        // yyyy-MM-dd (one entry per calendar day)
    var score: Int         // 1...5
    var createdAt: Date = Date()
}

/// Real, open Jitsi Meet rooms — the same rooms the web app joins, so family
/// on Android/web and seniors on iPhone end up in the same video call.
struct CoffeeCircle: Identifiable {
    let id: Int
    let title: String
    let emoji: String
    let schedule: String
    let host: String
    let participants: Int
    let room: String
    var url: URL { URL(string: "https://meet.jit.si/\(room)")! }
}

let coffeeCircles: [CoffeeCircle] = [
    CoffeeCircle(id: 1, title: "Morning Sunshine Tea & Chat", emoji: "☕",
                 schedule: "Live now", host: "Sarah M. (Volunteer)",
                 participants: 8, room: "CareSphere-MorningSunshineTea-Room2026"),
    CoffeeCircle(id: 2, title: "Classic Movie Trivia & Memories", emoji: "🎬",
                 schedule: "2:00 PM today", host: "David K. (Activity Lead)",
                 participants: 12, room: "CareSphere-ClassicMovieTrivia-Room2026"),
    CoffeeCircle(id: 3, title: "Gentle Stretching & Breathing", emoji: "🌿",
                 schedule: "4:30 PM today", host: "Elena R. (Wellness Coach)",
                 participants: 10, room: "CareSphere-GentleStretchBreathing-Room2026"),
]

enum CareTime {
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
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
