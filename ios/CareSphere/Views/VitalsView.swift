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

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    sensorBar
                    triageBanner
                    heartRateCard
                    spo2Card
                    bloodPressureCard
                    howItWorks
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Vitals & Telehealth")
            .navigationBarTitleDisplayMode(.inline)
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
                        .foregroundStyle(bluetooth.isConnected ? Color.emerald : Color.secondary)
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
                    Image(systemName: "heart.text.square.fill")
                        .foregroundStyle(healthKit.isAuthorized ? Color.pink : Color.secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        StatusChip(text: healthKit.isAuthorized ? "HEALTHKIT ON" : "HEALTHKIT OFF",
                                   color: healthKit.isAuthorized ? .pink : .gray)
                        Text(healthKit.statusMessage).font(.caption2).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Enable") { healthKit.requestAuthorization() }
                        .buttonStyle(.bordered)
                        .font(.caption.weight(.bold))
                        .disabled(healthKit.isAuthorized)
                }
            }
        }
    }

    private var triageBanner: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: anyFlag ? "exclamationmark.triangle.fill" : "checkmark.seal.fill")
                .foregroundStyle(anyFlag ? Color.orange : Color.emerald)
            VStack(alignment: .leading, spacing: 3) {
                Text(anyFlag ? "Triage flag — reading outside expected range" : "All readings within expected ranges")
                    .font(.footnote.weight(.black))
                Text("Thresholds: HR 50–110 bpm · SpO₂ ≥ 94% · BP < 140/90 mmHg. Flags notify your Care Circle and pre-fill the telehealth summary.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(anyFlag ? Color.orange.opacity(0.14) : Color.emerald.opacity(0.12),
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
                        .foregroundStyle(Color.emerald)
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
                    .background(Color(.tertiarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
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
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

extension Color {
    static let skyBlue = Color(red: 0.29, green: 0.65, blue: 0.93)
}

extension HealthKitService {
    /// Small convenience for tinting the SpO₂ progress bar.
    var spo2FlagView: Bool { (spo2 ?? 99) < 94 }
}
