import AppIntents
import Foundation

enum CareSphereShortcutRoute {
    static let storageKey = "CareSphere.PendingShortcutRoute"
    private static let allowedRoutes: Set<String> = ["today", "activities", "breathing", "mood", "visit-prep"]

    static func store(_ route: String) {
        guard allowedRoutes.contains(route) else { return }
        UserDefaults.standard.set(route, forKey: storageKey)
    }

    static func pending() -> String? {
        guard let route = UserDefaults.standard.string(forKey: storageKey),
              allowedRoutes.contains(route) else { return nil }
        return route
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: storageKey)
    }
}

struct OpenCareSphereTodayIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Today in CareSphere"
    static var description = IntentDescription("Open your CareSphere Today screen.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        CareSphereShortcutRoute.store("today")
        return .result()
    }
}

struct OpenCareSphereActivitiesIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Activities in CareSphere"
    static var description = IntentDescription("Browse your saved and available CareSphere activities.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        CareSphereShortcutRoute.store("activities")
        return .result()
    }
}

struct OpenCareSphereBreathingIntent: AppIntent {
    static var title: LocalizedStringResource = "Open a Breathing Pause"
    static var description = IntentDescription("Open the optional breathing activity in CareSphere. The breathing guide starts only when you tap Start.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        CareSphereShortcutRoute.store("breathing")
        return .result()
    }
}

struct OpenCareSphereMoodCheckInIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Mood Check-In"
    static var description = IntentDescription("Open CareSphere at the optional mood check-in. No mood is recorded by Siri.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        CareSphereShortcutRoute.store("mood")
        return .result()
    }
}

struct OpenCareSphereVisitPrepIntent: AppIntent {
    static var title: LocalizedStringResource = "Prepare for a Care Visit"
    static var description = IntentDescription("Open CareSphere visit preparation so you can select and review what to include.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        CareSphereShortcutRoute.store("visit-prep")
        return .result()
    }
}

struct CareSphereAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenCareSphereTodayIntent(),
            phrases: ["Open Today in \(.applicationName)", "Show my day in \(.applicationName)"],
            shortTitle: "Open Today",
            systemImageName: "sun.max")
        AppShortcut(
            intent: OpenCareSphereActivitiesIntent(),
            phrases: ["Open activities in \(.applicationName)", "Show activities in \(.applicationName)"],
            shortTitle: "Activities",
            systemImageName: "square.grid.2x2")
        AppShortcut(
            intent: OpenCareSphereBreathingIntent(),
            phrases: ["Open paced breathing in \(.applicationName)", "Show a breathing pause in \(.applicationName)"],
            shortTitle: "Breathing Pause",
            systemImageName: "wind")
        AppShortcut(
            intent: OpenCareSphereMoodCheckInIntent(),
            phrases: ["Open my mood check-in in \(.applicationName)", "Check in with my mood in \(.applicationName)"],
            shortTitle: "Mood Check-In",
            systemImageName: "face.smiling")
        AppShortcut(
            intent: OpenCareSphereVisitPrepIntent(),
            phrases: ["Prepare for a visit in \(.applicationName)", "Open visit preparation in \(.applicationName)"],
            shortTitle: "Visit Preparation",
            systemImageName: "doc.text")
    }
}
