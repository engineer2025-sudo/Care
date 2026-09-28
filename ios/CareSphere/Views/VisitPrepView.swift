import SwiftUI

/// Local, user-selected visit-preparation text. This is not an official record,
/// diagnosis, or clinical interpretation; sharing occurs only after user action.
struct VisitPrepView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore

    @State private var includeName = false
    @State private var includeMedications = false
    @State private var includeMoods = false
    @State private var includeNotes = false
    @State private var lookbackDays = 30
    @State private var questions = ""

    private var cutoff: Date? {
        guard lookbackDays > 0 else { return nil }
        return Calendar.current.date(byAdding: .day, value: -lookbackDays, to: Date())
    }

    private var selectedMoods: [MoodEntry] {
        store.moods
            .filter { mood in cutoff.map { cutoffDate in cutoffDate <= mood.createdAt } ?? true }
            .sorted { $0.createdAt < $1.createdAt }
    }

    private var selectedNotes: [CareNote] {
        store.notes
            .filter { note in cutoff.map { cutoffDate in cutoffDate <= note.createdAt } ?? true }
            .sorted { $0.createdAt > $1.createdAt }
    }

    private var hasSelectedContent: Bool {
        includeName || includeMedications || includeMoods || includeNotes || !questions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var brief: String {
        var lines = [
            "CareSphere · Visit preparation brief",
            "Prepared: \(Date().formatted(date: .abbreviated, time: .shortened))",
            "User-prepared information only. This is not a verified medical record, diagnosis, or clinical interpretation.",
            "",
        ]

        if includeName {
            lines.append("Display name: \(store.displayName.isEmpty ? "Not entered" : store.displayName)")
            lines.append("")
        }
        if includeMedications {
            lines.append("MEDICATION REMINDERS (user-entered; not pharmacy-verified)")
            lines.append("Schedule reviewed in CareSphere: \(store.medicationScheduleConfirmed ? "Yes" : "No — schedule is unconfirmed and reminders are paused.")")
            if store.configuredMedications.isEmpty {
                lines.append("No medication reminders are saved.")
            } else {
                for medication in store.configuredMedications {
                    let status = store.medicationScheduleConfirmed
                        ? (medication.isTaken ? "marked taken by user" : "not marked taken")
                        : "not reviewed"
                    lines.append("- \(medication.name) · \(medication.timeLabel) · \(status)")
                }
            }
            lines.append("")
        }
        if includeMoods {
            lines.append("MOOD CHECK-INS (optional self-reports; not a clinical measure)")
            if selectedMoods.isEmpty {
                lines.append("No mood check-ins in the selected period.")
            } else {
                for mood in selectedMoods {
                    lines.append("- \(mood.createdAt.formatted(date: .abbreviated, time: .omitted)) · \(Self.moodLabel(mood.score))")
                }
            }
            lines.append("")
        }
        if includeNotes {
            lines.append("CARE NOTES (user-entered; not clinician-verified)")
            if selectedNotes.isEmpty {
                lines.append("No care notes in the selected period.")
            } else {
                for note in selectedNotes {
                    lines.append("- \(note.createdAt.formatted(date: .abbreviated, time: .shortened)) · \(note.author): \(note.body)")
                }
            }
            lines.append("")
        }
        if !questions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            lines.append("QUESTIONS OR TOPICS I WANT TO DISCUSS")
            lines.append(questions.trimmingCharacters(in: .whitespacesAndNewlines))
            lines.append("")
        }
        return lines.joined(separator: "\n")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Choose what to include") {
                    Toggle("Display name", isOn: $includeName)
                    Toggle("Medication reminders", isOn: $includeMedications)
                    Toggle("Mood check-ins", isOn: $includeMoods)
                    Toggle("Care notes", isOn: $includeNotes)
                    if includeMoods || includeNotes {
                        Picker("Look back", selection: $lookbackDays) {
                            Text("7 days").tag(7)
                            Text("30 days").tag(30)
                            Text("90 days").tag(90)
                            Text("All saved").tag(0)
                        }
                    }
                    Text("Selections are off by default. The date range applies to notes and mood self-reports; the current medication schedule is shown only if you choose it.")
                        .font(.caption2).foregroundStyle(.secondary)
                }

                Section("Questions or topics · optional") {
                    TextField("Write a question to discuss", text: $questions, axis: .vertical)
                        .lineLimit(3...6)
                        .onChange(of: questions) { newValue in
                            if newValue.count > 1200 { questions = String(newValue.prefix(1200)) }
                        }
                    Text("This draft stays in memory until you close this screen. It is not saved in your journal.")
                        .font(.caption2).foregroundStyle(.secondary)
                }

                Section("Exact share preview") {
                    Text(brief)
                        .font(.system(.caption2, design: .monospaced))
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Section {
                    ShareLink(item: brief) {
                        Label("Share selected brief…", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .disabled(!hasSelectedContent)
                    Text("CareSphere makes no network request to build this preview. The system share sheet opens only when you tap Share; review the destination before sending.")
                        .font(.caption2).foregroundStyle(.secondary)
                }

                Section("Limitations") {
                    Text("This prototype includes only the selected local profile name, user-entered medication reminders, mood self-reports, notes, and your questions. It does not include HealthKit readings, a clinician-verified medication list, or simulated vitals, and it does not provide diagnosis or treatment advice.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Visit preparation")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private static func moodLabel(_ score: Int) -> String {
        switch score {
        case 1: return "Struggling"
        case 2: return "Low"
        case 3: return "Okay"
        case 4: return "Good"
        case 5: return "Great"
        default: return "Score \(score)"
        }
    }
}
