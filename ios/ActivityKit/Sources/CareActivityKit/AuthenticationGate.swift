import Foundation

/// Failure, unsupported authentication and stale/background callbacks never unlock.
public enum AuthenticationGate {
    public static func accepts(canEvaluate: Bool, verified: Bool, currentAttempt: Bool = true, foreground: Bool = true) -> Bool {
        canEvaluate && verified && currentAttempt && foreground
    }
}
