import SwiftUI
import CareActivityKit

struct OverviewView: View {
    @EnvironmentObject private var navigation: CareNavigation
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.scenePhase) private var scenePhase
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var notifications: NotificationService
    @EnvironmentObject private var bluetooth: BluetoothHeartRateService
    @EnvironmentObject private var support: CareSupportCoordinator
    @EnvironmentObject private var steps: StepCountService
    @State private var showRoutineEditor = false
    @State private var showMedicationSettings = false
    @State private var currentLocalDayKey = CareTime.dayKey()

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 18 { return "Good afternoon" }
        return "Good evening"
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 20) {
                        hero
                        if !store.personalSupport.simple { metricsGrid(proxy: proxy) }
                        moodCheckIn
                        routinesCard.id("routines")
                        if store.routineUndo != nil { Button(AppLanguage.text("Undo last routine change")) { store.undoRoutineChange() }.buttonStyle(.bordered) }
                        if !store.personalSupport.simple { medicationsCard.id("medications") }
                        #if os(iOS)
                        if !store.personalSupport.simple { stepsCard }
                        #endif
                    }
                    .carePagePadding()
                }
            }
            .background(Color.ink)
            .navigationTitle(AppLanguage.text("Today"))
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
            .onChange(of: scenePhase) { phase in
                if phase == .active { currentLocalDayKey = CareTime.dayKey() }
            }
            .sheet(isPresented: $showMedicationSettings) { SettingsView(initialSection: .medications) }
            .sheet(isPresented: $showRoutineEditor) {
                RoutineEditorView()
                    .environmentObject(store)
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(Date(), format: .dateTime.weekday(.wide).month(.abbreviated).day())
                .font(.subheadline.weight(.medium)).foregroundStyle(Color.emeraldText)
            Text("\(greeting), \(store.displayName.isEmpty ? "friend" : store.displayName).")
                .font(.largeTitle.weight(.bold))
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text(AppLanguage.text("A little structure, a moment of calm, or a familiar face. Choose what feels right today."))
                .font(.body).foregroundStyle(.secondary)
            Button { navigation.selectedTab = .activities } label: {
                Label(AppLanguage.text("Find an activity"), systemImage: "square.grid.2x2")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            Button { navigation.selectedTab = .connect } label: {
                Label(AppLanguage.text("Connect with someone"), systemImage: "person.2")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color.emerald.opacity(0.09), in: RoundedRectangle(cornerRadius: 24))
    }

    private func metricsGrid(proxy: ScrollViewProxy) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(AppLanguage.text("Today at a glance")).font(.headline).accessibilityAddTraits(.isHeader)
            LazyVGrid(columns: typeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                BigMetricButton(title: "\(store.routinesDone) of \(store.routines.count)", subtitle: "My daily routine") {
                    Image(systemName: "checklist").foregroundStyle(Color.emeraldText)
                } action: { proxy.scrollTo("routines", anchor: .top) }
                BigMetricButton(title: bluetooth.bpm.map { "\($0) bpm" } ?? "Not connected", subtitle: "Bluetooth heart rate") {
                    Image(systemName: "waveform.path.ecg").foregroundStyle(Color.emeraldText)
                } action: {
                    navigation.healthPage = .vitals
                    navigation.selectedTab = .health
                }
                BigMetricButton(title: "\(CareActivity.allCases.count) activities", subtitle: "Explore at your pace") {
                    Image(systemName: "square.grid.2x2").foregroundStyle(Color.emeraldText)
                } action: { navigation.selectedTab = .activities }
                BigMetricButton(
                    title: store.configuredMedications.isEmpty ? "Set up" : store.medicationScheduleConfirmed ? "\(store.medsTaken) of \(store.configuredMedications.count)" : "Review",
                    subtitle: "Medication check-ins") {
                    Image(systemName: "pills").foregroundStyle(.pink)
                } action: { proxy.scrollTo("medications", anchor: .top) }
            }
        }
    }

    private var moodCheckIn: some View {
        SectionCard(title: AppLanguage.text("How are you feeling?"), systemImage: "face.smiling") {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: typeSize.isAccessibilitySize ? 130 : 82))], spacing: 10) {
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
                            .accessibilityLabel("\(entry.day): \(moodLabel(entry.score))")
                    }
                }
            }
            Text(store.moodToday.map { "Today: feeling \(moodLabel($0.score).lowercased())" } ?? "How are you feeling right now?")
                .font(.caption)
                .foregroundStyle(.secondary)
            Button {
                support.begin(.selfReportedStress)
            } label: {
                Label(AppLanguage.text("I'm stressed"), systemImage: "wind")
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
            if !store.reduceVisualMotion { celebrate() }
        } label: {
            VStack(spacing: 8) {
                Text(moodEmoji(score)).font(.title).accessibilityHidden(true)
                Text(moodLabel(score)).font(.subheadline.weight(.medium))
                    .fixedSize(horizontal: false, vertical: true)
                if selected { Image(systemName: "checkmark.circle.fill").accessibilityHidden(true) }
            }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(selected ? Color.yellow.opacity(0.22) : Color.cardInner,
                            in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(selected ? Color.yellow.opacity(0.7) : .clear, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Feeling \(moodLabel(score))")
        .accessibilityValue(selected ? "Selected" : "")
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
        SectionCard(title: AppLanguage.text("Today's steps"), systemImage: "figure.walk") {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(steps.hasStarted && steps.isAvailable ? "\(steps.todaySteps)" : "—")
                        .font(.system(size: 32, weight: .black))
                    Text("of \(store.profile.dailyStepGoal) goal · \(steps.statusMessage)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if !steps.hasStarted {
                    Button(AppLanguage.text("Enable step counting")) { steps.start() }
                        .buttonStyle(.bordered).controlSize(.large)
                }
                ProgressView(value: Double(min(steps.todaySteps, store.profile.dailyStepGoal)),
                             total: Double(max(store.profile.dailyStepGoal, 1)))
                    .frame(maxWidth: .infinity)
                    .tint(.emerald)
            }
        }
    }
    #endif

    private var routinesCard: some View {
        SectionCard(title: AppLanguage.text("My daily routine"), systemImage: "calendar") {
            HStack {
                Text(AppLanguage.text("Check off what feels right today. Your list resets each local day."))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                Button {
                    showRoutineEditor = true
                } label: {
                    Label(AppLanguage.text("Edit"), systemImage: "slider.horizontal.3")
                        .font(.caption.weight(.bold))
                }
                .buttonStyle(.bordered)
                .accessibilityLabel(AppLanguage.text("Add or remove daily routines"))
            }

            if store.routines.isEmpty {
                Text(AppLanguage.text("No routines yet. Add a few gentle reminders that work for you."))
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
                            if !store.reduceVisualMotion { celebrate() }
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
        SectionCard(title: AppLanguage.text("Today's medications"), systemImage: "pills") {
            Button { showMedicationSettings = true } label: {
                Label(store.configuredMedications.isEmpty ? "Add a medication reminder" : "Manage my schedule", systemImage: "plus.circle")
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
            .buttonStyle(.bordered)
            VStack(spacing: 8) {
                if store.configuredMedications.isEmpty {
                    Text(AppLanguage.text("No schedule yet. Add only medicines and times confirmed by your care team in Settings."))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                } else if !store.medicationScheduleConfirmed {
                    Text(AppLanguage.text("A saved schedule needs review in Settings. Reminders and dose check-ins are paused until you confirm every name and time."))
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
                                if !med.isTaken && !store.reduceVisualMotion { celebrate() }
                                SpeechService.shared.speak(AppLanguage.text("Dose check-in saved."), enabled: store.voiceReminders, voiceIdentifier: store.voiceIdentifier)
                            } label: {
                                Image(systemName: med.isTaken ? "checkmark.circle.fill" : "circle.dashed")
                                    .font(.title2)
                                    .frame(minWidth: 44, minHeight: 44)
                                    .foregroundStyle(med.isTaken ? Color.emeraldText : Color.pink)
                            }
                            .accessibilityLabel("Mark \(med.name) \(med.isTaken ? "not taken today" : "taken today")")
                            VStack(alignment: .leading, spacing: 2) {
                                Text(med.name)
                                    .font(.subheadline.weight(.bold))
                                    .strikethrough(med.isTaken)
                                    .foregroundStyle(med.isTaken ? .secondary : .primary)
                                Text(med.purpose.isEmpty ? med.timeLabel : "\(med.purpose) · \(med.timeLabel)")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                StatusChip(text: med.isTaken ? "Marked today" : "Not marked", color: med.isTaken ? .gray : .pink)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
            }
            if store.medicationScheduleConfirmed {
                Text(AppLanguage.text("Check-ins are self-reported, reset at local midnight, and do not verify that a dose was taken."))
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
                Section(AppLanguage.text("Your routines")) {
                    if store.routines.isEmpty {
                        Text(AppLanguage.text("No routines yet. Add a reminder that fits your day."))
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
                                    Label(AppLanguage.text("Done today"), systemImage: "checkmark.circle.fill")
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
                        Text(AppLanguage.text("You can save up to 24 routines."))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section(AppLanguage.text("Add a routine")) {
                    HStack {
                        TextField(AppLanguage.text("Emoji"), text: $emoji)
                            .frame(width: 68)
                            .accessibilityLabel(AppLanguage.text("Routine emoji"))
                        TextField(AppLanguage.text("Routine name"), text: $title)
                            .accessibilityLabel(AppLanguage.text("Routine name"))
                    }
                    Button {
                        guard canAdd else { return }
                        store.addRoutine(title: title, emoji: emoji)
                        title = ""
                        emoji = "✨"
                    } label: {
                        Label(AppLanguage.text("Add to my routine"), systemImage: "plus.circle.fill")
                    }
                    .disabled(!canAdd)
                }

                Section {
                    Text(AppLanguage.text("Routine check-ins are stored on this device. A checkmark resets at local midnight; it is a personal checklist, not proof of an activity."))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(AppLanguage.text("Customize routine"))
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(AppLanguage.text("Done")) { dismiss() }
                }
            }
        }

    }
}
