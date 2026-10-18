import Foundation

public struct ActivityPicture: Identifiable, Equatable {
    public let id: String
    public let label: String
    public let symbol: String
    public init(_ id: String, _ label: String, _ symbol: String) {
        self.id = id; self.label = label; self.symbol = symbol
    }
}

public struct ChoiceRound: Identifiable {
    public let id: String
    public let prompt: String
    public let pictures: [ActivityPicture]
    public let choices: [ActivityPicture]
    public let answerID: String
    public let hint: String
    public var answer: ActivityPicture { choices.first { $0.id == answerID }! }

    public func options(fewerChoices: Bool) -> [ActivityPicture] {
        guard fewerChoices, choices.count > 2 else { return choices }
        let alternativeID = choices.first { $0.id != answerID }!.id
        return choices.filter { $0.id == answerID || $0.id == alternativeID }
    }
}

public enum ChoiceExercise: String, CaseIterable {
    case sorting, patterns, matching
    public var rounds: [ChoiceRound] {
        switch self {
        case .sorting: return ActivityExercises.sorting
        case .patterns: return ActivityExercises.patterns
        case .matching: return ActivityExercises.matching
        }
    }
}

/// Explicit transitions: an answer never starts the next round or a timer.
public struct ChoiceSession {
    public let exercise: ChoiceExercise
    public private(set) var index = 0
    public private(set) var completed = false
    public private(set) var message = "Choose an answer, ask for a hint, or skip."
    public var round: ChoiceRound { exercise.rounds[index] }
    public init(exercise: ChoiceExercise) { self.exercise = exercise }

    public mutating func choose(_ id: String) {
        guard !completed, round.choices.contains(where: { $0.id == id }) else { return }
        if id == round.answerID {
            completed = true
            message = "Yes — \(round.answer.label). Continue whenever you are ready."
        } else {
            message = "Try another option, or use the hint. There is no rush."
        }
    }
    public mutating func next() {
        index = (index + 1) % exercise.rounds.count
        completed = false
        message = "Choose an answer, ask for a hint, or skip."
    }
    public mutating func restart() { self = ChoiceSession(exercise: exercise) }
}

public struct EverydaySequence: Identifiable {
    public let id: String
    public let title: String
    public let steps: [ActivityPicture]
    public var options: [ActivityPicture] { [steps[2], steps[0], steps[1]] }
}

public struct SequenceSession {
    public private(set) var index = 0
    public private(set) var placedIDs: [String] = []
    public private(set) var message = "Choose the first step in this example."
    public init() {}
    public var sequence: EverydaySequence { ActivityExercises.sequences[index] }
    public var complete: Bool { placedIDs.count == sequence.steps.count }
    public var nextStep: ActivityPicture? { complete ? nil : sequence.steps[placedIDs.count] }

    public mutating func choose(_ id: String) {
        guard let expected = nextStep, sequence.steps.contains(where: { $0.id == id }), !placedIDs.contains(id) else { return }
        if id == expected.id {
            placedIDs.append(id)
            message = complete ? "The example is in order. Your own routine may be different." : "Step added. Choose what happens next."
        } else {
            message = "In this example, a different step comes first. You can show the next step."
        }
    }
    public mutating func undo() {
        guard !placedIDs.isEmpty else { return }
        placedIDs.removeLast()
        message = "Last step removed. You can choose again."
    }
    public mutating func restart() {
        placedIDs = []
        message = "Choose the first step in this example."
    }
    public mutating func next() {
        index = (index + 1) % ActivityExercises.sequences.count
        restart()
    }
}

public struct ConversationPrompt: Identifiable {
    public let id: String
    public let title: String
    public let symbol: String
    public let question: String
    public let invitation: String
}

public enum ActivityExercises {
    private static let reading = ActivityPicture("reading", "Reading", "book.closed")
    private static let clothing = ActivityPicture("clothing", "Clothing", "tshirt")
    private static let music = ActivityPicture("music", "Music", "music.note")
    private static let circle = ActivityPicture("circle", "Circle", "circle")
    private static let square = ActivityPicture("square", "Square", "square")
    private static let triangle = ActivityPicture("triangle", "Triangle", "triangle")
    private static let star = ActivityPicture("star", "Star", "star")
    private static let cup = ActivityPicture("cup", "Cup", "cup.and.saucer")
    private static let book = ActivityPicture("book", "Book", "book.closed")
    private static let leaf = ActivityPicture("leaf", "Leaf", "leaf")
    private static let house = ActivityPicture("house", "House", "house")

    public static let sorting: [ChoiceRound] = [
        sort("book", "Book", "book.closed", reading, [clothing, reading, music]),
        sort("shirt", "Shirt", "tshirt", clothing, [clothing, music, reading]),
        sort("guitar", "Guitar", "guitars", music, [reading, clothing, music]),
        sort("newspaper", "Newspaper", "newspaper", reading, [music, reading, clothing]),
        sort("shoe", "Shoe", "shoeprints.fill", clothing, [reading, music, clothing]),
        sort("piano", "Piano", "pianokeys", music, [music, clothing, reading]),
    ]
    private static func sort(_ id: String, _ label: String, _ symbol: String, _ category: ActivityPicture, _ options: [ActivityPicture]) -> ChoiceRound {
        ChoiceRound(id: id, prompt: "Which group fits \(label.lowercased())?", pictures: [ActivityPicture(id, label, symbol)], choices: options, answerID: category.id, hint: "In this game, \(label.lowercased()) belongs with \(category.label.lowercased()).")
    }

    public static let patterns: [ChoiceRound] = [
        pattern("circles-squares", [circle, square, circle, square], circle, [square, circle, triangle], "Circle, square repeats. Circle comes next."),
        pattern("leaves-books", [leaf, book, leaf, book], leaf, [leaf, cup, book], "Leaf, book repeats. Leaf comes next."),
        pattern("stars-circles", [star, star, circle, star, star], circle, [star, square, circle], "Two stars, then a circle. Circle comes next."),
        pattern("cups-books", [cup, book, cup, book, cup], book, [cup, book, house], "Cup, book repeats. Book comes next."),
        pattern("three-shapes", [circle, square, triangle, circle, square], triangle, [triangle, circle, square], "Circle, square, triangle repeats. Triangle comes next."),
        pattern("houses-leaves", [house, leaf, leaf, house, leaf], leaf, [house, leaf, cup], "House, leaf, leaf repeats. One more leaf comes next."),
    ]
    private static func pattern(_ id: String, _ pictures: [ActivityPicture], _ answer: ActivityPicture, _ options: [ActivityPicture], _ hint: String) -> ChoiceRound {
        ChoiceRound(id: id, prompt: "What comes next in this repeating row?", pictures: pictures, choices: options, answerID: answer.id, hint: hint)
    }

    public static let matching: [ChoiceRound] = [circle, book, leaf, cup, star, house, triangle, square].enumerated().map { index, picture in
        let all = [circle, book, leaf, cup, star, house, triangle, square]
        var choices = (0..<4).map { all[(index + $0) % all.count] }
        let shift = index % choices.count
        choices = Array(choices.dropFirst(shift)) + Array(choices.prefix(shift))
        return ChoiceRound(id: "match-\(picture.id)", prompt: "Find the same picture as the one above.", pictures: [picture], choices: choices, answerID: picture.id, hint: "Look for the \(picture.label.lowercased()). The picture and word are the same.")
    }

    public static let sequences: [EverydaySequence] = [
        .init(id: "book", title: "Enjoy a book", steps: [
            .init("choose", "Choose a book", "books.vertical"), .init("open", "Open the book", "book"), .init("read", "Read or look at a page", "text.book.closed"),
        ]),
        .init(id: "draw", title: "Make a drawing", steps: [
            .init("paper", "Get some paper", "doc"), .init("pencil", "Choose a pencil", "pencil"), .init("draw", "Make a mark", "scribble"),
        ]),
        .init(id: "listen", title: "Choose some music", steps: [
            .init("choose", "Choose a song", "music.note.list"), .init("volume", "Set a comfortable volume", "speaker.wave.1"), .init("listen", "Listen, or stop if you prefer", "ear"),
        ]),
        .init(id: "letter", title: "Write a friendly note", steps: [
            .init("paper", "Choose a card", "rectangle"), .init("write", "Write or draw a message", "pencil"), .init("share", "Share it if you want to", "envelope"),
        ]),
    ]

    public static let conversations: [ConversationPrompt] = [
        .init(id: "place", title: "A place you like", symbol: "leaf", question: "What is a place you enjoy, or would like to imagine?", invitation: "It could be a room, a garden, a beach, or a made-up place."),
        .init(id: "music", title: "A little music", symbol: "music.note", question: "Is there a sound or song you enjoy?", invitation: "You could name it, hum it, point, or choose quiet instead."),
        .init(id: "food", title: "Something familiar", symbol: "cup.and.saucer", question: "What food or drink do you like to talk about?", invitation: "Talk about its smell, color, or a place it reminds you of. No need to taste anything."),
        .init(id: "interest", title: "Your interests", symbol: "star", question: "What is something you like learning or talking about?", invitation: "A hobby, an animal, a collection, a game—any interest is welcome."),
        .init(id: "weather", title: "A kind of day", symbol: "cloud.sun", question: "What would your comfortable day look like?", invitation: "It can be real or imagined. There is no need to remember a date."),
        .init(id: "object", title: "An everyday object", symbol: "book.closed", question: "Is there an object you enjoy using or looking at?", invitation: "Describe it, point to it, or tell an imagined story about it."),
        .init(id: "color", title: "A color you enjoy", symbol: "paintpalette", question: "Which colors feel pleasant to you today?", invitation: "You can also name a color you would rather avoid. Preferences can change."),
        .init(id: "together", title: "Time together", symbol: "bubble.left.and.bubble.right", question: "What would you like to do together, or on your own?", invitation: "A conversation, a quiet moment, or a different activity are all fine."),
    ]
}
