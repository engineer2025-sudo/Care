import CareActivityKit
import SwiftUI
import UserNotifications
import UniformTypeIdentifiers

private struct CareDataExportDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    let data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        self.data = data
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

struct SettingsView: View {
    enum SectionDestination: Hashable { case medications }
    var initialSection: SectionDestination? = nil
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var notifications: NotificationService
    @AppStorage("caresphere.bareMinimum") private var bareMinimum = false

    #if os(iOS)
    @State private var contactPickerShown = false
    #endif
    @State private var biometricTestResult: String?
    @State private var showingDataExporter = false
    @State private var showingEraseConfirmation = false
    @State private var exportDocument: CareDataExportDocument?
    @State private var privacyActionMessage: String?
    @State private var newMedicationName = ""
    @State private var newMedicationPurpose = ""
    @State private var newMedicationTime = CareTime.date(hour: 9, minute: 0)

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
            Form {
                Section(AppLanguage.text("Language")) { InterfaceLanguagePicker() }
                siriShortcutsSection
                profileSection
                emergencySection
                medicationSection.id(SectionDestination.medications)
                securitySection
                accessibilitySection
                supportCheckInSection
                notificationsSection
                privacySection
                aboutSection
            }
            .onAppear {
                if let initialSection { proxy.scrollTo(initialSection, anchor: .top) }
            }
            }
            .navigationTitle(AppLanguage.text("Settings"))
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(AppLanguage.text("Done")) { dismiss() }
                }
            }
        }
        .fileExporter(
            isPresented: $showingDataExporter,
            document: exportDocument,
            contentType: .json,
            defaultFilename: "CareSphere-Private-Care-Data") { result in
                switch result {
                case .success:
                    privacyActionMessage = "Care data export saved. Review the file before sharing it."
                case .failure:
                    privacyActionMessage = "The care data export was cancelled or could not be saved."
                }
                exportDocument = nil
            }
        .confirmationDialog(AppLanguage.text("Erase all saved CareSphere care data?"),
            isPresented: $showingEraseConfirmation,
            titleVisibility: .visible) {
                Button(AppLanguage.text("Erase All Care Data"), role: .destructive) {
                    store.eraseAllLocalCareData()
                    privacyActionMessage = store.persistenceIssue ?? "Saved care data and medication notifications were removed."
                }
                Button(AppLanguage.text("Cancel"), role: .cancel) {}
            } message: {
                Text(AppLanguage.text("This removes your profile, emergency contact, routines, medication schedule, notes, mood history and scores, then returns to onboarding. It does not change system permissions or remove separately downloaded models and reference libraries."))
            }
    }

    private func prepareCareDataExport() {
        do {
            exportDocument = CareDataExportDocument(data: try store.makeCareDataExport())
            privacyActionMessage = nil
            showingDataExporter = true
        } catch {
            privacyActionMessage = "CareSphere could not prepare a care data export."
        }
    }

    private var siriShortcutsSection: some View {
        Section(AppLanguage.text("Siri & Shortcuts")) {
            Label(AppLanguage.text("Voice shortcuts, on your terms."), systemImage: "waveform")
                .font(.headline)
                .foregroundStyle(Color.emeraldText)
            Text(AppLanguage.text("Use Siri or the Shortcuts app to open a CareSphere screen. These shortcuts only navigate: they do not record a mood, read health data aloud, or share information. Search CareSphere in Shortcuts to see phrases available for your Siri language."))
                .font(.footnote).foregroundStyle(.secondary)
            Text(AppLanguage.text("Example Siri phrases (English):"))
                .font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 9) {
                ForEach([
                    "Open Today in CareSphere",
                    "Open activities in CareSphere",
                    "Open paced breathing in CareSphere",
                    "Open my mood check-in in CareSphere",
                    "Prepare for a visit in CareSphere",
                ], id: \.self) { phrase in
                    Text("“\(phrase)”")
                        .font(.subheadline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: Profile

    private var profileSection: some View {
        Section(AppLanguage.text("Profile")) {
            HStack {
                Text(AppLanguage.text("Display name"))
                Spacer()
                TextField(AppLanguage.text("Name"), text: $store.displayName)
                    .multilineTextAlignment(.trailing)
                    .foregroundStyle(.secondary)
            }
            DatePicker("Date of birth",
                       selection: birthDateBinding,
                       displayedComponents: .date)
            if let age = store.profile.age {
                LabeledContent("Age", value: "\(age)")
            }
            Picker(AppLanguage.text("Care focus"), selection: $store.profile.careMode) {
                ForEach(CareMode.allCases) { mode in
                    Text("\(mode.emoji) \(mode.label)").tag(mode)
                }
            }
        }
    }

    private var birthDateBinding: Binding<Date> {
        Binding<Date>(
            get: { store.profile.birthDate ?? Calendar.current.date(byAdding: .year, value: -70, to: Date())! },
            set: { store.profile.birthDate = $0 })
    }

    // MARK: Emergency contact

    private var emergencySection: some View {
        Section(AppLanguage.text("Emergency contact (SOS)")) {
            TextField(AppLanguage.text("Name"), text: $store.profile.emergencyContact.name)
            TextField(AppLanguage.text("Phone"), text: $store.profile.emergencyContact.phone)
                #if os(iOS)
                .keyboardType(.phonePad)
                #endif
            #if os(iOS)
            Button {
                contactPickerShown = true
            } label: {
                Label(AppLanguage.text("Import from Contacts"), systemImage: "person.crop.rectangle.stack")
            }
            #endif
        }
    }

    // MARK: Medication schedule

    private var medicationSection: some View {
        Section(AppLanguage.text("Medication reminders")) {
            if store.configuredMedications.isEmpty {
                Text(AppLanguage.text("No medication schedule entered."))
                    .font(.caption).foregroundStyle(.secondary)
            }
            ForEach($store.medications) { $medication in
                VStack(alignment: .leading, spacing: 8) {
                    TextField(AppLanguage.text("Medication name"), text: $medication.name)
                    TextField(AppLanguage.text("Purpose (optional)"), text: $medication.purpose)
                    DatePicker("Reminder time", selection: medicationTimeBinding($medication), displayedComponents: .hourAndMinute)
                    Button(role: .destructive) {
                        store.medications.removeAll { $0.id == medication.id }
                    } label: {
                        Label(AppLanguage.text("Remove reminder"), systemImage: "trash")
                    }
                    .font(.caption)
                }
                .padding(.vertical, 4)
            }

            if !store.configuredMedications.isEmpty {
                Toggle(AppLanguage.text("Enable reminders for this schedule"), isOn: $store.medicationScheduleConfirmed)
                Text(store.medicationScheduleConfirmed
                     ? "Reminders are enabled. Editing a medication name or time will pause them until you confirm again."
                     : "Reminders are paused. Review every saved name and time above, including schedules from earlier versions, then confirm here.")
                    .font(.caption2).foregroundStyle(.secondary)
            }

            TextField(AppLanguage.text("New medication name"), text: $newMedicationName)
            TextField(AppLanguage.text("Purpose (optional)"), text: $newMedicationPurpose)
            DatePicker("Reminder time", selection: $newMedicationTime, displayedComponents: .hourAndMinute)
            Button {
                let name = newMedicationName.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !name.isEmpty else { return }
                let time = CareTime.hourMinute(from: newMedicationTime)
                store.medications.append(Medication(
                    name: name,
                    purpose: newMedicationPurpose.trimmingCharacters(in: .whitespacesAndNewlines),
                    hour: time.hour,
                    minute: time.minute))
                newMedicationName = ""
                newMedicationPurpose = ""
            } label: {
                Label(AppLanguage.text("Add daily reminder"), systemImage: "plus.circle.fill")
            }
            .disabled(newMedicationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            InfoText(AppLanguage.text("Only add schedules you have confirmed with your care team or medication label. CareSphere stores your reminder times; it does not prescribe, verify a dose, or check drug interactions."))
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func medicationTimeBinding(_ medication: Binding<Medication>) -> Binding<Date> {
        Binding(
            get: { CareTime.date(hour: medication.wrappedValue.hour, minute: medication.wrappedValue.minute) },
            set: { date in
                let time = CareTime.hourMinute(from: date)
                medication.wrappedValue.hour = time.hour
                medication.wrappedValue.minute = time.minute
            })
    }

    // MARK: Security (Touch ID / Face ID)

    private var securitySection: some View {
        Section(AppLanguage.text("Security")) {
            Toggle("Lock with \(BiometricService.biometryName)", isOn: biometricsBinding)
            if store.biometricEnabled {
                Button {
                    BiometricService.authenticate(reason: "Confirm it's really you") { success, error in
                        biometricTestResult = success
                            ? "✅ \(BiometricService.biometryName) verified"
                            : "❌ \(error ?? "Authentication failed")"
                    }
                } label: {
                    Label("Test \(BiometricService.biometryName) now", systemImage: BiometricService.biometryName == "Face ID" ? "faceid" : "touchid")
                }
                if let result = biometricTestResult {
                    Text(result).font(.caption).foregroundStyle(.secondary)
                }
            }
            InfoText(AppLanguage.text("The app locks in the background. Device passcode fallback depends on system availability. Authentication errors keep your data locked."))
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    private var biometricsBinding: Binding<Bool> {
        Binding<Bool>(
            get: { store.biometricEnabled },
            set: { newValue in
                guard newValue else {
                    store.biometricEnabled = false
                    return
                }
                BiometricService.authenticate(reason: "Enable app lock") { success, error in
                    if success {
                        store.biometricEnabled = true
                    } else {
                        store.biometricEnabled = false
                    }
                }
            })
    }

    // MARK: Accessibility

    private var accessibilitySection: some View {
        Section(AppLanguage.text("Accessibility")) {
            InfoText(AppLanguage.text("Choose an appearance or follow your device. Dynamic Type, increased contrast, and Reduce Motion also follow system accessibility settings; the options below add contrast or further reduce activity motion. Buttons include VoiceOver labels."))
                .font(.caption2).foregroundStyle(.secondary)
            Picker(AppLanguage.text("Color appearance"), selection: $store.colorAppearance) {
                Text(AppLanguage.text("Follow device")).tag("system")
                Text(AppLanguage.text("Light")).tag("light")
                Text(AppLanguage.text("Dark")).tag("dark")
            }
            Toggle(AppLanguage.text("Increase in-app contrast"), isOn: $store.highContrast)
                .accessibilityHint(AppLanguage.text("Adds stronger outlines around section cards and status chips."))
            Toggle(AppLanguage.text("Reduce visual motion in activities"), isOn: $store.reduceVisualMotion)
            Toggle(AppLanguage.text("Bare minimum mode"), isOn: $bareMinimum)
                .accessibilityHint(AppLanguage.text("Hides explanatory and how-to text. Status messages and safety warnings stay visible."))
            Toggle(AppLanguage.text("Spoken in-app prompts"), isOn: $store.voiceReminders)
            Picker(AppLanguage.text("Reminder voice"), selection: $store.voiceIdentifier) {
                Text(AppLanguage.text("Automatic · best installed Apple voice")).tag("")
                Section(AppLanguage.text("Apple · installed on this device")) {
                    ForEach(SpeechService.matchingVoices, id: \.identifier) { voice in
                        Text("\(voice.name) · \(SpeechService.qualityLabel(for: voice))")
                            .tag(voice.identifier)
                    }
                }

            }
            InfoText(AppLanguage.text("Speech is generated on this device. In-app prompts and previews can use the selected voice; scheduled notifications still use the normal system notification sound when CareSphere is closed."))
                .font(.caption2).foregroundStyle(.secondary)
            if SpeechService.matchingVoices.isEmpty { Text(AppLanguage.text("No installed voice for this language. The words remain visible.")).font(.caption) }
            Button {
                SpeechService.shared.speak(AppLanguage.text("This is your CareSphere reminder. Please check your medication label and follow the schedule agreed with your care team."), enabled: true, voiceIdentifier: store.voiceIdentifier)
            } label: {
                Label(AppLanguage.text("Preview selected voice"), systemImage: "play.circle")
            }
        }
    }

    private var supportCheckInSection: some View {
        Section(AppLanguage.text("Support check-ins")) {
            Toggle(AppLanguage.text("Offer heart-rate check-ins"), isOn: $store.heartRateCheckInEnabled)
            Text("Uses only a paired Bluetooth monitor while CareSphere is open and unlocked. It prompts after live heart rate stays above \(CareSupportCoordinator.promptThresholdBPM) BPM for \(Int(CareSupportCoordinator.sustainedDuration)) seconds. Activity can raise heart rate; the app asks how you feel and never calls or messages anyone automatically.")
                .font(.caption2).foregroundStyle(.secondary)
        }
    }


    private var notificationsSection: some View {
        Section(AppLanguage.text("Notifications")) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(AppLanguage.text("Medication reminders"))
                    Text(statusHint).font(.caption2).foregroundStyle(.secondary)
                }
                Spacer()
                if notifications.authorizationStatus == .authorized {
                    Image(systemName: "checkmark.seal.fill").foregroundStyle(Color.emeraldText)
                } else {
                    Button(AppLanguage.text("Enable")) { notifications.requestAuthorization() }
                        .buttonStyle(.bordered)
                        .font(.caption.weight(.bold))
                }
            }
            Text(store.medicationScheduleConfirmed
                 ? "Confirmed names and times are scheduled with iOS notifications and ✓ Taken / Snooze actions. When CareSphere is closed, iOS uses the system notification sound—not spoken audio."
                 : "No medication reminders are active until you review and confirm a schedule in this section.")
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    // MARK: Privacy

    private var privacySection: some View {
        Section(AppLanguage.text("Privacy & data")) {
            if store.persistenceIssue == nil {
                Label(AppLanguage.text("Your profile, routines, medications, notes, moods and scores are encrypted on this device with AES-256-GCM. The key is stored in Keychain."), systemImage: "lock.shield")
                    .font(.caption)
            } else {
                Label(AppLanguage.text("CareSphere could not confirm that all saved data is protected. Review the storage warning above."), systemImage: "exclamationmark.triangle.fill")
                    .font(.caption).foregroundStyle(.orange)
            }
            #if os(iOS)
            InfoText(AppLanguage.text("The encrypted file also uses iOS Complete File Protection and is excluded from device backups; its Keychain key is available only while unlocked and is not migrated to another device. Older plaintext data is removed only after an encrypted copy is saved. Face ID / Touch ID is an additional app lock, not the encryption key."))
                .font(.caption2).foregroundStyle(.secondary)
            #else
            InfoText(AppLanguage.text("The encrypted file is restricted to your macOS user account (POSIX permissions 0600); the key is held in the user's login Keychain. The biometric screen lock is separate from the encryption key."))
                .font(.caption2).foregroundStyle(.secondary)
            #endif

            Button(action: prepareCareDataExport) {
                Label(AppLanguage.text("Export my care data as JSON…"), systemImage: "square.and.arrow.up")
            }
            .disabled(!store.canExportCareData)
            InfoText(AppLanguage.text("The system save sheet lets you choose where to place the export. It contains sensitive profile, medication and journal information; the exported copy is outside CareSphere's app-storage protections."))
                .font(.caption2).foregroundStyle(.secondary)

            Button(role: .destructive) {
                showingEraseConfirmation = true
            } label: {
                Label(AppLanguage.text("Erase all saved care data…"), systemImage: "trash")
            }
            Text(AppLanguage.text("Erasing removes saved care data and pending medication notifications, then returns you to onboarding. Notification permission and downloaded MedlinePlus and external Kiwix files are not removed."))
                .font(.caption2).foregroundStyle(.secondary)

            if let message = privacyActionMessage {
                Text(message).font(.caption).foregroundStyle(.secondary).accessibilityAddTraits(.updatesFrequently)
            }
            if let issue = store.persistenceIssue {
                Label(issue, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption).foregroundStyle(.orange)
            }

            Label(AppLanguage.text("Apple Intelligence summaries and installed Apple speech voices run on this device; questions are not sent to a cloud AI. Kiwix searches go only to the private/local server address you enter."), systemImage: "cpu")
                .font(.caption)
            Label(AppLanguage.text("MedlinePlus content is downloaded only when you choose. HealthKit access is explicit and read-only; workouts appear only if Apple Health can see them, and readings retain their true source labels."), systemImage: "heart.text.square")
                .font(.caption)
        }
    }

    // MARK: About

    private var aboutSection: some View {
        Section(AppLanguage.text("About")) {
            LabeledContent("Version", value: appVersionLabel)
            LabeledContent("Video", value: "Browser handoff · meet.jit.si")
            #if os(iOS)
            LabeledContent("Health", value: "Read-only HealthKit vitals/workouts + CoreBluetooth")
            #else
            LabeledContent("Health", value: "CoreBluetooth · Apple Health is iPhone-only")
            #endif
            VStack(alignment: .leading, spacing: 4) {
                Text(AppLanguage.text("Built on Apple's native stacks"))
                    .font(.caption.weight(.bold))
                InfoText(AppLanguage.text("SwiftUI · HealthKit · CoreBluetooth · UserNotifications · LocalAuthentication (Touch ID / Face ID) · CoreHaptics · NaturalLanguage · CoreMotion · AVAudioEngine · AVSpeechSynthesizer · CoreLocation · MapKit · Swift Charts · Contacts · Foundation Models (optional Apple Intelligence) · FoundationXML (MedlinePlus)"))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 2)
        }
    }

    private var appVersionLabel: String {
        let info = Bundle.main.infoDictionary ?? [:]
        let version = info["CFBundleShortVersionString"] as? String ?? "Unknown"
        let build = info["CFBundleVersion"] as? String ?? "Unknown"
        return "\(version) (\(build))"
    }

    private var statusHint: String {
        switch notifications.authorizationStatus {
        case .authorized, .provisional:
            if store.configuredMedications.isEmpty { return "Permission granted; no medication schedule is configured." }
            return store.medicationScheduleConfirmed
                ? "Permission granted. iOS delivers scheduled reminders with a system sound when the app is closed."
                : "Permission granted, but the saved schedule is paused until you review and confirm it."
        case .denied:
            return "Denied — enable in system Settings → Notifications → CareSphere."
        default:
            return store.configuredMedications.isEmpty
                ? "Add a personal schedule, review each entry against your current instructions, and allow notifications to use reminders."
                : "No reminders are active until permission and schedule confirmation are both in place."
        }
    }
}


/// Native names make the language selector usable even before reading the current UI.
struct InterfaceLanguagePicker: View {
    @AppStorage(AppLanguage.preferenceKey) private var choice = "auto"
    var compact = false
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker(selection: $choice) {
                ForEach(AppLanguage.options, id: \.id) { option in
                    Text(verbatim: option.id == "auto" ? AppLanguage.text(option.name) : option.name).tag(option.id)
                }
            } label: { Label(AppLanguage.text("App language"), systemImage: "globe") }
            if !compact {
                Text(AppLanguage.text("Your notes and care records stay in their original language.")).font(.caption)
                Text(AppLanguage.text("Some advanced instructions and external content remain in English.")).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
