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
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var notifications: NotificationService
    @EnvironmentObject private var localSpeech: KokoroSpeechService

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
            Form {
                profileSection
                emergencySection
                medicationSection
                securitySection
                accessibilitySection
                neuralVoiceSection
                notificationsSection
                privacySection
                aboutSection
            }
            .navigationTitle("Settings")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
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
        .confirmationDialog(
            "Erase all saved CareSphere care data?",
            isPresented: $showingEraseConfirmation,
            titleVisibility: .visible) {
                Button("Erase All Care Data", role: .destructive) {
                    store.eraseAllLocalCareData()
                    privacyActionMessage = store.persistenceIssue ?? "Saved care data and medication notifications were removed."
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes your profile, emergency contact, routines, medication schedule, notes, mood history and scores, then returns to onboarding. It does not change system permissions or remove separately downloaded models and reference libraries.")
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

    // MARK: Profile

    private var profileSection: some View {
        Section("Profile") {
            HStack {
                Text("Display name")
                Spacer()
                TextField("Name", text: $store.displayName)
                    .multilineTextAlignment(.trailing)
                    .foregroundStyle(.secondary)
            }
            DatePicker("Date of birth",
                       selection: birthDateBinding,
                       displayedComponents: .date)
            if let age = store.profile.age {
                LabeledContent("Age", value: "\(age)")
            }
            Picker("Care focus", selection: $store.profile.careMode) {
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
        Section("Emergency contact (SOS)") {
            TextField("Name", text: $store.profile.emergencyContact.name)
            TextField("Phone", text: $store.profile.emergencyContact.phone)
                #if os(iOS)
                .keyboardType(.phonePad)
                #endif
            #if os(iOS)
            Button {
                contactPickerShown = true
            } label: {
                Label("Import from Contacts", systemImage: "person.crop.rectangle.stack")
            }
            #endif
        }
    }

    // MARK: Medication schedule

    private var medicationSection: some View {
        Section("Medication reminders") {
            if store.configuredMedications.isEmpty {
                Text("No medication schedule entered.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            ForEach($store.medications) { $medication in
                VStack(alignment: .leading, spacing: 8) {
                    TextField("Medication name", text: $medication.name)
                    TextField("Purpose (optional)", text: $medication.purpose)
                    DatePicker("Reminder time", selection: medicationTimeBinding($medication), displayedComponents: .hourAndMinute)
                    Button(role: .destructive) {
                        store.medications.removeAll { $0.id == medication.id }
                    } label: {
                        Label("Remove reminder", systemImage: "trash")
                    }
                    .font(.caption)
                }
                .padding(.vertical, 4)
            }

            if !store.configuredMedications.isEmpty {
                Toggle("Enable reminders for this schedule", isOn: $store.medicationScheduleConfirmed)
                Text(store.medicationScheduleConfirmed
                     ? "Reminders are enabled. Editing a medication name or time will pause them until you confirm again."
                     : "Reminders are paused. Review every saved name and time above, including schedules from earlier versions, then confirm here.")
                    .font(.caption2).foregroundStyle(.secondary)
            }

            TextField("New medication name", text: $newMedicationName)
            TextField("Purpose (optional)", text: $newMedicationPurpose)
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
                Label("Add daily reminder", systemImage: "plus.circle.fill")
            }
            .disabled(newMedicationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            Text("Only add schedules you have confirmed with your care team or medication label. CareSphere stores your reminder times; it does not prescribe, verify a dose, or check drug interactions.")
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
        Section("Security") {
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
            Text("The app locks whenever it leaves the foreground. Your device passcode always works as a fallback — you can never be locked out.")
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
        Section("Accessibility") {
            Toggle("Spoken in-app prompts", isOn: $store.voiceReminders)
            Picker("Reminder voice", selection: $store.voiceIdentifier) {
                Text("Automatic · best installed Apple voice").tag("")
                Section("Apple · installed on this device") {
                    ForEach(SpeechService.englishVoices, id: \.identifier) { voice in
                        Text("\(voice.name) · \(SpeechService.qualityLabel(for: voice))")
                            .tag(voice.identifier)
                    }
                }
                if localSpeech.isModelInstalled {
                    Section("Kokoro · local neural voices") {
                        ForEach(KokoroSpeaker.english) { speaker in
                            Text(speaker.displayName).tag(speaker.selection)
                        }
                    }
                }
            }
            Text("Speech is generated on this device. In-app prompts and previews can use the selected voice; scheduled notifications still use the normal system notification sound when CareSphere is closed.")
                .font(.caption2).foregroundStyle(.secondary)
            Button {
                SpeechService.shared.speak("This is your CareSphere reminder. Please check your medication label and follow the schedule agreed with your care team.", enabled: true, voiceIdentifier: store.voiceIdentifier)
            } label: {
                Label("Preview selected voice", systemImage: "play.circle")
            }
            .disabled(localSpeech.isGenerating)
        }
    }

    private var neuralVoiceSection: some View {
        Section("Open-source neural voice") {
            if localSpeech.isModelInstalled {
                Label("Kokoro English voices are installed for offline use.", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(Color.emerald)
                if localSpeech.isGenerating {
                    ProgressView("Generating speech on this device…")
                }
                Button(role: .destructive) {
                    Task {
                        await localSpeech.removeModel()
                        if store.voiceIdentifier.hasPrefix("kokoro:") {
                            store.voiceIdentifier = ""
                        }
                    }
                } label: {
                    Label("Remove Kokoro voice pack", systemImage: "trash")
                }
                .disabled(localSpeech.isGenerating)
            } else if localSpeech.isDownloading {
                ProgressView("Downloading and installing (~158 MB)…")
                Text("Keep CareSphere open. The extracted model needs about 250 MB of temporary free storage.")
                    .font(.caption2).foregroundStyle(.secondary)
            } else {
                Button {
                    Task { await localSpeech.downloadModel() }
                } label: {
                    Label("Download Kokoro English voices (~158 MB)", systemImage: "arrow.down.circle.fill")
                }
                .disabled(localSpeech.isGenerating)
                Text("Optional Kokoro int8 weights. After download, speech generation runs offline; the model is not included in the app installer.")
                    .font(.caption2).foregroundStyle(.secondary)
            }

            if let message = localSpeech.statusMessage {
                Text(message).font(.caption).foregroundStyle(.secondary)
            }
            if let error = localSpeech.errorMessage {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption).foregroundStyle(.orange)
            }
            Link("Model and Sherpa-ONNX project details", destination: URL(string: "https://github.com/k2-fsa/sherpa-onnx")!)
                .font(.caption)
            Link("eSpeak-NG license (GPL-3.0)", destination: URL(string: "https://github.com/espeak-ng/espeak-ng/blob/1.52.0/COPYING")!)
                .font(.caption)
            Text("Kokoro weights are Apache-2.0; its included eSpeak-NG pronunciation data has a separate GPL-3.0 license. The voice pack contains both notices. Synthetic voices are not a substitute for a clinician or emergency service.")
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    // MARK: Notifications

    private var notificationsSection: some View {
        Section("Notifications") {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Medication reminders")
                    Text(statusHint).font(.caption2).foregroundStyle(.secondary)
                }
                Spacer()
                if notifications.authorizationStatus == .authorized {
                    Image(systemName: "checkmark.seal.fill").foregroundStyle(Color.emerald)
                } else {
                    Button("Enable") { notifications.requestAuthorization() }
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
        Section("Privacy & data") {
            Label("Your profile, routines, medications, notes, moods and scores stay in CareSphere's private app storage.", systemImage: "lock.shield")
                .font(.caption)
            #if os(iOS)
            Text("The care-data file uses iOS Complete File Protection while the device is locked. Touch ID / Face ID is an additional screen lock, not a separate encryption key.")
                .font(.caption2).foregroundStyle(.secondary)
            #else
            Text("The care-data file is restricted to your macOS user account (POSIX permissions 0600). The biometric screen lock is not a separate encryption key.")
                .font(.caption2).foregroundStyle(.secondary)
            #endif

            Button(action: prepareCareDataExport) {
                Label("Export my care data as JSON…", systemImage: "square.and.arrow.up")
            }
            Text("The system save sheet lets you choose where to place the export. It contains sensitive profile, medication and journal information; the exported copy is outside CareSphere's app-storage protections.")
                .font(.caption2).foregroundStyle(.secondary)

            Button(role: .destructive) {
                showingEraseConfirmation = true
            } label: {
                Label("Erase all saved care data…", systemImage: "trash")
            }
            Text("Erasing removes saved care data and pending medication notifications, then returns you to onboarding. Notification permission and separately downloaded Qwen, Kokoro, MedlinePlus and external Kiwix files are not removed.")
                .font(.caption2).foregroundStyle(.secondary)

            if let message = privacyActionMessage {
                Text(message).font(.caption).foregroundStyle(.secondary).accessibilityAddTraits(.updatesFrequently)
            }
            if let issue = store.persistenceIssue {
                Label(issue, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption).foregroundStyle(.orange)
            }

            Label("The Qwen assistant and optional Kokoro voice run on this device; questions and generated audio are not sent to a cloud AI. Kiwix searches go only to the private/local server address you enter.", systemImage: "cpu")
                .font(.caption)
            Label("MedlinePlus content and optional model weights are downloaded only when you choose. HealthKit access is explicit and read-only; workouts appear only if Apple Health can see them, and readings retain their true source labels.", systemImage: "heart.text.square")
                .font(.caption)
        }
    }

    // MARK: About

    private var aboutSection: some View {
        Section("About") {
            LabeledContent("Version", value: appVersionLabel)
            LabeledContent("Video", value: "Jitsi Meet SDK · meet.jit.si")
            #if os(iOS)
            LabeledContent("Health", value: "Read-only HealthKit vitals/workouts + CoreBluetooth")
            #else
            LabeledContent("Health", value: "CoreBluetooth · Apple Health is iPhone-only")
            #endif
            VStack(alignment: .leading, spacing: 4) {
                Text("Built on Apple's native stacks")
                    .font(.caption.weight(.bold))
                Text("SwiftUI · HealthKit · CoreBluetooth · UserNotifications · LocalAuthentication (Touch ID / Face ID) · CoreHaptics · NaturalLanguage · CoreMotion · AVAudioEngine · AVSpeechSynthesizer · Sherpa-ONNX + optional Kokoro TTS · ZIPFoundation · CoreLocation · MapKit · Swift Charts · Contacts · llama.cpp (optional local GGUF) · FoundationXML (MedlinePlus)")
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
                ? "Add a verified schedule, confirm it, and allow notifications to use reminders."
                : "No reminders are active until permission and schedule confirmation are both in place."
        }
    }
}
