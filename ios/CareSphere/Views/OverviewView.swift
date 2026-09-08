import SwiftUI

struct OverviewView: View {
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var notifications: NotificationService
    @EnvironmentObject private var bluetooth: BluetoothHeartRateService

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 18 { return "Good afternoon" }
        return "Good evening"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    hero
                    metricsGrid
                    moodCheckIn
                    #if os(iOS)
                    stepsCard
                    #endif
                    routinesCard
                    medicationsCard
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Overview")
            .inlineTitle()
            .onAppear {
                if notifications.authorizationStatus == .authorized {
                    NotificationService.shared.syncMedicationReminders(store.medications)
                }
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("\(greeting), \(store.displayName)", systemImage: "sparkles")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.emerald)
            Text("Connected care for independent living")
                .font(.title2.weight(.heavy))
            Text("Live Apple Health & Bluetooth vitals, one-tap Jitsi coffee circles, and sensory therapy games — with family one tap away.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            if !store.personalizedTagline.isEmpty {
                Text(store.personalizedTagline)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Color.emerald)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            LinearGradient(colors: [.teal.opacity(0.35), .emerald.opacity(0.18)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var metricsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            BigMetricButton(title: "\(store.routinesDone)/\(store.routines.count)", subtitle: "Routine done today") {
                Image(systemName: "checklist").foregroundStyle(Color.emerald)
            } action: {}
            BigMetricButton(title: bluetooth.bpm.map { "\($0) bpm" } ?? "Not paired", subtitle: "Heart-rate sensor") {
                Image(systemName: "waveform.path.ecg").foregroundStyle(Color.emerald)
            } action: {}
            BigMetricButton(title: "\(store.emotionScore) wins", subtitle: "Therapy engagement") {
                Image(systemName: "brain.head.profile").foregroundStyle(.indigo)
            } action: {}
            BigMetricButton(
                title: "\(store.medsTaken)/\(store.medications.count)",
                subtitle: store.nextDueMedication.map { "Next: \($0.shortName) at \($0.timeLabel)" } ?? "All doses taken ✓") {
                Image(systemName: "pills.fill").foregroundStyle(.pink)
            } action: {}
        }
    }

    private var moodCheckIn: some View {
        SectionCard(title: "Daily mood check-in", systemImage: "face.smiling") {
            HStack(spacing: 10) {
                ForEach(1...5, id: \.self) { score in
                    moodButton(score: score)
                }
            }
            let sorted = store.moods.sorted { $0.day < $1.day }.suffix(14)
            if !sorted.isEmpty {
                HStack(spacing: 4) {
                    ForEach(sorted) { entry in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(moodColor(entry.score))
                            .frame(height: 8)
                    }
                }
            }
            Text(store.moodToday.map { "Today: feeling \(moodLabel($0.score).lowercased())" } ?? "How are you feeling right now?")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func moodButton(score: Int) -> some View {
        let selected = store.moodToday?.score == score
        return Button {
            store.setMood(score: score)
            celebrate()
        } label: {
            Text(moodEmoji(score))
                .font(.title2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(selected ? Color.yellow.opacity(0.22) : Color.cardInner,
                            in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(selected ? Color.yellow.opacity(0.7) : .clear, lineWidth: 2))
        }
        .accessibilityLabel("Feeling \(moodLabel(score))")
    }

    private func moodEmoji(_ score: Int) -> String {
        ["😞", "😕", "😐", "🙂", "😄"][score - 1]
    }
    private func moodLabel(_ score: Int) -> String {
        ["Struggling", "Low", "Okay", "Good", "Great"][score - 1]
    }
    private func moodColor(_ score: Int) -> Color {
        [.red, .orange, .yellow, .green, .emerald][score - 1]
    }

    #if os(iOS)
    private var stepsCard: some View {
        SectionCard(title: "Today's steps", systemImage: "figure.walk") {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("\(steps.todaySteps)")
                        .font(.system(size: 32, weight: .black))
                    Text("of \(store.profile.dailyStepGoal) goal · \(steps.statusMessage)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                ProgressView(value: Double(min(steps.todaySteps, store.profile.dailyStepGoal)),
                             total: Double(max(store.profile.dailyStepGoal, 1)))
                    .frame(width: 130)
                    .tint(.emerald)
            }
        }
    }
    #endif

    private var routinesCard: some View {
        SectionCard(title: "Predictable daily routine", systemImage: "calendar") {
            VStack(spacing: 8) {
                ForEach(store.routines) { routine in
                    Button {
                        store.toggleRoutine(routine)
                        celebrate()
                    } label: {
                        HStack {
                            Text(routine.emoji)
                            Text(routine.title)
                                .font(.subheadline.weight(.semibold))
                                .strikethrough(routine.isDone)
                                .foregroundStyle(routine.isDone ? Color.emerald : .primary)
                            Spacer()
                            Image(systemName: routine.isDone ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(routine.isDone ? Color.emerald : Color.secondary)
                        }
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var medicationsCard: some View {
        SectionCard(title: "Today's medications", systemImage: "bell.badge.fill") {
            VStack(spacing: 8) {
                ForEach(store.medications) { med in
                    HStack(spacing: 12) {
                        Button {
                            store.toggleMedication(med)
                            if !med.isTaken { celebrate() }
                            SpeechService.shared.speak("Dose recorded. Thank you.", enabled: store.voiceReminders)
                        } label: {
                            Image(systemName: med.isTaken ? "checkmark.circle.fill" : "circle.dashed")
                                .font(.title3)
                                .foregroundStyle(med.isTaken ? Color.emerald : Color.pink)
                        }
                        .accessibilityLabel("Mark \(med.name) \(med.isTaken ? "not taken" : "taken")")
                        VStack(alignment: .leading, spacing: 2) {
                            Text(med.name)
                                .font(.subheadline.weight(.bold))
                                .strikethrough(med.isTaken)
                                .foregroundStyle(med.isTaken ? .secondary : .primary)
                            Text("\(med.purpose) · \(med.timeLabel)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        StatusChip(text: med.isTaken ? "Taken" : "Due", color: med.isTaken ? .gray : .pink)
                    }
                    .padding(12)
                    .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
            Label("Dose times become real iOS reminders with ✓ Taken / Snooze buttons on the lock screen.",
                  systemImage: "lock.iphone")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
