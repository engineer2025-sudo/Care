import Foundation
#if os(iOS)
import CoreMotion

/// Daily step tracking via CoreMotion's CMPedometer — the official motion
/// processor API. Prompts for Motion & Fitness permission on first start and
/// streams step-count updates live. Not available on macOS (no-op stub below).
@MainActor
final class StepCountService: ObservableObject {
    @Published var todaySteps: Int = 0
    @Published var isAvailable: Bool = true
    @Published var statusMessage: String = "Checking motion data…"

    private let pedometer = CMPedometer()
    private var started = false

    func start() {
        guard !started else { return }
        started = true
        guard CMPedometer.isStepCountingAvailable() else {
            isAvailable = false
            statusMessage = "Step counting isn't available on this device."
            return
        }
        let startOfDay = Calendar.current.startOfDay(for: Date())
        pedometer.startUpdates(from: startOfDay) { [weak self] data, error in
            DispatchQueue.main.async {
                if let data {
                    self?.todaySteps = data.numberOfSteps.intValue
                    self?.statusMessage = "Live from the motion coprocessor"
                } else if let error {
                    self?.isAvailable = false
                    self?.statusMessage = "Motion data unavailable (\(error.localizedDescription)). Enable it in Settings → Privacy → Motion & Fitness."
                }
            }
        }
        // startUpdates delivers today's accumulated totals immediately,
        // then streams deltas as the user moves.
    }
}
#else
import Foundation

/// macOS stub — CoreMotion is iOS-only hardware API.
@MainActor
final class StepCountService: ObservableObject {
    @Published var todaySteps: Int = 0
    @Published var isAvailable: Bool = false
    @Published var statusMessage: String = "Step tracking is an iPhone feature (motion coprocessor)."
    func start() {}
}
#endif
