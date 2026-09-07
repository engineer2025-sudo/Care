import Foundation
import HealthKit

/// Reads real vitals from Apple Health — the official iOS source for Apple
/// Watch heart rate, blood-oxygen readings and blood-pressure results stored
/// by connected cuff apps. Observes new samples so values refresh live while
/// the app is open (background delivery is also requested).
final class HealthKitService: NSObject, ObservableObject {
    @Published var heartRate: Double?          // bpm
    @Published var spo2: Double?               // %
    @Published var systolic: Double?           // mmHg
    @Published var diastolic: Double?          // mmHg
    @Published var isAuthorized = false
    @Published var statusMessage = "Apple Health not queried yet"

    private let store = HKHealthStore()

    override init() {
        super.init()
        guard HKHealthStore.isHealthDataAvailable() else {
            statusMessage = "Apple Health isn't available on this device."
            return
        }
    }

    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!,
        ]
        if let bp = HKObjectType.correlationType(forIdentifier: .bloodPressure) {
            types.insert(bp)
        }
        return types
    }

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        store.requestAuthorization(toShare: [], read: readTypes) { [weak self] granted, error in
            DispatchQueue.main.async {
                self?.isAuthorized = granted
                self?.statusMessage = granted
                    ? "Reading from Apple Health"
                    : "Apple Health access denied (\(error?.localizedDescription ?? "user declined"))"
                if granted { self?.refreshAll() }
            }
        }
    }

    /// Fetches the newest sample of each metric and starts live observation.
    func refreshAll() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        if let hrType = HKObjectType.quantityType(forIdentifier: .heartRate) {
            fetchLatestQuantity(hrType, unit: HKUnit.count().unitDivided(by: .minute())) { value in
                DispatchQueue.main.async {
                    if let bpm = value { self.heartRate = bpm }
                }
            }
            observe(hrType)
        }
        if let spo2Type = HKObjectType.quantityType(forIdentifier: .oxygenSaturation) {
            fetchLatestQuantity(spo2Type, unit: .percent()) { value in
                DispatchQueue.main.async {
                    if let fraction = value { self.spo2 = fraction * 100 }
                }
            }
            observe(spo2Type)
        }
        if let bpType = HKObjectType.correlationType(forIdentifier: .bloodPressure) {
            fetchLatestBloodPressure(bpType)
        }
    }

    private func fetchLatestQuantity(
        _ type: HKQuantityType, unit: HKUnit, completion: @escaping (Double?) -> Void
    ) {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            completion((samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit))
        }
        store.execute(query)
    }

    private func fetchLatestBloodPressure(_ bpType: HKCorrelationType) {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKCorrelationQuery(type: bpType, predicate: nil, samplePredicates: nil) { [weak self] _, correlations, _ in
            guard let correlation = correlations?.last else { return }
            var sys: Double?
            var dia: Double?
            for sample in (correlation.objects as? Set<HKQuantitySample>) ?? [] {
                if sample.sampleType == HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic) {
                    sys = sample.quantity.doubleValue(for: HKUnit(from: "mmHg"))
                }
                if sample.sampleType == HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic) {
                    dia = sample.quantity.doubleValue(for: HKUnit(from: "mmHg"))
                }
            }
            DispatchQueue.main.async {
                if let sys { self?.systolic = sys }
                if let dia { self?.diastolic = dia }
            }
        }
        store.execute(query)
    }

    /// Live updates: re-fetch whenever Apple Health gains a new sample.
    private func observe(_ type: HKQuantityType) {
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
        let observer = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, _ in
            if type == HKObjectType.quantityType(forIdentifier: .heartRate) {
                self?.refreshAll()
            }
            completion()
        }
        store.execute(observer)
    }
}
