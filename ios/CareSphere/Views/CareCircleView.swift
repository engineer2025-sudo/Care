import SwiftUI

struct CareCircleView: View {
    @EnvironmentObject private var store: CareStore
    @State private var noteDraft = ""
    @State private var showingVisitPrep = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    localOnlyNotice
                    visitPrepCard
                    careNotes
                    todaySummary
                    medicationStatus
                    emergencyContact
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Care Circle")
            .inlineTitle()
        }
        .sheet(isPresented: $showingVisitPrep) {
            VisitPrepView()
                .environmentObject(store)
        }
    }

    private var localOnlyNotice: some View {
        SectionCard(title: "Private to this device", systemImage: "iphone.gen3") {
            Text("Care notes and check-ins are saved locally. This build has no family-sync, clinician portal, or push-alert server. Starter notes, if present, are sample content—not messages from real people.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var visitPrepCard: some View {
        SectionCard(title: "Prepare for a care visit", systemImage: "doc.text") {
            Text("Build a preview from only the local details you choose, then share it with the system share sheet. It is not a medical record or clinical interpretation.")
                .font(.caption).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            Button {
                showingVisitPrep = true
            } label: {
                Label("Choose information to include", systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var careNotes: some View {
        SectionCard(title: "Care notes · local only", systemImage: "square.and.pencil") {
            HStack(spacing: 10) {
                TextField("Add a private care note…", text: $noteDraft)
                    .textFieldStyle(.roundedBorder)
                    .font(.footnote)
                Button {
                    store.addNote(author: "You (\(store.displayName))", body: noteDraft)
                    noteDraft = ""
                    celebrate()
                } label: {
                    Image(systemName: "paperplane.fill")
                        .padding(10)
                }
                .buttonStyle(.borderedProminent)
                .disabled(noteDraft.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            ForEach(store.notes) { note in
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(note.author).font(.caption.weight(.bold))
                        Spacer()
                        Text(note.createdAt, style: .date).font(.caption2).foregroundStyle(.tertiary)
                    }
                    Text(note.body).font(.footnote).foregroundStyle(.secondary)
                    if let sentiment = note.sentiment {
                        HStack(spacing: 5) {
                            Text(TextInsightsService.emoji(for: sentiment))
                            StatusChip(text: TextInsightsService.label(for: sentiment),
                                       color: sentiment >= 0.35 ? .emerald : sentiment <= -0.35 ? .orange : .gray)
                            Text("on-device NLP").font(.caption2).foregroundStyle(.tertiary)
                        }
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }

    private var todaySummary: some View {
        SectionCard(title: "Today at a glance", systemImage: "chart.bar.fill") {
            VStack(alignment: .leading, spacing: 8) {
                insightRow("Routine check-ins", value: "\(store.routinesDone)/\(store.routines.count)", note: "marked complete today")
                insightRow("Emotion-match score", value: "\(store.emotionScore)", note: "local game score")
                insightRow(
                    "Medication check-ins",
                    value: store.configuredMedications.isEmpty ? "None" : store.medicationScheduleConfirmed ? "\(store.medsTaken)/\(store.configuredMedications.count)" : "Paused",
                    note: store.configuredMedications.isEmpty ? "no schedule entered" : store.medicationScheduleConfirmed ? "self-reported; no pharmacy integration" : "review saved schedule in Settings")
                insightRow("Mood check-in", value: store.moodToday.map { moodLabel($0.score) } ?? "Not recorded", note: "optional self-report")
            }
        }
    }

    private func insightRow(_ title: String, value: String, note: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline) {
                Text(title).font(.footnote).foregroundStyle(.secondary)
                Spacer(minLength: 8)
                Text(value).font(.footnote.weight(.heavy)).foregroundStyle(.primary)
            }
            Text(note).font(.caption2).foregroundStyle(.tertiary)
        }
    }

    private var medicationStatus: some View {
        SectionCard(title: "Medication status · today", systemImage: "pills.fill") {
            if store.configuredMedications.isEmpty {
                Text("No medication schedule is saved on this device.")
                    .font(.caption).foregroundStyle(.secondary)
            } else if !store.medicationScheduleConfirmed {
                Text("A saved schedule is paused until you review every name and time in Settings. No dose check-ins or reminders are active yet.")
                    .font(.caption).foregroundStyle(.secondary)
            } else {
                ForEach(store.configuredMedications) { medication in
                    HStack(spacing: 10) {
                        Image(systemName: medication.isTaken ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(medication.isTaken ? Color.emerald : Color.secondary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(medication.shortName).font(.footnote.weight(.semibold))
                            Text("Scheduled \(medication.timeLabel)")
                                .font(.caption2).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(medication.isTaken ? "Marked taken" : "Not marked")
                            .font(.caption2).foregroundStyle(.secondary)
                    }
                }
                Text("This reflects only the schedule and check-ins entered in CareSphere. It does not verify that a dose was taken.")
                    .font(.caption2).foregroundStyle(.tertiary)
            }
        }
    }

    private var emergencyContact: some View {
        SectionCard(title: "Emergency contact", systemImage: "person.crop.circle.badge.exclamationmark") {
            let contact = store.profile.emergencyContact
            if contact.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && contact.phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text("No emergency contact is set. Add one in Settings. The contact is stored on this device; CareSphere does not automatically notify them.")
                    .font(.caption).foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    if !contact.name.isEmpty {
                        Text(contact.name).font(.footnote.weight(.bold))
                    }
                    if !contact.phone.isEmpty {
                        let phoneForURL = contact.phone.filter { $0.isNumber || $0 == "+" }
                        if let phoneURL = URL(string: "tel:\(phoneForURL)") {
                            Link(contact.phone, destination: phoneURL)
                                .font(.footnote)
                        }
                    }
                    Text("Saved locally. Use SOS → Share SOS details to choose a messaging app and recipient.")
                        .font(.caption2).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func moodLabel(_ score: Int) -> String {
        ["Struggling", "Low", "Okay", "Good", "Great"][score - 1]
    }
}
