import SwiftUI

@main
struct CareSphereApp: App {
    @StateObject private var store = CareStore()
    @StateObject private var healthKit = HealthKitService()
    @StateObject private var bluetooth = BluetoothHeartRateService()
    @StateObject private var notifications = NotificationService.shared
    @StateObject private var location = LocationService()

    init() {
        NotificationService.shared.registerCategories()
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(store)
                .environmentObject(healthKit)
                .environmentObject(bluetooth)
                .environmentObject(notifications)
                .environmentObject(location)
                .tint(.emerald)
        }
    }
}

extension Color {
    /// CareSphere emerald (#10b981) used for tinting across the app.
    static let emerald = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255)
    static let ink = Color(red: 2 / 255, green: 6 / 255, blue: 23 / 255) // slate-950
}
