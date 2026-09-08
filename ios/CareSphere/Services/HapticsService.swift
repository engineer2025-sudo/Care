import Foundation
#if os(iOS)
import CoreHaptics
import UIKit

/// Rich custom haptics via CoreHaptics (CHHapticEngine) with a graceful
/// fallback to UINotificationFeedbackGenerator on devices without a Taptic
/// Engine (iPhone 6s and earlier, most simulators).
enum HapticsService {

    private static var engine: CHHapticEngine?

    private static func ensureEngine() -> CHHapticEngine? {
        if let engine { return engine }
        // Probe by constructing the engine — on unsupported hardware this fails.
        guard let newEngine = try? CHHapticEngine() else { return nil }
        newEngine.resetHandler = { try? newEngine.start() }
        try? newEngine.start()
        engine = newEngine
        return engine
    }

    private static func play(_ events: [CHHapticEvent], fallback: UINotificationFeedbackGenerator.FeedbackType) {
        if let hapticEngine = ensureEngine() {
            do {
                let pattern = try CHHapticPattern(events: events, parameters: [])
                let player = try hapticEngine.makePlayer(with: pattern)
                try player.start(atTime: CHHapticTimeImmediate)
                return
            } catch { /* fall through to generator */ }
        }
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(fallback)
    }

    /// Bright double-tap — game wins, check-ins, celebrations.
    static func success() {
        play([
            CHHapticEvent(eventType: .hapticTransient, parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.7),
            ], relativeTime: 0),
            CHHapticEvent(eventType: .hapticTransient, parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
            ], relativeTime: 0.12),
        ], fallback: .success)
    }

    /// Distinct warning pulse — SOS actions, destructive confirmations.
    static func warning() {
        play([
            CHHapticEvent(eventType: .hapticContinuous, parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.4),
            ], relativeTime: 0, duration: 0.25),
        ], fallback: .warning)
    }

    /// Low error thud — wrong pattern tile, failures.
    static func error() {
        play([
            CHHapticEvent(eventType: .hapticContinuous, parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.2),
            ], relativeTime: 0, duration: 0.35),
        ], fallback: .error)
    }
}
#else

/// macOS: no Taptic Engine API — intentional no-ops (visual feedback carries).
enum HapticsService {
    static func success() {}
    static func warning() {}
    static func error() {}
}
#endif
