import SwiftUI
import UserNotifications

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var notifications: NotificationService

    #if os(iOS)
    @State private var contactPickerShown = false
    #endif
    @State private var biometricTestResult: String?

    var body: some View {
        NavigationStack {
            Form {
                profileSection
                emergencySection
                securitySection
                accessibilitySection
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
            Toggle("Spoken reminders", isOn: $store.voiceReminders)
            Text("Speaks medication and routine prompts aloud with on-device AVSpeechSynthesizer.")
                .font(.caption2).foregroundStyle(.secondary)
            Button {
                SpeechService.shared.speak("This is your CareSphere reminder. Time to take Lisinopril.", enabled: true)
            } label: {
                Label("Preview a spoken reminder", systemImage: "play.circle")
            }
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
            Text("Daily doses are scheduled with UNCalendarNotificationTrigger and support ✓ Taken / Snooze actions from the lock screen.")
                .font(.caption2).foregroundStyle(.secondary)
        }
    }

    // MARK: Privacy

    private var privacySection: some View {
        Section("Privacy") {
            Label("Your profile, routines, medications, notes, moods and scores never leave this device — they persist in your app's Documents folder only.", systemImage: "lock.shield")
                .font(.caption)
            Label("Health data is read via HealthKit with your explicit consent; vitals are never fabricated and every card is labeled with its true source.", systemImage: "heart.text.square")
                .font(.caption)
        }
    }

    // MARK: About

    private var aboutSection: some View {
        Section("About") {
            LabeledContent("Version", value: "2.0.0 (2)")
            LabeledContent("Video", value: "Jitsi Meet SDK · meet.jit.si")
            LabeledContent("Health", value: "HealthKit + CoreBluetooth")
            VStack(alignment: .leading, spacing: 4) {
                Text("Built on Apple's native stacks")
                    .font(.caption.weight(.bold))
                Text("SwiftUI · HealthKit · CoreBluetooth · UserNotifications · LocalAuthentication (Touch ID / Face ID) · CoreHaptics · NaturalLanguage · CoreMotion · AVAudioEngine · AVSpeechSynthesizer · CoreLocation · MapKit · Swift Charts · Contacts")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 2)
        }
    }

    private var statusHint: String {
        switch notifications.authorizationStatus {
        case .authorized, .provisional: return "Enabled — reminders fire even in the background."
        case .denied: return "Denied — enable in iOS Settings → Notifications → CareSphere."
        default: return "Reminders pop up even if the app is closed."
        }
    }
}
