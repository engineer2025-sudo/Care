import Foundation
import Combine
import UserNotifications

/// Single source of truth for user content. Persists care data to JSON in the
/// app's private Application Support directory. Network-backed features are opt-in and described
/// in their views; medication reminders are reconciled with iOS notifications.
@MainActor
final class CareStore: ObservableObject {

    // MARK: Persisted state
    @Published var displayName: String { didSet { save() } }
    @Published var voiceReminders: Bool { didSet { save() } }
    @Published var voiceIdentifier: String { didSet { save() } }
    @Published var routines: [Routine] { didSet { save() } }
    @Published var medications: [Medication] {
        didSet {
            // Names/times added or changed after confirmation need a fresh review.
            // Taken-state changes alone do not invalidate the schedule.
            if Self.medicationScheduleSignature(oldValue) != Self.medicationScheduleSignature(medications),
               medicationScheduleConfirmed {
                medicationScheduleConfirmed = false
            } else {
                save()
                syncMedicationReminders()
            }
        }
    }
    @Published var medicationScheduleConfirmed: Bool {
        didSet {
            save()
            syncMedicationReminders()
        }
    }
    @Published var notes: [CareNote] { didSet { save() } }
    @Published var moods: [MoodEntry] { didSet { save() } }
    @Published var emotionScore: Int { didSet { save() } }
    @Published var bestPattern: Int { didSet { save() } }

    // MARK: v2 — onboarding, profile & security
    @Published var hasCompletedOnboarding: Bool { didSet { save() } }
    @Published var biometricEnabled: Bool { didSet { save() } }
    @Published var profile: CareProfile { didSet { save() } }
    @Published private(set) var persistenceIssue: String?

    private let fileURL: URL
    private var observers: [NSObjectProtocol] = []
    private var isErasingLocalData = false

    // MARK: Init / persistence

    init() {
        fileURL = Self.careStoreURL()

        let box = Self.load(from: fileURL)
        displayName = box?.displayName ?? "Alex"
        voiceReminders = box?.voiceReminders ?? false
        voiceIdentifier = box?.voiceIdentifier ?? ""
        routines = box?.routines ?? [
            Routine(emoji: "💧", title: "Morning hydration"),
            Routine(emoji: "🧩", title: "10-minute brain game"),
            Routine(emoji: "☕", title: "Join a coffee circle"),
            Routine(emoji: "🌿", title: "Evening stretch & wind-down"),
        ]
        // Never prefill medication names or times. Fresh users configure only
        // their own schedule during onboarding; no demo drug creates reminders.
        medications = box?.medications ?? []
        // Older stores did not carry an explicit confirmation. Preserve their
        // saved data, but pause its reminders until the user reviews it.
        medicationScheduleConfirmed = box?.medicationScheduleConfirmed ?? false
        notes = box?.notes ?? []
        moods = box?.moods ?? []
        emotionScore = box?.emotionScore ?? 0
        bestPattern = box?.bestPattern ?? 0
        hasCompletedOnboarding = box?.hasCompletedOnboarding ?? false
        biometricEnabled = box?.biometricEnabled ?? false
        profile = box?.profile ?? CareProfile()

        protectStoreDirectory()
        protectExistingStoreFile()
        // Persist decoded legacy Boolean check-ins as day-keyed values so a
        // later app launch cannot migrate yesterday's checkmark into today.
        if box != nil { save() }
        observeNotificationActions()
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    /// Keep private care data in the app-support container. Migrate the legacy
    /// Documents file once so existing users retain their notes and schedules.
    private static func careStoreURL() -> URL {
        let manager = FileManager.default
        let support = manager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("CareSphere", isDirectory: true)
        try? manager.createDirectory(
            at: support,
            withIntermediateDirectories: true,
            attributes: [.posixPermissions: 0o700])
        try? manager.setAttributes([.posixPermissions: 0o700], ofItemAtPath: support.path)

        let destination = support.appendingPathComponent("carestore.json")
        let legacy = manager.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("carestore.json")
        if !manager.fileExists(atPath: destination.path), manager.fileExists(atPath: legacy.path) {
            do {
                try manager.moveItem(at: legacy, to: destination)
            } catch {
                do {
                    try manager.copyItem(at: legacy, to: destination)
                    try manager.removeItem(at: legacy)
                } catch {
                    // Keep reading the legacy file rather than hiding the user's data.
                    return legacy
                }
            }
        }
        return destination
    }

    private static func load(from url: URL) -> PersistedBox? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(PersistedBox.self, from: data)
    }

    private func persistedBox() -> PersistedBox {
        PersistedBox(
            displayName: displayName,
            voiceReminders: voiceReminders,
            voiceIdentifier: voiceIdentifier.isEmpty ? nil : voiceIdentifier,
            routines: routines,
            medications: medications,
            medicationScheduleConfirmed: medicationScheduleConfirmed,
            notes: notes,
            moods: moods,
            emotionScore: emotionScore,
            bestPattern: bestPattern,
            hasCompletedOnboarding: hasCompletedOnboarding,
            biometricEnabled: biometricEnabled,
            profile: profile)
    }

    private func save() {
        guard !isErasingLocalData else { return }
        do {
            let data = try JSONEncoder().encode(persistedBox())
            try writePrivateFile(data, to: fileURL)
            persistenceIssue = nil
            protectStoreDirectory()
        } catch {
            persistenceIssue = "CareSphere could not save your care data to protected app storage."
        }
    }

    private func protectStoreDirectory() {
        #if os(macOS)
        let expectedDirectory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("CareSphere", isDirectory: true)
        guard fileURL.deletingLastPathComponent().standardizedFileURL == expectedDirectory.standardizedFileURL else {
            return // A migration fallback may still be reading Documents; never chmod that whole folder.
        }
        do {
            try FileManager.default.setAttributes(
                [.posixPermissions: 0o700],
                ofItemAtPath: expectedDirectory.path)
        } catch {
            persistenceIssue = "CareSphere could not restrict access to its private data folder."
        }
        #endif
    }

    private func protectExistingStoreFile() {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        do {
            #if os(iOS)
            try FileManager.default.setAttributes(
                [.protectionKey: FileProtectionType.complete],
                ofItemAtPath: fileURL.path)
            #else
            try FileManager.default.setAttributes(
                [.posixPermissions: 0o600],
                ofItemAtPath: fileURL.path)
            #endif
        } catch {
            persistenceIssue = "CareSphere could not apply its private file-protection settings."
        }
    }

    private func writePrivateFile(_ data: Data, to url: URL) throws {
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtection])
        #else
        try data.write(to: url, options: .atomic)
        try FileManager.default.setAttributes(
            [.posixPermissions: 0o600],
            ofItemAtPath: url.path)
        #endif
    }

    private struct CareDataExport: Encodable {
        let app = "CareSphere"
        let formatVersion = 1
        let exportedAt: Date
        let privacyNotice = "Contains sensitive personal and health-related information. Share only with people you trust."
        let data: PersistedBox
    }

    /// Returns a complete, user-initiated JSON snapshot for the system file exporter.
    func makeCareDataExport() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(CareDataExport(exportedAt: Date(), data: persistedBox()))
    }

    /// Removes private care data and pending medication notifications. System
    /// notification permission and separately downloaded reference/model files remain.
    func eraseAllLocalCareData() {
        isErasingLocalData = true
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()

        medicationScheduleConfirmed = false
        medications = []
        displayName = "Alex"
        voiceReminders = false
        voiceIdentifier = ""
        routines = [
            Routine(emoji: "💧", title: "Morning hydration"),
            Routine(emoji: "🧩", title: "10-minute brain game"),
            Routine(emoji: "☕", title: "Join a coffee circle"),
            Routine(emoji: "🌿", title: "Evening stretch & wind-down"),
        ]
        notes = []
        moods = []
        emotionScore = 0
        bestPattern = 0
        hasCompletedOnboarding = false
        biometricEnabled = false
        profile = CareProfile()
        isErasingLocalData = false

        do {
            try FileManager.default.removeItem(at: fileURL)
            persistenceIssue = nil
        } catch {
            persistenceIssue = FileManager.default.fileExists(atPath: fileURL.path)
                ? "CareSphere could not fully remove its local care-data file."
                : nil
        }
    }

    private struct PersistedBox: Codable {
        var displayName: String
        var voiceReminders: Bool
        // Optional so existing v1/v2 carestore.json files continue to decode.
        var voiceIdentifier: String?
        var routines: [Routine]
        var medications: [Medication]
        // Optional so pre-confirmation stores decode safely; legacy schedules default paused.
        var medicationScheduleConfirmed: Bool?
        var notes: [CareNote]
        var moods: [MoodEntry]
        var emotionScore: Int
        var bestPattern: Int
        // v2 fields decode as nil from v1 files and fall back to defaults.
        var hasCompletedOnboarding: Bool?
        var biometricEnabled: Bool?
        var profile: CareProfile?
    }

    // MARK: Derived values

    var routinesDone: Int { routines.filter(\.isDone).count }
    var configuredMedications: [Medication] {
        medications.filter { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
    var medsTaken: Int {
        medicationScheduleConfirmed ? configuredMedications.filter(\.isTaken).count : 0
    }
    var nextDueMedication: Medication? {
        guard medicationScheduleConfirmed else { return nil }
        return configuredMedications
            .filter { !$0.isTaken }
            .min { ($0.hour, $0.minute) < ($1.hour, $1.minute) }
    }

    /// Reconciles persisted notification requests on app launch, including
    /// removing legacy reminders when a saved schedule still needs review.
    func refreshMedicationReminders() {
        syncMedicationReminders()
    }

    private func syncMedicationReminders() {
        NotificationService.shared.syncMedicationReminders(
            medicationScheduleConfirmed ? configuredMedications : [])
    }

    private static func medicationScheduleSignature(_ medications: [Medication]) -> String {
        medications
            .filter { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .sorted { $0.id.uuidString < $1.id.uuidString }
            .map { "\($0.id.uuidString)|\($0.name)|\($0.purpose)|\($0.hour)|\($0.minute)" }
            .joined(separator: "\\n")
    }
    var moodToday: MoodEntry? { moods.first { $0.day == CareTime.dayKey() } }

    /// Personalized greeting line based on age + care focus.
    var personalizedTagline: String {
        var parts: [String] = []
        if let age = profile.age { parts.append("\(age) years young") }
        parts.append("focused on \(profile.careMode.label.lowercased())")
        return parts.joined(separator: " · ")
    }

    // MARK: Mutations

    func toggleRoutine(_ routine: Routine) {
        if let index = routines.firstIndex(where: { $0.id == routine.id }) {
            routines[index].isDone.toggle()
        }
    }

    /// Add a small, predictable user-defined routine to today's checklist.
    func addRoutine(title: String, emoji: String = "✨") {
        let cleanedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanedTitle.isEmpty, routines.count < 24 else { return }
        let cleanedEmoji = emoji.trimmingCharacters(in: .whitespacesAndNewlines)
        routines.append(Routine(
            emoji: String((cleanedEmoji.isEmpty ? "✨" : cleanedEmoji).prefix(2)),
            title: String(cleanedTitle.prefix(80))))
    }

    func removeRoutine(id: UUID) {
        routines.removeAll { $0.id == id }
    }

    func toggleMedication(_ medication: Medication) {
        guard medicationScheduleConfirmed else { return }
        if let index = medications.firstIndex(where: { $0.id == medication.id }) {
            medications[index].isTaken.toggle()
        }
    }

    func takeMedication(id: UUID) {
        guard medicationScheduleConfirmed else { return }
        if let index = medications.firstIndex(where: { $0.id == id }), !medications[index].isTaken {
            medications[index].isTaken = true
        }
    }

    func snoozeMedication(id: UUID) {
        guard medicationScheduleConfirmed,
              let med = medications.first(where: { $0.id == id }) else { return }
        let content = UNMutableNotificationContent()
        content.title = "💊 Snoozed: \(med.shortName)"
        content.body = "Reminder for \(med.timeLabel) snoozed 10 minutes."
        content.sound = .default
        content.categoryIdentifier = "MED_DOSE"
        content.userInfo = ["medId": med.id.uuidString]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 600, repeats: false)
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: "med-snooze-\(med.id.uuidString)", content: content, trigger: trigger))
    }

    func setMood(score: Int) {
        let key = CareTime.dayKey()
        if let index = moods.firstIndex(where: { $0.day == key }) {
            moods[index].score = score
        } else {
            moods.append(MoodEntry(day: key, score: score))
        }
    }

    func addNote(author: String, body: String) {
        guard !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        notes.insert(
            CareNote(author: author, body: trimmed, sentiment: TextInsightsService.sentimentScore(for: trimmed)),
            at: 0)
    }

    // MARK: Notification-action plumbing (✓ Taken / Snooze from lock screen)

    private func observeNotificationActions() {
        observers.append(NotificationCenter.default.addObserver(
            forName: .careSphereTakeMed, object: nil, queue: .main) { [weak self] note in
                guard let idString = note.userInfo?["medId"] as? String,
                      let uuid = UUID(uuidString: idString) else { return }
                Task { @MainActor in self?.takeMedication(id: uuid) }
            })
        observers.append(NotificationCenter.default.addObserver(
            forName: .careSphereSnoozeMed, object: nil, queue: .main) { [weak self] note in
                guard let idString = note.userInfo?["medId"] as? String,
                      let uuid = UUID(uuidString: idString) else { return }
                Task { @MainActor in self?.snoozeMedication(id: uuid) }
            })
    }
}
