import SwiftUI

@main
struct CareSphereApp: App {
    @StateObject private var store = CareStore()
    @StateObject private var healthKit = HealthKitService()
    @StateObject private var bluetooth = BluetoothHeartRateService()
    @StateObject private var notifications = NotificationService.shared
    @StateObject private var location = LocationService()
    @StateObject private var steps = StepCountService()
    @StateObject private var localAssistant = LocalAssistantService()
    @StateObject private var kokoroSpeech = KokoroSpeechService.shared

    @Environment(\.scenePhase) private var scenePhase
    @State private var isLocked = false
    @State private var hasCheckedInitialLock = false

    init() {
        NotificationService.shared.registerCategories()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if !store.hasCompletedOnboarding {
                    OnboardingView()
                } else if store.biometricEnabled && (isLocked || !hasCheckedInitialLock) {
                    // Replace the app's root view with an opaque lock screen.
                    // A macOS sheet left the sensitive window visible and live behind it.
                    AppLockView(onUnlock: { isLocked = false })
                } else {
                    RootTabView()
                }
            }
            .environmentObject(store)
            .environmentObject(healthKit)
            .environmentObject(bluetooth)
            .environmentObject(notifications)
            .environmentObject(location)
            .environmentObject(steps)
            .environmentObject(localAssistant)
            .environmentObject(kokoroSpeech)
            .tint(.emerald)
            .onAppear {
                store.refreshMedicationReminders()
                if !hasCheckedInitialLock {
                    hasCheckedInitialLock = true
                    if store.biometricEnabled { isLocked = true }
                }
                steps.start()
            }
            .onChange(of: scenePhase) { phase in
                if phase == .active && healthKit.hasRequestedAuthorization {
                    healthKit.refreshAll()
                }
                // Lock after the app is actually backgrounded. LocalAuthentication
                // may make a scene inactive while its own system prompt is visible.
                if phase == .background {
                    KokoroSpeechService.shared.stopPlayback()
                    Task { await KokoroSpeechService.shared.releaseInferenceMemory() }
                }
                if store.hasCompletedOnboarding && store.biometricEnabled && phase == .background {
                    isLocked = true
                }
            }
            .onChange(of: store.hasCompletedOnboarding) { completed in
                if completed && store.biometricEnabled { isLocked = true }
            }
        }
    }
}

extension Color {
    /// CareSphere emerald (#10b981) used for tinting across the app.
    static let emerald = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255)
    static let ink = Color(red: 2 / 255, green: 6 / 255, blue: 23 / 255) // slate-950
}
