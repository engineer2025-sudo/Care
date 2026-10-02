import Foundation
import Combine
import HealthKit

/// A display-safe summary of a workout read from Apple Health. CareSphere never
/// writes workout or vital data back to HealthKit.
struct HealthWorkoutSummary: Identifiable, Equatable, Sendable {
    let id: UUID
    let activity: String
    let startDate: Date
    let duration: TimeInterval
    let distanceMeters: Double?
    let activeEnergyKilocalories: Double?
    let sourceName: String
    let sourceBundleIdentifier: String

    var isGarminSource: Bool {
        sourceName.localizedCaseInsensitiveContains("Garmin")
            || sourceBundleIdentifier.localizedCaseInsensitiveContains("garmin")
    }

    var sourceTag: String {
        if isGarminSource { return "GARMIN CONNECT" }
        let name = sourceName.trimmingCharacters(in: .whitespacesAndNewlines)
        return name.isEmpty ? "UNKNOWN SOURCE" : String(name.uppercased().prefix(22))
    }
}

/// Reads real vitals and workout summaries from Apple Health. The user controls
/// read access; HealthKit intentionally does not tell an app whether read access
/// was denied, so an empty query is not treated as proof of denial or no data.
final class HealthKitService: NSObject, ObservableObject {
    @Published var heartRate: Double?          // bpm
    @Published var spo2: Double?               // %
    @Published var systolic: Double?            // mmHg
    @Published var diastolic: Double?           // mmHg
    @Published private(set) var workouts: [HealthWorkoutSummary] = []
    @Published private(set) var isLoadingWorkouts = false
    @Published private(set) var workoutQueryError: String?
    @Published private(set) var lastWorkoutRefresh: Date?
    @Published private(set) var hasRequestedAuthorization = false
    @Published var statusMessage = "Apple Health not queried yet"

    private let store = HKHealthStore()
    private static let authorizationRequestKey = "caresphere.healthKit.readAuthorizationRequested"
    private var observerQueries: [HKObserverQuery] = []
    private var observedSampleTypeIdentifiers = Set<String>()
    private var didInstallObservers = false

    /// HealthKit is available when running on a supported iPhone or iPad.
    var canRequestAuthorization: Bool {
        #if os(iOS)
        return HKHealthStore.isHealthDataAvailable()
        #else
        return false
        #endif
    }

    override init() {
        hasRequestedAuthorization = UserDefaults.standard.bool(forKey: Self.authorizationRequestKey)
        super.init()

        #if os(macOS)
        statusMessage = "Apple Health is available on a supported iPhone or iPad. Enable Garmin Connect sharing to Apple Health on iPhone first."
        #else
        guard HKHealthStore.isHealthDataAvailable() else {
            statusMessage = "Apple Health isn't available on this device."
            return
        }
        statusMessage = hasRequestedAuthorization
            ? Self.readAccessRequestedMessage
            : "Apple Health ready — tap Enable to request read-only access to vitals and workouts."
        if hasRequestedAuthorization {
            refreshAll()
        }
        #endif
    }

    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .oxygenSaturation)!,
            HKObjectType.workoutType(),
        ]
        if let bp = HKObjectType.correlationType(forIdentifier: .bloodPressure) {
            types.insert(bp)
        }
        return types
    }

    private static let readAccessRequestedMessage = "Request complete. Apple keeps read-permission choices private; an empty result can mean no records or that a category is not shared. Check Health access and the source app."

    func requestAuthorization() {
        #if os(macOS)
        statusMessage = "HealthKit is unavailable on this device. On iPhone, enable Garmin Connect's Apple Health sharing and authorize CareSphere there."
        #else
        guard HKHealthStore.isHealthDataAvailable() else {
            statusMessage = "Apple Health isn't available on this device."
            return
        }
        // Read-only by design. In particular, workoutType is requested here so
        // Garmin Connect workouts written into Apple Health can be queried.
        store.requestAuthorization(toShare: [], read: readTypes) { [weak self] success, error in
            DispatchQueue.main.async {
                guard let self else { return }
                guard success, error == nil else {
                    self.statusMessage = "Could not complete the Apple Health request: \(error?.localizedDescription ?? "try again")"
                    return
                }
                // `success` only means the request completed. HealthKit hides the
                // user's read grant/deny choice from apps for privacy.
                self.hasRequestedAuthorization = true
                UserDefaults.standard.set(true, forKey: Self.authorizationRequestKey)
                self.statusMessage = Self.readAccessRequestedMessage
                self.refreshAll()
            }
        }
        #endif
    }

    /// Refreshes the latest vitals and recent workouts. Called after the user
    /// requests access and again when the app returns to the foreground.
    func refreshAll() {
        guard canRequestAuthorization, hasRequestedAuthorization else { return }
        installObserversIfNeeded()

        if let hrType = HKObjectType.quantityType(forIdentifier: .heartRate) {
            fetchLatestQuantity(hrType, unit: HKUnit.count().unitDivided(by: .minute())) { [weak self] value in
                DispatchQueue.main.async { self?.heartRate = value }
            }
        }
        if let spo2Type = HKObjectType.quantityType(forIdentifier: .oxygenSaturation) {
            fetchLatestQuantity(spo2Type, unit: .percent()) { [weak self] value in
                DispatchQueue.main.async { self?.spo2 = value.map { $0 * 100 } }
            }
        }
        if let bpType = HKObjectType.correlationType(forIdentifier: .bloodPressure) {
            fetchLatestBloodPressure(bpType)
        }
        refreshWorkouts()
    }

    /// Fetches the 25 most recent workouts that HealthKit makes visible to the
    /// app. Garmin Connect must first write an activity into Apple Health.
    func refreshWorkouts() {
        guard canRequestAuthorization, hasRequestedAuthorization else { return }
        fetchRecentWorkouts()
    }

    private func fetchRecentWorkouts(completion: (() -> Void)? = nil) {
        let type = HKObjectType.workoutType()
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        DispatchQueue.main.async { [weak self] in
            self?.isLoadingWorkouts = true
            self?.workoutQueryError = nil
        }

        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 25, sortDescriptors: [sort]) { [weak self] _, samples, error in
            let summaries = (samples as? [HKWorkout] ?? []).map { Self.summary(from: $0) }
            DispatchQueue.main.async {
                guard let self else {
                    completion?()
                    return
                }
                self.workoutQueryError = error?.localizedDescription
                self.workouts = summaries
                self.lastWorkoutRefresh = Date()
                self.isLoadingWorkouts = false
                completion?()
            }
        }
        store.execute(query)
    }

    private static func summary(from workout: HKWorkout) -> HealthWorkoutSummary {
        let distance = workout.totalDistance?.doubleValue(for: .meter())
        let energy = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie())
        let source = workout.sourceRevision.source
        return HealthWorkoutSummary(
            id: workout.uuid,
            activity: activityName(for: workout.workoutActivityType),
            startDate: workout.startDate,
            duration: workout.duration,
            distanceMeters: distance,
            activeEnergyKilocalories: energy,
            sourceName: source.name,
            sourceBundleIdentifier: source.bundleIdentifier)
    }

    private static func activityName(for activity: HKWorkoutActivityType) -> String {
        switch activity {
        case .running: return "Run"
        case .walking: return "Walk"
        case .cycling: return "Ride"
        case .swimming: return "Swim"
        case .hiking: return "Hike"
        case .yoga: return "Yoga"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "Strength"
        default: return "Workout"
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
        let query = HKCorrelationQuery(type: bpType, predicate: nil, samplePredicates: nil) { [weak self] _, correlations, _ in
            guard let correlation = correlations?.max(by: { $0.endDate < $1.endDate }) else {
                DispatchQueue.main.async {
                    self?.systolic = nil
                    self?.diastolic = nil
                }
                return
            }
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
                self?.systolic = sys
                self?.diastolic = dia
            }
        }
        store.execute(query)
    }

    /// Installs each long-running observer once. Background delivery is
    /// configured for the iOS target; HealthKit still controls when updates run.
    private func installObserversIfNeeded() {
        #if os(iOS)
        guard !didInstallObservers else { return }
        didInstallObservers = true

        if let hrType = HKObjectType.quantityType(forIdentifier: .heartRate) {
            observe(hrType)
        }
        if let spo2Type = HKObjectType.quantityType(forIdentifier: .oxygenSaturation) {
            observe(spo2Type)
        }
        observeWorkouts()
        #endif
    }

    private func observe(_ type: HKQuantityType) {
        guard observedSampleTypeIdentifiers.insert(type.identifier).inserted else { return }
        #if os(iOS)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
        #endif
        let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, error in
            guard let self, error == nil else {
                completion()
                return
            }
            if type.identifier == HKObjectType.quantityType(forIdentifier: .heartRate)?.identifier {
                self.fetchLatestQuantity(type, unit: HKUnit.count().unitDivided(by: .minute())) { [weak self] value in
                    DispatchQueue.main.async {
                        self?.heartRate = value
                        completion()
                    }
                }
            } else {
                self.fetchLatestQuantity(type, unit: .percent()) { [weak self] value in
                    DispatchQueue.main.async {
                        self?.spo2 = value.map { $0 * 100 }
                        completion()
                    }
                }
            }
        }
        observerQueries.append(query)
        store.execute(query)
    }

    private func observeWorkouts() {
        let type = HKObjectType.workoutType()
        guard observedSampleTypeIdentifiers.insert(type.identifier).inserted else { return }
        #if os(iOS)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
        #endif
        let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, error in
            guard let self, error == nil else {
                completion()
                return
            }
            self.fetchRecentWorkouts(completion: completion)
        }
        observerQueries.append(query)
        store.execute(query)
    }
}
