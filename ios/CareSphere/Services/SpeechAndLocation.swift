import CareActivityKit
import Combine
import Foundation
import AVFoundation
import CoreLocation

/// Spoken medication/routine prompts. Speech synthesis and installed voice data
/// stay on-device; users can choose an installed Apple voice.
final class SpeechService: ObservableObject {
    @Published var unavailableMessage: String?
    static let shared = SpeechService()
    private let synthesizer = AVSpeechSynthesizer()

    static var matchingVoices: [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices()
            .filter { AppLanguage.voiceMatches($0.language) }
            .sorted {
                if $0.quality.rawValue != $1.quality.rawValue {
                    return $0.quality.rawValue > $1.quality.rawValue
                }
                return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
            }
    }

    static func qualityLabel(for voice: AVSpeechSynthesisVoice) -> String {
        // Use raw quality ranks to stay compatible with earlier deployment targets.
        switch voice.quality.rawValue {
        case 3: return "Premium"
        case 2: return "Enhanced"
        default: return "Standard"
        }
    }

    @discardableResult
    func speak(_ text: String, enabled: Bool, voiceIdentifier: String? = nil) -> Bool {
        guard enabled else { return false }
        guard let voice = selectedVoice(identifier: voiceIdentifier) else {
            synthesizer.stopSpeaking(at: .immediate)
            unavailableMessage = AppLanguage.text("No installed voice for this language. The words remain visible.")
            return false
        }
        unavailableMessage = nil

        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.46          // slower, senior-friendly cadence
        utterance.pitchMultiplier = 1.0
        utterance.voice = voice
        synthesizer.stopSpeaking(at: .immediate)
        synthesizer.speak(utterance)
        return true
    }

    func stop() { synthesizer.stopSpeaking(at: .immediate) }

    private func selectedVoice(identifier: String?) -> AVSpeechSynthesisVoice? {
        let installed = Self.matchingVoices
        if let identifier, let selected = installed.first(where: { $0.identifier == identifier }) { return selected }
        return installed.first
    }
}

/// GPS for emergency SOS via CoreLocation, with a delegate that publishes the
/// fix to SwiftUI. When-in-use authorization only — location is never read
/// unless the user taps "Attach my location".
final class LocationService: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var location: CLLocation?
    @Published var errorText: String?
    @Published var isLocating = false

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }

    func request() {
        errorText = nil
        isLocating = true
        manager.requestWhenInUseAuthorization()
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        DispatchQueue.main.async {
            self.location = locations.last
            self.isLocating = false
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        DispatchQueue.main.async {
            self.errorText = error.localizedDescription
            self.isLocating = false
        }
    }
}
