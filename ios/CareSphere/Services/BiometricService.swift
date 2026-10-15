import CareActivityKit
import Foundation
import LocalAuthentication

/// Touch ID / Face ID app lock via the official LocalAuthentication frame‐
/// work. Uses `.deviceOwnerAuthentication` for supported passcode fallback,
/// fails closed when authentication is unavailable, and reports which biometry
/// the hardware offers so the UI can say "Touch ID" or "Face ID" correctly.
enum BiometricService {

    /// Human-readable name of the available biometry, e.g. "Touch ID".
    static var biometryName: String {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return "Passcode"
        }
        switch context.biometryType {
        case .touchID: return "Touch ID"
        case .faceID: return "Face ID"
        case .opticID: return "Optic ID"
        default: return "Passcode"
        }
    }

    static var hasBiometrics: Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    /// Caller can invalidate the returned context when leaving/backgrounding.
    @discardableResult
    static func authenticate(reason: String, completion: @escaping (Bool, String?) -> Void) -> LAContext {
        let context = LAContext()
        context.localizedFallbackTitle = AppLanguage.text("Use Passcode")
        var evalError: NSError?
        // Unsupported, cancelled or unavailable authentication must never become success.
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &evalError) else {
            DispatchQueue.main.async { completion(false, AppLanguage.text("Device authentication is unavailable. Your data remains locked. Check device security settings and try again.")) }
            return context
        }
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                completion(AuthenticationGate.accepts(canEvaluate: true, verified: success), error?.localizedDescription)
            }
        }
        return context
    }
}
