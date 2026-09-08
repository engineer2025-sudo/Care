import Foundation
import NaturalLanguage

/// On-device NLP via Apple's NaturalLanguage framework — scores the emotional
/// tone of care-journal notes so the Care Circle view can surface gentle
/// mood trends. Runs entirely offline using the system sentiment model.
enum TextInsightsService {

    /// Sentiment in -1.0 (negative) … 1.0 (positive). 0 when unavailable.
    static func sentimentScore(for text: String) -> Double {
        let tagger = NLTagger(tagSchemes: [.sentimentScore])
        tagger.string = text
        let (tag, _) = tagger.tag(at: text.startIndex, unit: .paragraph, scheme: .sentimentScore)
        guard let rawValue = tag?.rawValue, let score = Double(rawValue) else { return 0 }
        return score
    }

    static func emoji(for score: Double) -> String {
        if score >= 0.35 { return "😊" }
        if score <= -0.35 { return "😟" }
        return "😐"
    }

    static func label(for score: Double) -> String {
        if score >= 0.35 { return "Positive" }
        if score <= -0.35 { return "Needs care" }
        return "Neutral"
    }
}
