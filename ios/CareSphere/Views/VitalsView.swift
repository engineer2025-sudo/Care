import SwiftUI
import Charts

struct VitalsPoint: Identifiable {
    let id = UUID()
    let date: Date
    let bpm: Double
}

struct VitalsView: View {
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var healthKit: HealthKitService
    @EnvironmentObject private var bluetooth: BluetoothHeartRateService

    @State private var series: [VitalsPoint] = []

    private var effectiveHR: Double? { bluetooth.bpm.map(Double.init) ?? healthKit.heartRate }
    private var hrFlag: Bool { effectiveHR.map { $0 < 50 || $0 > 110 } ?? false }
    private var spo2Flag: Bool { healthKit.spo2.map { $0 < 94 } ?? false }
    private var bpFlag: Bool {
        if let sys = healthKit.systolic, sys > 140 { return true }
        if let dia = healthKit.diastolic, dia > 90 { return true }
        return false
    }
    private var anyFlag: Bool { hrFlag || spo2Flag || bpFlag }
    private var hasAnyReading: Bool {
        effectiveHR != nil || healthKit.spo2 != nil || healthKit.systolic != nil || healthKit.diastolic != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    sensorBar
                    garminCard
                    workoutsCard
                    referenceRangeBanner
                    heartRateCard
                    spo2Card
                    bloodPressureCard
                    howItWorks
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Vitals & Telehealth")
            .inlineTitle()
            .onAppear {
                if healthKit.hasRequestedAuthorization { healthKit.refreshAll() }
            }
            .onReceive(bluetooth.$bpm.compactMap { $0 }) { value in
                series.append(VitalsPoint(date: Date(), bpm: Double(value)))
                if series.count > 60 { series.removeFirst() }
            }
        }
    }

    private var sensorBar: some View {
        SectionCard(title: "Connected sensors", systemImage: "antenna.radiowaves.left.and.right") {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: bluetooth.isConnected ? "dot.radiowaves.left.and.right" : "bluetooth")
                        .foregroundStyle(bluetooth.isConnected ? Color.emeraldText : Color.secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            StatusChip(
                                text: bluetooth.isConnected ? "LIVE BLE" : "NOT PAIRED",
                                color: bluetooth.isConnected ? .emerald : .gray)
                            if let name = bluetooth.sensorName {
                                Text(name).font(.caption.weight(.semibold))
                            }
                        }
                        Text(bluetooth.statusMessage).font(.caption2).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button(bluetooth.isConnected ? "Disconnect" : "Pair") {
                        bluetooth.isConnected ? bluetooth.disconnect() : bluetooth.pair()
                    }
                    .buttonStyle(.bordered)
                    .font(.caption.weight(.bold))
                }
                Divider()
                HStack(spacing: 8) {
                    Image(systemName: healthKit.hasRequestedAuthorization ? "heart.text.square.fill" : "heart.text.square")
                        .foregroundStyle(healthKit.hasRequestedAuthorization ? Color.pink : Color.secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        StatusChip(
                            text: healthKit.canRequestAuthorization
                                ? (healthKit.hasRequestedAuthorization ? "READ REQUESTED" : "READY · NOT ENABLED")
                                : "iOS ONLY",
                            color: healthKit.hasRequestedAuthorization ? .pink : healthKit.canRequestAuthorization ? .skyBlue : .gray)
                        Text(healthKit.statusMessage).font(.caption2).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button(healthKit.canRequestAuthorization
                           ? (healthKit.hasRequestedAuthorization ? "Review" : "Enable")
                           : "iOS app") {
                        healthKit.requestAuthorization()
                    }
                    .buttonStyle(.bordered)
                    .font(.caption.weight(.bold))
                    .disabled(!healthKit.canRequestAuthorization)
                }
            }
        }
    }

    /// Garmin wearables broadcast the *standard* Bluetooth Heart Rate profile
    /// (0x180D), so the same CoreBluetooth pairing flow connects to them.
    private var garminCard: some View {
        SectionCard(title: "Connect Garmin", systemImage: "figure.run") {
            VStack(alignment: .leading, spacing: 8) {
                Text("Garmin watches (Forerunner, Venu, Fenix, vivoactive) broadcast standard Bluetooth heart rate — pair them exactly like any chest strap:")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Label {
                    Text("On the watch: **Settings → Health & Wellness → Wrist Heart Rate → Broadcast Heart Rate** (Venu/vivoactive) or **Settings → Sensors & Accessories → Wrist Heart Rate → Broadcast Heart Rate** (Forerunner/Fenix).")
                        .font(.caption)
                } icon: {
                    Image(systemName: "1.circle.fill").foregroundStyle(Color.emeraldText)
                }
                Label {
                    Text("Keep the watch on the broadcast screen nearby, then tap **Pair** above — it appears as a heart-rate monitor.")
                        .font(.caption)
                } icon: {
                    Image(systemName: "2.circle.fill").foregroundStyle(Color.emeraldText)
                }
                Label {
                    Text("Live BPM streams here and into the sparkline. Turn off broadcast on the watch afterwards to save battery.")
                        .font(.caption)
                } icon: {
                    Image(systemName: "3.circle.fill").foregroundStyle(Color.emeraldText)
                }
            }
        }
    }

    private var workoutsCard: some View {
        SectionCard(title: "Recent workouts", systemImage: "figure.run") {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    StatusChip(text: "READ-ONLY · APPLE HEALTH", color: .skyBlue)
                    Text("CareSphere reads workout summaries; it never writes or edits Health records.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 4)
                Button {
                    healthKit.refreshWorkouts()
                } label: {
                    if healthKit.isLoadingWorkouts {
                        ProgressView().controlSize(.small)
                    } else {
                        Label("Refresh", systemImage: "arrow.clockwise")
                            .font(.caption.weight(.bold))
                    }
                }
                .buttonStyle(.bordered)
                .disabled(!healthKit.canRequestAuthorization || !healthKit.hasRequestedAuthorization || healthKit.isLoadingWorkouts)
                .accessibilityLabel("Refresh workouts from Apple Health")
            }

            if !healthKit.canRequestAuthorization {
                Label("Apple Health workout readings are available on a supported iPhone or iPad.",
                      systemImage: "iphone")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            } else if !healthKit.hasRequestedAuthorization {
                Label("Tap Enable above to request Health access. You can choose which categories to share.",
                      systemImage: "hand.tap")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            } else if healthKit.isLoadingWorkouts && healthKit.workouts.isEmpty {
                ProgressView("Checking Apple Health…")
                    .font(.caption)
                    .tint(.emerald)
            } else if healthKit.workouts.isEmpty {
                Label("No workouts are visible yet. HealthKit hides read-permission decisions, so check CareSphere's Workouts access and confirm a workout exists in Apple Health.",
                      systemImage: "figure.run")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                VStack(spacing: 9) {
                    ForEach(healthKit.workouts) { workout in
                        WorkoutSummaryRow(workout: workout)
                    }
                }
                .animation(.easeInOut(duration: 0.2), value: healthKit.workouts.count)
            }

            if let error = healthKit.workoutQueryError {
                Label("Apple Health could not load workouts: \(error)", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption2)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            }

            #if os(iOS)
            Text("Garmin setup: Garmin Connect → More → Settings → Connect Apps → Apple Health → Connect with Apple Health. Allow Workouts, then keep Garmin Connect open while the watch syncs; Garmin says Health transfer pauses when Connect closes. Apple Health receives workout summaries, not Garmin GPS tracks.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .fixedSize(horizontal: false, vertical: true)
            Link("Garmin's Apple Health instructions", destination: URL(string: "https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA")!)
                .font(.caption2.weight(.semibold))
            #else
            Text("Garmin workouts must first be shared to Apple Health on iPhone. Direct Garmin-account syncing is not available.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .fixedSize(horizontal: false, vertical: true)
            #endif

            if let refreshedAt = healthKit.lastWorkoutRefresh {
                Text("Last checked at \(refreshedAt.formatted(date: .omitted, time: .shortened))")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var referenceRangeBanner: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: anyFlag ? "exclamationmark.triangle.fill" : hasAnyReading ? "checkmark.seal.fill" : "waveform.path.ecg")
                .foregroundStyle(anyFlag ? Color.orange : hasAnyReading ? Color.emeraldText : Color.secondary)
            VStack(alignment: .leading, spacing: 3) {
                Text(anyFlag ? "A reading is outside a broad reference band" : hasAnyReading ? "No displayed reading is outside these broad bands" : "No readings available to compare")
                    .font(.footnote.weight(.black))
                Text("Informational only—not triage or diagnosis. Broad examples: HR 50–110 bpm · SpO₂ ≥ 94% · BP < 140/90 mmHg. An optional check-in uses sustained live Bluetooth HR only; CareSphere does not send alerts or create a clinical summary.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(anyFlag ? Color.orange.opacity(0.14) : hasAnyReading ? Color.emerald.opacity(0.12) : Color.cardInner,
                    in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var heartRateCard: some View {
        SectionCard(title: "Heart rate", systemImage: "waveform.path.ecg") {
            HStack(alignment: .firstTextBaseline) {
                Text(effectiveHR.map { String(Int($0)) } ?? "—")
                    .font(.system(size: 40, weight: .black))
                Text("bpm").font(.caption).foregroundStyle(.secondary)
                Spacer()
                StatusChip(
                    text: bluetooth.bpm != nil ? "LIVE BLE" : healthKit.heartRate != nil ? "APPLE HEALTH" : "NO DATA",
                    color: bluetooth.bpm != nil ? .emerald : .gray)
            }
            if series.count >= 2 {
                Chart(series) { point in
                    LineMark(x: .value("Time", point.date), y: .value("BPM", point.bpm))
                        .foregroundStyle(Color.emeraldText)
                        .interpolationMethod(.catmullRom)
                }
                .chartYAxis(.hidden)
                .frame(height: 90)
            } else {
                Text("Live sparkline appears once a sensor streams readings.")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .frame(height: 90, alignment: .center)
                    .frame(maxWidth: .infinity)
                    .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 12))
            }
            Text("BLE: Bluetooth SIG Heart Rate profile (0x180D/0x2A37) · Apple Health: Apple Watch samples")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    private var spo2Card: some View {
        SectionCard(title: "Blood oxygen (SpO₂)", systemImage: "lungs.fill") {
            HStack(alignment: .firstTextBaseline) {
                Text(healthKit.spo2.map { "\(Int($0))%" } ?? "—")
                    .font(.system(size: 40, weight: .black))
                Spacer()
                StatusChip(text: healthKit.spo2 != nil ? "APPLE WATCH" : "NO READING",
                           color: healthKit.spo2 != nil ? .skyBlue : .gray)
            }
            ProgressView(value: min(max((healthKit.spo2 ?? 88) - 88, 0), 12), total: 12)
                .tint(healthKit.spo2FlagView ? .orange : .blue)
            Text("Read from Apple Health — Apple Watch records SpO₂ automatically; enable it in the Watch app under Blood Oxygen.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    private var bloodPressureCard: some View {
        SectionCard(title: "Blood pressure", systemImage: "stethoscope") {
            HStack(alignment: .firstTextBaseline) {
                Text(healthKit.systolic.map { "\(Int($0)) / \(Int(healthKit.diastolic ?? 0))" } ?? "—")
                    .font(.system(size: 34, weight: .black))
                Text("mmHg").font(.caption).foregroundStyle(.secondary)
                Spacer()
                StatusChip(text: healthKit.systolic != nil ? "APPLE HEALTH" : "NO READING",
                           color: healthKit.systolic != nil ? .skyBlue : .gray)
            }
            Text("iOS doesn't measure BP on-wrist — readings arrive from FDA-cleared Bluetooth cuffs (Omron, Withings) that sync to Apple Health. Refresh after taking a reading.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
            Button {
                healthKit.refreshAll()
            } label: {
                Label("Refresh from Apple Health", systemImage: "arrow.clockwise")
                    .font(.caption.weight(.bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
            }
            .buttonStyle(.bordered)
        }
    }

    private var howItWorks: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("How vitals really reach this screen", systemImage: "info.circle.fill")
                .font(.subheadline.weight(.bold))
            Text("Live BLE: Pairing scans for standard Bluetooth heart-rate monitors and subscribes to GATT notifications — real telemetry, parsed per the Bluetooth SIG spec.")
            Text("Apple Health: heart rate, SpO₂ and blood pressure come from your Apple Watch and connected cuff apps via HealthKit — the official, consent-gated health store on iOS.")
            Text("CareSphere never fabricates numbers: every card is labeled with its true source.")
        }
        .font(.caption)
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

extension Color {
    static let skyBlue = Color(red: 0.29, green: 0.65, blue: 0.93)
}

private struct WorkoutSummaryRow: View {
    let workout: HealthWorkoutSummary

    private var durationLabel: String {
        let totalSeconds = max(0, Int(workout.duration.rounded()))
        let hours = totalSeconds / 3_600
        let minutes = (totalSeconds % 3_600) / 60
        if hours > 0 { return "\(hours) hr \(minutes) min" }
        if totalSeconds < 60 { return "<1 min" }
        return "\(minutes) min"
    }

    private var distanceLabel: String? {
        guard let meters = workout.distanceMeters, meters > 0 else { return nil }
        let formatter = MeasurementFormatter()
        formatter.unitStyle = .short
        formatter.unitOptions = .naturalScale
        return formatter.string(from: Measurement(value: meters, unit: UnitLength.meters))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline) {
                Label(workout.activity, systemImage: "figure.run")
                    .font(.subheadline.weight(.bold))
                Spacer(minLength: 8)
                Text(workout.startDate.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
            }
            HStack(spacing: 12) {
                Label(durationLabel, systemImage: "clock")
                if let distanceLabel {
                    Label(distanceLabel, systemImage: "arrow.left.and.right")
                }
                if let calories = workout.activeEnergyKilocalories, calories > 0 {
                    Label("\(Int(calories.rounded())) kcal", systemImage: "flame")
                }
            }
            .font(.caption2.weight(.medium))
            .foregroundStyle(.secondary)
            HStack(spacing: 6) {
                StatusChip(text: workout.sourceTag, color: workout.isGarminSource ? .emeraldText : .skyBlue)
                Text("via Apple Health · \(workout.sourceName)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

extension HealthKitService {
    /// Small convenience for tinting the SpO₂ progress bar.
    var spo2FlagView: Bool { (spo2 ?? 99) < 94 }
}
