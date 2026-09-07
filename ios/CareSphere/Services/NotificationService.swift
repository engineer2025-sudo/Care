import Foundation
import UserNotifications

extension Notification.Name {
    static let careSphereTakeMed = Notification.Name("careSphereTakeMed")
    static let careSphereSnoozeMed = Notification.Name("careSphereSnoozeMed")
}

/// Official iOS medication reminders: UNUserNotificationCenter with a daily
/// UNCalendarNotificationTrigger per dose and actionable lock-screen buttons
/// ("✓ Taken" / "Snooze 10 min") handled via UNUserNotificationCenterDelegate.
final class NotificationService: NSObject, ObservableObject {
    static let shared = NotificationService()

    @Published var authorizationStatus: UNAuthorizationStatus = .notDetermined

    override init() {
        super.init()
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.authorizationStatus = settings.authorizationStatus
            }
        }
    }

    func registerCategories() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        let take = UNNotificationAction(identifier: "TAKE_ACTION", title: "✓ Taken", options: [.authenticationRequired])
        let snooze = UNNotificationAction(identifier: "SNOOZE_ACTION", title: "Snooze 10 min", options: [])
        center.setNotificationCategories([
            UNNotificationCategory(identifier: "MED_DOSE", actions: [take, snooze], intentIdentifiers: [], options: []),
        ])
    }

    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                self.authorizationStatus = granted ? .authorized : .denied
            }
        }
    }

    /// Rebuilds the pending daily reminders so they always mirror the store.
    func syncMedicationReminders(_ meds: [Medication]) {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
            center.removeAllPendingNotificationRequests()
            for med in meds where !med.isTaken {
                var comps = DateComponents()
                comps.hour = med.hour
                comps.minute = med.minute
                let content = UNMutableNotificationContent()
                content.title = "💊 Time for \(med.shortName)"
                content.body = "Scheduled for \(med.timeLabel) — \(med.purpose). Mark it taken when done."
                content.sound = .default
                content.categoryIdentifier = "MED_DOSE"
                content.userInfo = ["medId": med.id.uuidString]
                let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
                center.add(UNNotificationRequest(identifier: "med-\(med.id.uuidString)", content: content, trigger: trigger))
            }
        }
    }
}

extension NotificationService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let idString = response.notification.request.content.userInfo["medId"] as? String
        switch response.actionIdentifier {
        case "TAKE_ACTION":
            if let uuid = idString.flatMap(UUID.init(uuidString:)) {
                NotificationCenter.default.post(name: .careSphereTakeMed, object: nil, userInfo: ["medId": uuid.uuidString])
            }
        case "SNOOZE_ACTION":
            if let uuid = idString.flatMap(UUID.init(uuidString:)) {
                NotificationCenter.default.post(name: .careSphereSnoozeMed, object: nil, userInfo: ["medId": uuid.uuidString])
            }
        default:
            break
        }
        completionHandler()
    }
}
