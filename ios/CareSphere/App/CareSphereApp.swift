import SwiftUI

@main
struct CareSphereApp: App {
    @StateObject private var store = CareStore()
    @StateObject private var healthKit = HealthKitService()
    @StateObject private var bluetooth = BluetoothHeartRateService()
    @StateObject private var notifications = NotificationService.shared
    @StateObject private var location = LocationService()
    @StateObject private var steps = StepCountService()

    @Environment(\.scenePhase) private var scenePhase
    @State private var isLocked = false

    init() {
        NotificationService.shared.registerCategories()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if store.hasCompletedOnboarding {
                    RootTabView()
                        .fullScreenOrSheetLock(isPresented: $isLocked) {
                            AppLockView(onUnlock: { isLocked = false })
                        }
                        .onAppear {
                            if store.biometricEnabled && !isLocked && !hasShownInitialLock {
                                hasShownInitialLock = true
                                isLocked = true
                            }
                            steps.start()
                        }
                } else {
                    OnboardingView()
                }
            }
            .environmentObject(store)
            .environmentObject(healthKit)
            .environmentObject(bluetooth)
            .environmentObject(notifications)
            .environmentObject(location)
            .environmentObject(steps)
            .tint(.emerald)
            .onChange(of: scenePhase) { phase in
                // Lock whenever the app leaves the foreground (if enabled).
                if store.hasCompletedOnboarding && store.biometricEnabled && phase != .active {
                    isLocked = true
                }
            }
        }
    }

    @State private var hasShownInitialLock = false
}

/// fullScreenCover on iPhone; window-modal sheet on macOS (no fullScreenCover there).
private extension View {
    @ViewBuilder
    func fullScreenOrSheetLock<Content: View>(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) -> some View {
        #if os(iOS)
        self.fullScreenCover(isPresented: isPresented, content: content)
        #else
        self.sheet(isPresented: isPresented, content: content)
        #endif
    }
}

extension Color {
    /// CareSphere emerald (#10b981) used for tinting across the app.
    static let emerald = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255)
    static let ink = Color(red: 2 / 255, green: 6 / 255, blue: 23 / 255) // slate-950
}
