import SwiftUI
import UserNotifications

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var notifications: NotificationService

    var body: some View {
        NavigationStack {
            Form {
                Section("Profile") {
                    HStack {
                        Text("Display name")
                        Spacer()
                        TextField("Name", text: $store.displayName)
                            .multilineTextAlignment(.trailing)
                            .foregroundStyle(.secondary)
                    }
                    Text("Shown when you join video coffee circles via the Jitsi SDK.")
                        .font(.caption2).foregroundStyle(.secondary)
                }

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

                Section("Privacy") {
                    Label("Your routines, medications, notes, moods and scores never leave this device — they persist in your app's Documents folder only.", systemImage: "lock.shield")
                        .font(.caption)
                    Label("Health data is read via HealthKit with your explicit consent; vitals are never fabricated and every card is labeled with its true source.", systemImage: "heart.text.square")
                        .font(.caption)
                }

                Section("About") {
                    LabeledContent("Version", value: "1.0.0 (1)")
                    LabeledContent("Video", value: "Jitsi Meet SDK · meet.jit.si")
                    LabeledContent("Health", value: "HealthKit + CoreBluetooth")
                }
            }
            .navigationTitle("Settings & Accessibility")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
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
