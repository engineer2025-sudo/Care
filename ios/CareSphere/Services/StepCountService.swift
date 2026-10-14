import Foundation
#if os(iOS)
import CoreMotion

/// Daily step tracking via CoreMotion's CMPedometer — the official motion
/// processor API. Prompts for Motion & Fitness permission on first start and
/// streams step-count updates live. Not available on macOS (no-op stub below).
@MainActor
final class StepCountService: ObservableObject {
    @Published private(set) var hasStarted = false
    @Published var todaySteps: Int = 0
    @Published var isAvailable: Bool = true
    @Published var statusMessage: String = "Step counting is optional. Enable it when you are ready."

    private let pedometer = CMPedometer()
    private var started = false
    private var trackingDay: Date?

    func start() {
        let startOfDay = Calendar.current.startOfDay(for: Date())
        guard !started || trackingDay != startOfDay else { return }
        pedometer.stopUpdates()
        started = true
        hasStarted = true
        trackingDay = startOfDay
        todaySteps = 0
        guard CMPedometer.isStepCountingAvailable() else {
            isAvailable = false
            statusMessage = "Step counting isn't available on this device."
            return
        }
        pedometer.startUpdates(from: startOfDay) { [weak self] data, error in
            DispatchQueue.main.async {
                if let data {
                    self?.isAvailable = true
                    self?.todaySteps = data.numberOfSteps.intValue
                    self?.statusMessage = "Live from the motion coprocessor"
                } else if let error {
                    self?.started = false
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
    @Published private(set) var hasStarted = false
    @Published var todaySteps: Int = 0
    @Published var isAvailable: Bool = false
    @Published var statusMessage: String = "Step tracking is an iPhone feature (motion coprocessor)."
    func start() {}
}
#endif
