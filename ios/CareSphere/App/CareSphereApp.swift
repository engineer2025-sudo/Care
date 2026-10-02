import SwiftUI
#if os(iOS)
import UIKit
#else
import AppKit
#endif

@main
struct CareSphereApp: App {
    @StateObject private var store = CareStore()
    @StateObject private var healthKit = HealthKitService()
    @StateObject private var bluetooth = BluetoothHeartRateService()
    @StateObject private var notifications = NotificationService.shared
    @StateObject private var location = LocationService()
    @StateObject private var steps = StepCountService()
    @StateObject private var localAssistant = LocalAssistantService()
    @StateObject private var careSupport = CareSupportCoordinator()
    @StateObject private var kokoroSpeech = KokoroSpeechService.shared

    @Environment(\.scenePhase) private var scenePhase
    @State private var isLocked = false
    @State private var hasCheckedInitialLock = false

    private var preferredColorScheme: ColorScheme? {
        switch store.colorAppearance {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }

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
            .environmentObject(careSupport)
            .environmentObject(kokoroSpeech)
            .preferredColorScheme(preferredColorScheme)
            .environment(\.careSphereHighContrast, store.highContrast)
            .tint(.emerald)
            .safeAreaInset(edge: .top, spacing: 0) {
                if let issue = store.persistenceIssue {
                    Label(issue, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption.weight(.medium))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .foregroundStyle(.primary)
                        .background(Color.orange.opacity(0.18))
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
            .fullScreenCover(item: $careSupport.activeFlow) { flow in
                CareSupportFlowView(flow: flow)
                    .environmentObject(store)
                    .environmentObject(careSupport)
            }
            .onReceive(bluetooth.$bpm) { bpm in
                careSupport.observeLiveHeartRate(
                    bpm,
                    checkInsEnabled: store.heartRateCheckInEnabled && store.hasCompletedOnboarding && !isLocked)
            }
            .onAppear {
                careSupport.setAppActive(true)
                store.refreshMedicationReminders()
                if !hasCheckedInitialLock {
                    hasCheckedInitialLock = true
                    if store.biometricEnabled { isLocked = true }
                }
                steps.start()
            }
            .onChange(of: scenePhase) { phase in
                careSupport.setAppActive(phase == .active)
                if phase == .active && healthKit.hasRequestedAuthorization {
                    healthKit.refreshAll()
                }
                // Lock after the app is actually backgrounded. LocalAuthentication
                // may make a scene inactive while its own system prompt is visible.
                if phase == .background {
                    careSupport.finish()
                    KokoroSpeechService.shared.stopPlayback()
                    Task { await KokoroSpeechService.shared.releaseInferenceMemory() }
                }
                if store.hasCompletedOnboarding && store.biometricEnabled && phase == .background {
                    isLocked = true
                }
            }
            .onChange(of: store.heartRateCheckInEnabled) { enabled in
                if !enabled { careSupport.observeLiveHeartRate(nil, checkInsEnabled: false) }
            }
            .onChange(of: store.hasCompletedOnboarding) { completed in
                if completed && store.biometricEnabled { isLocked = true }
            }
        }
    }
}

extension Color {
    /// Muted sage for filled controls; white labels remain readable on this shade.
    static let emerald = Color(red: 55 / 255, green: 111 / 255, blue: 76 / 255)

    /// Contrast-aware sage text: dark ink in light appearance, light sage in dark.
    static let emeraldText: Color = {
        #if os(iOS)
        return Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 140 / 255, green: 187 / 255, blue: 151 / 255, alpha: 1)
                : UIColor(red: 38 / 255, green: 96 / 255, blue: 57 / 255, alpha: 1)
        })
        #else
        return Color(NSColor(name: nil) { appearance in
            let matched = appearance.bestMatch(from: [.darkAqua, .aqua])
            return matched == .darkAqua
                ? NSColor(red: 140 / 255, green: 187 / 255, blue: 151 / 255, alpha: 1)
                : NSColor(red: 38 / 255, green: 96 / 255, blue: 57 / 255, alpha: 1)
        })
        #endif
    }()

    /// Follow the user's system appearance rather than forcing a dark canvas.
    static let ink: Color = {
        #if os(iOS)
        return Color(uiColor: .systemBackground)
        #else
        return Color(NSColor.windowBackgroundColor)
        #endif
    }()
}
