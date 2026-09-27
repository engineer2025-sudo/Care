import Foundation
import AVFoundation
import CoreLocation

/// Spoken medication/routine prompts. Speech synthesis and installed voice data
/// stay on-device; users can choose an Apple voice or an optional Kokoro neural voice.
final class SpeechService {
    static let shared = SpeechService()
    private let synthesizer = AVSpeechSynthesizer()

    static var englishVoices: [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language.lowercased().hasPrefix("en") }
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

    func speak(_ text: String, enabled: Bool, voiceIdentifier: String? = nil) {
        guard enabled else { return }

        if let voiceIdentifier,
           voiceIdentifier.hasPrefix("kokoro:"),
           let speakerID = Int(voiceIdentifier.dropFirst("kokoro:".count)),
           KokoroSpeaker.english.contains(where: { $0.id == speakerID }) {
            synthesizer.stopSpeaking(at: .immediate)
            Task { @MainActor in
                let localSpeech = KokoroSpeechService.shared
                localSpeech.stopPlayback()
                await localSpeech.speak(text, speakerID: speakerID)
            }
            return
        }

        // Switching back to an Apple voice should stop any active neural audio.
        Task { @MainActor in KokoroSpeechService.shared.stopPlayback() }
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.46          // slower, senior-friendly cadence
        utterance.pitchMultiplier = 1.0
        utterance.voice = selectedVoice(identifier: voiceIdentifier)
        synthesizer.stopSpeaking(at: .immediate)
        synthesizer.speak(utterance)
    }

    private func selectedVoice(identifier: String?) -> AVSpeechSynthesisVoice? {
        if let identifier, !identifier.isEmpty,
           let selected = AVSpeechSynthesisVoice(identifier: identifier) {
            return selected
        }
        // Prefer the best-quality installed voice matching the device language.
        let preferredLanguage = Locale.preferredLanguages.first ?? "en-US"
        return AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language == preferredLanguage }
            .max { $0.quality.rawValue < $1.quality.rawValue }
            ?? AVSpeechSynthesisVoice(language: "en-US")
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
