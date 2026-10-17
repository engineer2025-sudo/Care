import Foundation

public enum ActivityCategory: String, CaseIterable, Identifiable {
    case all = "All activities", thinking = "Notice & think", everyday = "Everyday steps"
    case connection = "Connect & express", calm = "Find calm"
    public var id: String { rawValue }
}

public enum CareActivity: String, CaseIterable, Identifiable {
    case picturePairs, sortTogether, completePattern, findSame, everydayOrder
    case conversation, feelings, pictureStory, patternRecall, soundscapes, breathing, socialMoments
    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .picturePairs: return "Picture pairs"
        case .sortTogether: return "Sort together"
        case .completePattern: return "Complete the pattern"
        case .findSame: return "Find the same"
        case .everydayOrder: return "Everyday order"
        case .conversation: return "Conversation cards"
        case .feelings: return "Feelings explorer"
        case .pictureStory: return "Picture story"
        case .patternRecall: return "Remember a pattern"
        case .soundscapes: return "Soundscapes"
        case .breathing: return "Paced breathing"
        case .socialMoments: return "Social moment cards"
        }
    }

    public var symbol: String {
        switch self {
        case .picturePairs: return "square.grid.2x2"
        case .sortTogether: return "tray.2"
        case .completePattern: return "circle.grid.2x2"
        case .findSame: return "magnifyingglass"
        case .everydayOrder: return "list.number"
        case .conversation: return "bubble.left.and.bubble.right"
        case .feelings: return "face.smiling"
        case .pictureStory: return "text.book.closed"
        case .patternRecall: return "hand.tap"
        case .soundscapes: return "speaker.wave.2"
        case .breathing: return "wind"
        case .socialMoments: return "rectangle.stack"
        }
    }

    public var category: ActivityCategory {
        switch self {
        case .picturePairs, .sortTogether, .completePattern, .findSame, .patternRecall: return .thinking
        case .everydayOrder, .pictureStory: return .everyday
        case .conversation, .feelings, .socialMoments: return .connection
        case .soundscapes, .breathing: return .calm
        }
    }

    public var summary: String {
        switch self {
        case .picturePairs: return "Turn over familiar pictures and find a pair."
        case .sortTogether: return "Explore how everyday objects belong together."
        case .completePattern: return "Look at a repeating row and choose what comes next."
        case .findSame: return "Keep a picture in view and find its matching symbol."
        case .everydayOrder: return "Put a simple example routine in order, one tap at a time."
        case .conversation: return "Share a preference, a memory, or an imagined story."
        case .feelings: return "Explore feeling words. There is no single right answer."
        case .pictureStory: return "Move through a short picture story at your own pace."
        case .patternRecall: return "Watch numbered pads, then repeat their order."
        case .soundscapes: return "Choose an optional sound. Nothing plays automatically."
        case .breathing: return "Follow a comfortable pace, or simply breathe naturally."
        case .socialMoments: return "Explore everyday situations. There is no best response."
        }
    }

    public var support: String {
        switch self {
        case .picturePairs: return "2–4 pairs · reveal-all option"
        case .sortTogether, .completePattern, .findSame: return "2 or more choices · hints available"
        case .everydayOrder: return "3 steps · show the next step"
        case .conversation: return "Solo or together · no answers recorded"
        case .feelings: return "Any answer is welcome"
        case .pictureStory: return "Forward and back · no test"
        case .patternRecall: return "1–4 steps · choose a length"
        case .soundscapes: return "Sound is opt-in · stop anytime"
        case .breathing: return "Optional hold · pause anytime"
        case .socialMoments: return "Several choices · no score · no response saved"
        }
    }

    public var purpose: String {
        switch self {
        case .sortTogether: return "An opportunity to talk about familiar objects and categories. Hints keep the activity supportive rather than a test."
        case .completePattern: return "An opportunity to notice a visible, predictable rule. All earlier symbols stay in view; memory is not required."
        case .findSame: return "An opportunity for visual comparison using both pictures and words, without a time limit."
        case .everydayOrder: return "An opportunity to explore a visual sequence. These examples are not instructions for personal care; routines differ."
        case .conversation: return "An invitation to talk or communicate in any comfortable way. A memory does not need to be accurate, and a present-day or imagined answer is welcome."
        case .feelings: return "An opportunity to explore words, not a test of reading faces. Do not use this to teach that a facial expression always means a particular emotion."
        case .picturePairs, .patternRecall: return "Optional matching and recall practice. Performance is not a measure of cognition, diagnosis, or decline."
        case .pictureStory: return "Predictable visual supports can make an example easier to follow. Personal routines and preferences differ."
        case .soundscapes, .breathing: return "An optional comfort tool, not treatment. Stop if it feels uncomfortable, dizzying, tiring, or overwhelming."
        case .socialMoments: return "Optional fictional everyday situations with several reasonable responses. This is not social-skills treatment or an assessment. A person can choose, talk about another option, or skip; no response is saved."
        }
    }

    public static func filtered(category: ActivityCategory, query: String) -> [CareActivity] {
        let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return allCases.filter {
            (category == .all || $0.category == category) &&
            (text.isEmpty || "\($0.title) \($0.summary)".localizedCaseInsensitiveContains(text))
        }
    }
}

public struct ActivityReference: Identifiable {
    public let id: String
    public let title: String
    public let summary: String
    public let url: URL

    public static let all: [ActivityReference] = [
        .init(id: "autism-serious-games-2024", title: "Carneiro et al. · Serious games for social skills (2024)",
              summary: "Nine studies of children and adolescents reported positive findings in at least one measured domain, but interventions varied and risk of bias was substantial. This is not evidence that CareSphere works.",
              url: URL(string: "https://doi.org/10.3390/healthcare12050508")!),
        .init(id: "scholar-labs-1", title: "Google Scholar Labs search 1 (user-shared)",
              summary: "This sign-in-protected result list was not available for review. Link only; no claims are attributed to it.",
              url: URL(string: "https://scholar.google.com/scholar_labs/search/session/8600305665779058312?hl=en")!),
        .init(id: "scholar-labs-2", title: "Google Scholar Labs search 2 (user-shared)",
              summary: "This sign-in-protected result list was not available for review. Link only; no claims are attributed to it.",
              url: URL(string: "https://scholar.google.com/scholar_labs/search/session/6581218369437547131?hl=en")!),
        .init(id: "cognitive-tech-review-2020", title: "Irazoki et al. · Digital cognitive interventions (2020)",
              summary: "A review of 19 studies and 11 programs for older adults found major differences in aims, users, and delivery, and called for more clinical research. Standalone CareSphere activities are not clinician-led interventions.",
              url: URL(string: "https://doi.org/10.3389/fpsyg.2020.00648")!),
        .init(id: "cognitive-stimulation", title: "Cochrane · Cognitive stimulation (2023)",
              summary: "Structured programs probably offer small, short-term cognitive benefits in mild-to-moderate dementia. These games are not those tested programs.",
              url: URL(string: "https://www.cochrane.org/evidence/CD005562_can-cognitive-stimulation-benefit-people-dementia")!),
        .init(id: "dementia-guideline", title: "NICE NG97 · Dementia care",
              summary: "Recommends preference-led activities and group cognitive stimulation therapy. It advises against cognitive training as treatment for mild-to-moderate Alzheimer's disease.",
              url: URL(string: "https://www.nice.org.uk/guidance/ng97/chapter/recommendations")!),
        .init(id: "autism-guideline", title: "NICE CG142 · Support for autistic adults",
              summary: "Emphasizes interests, predictable structure, visual supports, sensory adjustments, and choice. This adult guidance is not proof of a game benefit or a pediatric treatment recommendation.",
              url: URL(string: "https://www.nice.org.uk/guidance/cg142/chapter/recommendations")!),
        .init(id: "reminiscence", title: "Cochrane · Reminiscence (2018)",
              summary: "Some small, inconsistent benefits depend on setting and delivery. Conversation prompts here have not been clinically evaluated.",
              url: URL(string: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001120.pub3/full")!),
    ]
}
