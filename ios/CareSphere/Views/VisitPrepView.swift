import CareActivityKit
import CryptoKit
import SwiftUI
import UIKit

/// Local, user-selected visit-preparation text. This is not an official record,
/// diagnosis, or clinical interpretation; sharing occurs only after user action.
struct VisitPrepView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var healthKit: HealthKitService

    @State private var includeName = false
    @State private var includeMedications = false
    @State private var includeMoods = false
    @State private var includeNotes = false
    @State private var includeVitals = false
    @State private var includeAppleHealth = false
    @State private var lookbackDays = 30
    @State private var questions = ""
    @State private var pdfURL: URL?
    @State private var showShareSheet = false
    @State private var exportError = ""

    private var cutoff: Date? {
        guard lookbackDays > 0 else { return nil }
        return Calendar.current.date(byAdding: .day, value: -lookbackDays, to: Date())
    }

    private var selectedMoods: [MoodEntry] {
        store.moods
            .filter { mood in cutoff.map { cutoffDate in cutoffDate <= mood.createdAt } ?? true }
            .sorted { $0.createdAt < $1.createdAt }
    }

    private var selectedNotes: [CareNote] {
        store.notes
            .filter { note in cutoff.map { cutoffDate in cutoffDate <= note.createdAt } ?? true }
            .sorted { $0.createdAt > $1.createdAt }
    }

    private var hasSelectedContent: Bool {
        includeName || includeMedications || includeMoods || includeNotes || includeVitals || includeAppleHealth || !questions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var brief: String {
        var lines = [
            "CareSphere · Visit preparation brief",
            "Prepared: \(Date().formatted(date: .abbreviated, time: .shortened))",
            "User-prepared information only. This is not a verified medical record, diagnosis, or clinical interpretation.",
            "",
        ]

        if includeName {
            lines.append("Display name: \(store.displayName.isEmpty ? "Not entered" : store.displayName)")
            lines.append("")
        }
        if includeMedications {
            lines.append("MEDICATION REMINDERS (user-entered; not pharmacy-verified)")
            lines.append("Schedule reviewed in CareSphere: \(store.medicationScheduleConfirmed ? "Yes" : "No — schedule is unconfirmed and reminders are paused.")")
            if store.configuredMedications.isEmpty {
                lines.append("No medication reminders are saved.")
            } else {
                for medication in store.configuredMedications {
                    let status = store.medicationScheduleConfirmed
                        ? (medication.isTaken ? "marked taken by user" : "not marked taken")
                        : "not reviewed"
                    lines.append("- \(medication.name) · \(medication.timeLabel) · \(status)")
                }
            }
            lines.append("")
        }
        if includeMoods {
            lines.append("MOOD CHECK-INS (optional self-reports; not a clinical measure)")
            if selectedMoods.isEmpty {
                lines.append("No mood check-ins in the selected period.")
            } else {
                for mood in selectedMoods {
                    lines.append("- \(mood.createdAt.formatted(date: .abbreviated, time: .omitted)) · \(Self.moodLabel(mood.score))")
                }
            }
            lines.append("")
        }
        if includeNotes {
            lines.append("CARE NOTES (user-entered; not clinician-verified)")
            if selectedNotes.isEmpty {
                lines.append("No care notes in the selected period.")
            } else {
                for note in selectedNotes {
                    lines.append("- \(note.createdAt.formatted(date: .abbreviated, time: .shortened)) · \(note.author): \(note.body)")
                }
            }
            lines.append("")
        }
        if includeAppleHealth {
            lines.append("APPLE HEALTH LATEST READINGS (recorded time and source are shown)")
            var foundReading = false
            if let value = healthKit.heartRate {
                let date = healthKit.heartRateRecordedAt?.formatted(date: .abbreviated, time: .shortened) ?? "time not returned"
                lines.append("- Heart rate · \(String(format: "%.0f", value)) bpm · \(date) · \(healthKit.heartRateSource ?? "source not returned")")
                foundReading = true
            }
            if let value = healthKit.spo2 {
                let date = healthKit.oxygenRecordedAt?.formatted(date: .abbreviated, time: .shortened) ?? "time not returned"
                lines.append("- Blood oxygen · \(String(format: "%.1f", value))% · \(date) · \(healthKit.oxygenSource ?? "source not returned")")
                foundReading = true
            }
            if let systolic = healthKit.systolic, let diastolic = healthKit.diastolic {
                let date = healthKit.bloodPressureRecordedAt?.formatted(date: .abbreviated, time: .shortened) ?? "time not returned"
                lines.append("- Blood pressure · \(String(format: "%.0f", systolic))/\(String(format: "%.0f", diastolic)) mmHg · \(date) · \(healthKit.bloodPressureSource ?? "source not returned")")
                foundReading = true
            }
            if !foundReading { lines.append("No Apple Health readings are currently available to include.") }
            lines.append("")
        }
        if includeVitals {
            lines.append("MANUALLY ENTERED VITALS (self-entered values; not sensor-verified)")
            if store.manualVitals.isEmpty {
                lines.append("No manually entered vital records are saved.")
            } else {
                for vital in store.manualVitals.sorted(by: { $0.at < $1.at }) {
                    lines.append("- \(vital.at.formatted(date: .abbreviated, time: .shortened)) · \(vital.formatted) · entered by user")
                }
            }
            lines.append("")
        }
        if !questions.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            lines.append("QUESTIONS OR TOPICS I WANT TO DISCUSS")
            lines.append(questions.trimmingCharacters(in: .whitespacesAndNewlines))
            lines.append("")
        }
        return lines.joined(separator: "\n")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(AppLanguage.text("Choose what to include")) {
                    Toggle(AppLanguage.text("Display name"), isOn: $includeName)
                    Toggle(AppLanguage.text("Medication reminders"), isOn: $includeMedications)
                    Toggle(AppLanguage.text("Mood check-ins"), isOn: $includeMoods)
                    Toggle(AppLanguage.text("Care notes"), isOn: $includeNotes)
                    Toggle(AppLanguage.text("Manually entered blood pressure and oxygen"), isOn: $includeVitals)
                    Toggle(AppLanguage.text("Apple Health latest readings"), isOn: $includeAppleHealth)
                    if includeMoods || includeNotes {
                        Picker(AppLanguage.text("Look back"), selection: $lookbackDays) {
                            Text(AppLanguage.text("7 days")).tag(7)
                            Text(AppLanguage.text("30 days")).tag(30)
                            Text(AppLanguage.text("90 days")).tag(90)
                            Text(AppLanguage.text("All saved")).tag(0)
                        }
                    }
                    InfoText(AppLanguage.text("Selections are off by default. The date range applies to notes and mood self-reports; the current medication schedule is shown only if you choose it."))
                        .font(.caption2).foregroundStyle(.secondary)
                }

                Section(AppLanguage.text("Questions or topics · optional")) {
                    TextField(AppLanguage.text("Write a question to discuss"), text: $questions, axis: .vertical)
                        .lineLimit(3...6)
                        .onChange(of: questions) { newValue in
                            if newValue.count > 1200 { questions = String(newValue.prefix(1200)) }
                        }
                    InfoText(AppLanguage.text("This draft stays in memory until you close this screen. It is not saved in your journal."))
                        .font(.caption2).foregroundStyle(.secondary)
                }

                Section(AppLanguage.text("Report content preview")) {
                    Text(brief)
                        .font(.system(.caption2, design: .monospaced))
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Section {
                    Button(action: makePDF) {
                        Label(AppLanguage.text("Create sealed PDF…"), systemImage: "doc.richtext")
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .disabled(!hasSelectedContent)
                    Text(AppLanguage.text("The PDF is prepared on this device. Its SHA-256 seal fingerprints the selected report text; it is not a cryptographic PDF signature or proof of identity."))
                        .font(.caption2).foregroundStyle(.secondary)
                }

                Section(AppLanguage.text("About this report")) {
                    InfoText(AppLanguage.text("Only the sections you select are included. Medication, mood, and health entries retain their recorded source; review the report before sharing."))
                    InfoText(AppLanguage.text("PDFs add a final reverse-side data ledger and a decorative stamp with a SHA-256 fingerprint. Enable duplex printing to place it on paper’s back; the stamp is not an identity signature."))
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle(AppLanguage.text("Visit preparation"))
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(AppLanguage.text("Done")) { dismiss() }
                }
            }
            .sheet(isPresented: $showShareSheet, onDismiss: removeTemporaryPDF) {
                if let pdfURL {
                    VisitPrepActivitySheet(items: [pdfURL])
                        .ignoresSafeArea()
                }
            }
            .alert(AppLanguage.text("Could not create PDF"), isPresented: Binding(
                get: { !exportError.isEmpty },
                set: { if !$0 { exportError = "" } }
            )) {
                Button(AppLanguage.text("OK"), role: .cancel) { exportError = "" }
            } message: {
                Text(exportError)
            }
        }
    }

    private func makePDF() {
        do {
            let data = try VisitPrepPDFRenderer.render(brief: brief)
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("caresphere-visit-prep-\\(ISO8601DateFormatter().string(from: Date()).prefix(10)).pdf")
            try data.write(to: url, options: .atomic)
            pdfURL = url
            showShareSheet = true
        } catch {
            exportError = error.localizedDescription
        }
    }

    private func removeTemporaryPDF() {
        if let pdfURL { try? FileManager.default.removeItem(at: pdfURL) }
        pdfURL = nil
    }

    private static func moodLabel(_ score: Int) -> String {
        switch score {
        case 1: return "Struggling"
        case 2: return "Low"
        case 3: return "Okay"
        case 4: return "Good"
        case 5: return "Great"
        default: return "Score \(score)"
        }
    }
}

private struct VisitPrepActivitySheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

private enum VisitPrepPDFRenderer {
    private static let page = CGRect(x: 0, y: 0, width: 612, height: 792)
    private static let ink = UIColor(red: 0.08, green: 0.18, blue: 0.21, alpha: 1)
    private static let muted = UIColor(red: 0.34, green: 0.44, blue: 0.45, alpha: 1)
    private static let teal = UIColor(red: 0.08, green: 0.42, blue: 0.40, alpha: 1)
    private static let mint = UIColor(red: 0.92, green: 0.97, blue: 0.94, alpha: 1)
    static func render(brief: String) throws -> Data {
        let digest = SHA256.hash(data: Data(brief.utf8)).map { String(format: "%02x", $0) }.joined()
        let briefLines = brief.components(separatedBy: .newlines)
        let preparedAt = briefLines.first(where: { $0.hasPrefix("Prepared:") }).map { String($0.dropFirst("Prepared:".count)).trimmingCharacters(in: .whitespaces) } ?? "time not recorded"
        let renderer = UIGraphicsPDFRenderer(bounds: page)
        return renderer.pdfData { pdf in
            var pageNumber = 0
            var y: CGFloat = 0

            func text(_ value: String, x: CGFloat = 52, width: CGFloat = 508,
                      font: UIFont = .systemFont(ofSize: 10), color: UIColor = ink,
                      weight: UIFont.Weight = .regular, lineSpacing: CGFloat = 3) -> CGFloat {
                let styledFont = UIFont.systemFont(ofSize: font.pointSize, weight: weight)
                let attributes: [NSAttributedString.Key: Any] = [.font: styledFont, .foregroundColor: color]
                var total: CGFloat = 0
                for paragraph in value.components(separatedBy: .newlines) {
                    var wrappedLines: [String] = []
                    var current = ""
                    for word in paragraph.split(whereSeparator: { $0.isWhitespace }).map { String($0) } {
                        let candidate = current.isEmpty ? word : current + " " + word
                        if (candidate as NSString).size(withAttributes: attributes).width <= width {
                            current = candidate
                        } else if current.isEmpty {
                            var fragment = ""
                            for character in word {
                                let next = fragment + String(character)
                                if (next as NSString).size(withAttributes: attributes).width > width, !fragment.isEmpty {
                                    wrappedLines.append(fragment)
                                    fragment = String(character)
                                } else { fragment = next }
                            }
                            current = fragment
                        } else {
                            wrappedLines.append(current)
                            current = word
                        }
                    }
                    wrappedLines.append(current)
                    for line in wrappedLines {
                        let lineHeight = styledFont.lineHeight + lineSpacing
                        if y + lineHeight > 735 {
                            let footerAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 7), .foregroundColor: muted]
                            ("CareSphere · Personal visit preparation                                      Page \\(pageNumber)" as NSString).draw(at: CGPoint(x: 52, y: 761), withAttributes: footerAttrs)
                            pdf.beginPage()
                            pageNumber += 1
                            y = 55
                            let headerAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 8, weight: .bold), .foregroundColor: teal]
                            ("CARESPHERE  ·  VISIT PREPARATION" as NSString).draw(at: CGPoint(x: 52, y: 32), withAttributes: headerAttrs)
                        }
                        (line as NSString).draw(at: CGPoint(x: x, y: y), withAttributes: attributes)
                        y += lineHeight
                        total += lineHeight
                    }
                }
                y += 7
                return total + 7
            }

            func footer() {
                let rule = UIBezierPath()
                rule.move(to: CGPoint(x: 52, y: 753))
                rule.addLine(to: CGPoint(x: 560, y: 753))
                UIColor(red: 0.86, green: 0.91, blue: 0.88, alpha: 1).setStroke()
                rule.lineWidth = 0.7
                rule.stroke()
                let label = "CareSphere · Personal visit preparation                                      Page \(pageNumber)"
                let attrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 7), .foregroundColor: muted]
                (label as NSString).draw(at: CGPoint(x: 52, y: 761), withAttributes: attrs)
            }

            func startPage() {
                pdf.beginPage()
                pageNumber += 1
                if pageNumber == 1 {
                    let context = pdf.cgContext
                    let colors = [UIColor(red: 0.06, green: 0.23, blue: 0.27, alpha: 1).cgColor,
                                  UIColor(red: 0.08, green: 0.44, blue: 0.41, alpha: 1).cgColor] as CFArray
                    let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1])!
                    context.drawLinearGradient(gradient, start: CGPoint(x: 0, y: 0), end: CGPoint(x: 612, y: 190), options: [])
                    context.setStrokeColor(UIColor.white.withAlphaComponent(0.15).cgColor)
                    context.setLineWidth(1)
                    context.strokeEllipse(in: CGRect(x: 474, y: -84, width: 190, height: 190))
                    context.strokeEllipse(in: CGRect(x: 453, y: -105, width: 232, height: 232))
                    let badge = CGRect(x: 52, y: 34, width: 42, height: 42)
                    context.setFillColor(UIColor(red: 0.88, green: 0.96, blue: 0.91, alpha: 1).cgColor)
                    context.fillEllipse(in: badge)
                    let cAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 19, weight: .black), .foregroundColor: teal]
                    ("C" as NSString).draw(at: CGPoint(x: 66, y: 43), withAttributes: cAttrs)
                    let brandAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 9, weight: .bold), .foregroundColor: UIColor(red: 0.84, green: 0.94, blue: 0.89, alpha: 1)]
                    ("CARESPHERE  ·  PERSONAL CARE TOOLS" as NSString).draw(at: CGPoint(x: 105, y: 49), withAttributes: brandAttrs)
                    let eyebrowAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 8, weight: .bold), .foregroundColor: UIColor.white.withAlphaComponent(0.8)]
                    ("VISIT PREPARATION" as NSString).draw(at: CGPoint(x: 52, y: 101), withAttributes: eyebrowAttrs)
                    let titleAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 29, weight: .bold), .foregroundColor: .white]
                    ("Care visit preparation" as NSString).draw(at: CGPoint(x: 52, y: 120), withAttributes: titleAttrs)
                    let subtitleAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 10), .foregroundColor: UIColor.white.withAlphaComponent(0.86)]
                    ("A personal briefing made from the items you chose." as NSString).draw(at: CGPoint(x: 53, y: 161), withAttributes: subtitleAttrs)
                    y = 214
                } else {
                    y = 55
                    text("CARESPHERE  ·  VISIT PREPARATION", x: 52, width: 508, font: .systemFont(ofSize: 8), color: teal, weight: .bold)
                }
            }

            func nextPageIfNeeded(_ needed: CGFloat) {
                if y + needed > 735 {
                    footer()
                    startPage()
                }
            }

            startPage()
            text("YOUR SELECTED INFORMATION", font: .systemFont(ofSize: 8), color: teal, weight: .bold, lineSpacing: 1)

            let sectionNames: Set<String> = [
                "MEDICATION REMINDERS", "MOOD CHECK-INS", "CARE NOTES", "QUESTIONS OR TOPICS I WANT TO DISCUSS", "APPLE HEALTH LATEST READINGS", "MANUALLY ENTERED VITALS"
            ]
            let lines = brief.components(separatedBy: "\n")
            for (index, line) in lines.enumerated() {
                if index == 0 || line.hasPrefix("Prepared:") || line.isEmpty { continue }
                if line.hasPrefix("User-prepared information only.") {
                    nextPageIfNeeded(54)
                    let rect = CGRect(x: 52, y: y, width: 508, height: 47)
                    mint.setFill()
                    UIBezierPath(roundedRect: rect, cornerRadius: 8).fill()
                    let rail = UIBezierPath(roundedRect: CGRect(x: 52, y: y, width: 3, height: 47), cornerRadius: 1.5)
                    UIColor(red: 0.34, green: 0.66, blue: 0.55, alpha: 1).setFill()
                    rail.fill()
                    y += 8
                    text(line, x: 66, width: 477, font: .systemFont(ofSize: 8.5), color: muted, lineSpacing: 2)
                    y += 7
                    continue
                }
                let heading = line.components(separatedBy: " (").first ?? line
                if sectionNames.contains(where: { line.hasPrefix($0) }) {
                    nextPageIfNeeded(42)
                    if y > 220 { y += 8 }
                    text(heading.capitalized, font: .systemFont(ofSize: 12), color: teal, weight: .bold, lineSpacing: 1)
                    if let open = line.firstIndex(of: "("), line.last == ")" {
                        let source = String(line[line.index(after: open)..<line.index(before: line.endIndex)])
                        text(source, font: .systemFont(ofSize: 7.5), color: muted, lineSpacing: 1)
                    }
                    continue
                }
                nextPageIfNeeded(34)
                if line.hasPrefix("- ") {
                    text("•  " + String(line.dropFirst(2)), x: 60, width: 495, font: .systemFont(ofSize: 9), color: ink)
                } else if line.hasPrefix("Display name:") || line.hasPrefix("Schedule reviewed in CareSphere:") {
                    let parts = line.split(separator: ":", maxSplits: 1).map(String.init)
                    let label = (parts.first ?? "") + ":"
                    let value = parts.count > 1 ? parts[1].trimmingCharacters(in: .whitespaces) : ""
                    let labelAttrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 8.5, weight: .semibold), .foregroundColor: muted]
                    (label as NSString).draw(at: CGPoint(x: 52, y: y), withAttributes: labelAttrs)
                    text(value, x: 231, width: 320, font: .systemFont(ofSize: 9), color: ink, lineSpacing: 2)
                } else {
                    text(line, font: .systemFont(ofSize: 9), color: ink)
                }
            }

            footer()
            startPage()
            text("REVERSE SIDE · SELECTED DATA RECORD", font: .systemFont(ofSize: 8), color: teal, weight: .bold, lineSpacing: 1)
            text("Data & electronic stamp", font: .systemFont(ofSize: 23), color: ink, weight: .bold, lineSpacing: 2)
            let imageTop = y + 5
            if let sealImage = UIImage(named: "VisitPrepSeal") {
                let sealFrame = CGRect(x: 52, y: imageTop, width: 160, height: 160)
                pdf.cgContext.saveGState()
                UIBezierPath(ovalIn: sealFrame).addClip()
                sealImage.draw(in: sealFrame)
                pdf.cgContext.restoreGState()
            }
            let metadataTop = y + 8
            y = metadataTop
            text("ELECTRONIC INTEGRITY STAMP · \(digest.prefix(12).uppercased())", x: 225, width: 335, font: .systemFont(ofSize: 8, weight: .heavy), color: teal, lineSpacing: 1)
            text("Prepared: \(preparedAt)", x: 225, width: 335, font: .systemFont(ofSize: 8), color: muted, lineSpacing: 1)
            text("Data source: items selected by the user in CareSphere.", x: 225, width: 335, font: .systemFont(ofSize: 8), color: muted, lineSpacing: 1)
            text("SHA-256 fingerprints the selected report text; it does not sign the PDF or prove identity.", x: 225, width: 335, font: .systemFont(ofSize: 8), color: muted, lineSpacing: 1)
            text(digest, x: 225, width: 335, font: .monospacedSystemFont(ofSize: 6.7, weight: .semibold), color: ink, lineSpacing: 1)
            y = max(y, imageTop + 168)
            text("SELECTED DATA INCLUDED IN THIS COPY", font: .systemFont(ofSize: 9), color: teal, weight: .bold, lineSpacing: 1)

            var inSelectedSection = false
            for line in briefLines {
                if line.isEmpty || line.hasPrefix("Prepared:") || line.hasPrefix("User-prepared information only.") { continue }
                let sectionNames = ["MEDICATION REMINDERS", "MOOD CHECK-INS", "CARE NOTES", "QUESTIONS OR TOPICS I WANT TO DISCUSS", "APPLE HEALTH LATEST READINGS", "LIVE BLUETOOTH HEART RATE", "MANUALLY ENTERED VITALS"]
                if sectionNames.contains(where: { line.hasPrefix($0) }) {
                    inSelectedSection = true
                    nextPageIfNeeded(38)
                    let heading = line.components(separatedBy: " (").first ?? line
                    text(heading.capitalized, font: .systemFont(ofSize: 11), color: teal, weight: .bold, lineSpacing: 1)
                    if let open = line.firstIndex(of: "("), line.last == ")" {
                        text(String(line[line.index(after: open)..<line.index(before: line.endIndex)]), font: .systemFont(ofSize: 7), color: muted, lineSpacing: 1)
                    }
                } else if line.hasPrefix("Display name:") {
                    inSelectedSection = false
                    text("Profile information", font: .systemFont(ofSize: 11), color: teal, weight: .bold, lineSpacing: 1)
                    text(line, x: 60, width: 495, font: .systemFont(ofSize: 8.5), color: ink, lineSpacing: 1)
                } else if inSelectedSection {
                    nextPageIfNeeded(30)
                    text(line.hasPrefix("- ") ? "•  " + String(line.dropFirst(2)) : line, x: 60, width: 495, font: .systemFont(ofSize: 8.5), color: ink, lineSpacing: 2)
                }
            }
            nextPageIfNeeded(44)
            text("Content checksum only · not a clinician, clinic, medical-record, or certified-signature verification.", font: .systemFont(ofSize: 7.5), color: muted, lineSpacing: 1)
            footer()
        }
    }
}
