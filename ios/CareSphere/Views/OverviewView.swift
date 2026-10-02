import SwiftUI

struct OverviewView: View {
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var notifications: NotificationService
    @EnvironmentObject private var bluetooth: BluetoothHeartRateService
    @EnvironmentObject private var support: CareSupportCoordinator
    @EnvironmentObject private var steps: StepCountService
    @State private var showRoutineEditor = false
    @State private var currentLocalDayKey = CareTime.dayKey()

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
                store.refreshMedicationReminders()
            }
            .task {
                while !Task.isCancelled {
                    let now = Date()
                    let boundary = Calendar.current.nextDate(
                        after: now,
                        matching: DateComponents(hour: 0, minute: 0, second: 1),
                        matchingPolicy: .nextTime,
                        repeatedTimePolicy: .first,
                        direction: .forward) ?? now.addingTimeInterval(60)
                    let delay = max(1, boundary.timeIntervalSinceNow)
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    guard !Task.isCancelled else { return }
                    currentLocalDayKey = CareTime.dayKey()
                }
            }
            .onChange(of: notifications.authorizationStatus) { status in
                if status == .authorized || status == .provisional {
                    store.refreshMedicationReminders()
                }
            }
            .sheet(isPresented: $showRoutineEditor) {
                RoutineEditorView()
                    .environmentObject(store)
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("\(greeting), \(store.displayName)", systemImage: "sparkles")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.emeraldText)
            Text("Connected care for independent living")
                .font(.title2.weight(.heavy))
            Text("Live Bluetooth heart-rate monitors, Apple Health summaries on iPhone, Jitsi video rooms, and optional sensory activities. Care notes stay on this device.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            if !store.personalizedTagline.isEmpty {
                Text(store.personalizedTagline)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Color.emeraldText)
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
                Image(systemName: "checklist").foregroundStyle(Color.emeraldText)
            } action: {}
            BigMetricButton(title: bluetooth.bpm.map { "\($0) bpm" } ?? "Not paired", subtitle: "Heart-rate sensor") {
                Image(systemName: "waveform.path.ecg").foregroundStyle(Color.emeraldText)
            } action: {}
            BigMetricButton(title: "Untimed", subtitle: "Optional activities · not scored") {
                Image(systemName: "square.grid.2x2").foregroundStyle(Color.emeraldText)
            } action: {}
            BigMetricButton(
                title: store.configuredMedications.isEmpty
                    ? "None"
                    : store.medicationScheduleConfirmed ? "\(store.medsTaken)/\(store.configuredMedications.count)" : "Review",
                subtitle: store.configuredMedications.isEmpty
                    ? "No medication schedule"
                    : store.medicationScheduleConfirmed
                        ? store.nextDueMedication.map { "Next: \($0.shortName) at \($0.timeLabel)" } ?? "All check-ins marked today ✓"
                        : "Reminders paused · confirm in Settings") {
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
            Button {
                support.begin(.selfReportedStress)
            } label: {
                Label("I'm stressed", systemImage: "wind")
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 4)
            }
            .buttonStyle(.bordered)
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
            HStack {
                Text("Check off what feels right today. Your list resets each local day.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                Button {
                    showRoutineEditor = true
                } label: {
                    Label("Edit", systemImage: "slider.horizontal.3")
                        .font(.caption.weight(.bold))
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("Add or remove daily routines")
            }

            if store.routines.isEmpty {
                Text("No routines yet. Add a few gentle reminders that work for you.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            } else {
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
                                    .foregroundStyle(routine.isDone ? Color.emeraldText : .primary)
                                Spacer()
                                Image(systemName: routine.isDone ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(routine.isDone ? Color.emeraldText : Color.secondary)
                            }
                            .padding(12)
                            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .id(currentLocalDayKey)
    }

    private var medicationsCard: some View {
        SectionCard(title: "Today's medications", systemImage: "bell.badge.fill") {
            VStack(spacing: 8) {
                if store.configuredMedications.isEmpty {
                    Text("No schedule yet. Add only medicines and times confirmed by your care team in Settings.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                } else if !store.medicationScheduleConfirmed {
                    Text("A saved schedule needs review in Settings. Reminders and dose check-ins are paused until you confirm every name and time.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                if store.medicationScheduleConfirmed {
                    ForEach(store.configuredMedications) { med in
                        HStack(spacing: 12) {
                            Button {
                                store.toggleMedication(med)
                                if !med.isTaken { celebrate() }
                                SpeechService.shared.speak("Dose check-in saved.", enabled: store.voiceReminders, voiceIdentifier: store.voiceIdentifier)
                            } label: {
                                Image(systemName: med.isTaken ? "checkmark.circle.fill" : "circle.dashed")
                                    .font(.title3)
                                    .foregroundStyle(med.isTaken ? Color.emeraldText : Color.pink)
                            }
                            .accessibilityLabel("Mark \(med.name) \(med.isTaken ? "not taken today" : "taken today")")
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
                            StatusChip(text: med.isTaken ? "Marked today" : "Not marked", color: med.isTaken ? .gray : .pink)
                        }
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
            }
            if store.medicationScheduleConfirmed {
                Text("Check-ins are self-reported, reset at local midnight, and do not verify that a dose was taken.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Label {
                    Text(notifications.authorizationStatus == .authorized || notifications.authorizationStatus == .provisional
                         ? "Scheduled iOS reminders use the system sound when the app is closed."
                         : "Allow notifications in Settings for lock-screen reminders.")
                } icon: {
                    Image(systemName: "lock.iphone")
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
        }
    }
}

private struct RoutineEditorView: View {
    @EnvironmentObject private var store: CareStore
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var emoji = "✨"

    private var canAdd: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && store.routines.count < 24
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Your routines") {
                    if store.routines.isEmpty {
                        Text("No routines yet. Add a reminder that fits your day.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(store.routines) { routine in
                            HStack(spacing: 10) {
                                Text(routine.emoji)
                                    .font(.title3)
                                Text(routine.title)
                                    .lineLimit(2)
                                Spacer(minLength: 8)
                                if routine.isDone {
                                    Label("Done today", systemImage: "checkmark.circle.fill")
                                        .font(.caption)
                                        .foregroundStyle(Color.emeraldText)
                                        .labelStyle(.titleAndIcon)
                                }
                                Button(role: .destructive) {
                                    store.removeRoutine(id: routine.id)
                                } label: {
                                    Image(systemName: "trash")
                                        .frame(width: 36, height: 36)
                                }
                                .buttonStyle(.borderless)
                                .accessibilityLabel("Remove \(routine.title)")
                            }
                            .padding(.vertical, 2)
                        }
                    }
                    if store.routines.count >= 24 {
                        Text("You can save up to 24 routines.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Add a routine") {
                    HStack {
                        TextField("Emoji", text: $emoji)
                            .frame(width: 68)
                            .accessibilityLabel("Routine emoji")
                        TextField("Routine name", text: $title)
                            .accessibilityLabel("Routine name")
                    }
                    Button {
                        guard canAdd else { return }
                        store.addRoutine(title: title, emoji: emoji)
                        title = ""
                        emoji = "✨"
                    } label: {
                        Label("Add to my routine", systemImage: "plus.circle.fill")
                    }
                    .disabled(!canAdd)
                }

                Section {
                    Text("Routine check-ins are stored on this device. A checkmark resets at local midnight; it is a personal checklist, not proof of an activity.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Customize routine")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .frame(minWidth: 320, minHeight: 360)
    }
}
