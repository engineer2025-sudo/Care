import Foundation
import AVFoundation
import CoreLocation

/// Spoken medication/routine prompts via AVSpeechSynthesizer (official iOS
/// text-to-speech — runs entirely on device).
final class SpeechService {
    static let shared = SpeechService()
    private let synthesizer = AVSpeechSynthesizer()

    func speak(_ text: String, enabled: Bool) {
        guard enabled else { return }
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.45          // slower, senior-friendly cadence
        synthesizer.stopSpeaking(at: .immediate)
        synthesizer.speak(utterance)
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
