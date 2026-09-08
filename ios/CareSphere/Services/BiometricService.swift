import Foundation
import LocalAuthentication

/// Touch ID / Face ID app lock via the official LocalAuthentication frame‐
/// work. Uses `.deviceOwnerAuthentication` so users can always fall back to
/// the device passcode (never locks people out), and reports which biometry
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

    /// Prompts the user. Falls back to the device passcode automatically.
    static func authenticate(reason: String, completion: @escaping (Bool, String?) -> Void) {
        let context = LAContext()
        context.localizedFallbackTitle = "Use Passcode"
        var evalError: NSError?
        // .deviceOwnerAuthentication = biometrics OR passcode — always solvable.
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &evalError) else {
            completion(true, nil)   // nothing to authenticate against — don't lock out
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                completion(success, error?.localizedDescription)
            }
        }
    }
}
