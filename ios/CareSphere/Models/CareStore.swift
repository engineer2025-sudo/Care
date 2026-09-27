import Foundation
import Combine
import UserNotifications

/// Single source of truth for user content. Persists care data to JSON in the
/// app's Documents directory. Network-backed features are opt-in and described
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

    private let fileURL: URL
    private var observers: [NSObjectProtocol] = []

    // MARK: Init / persistence

    init() {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        fileURL = documents.appendingPathComponent("carestore.json")

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
        notes = box?.notes ?? [
            CareNote(author: "Sample note · replace with your own",
                     body: "Example only: a user could record a care-team update here. No clinician has reviewed this entry."),
            CareNote(author: "Sample family note · local demo",
                     body: "Example only: notes stay on this device and are not shared with family or a clinician."),
        ]
        moods = box?.moods ?? []
        emotionScore = box?.emotionScore ?? 0
        bestPattern = box?.bestPattern ?? 0
        hasCompletedOnboarding = box?.hasCompletedOnboarding ?? false
        biometricEnabled = box?.biometricEnabled ?? false
        profile = box?.profile ?? CareProfile()

        observeNotificationActions()
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    private static func load(from url: URL) -> PersistedBox? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(PersistedBox.self, from: data)
    }

    private func save() {
        let box = PersistedBox(
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
        if let data = try? JSONEncoder().encode(box) {
            try? data.write(to: fileURL, options: .atomic)
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
