import Foundation
import Combine
import UserNotifications

/// Single source of truth for user content. Persists to JSON in Documents —
/// nothing leaves the device. Syncs medication reminders into the system
/// notification center whenever a dose changes.
@MainActor
final class CareStore: ObservableObject {

    // MARK: Persisted state
    @Published var displayName: String { didSet { save() } }
    @Published var voiceReminders: Bool { didSet { save() } }
    @Published var routines: [Routine] { didSet { save() } }
    @Published var medications: [Medication] {
        didSet {
            save()
            NotificationService.shared.syncMedicationReminders(medications)
        }
    }
    @Published var notes: [CareNote] { didSet { save() } }
    @Published var moods: [MoodEntry] { didSet { save() } }
    @Published var emotionScore: Int { didSet { save() } }
    @Published var bestPattern: Int { didSet { save() } }

    private let fileURL: URL
    private var observers: [NSObjectProtocol] = []

    // MARK: Init / persistence

    init() {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        fileURL = documents.appendingPathComponent("carestore.json")

        let saved = Self.load(from: fileURL)
        displayName = saved?.displayName ?? "Alex"
        voiceReminders = saved?.voiceReminders ?? false
        routines = saved?.routines ?? [
            Routine(emoji: "💧", title: "Morning hydration"),
            Routine(emoji: "🧩", title: "10-minute brain game"),
            Routine(emoji: "☕", title: "Join a coffee circle"),
            Routine(emoji: "🌿", title: "Evening stretch & wind-down"),
        ]
        medications = saved?.medications ?? [
            Medication(name: "Lisinopril", purpose: "Blood pressure", hour: 8, minute: 0),
            Medication(name: "Vitamin D3", purpose: "Bone health", hour: 12, minute: 30),
            Medication(name: "Donepezil", purpose: "Memory support", hour: 20, minute: 0),
        ]
        notes = saved?.notes ?? [
            CareNote(author: "Dr. Evelyn Vance (PCP)",
                     body: "BP stable at 122/78. Continue morning walks and current dose."),
            CareNote(author: "Sarah M. (daughter)",
                     body: "Alex completed 3 emotion-recognition sessions — engagement is way up!"),
        ]
        moods = saved?.moods ?? []
        emotionScore = saved?.emotionScore ?? 0
        bestPattern = saved?.bestPattern ?? 0

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
            routines: routines,
            medications: medications,
            notes: notes,
            moods: moods,
            emotionScore: emotionScore,
            bestPattern: bestPattern)
        if let data = try? JSONEncoder().encode(box) {
            try? data.write(to: fileURL, options: .atomic)
        }
    }

    private struct PersistedBox: Codable {
        var displayName: String
        var voiceReminders: Bool
        var routines: [Routine]
        var medications: [Medication]
        var notes: [CareNote]
        var moods: [MoodEntry]
        var emotionScore: Int
        var bestPattern: Int
    }

    // MARK: Derived values

    var routinesDone: Int { routines.filter(\.isDone).count }
    var medsTaken: Int { medications.filter(\.isTaken).count }
    var nextDueMedication: Medication? {
        medications
            .filter { !$0.isTaken }
            .min { ($0.hour, $0.minute) < ($1.hour, $1.minute) }
    }
    var moodToday: MoodEntry? { moods.first { $0.day == CareTime.dayKey() } }

    // MARK: Mutations

    func toggleRoutine(_ routine: Routine) {
        if let index = routines.firstIndex(where: { $0.id == routine.id }) {
            routines[index].isDone.toggle()
        }
    }

    func toggleMedication(_ medication: Medication) {
        if let index = medications.firstIndex(where: { $0.id == medication.id }) {
            medications[index].isTaken.toggle()
        }
    }

    func takeMedication(id: UUID) {
        if let index = medications.firstIndex(where: { $0.id == id }), !medications[index].isTaken {
            medications[index].isTaken = true
        }
    }

    func snoozeMedication(id: UUID) {
        guard let med = medications.first(where: { $0.id == id }) else { return }
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
        notes.insert(CareNote(author: author, body: body.trimmingCharacters(in: .whitespacesAndNewlines)), at: 0)
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
