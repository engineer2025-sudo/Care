import Foundation
import Combine

/// A small, deterministic support flow. It does not use the language model to
/// diagnose, infer distress, or contact anyone.
enum CareQuestionRisk: Equatable {
    case selfHarm
    case possiblePoisoning
}

enum CareSupportTrigger: Equatable {
    case sustainedHeartRate
    case selfReportedStress
    case urgentQuestion(CareQuestionRisk)
}

struct CareSupportFlow: Identifiable {
    let id: UUID
    let trigger: CareSupportTrigger
    let room: String

    init(trigger: CareSupportTrigger) {
        let id = UUID()
        self.id = id
        self.trigger = trigger
        self.room = "CareSphere-Support-\(id.uuidString.replacingOccurrences(of: "-", with: ""))"
    }
}

@MainActor
final class CareSupportCoordinator: ObservableObject {
    @Published var activeFlow: CareSupportFlow?

    private var appIsActive = false
    private var aboveRangeSince: Date?
    private var lastLiveSampleAt: Date?
    private var lastHeartRatePrompt: Date?

    /// This is a general wellness prompt threshold, not a clinical alarm.
    /// Only fresh CoreBluetooth notifications while the app is foregrounded
    /// are considered; HealthKit history and saved samples are never monitored.
    static let promptThresholdBPM = 110
    static let sustainedDuration: TimeInterval = 90
    private static let maximumLiveSampleGap: TimeInterval = 15
    private let promptCooldown: TimeInterval = 30 * 60

    func setAppActive(_ active: Bool) {
        appIsActive = active
        if !active {
            aboveRangeSince = nil
            lastLiveSampleAt = nil
        }
    }

    func observeLiveHeartRate(_ bpm: Int?, checkInsEnabled: Bool, now: Date = Date()) {
        guard checkInsEnabled, appIsActive, activeFlow == nil, let bpm else {
            aboveRangeSince = nil
            lastLiveSampleAt = nil
            return
        }
        if let lastLiveSampleAt {
            if now.timeIntervalSince(lastLiveSampleAt) > Self.maximumLiveSampleGap || now < lastLiveSampleAt {
                aboveRangeSince = nil
            }
        }
        lastLiveSampleAt = now
        guard bpm > Self.promptThresholdBPM else {
            aboveRangeSince = nil
            return
        }
        if aboveRangeSince == nil { aboveRangeSince = now }
        guard let aboveRangeSince,
              now.timeIntervalSince(aboveRangeSince) >= Self.sustainedDuration else { return }
        if let lastHeartRatePrompt,
           now.timeIntervalSince(lastHeartRatePrompt) < promptCooldown { return }

        self.lastHeartRatePrompt = now
        self.aboveRangeSince = nil
        begin(.sustainedHeartRate)
    }

    func begin(_ trigger: CareSupportTrigger) {
        if case .urgentQuestion(_) = trigger {
            activeFlow = CareSupportFlow(trigger: trigger)
            return
        }
        guard activeFlow == nil else { return }
        activeFlow = CareSupportFlow(trigger: trigger)
    }

    func finish() {
        activeFlow = nil
    }
}

/// Rules-first interruption for a narrow set of possible self-harm or
/// poisoning messages. The raw message is never saved or sent to a caregiver.
enum CareQuestionSafety {
    static func classify(_ input: String) -> CareQuestionRisk? {
        let text = input
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            .lowercased()

        let poisoningPhrases = [
            "overdose", "poisoning", "i overdosed", "i took too many", "i took too much",
            "i swallowed too many", "i swallowed too much", "i ate too many", "i ate too much",
            "i consumed too many", "i consumed too much", "i took a handful", "i swallowed a handful",
            "i drank too much", "i took an overdose", "lethal dose", "what dose is lethal",
            "how much is lethal", "how much would kill", "how many would kill", "what amount will kill",
        ]
        if poisoningPhrases.contains(where: { text.contains($0) }) { return .possiblePoisoning }

        let selfHarmPhrases = [
            "kill myself", "hurt myself", "harm myself", "end my life", "self harm",
            "suicide", "i want to die", "i want to hurt", "i might hurt", "i might kill",
            "i am going to kill myself", "i am going to hurt myself", "how to die", "way to die",
            "ways to die", "painless way to die", "how many pills to die", "how many pills would kill",
            "take all my pills",
            "take all the pills", "take all my medication", "i took all my pills",
            "i took all the pills", "i took all my medication", "i swallowed all my pills",
            "i ate all my pills",
        ]
        if selfHarmPhrases.contains(where: { text.contains($0) }) { return .selfHarm }

        let medicationTerms = [
            "ibuprofen", "ibprofen", "ibproven", "advil", "motrin", "acetaminophen",
            "paracetamol", "tylenol", "aspirin", "painkiller", "pain killer", "medicine",
            "medication", "pills", "tablets", "capsules",
        ]
        let dangerTerms = [
            "entire case", "whole case", "full case", "entire bottle", "whole bottle",
            "full bottle", "a bottle of", "entire box", "whole box", "entire pack", "whole pack",
            "all my", "all the", "all at once", "take them all", "too many", "too much", "handful", "will i die",
            "would i die", "could i die", "can i die", "die from", "die if", "cause death",
            "risk of death", "fatal", "deadly", "will it kill", "would it kill", "could it kill",
            "can it kill", "will this kill", "could this kill", "kill me", "kill you", "hurt me", "lethal",
        ]
        let ingestionTerms = ["eat", "swallow", "take", "took", "ingest", "drink", "consumed"]
        let mentionsMedication = medicationTerms.contains(where: { text.contains($0) })
        let mentionsDanger = dangerTerms.contains(where: { text.contains($0) })
        let mentionsIngestion = ingestionTerms.contains(where: { text.contains($0) })

        if mentionsMedication && mentionsDanger {
            return .possiblePoisoning
        }
        // Catch ingestion questions about other dangerous substances without
        // attempting to identify the substance or describe effects.
        if mentionsIngestion && mentionsDanger { return .possiblePoisoning }
        return nil
    }

    static func safeResponse(for risk: CareQuestionRisk) -> String {
        switch risk {
        case .selfHarm:
            return "I'm glad you told me. Please don't hurt yourself. Get urgent support now."
        case .possiblePoisoning:
            return "This could be dangerous. If you haven't taken it, don't. If you have, get urgent help now."
        }
    }
}
