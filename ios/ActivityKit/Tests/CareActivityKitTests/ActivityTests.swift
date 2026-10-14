import XCTest
@testable import CareActivityKit

final class ActivityTests: XCTestCase {
    func testLibraryHasElevenUniqueActivities() {
        XCTAssertEqual(CareActivity.allCases.count, 11)
        XCTAssertEqual(Set(CareActivity.allCases.map(\.id)).count, 11)
        for activity in CareActivity.allCases {
            XCTAssertFalse(activity.title.isEmpty)
            XCTAssertFalse(activity.summary.isEmpty)
            XCTAssertFalse(activity.purpose.isEmpty)
            XCTAssertFalse(activity.support.isEmpty)
            XCTAssertNotEqual(activity.category, .all)
        }
    }

    func testSearchTrimsWhitespaceAndIgnoresCase() {
        XCTAssertEqual(CareActivity.filtered(category: .all, query: "  SORT TOGETHER \n"), [.sortTogether])
        XCTAssertEqual(CareActivity.filtered(category: .calm, query: "sort"), [])
        XCTAssertEqual(CareActivity.filtered(category: .all, query: "  ").count, 11)
    }

    func testEveryCategoryHasActivities() {
        for category in ActivityCategory.allCases {
            XCTAssertFalse(CareActivity.filtered(category: category, query: "").isEmpty)
        }
    }

    func testEveryRoundHasExactlyOneAnswerAndDistinctOptions() {
        for exercise in ChoiceExercise.allCases {
            XCTAssertFalse(exercise.rounds.isEmpty)
            XCTAssertEqual(Set(exercise.rounds.map(\.id)).count, exercise.rounds.count)
            for round in exercise.rounds {
                XCTAssertEqual(round.choices.filter { $0.id == round.answerID }.count, 1)
                XCTAssertEqual(Set(round.choices.map(\.id)).count, round.choices.count)
                XCTAssertFalse(round.hint.isEmpty)
                XCTAssertFalse(round.pictures.isEmpty)
                XCTAssertEqual(round.options(fewerChoices: true).count, 2)
                XCTAssertTrue(round.options(fewerChoices: true).contains { $0.id == round.answerID })
                XCTAssertEqual(round.options(fewerChoices: false), round.choices)
            }
        }
    }

    func testIncorrectChoiceDoesNotAdvanceOrLockTheRound() {
        for exercise in ChoiceExercise.allCases {
            var session = ChoiceSession(exercise: exercise)
            let wrong = session.round.choices.first { $0.id != session.round.answerID }!
            session.choose(wrong.id)
            XCTAssertEqual(session.index, 0)
            XCTAssertFalse(session.completed)
            session.choose(session.round.answerID)
            XCTAssertTrue(session.completed)
        }
    }

    func testUnknownChoiceDoesNothing() {
        var session = ChoiceSession(exercise: .sorting)
        let original = session.message
        session.choose("not-a-choice")
        XCTAssertEqual(session.message, original)
        XCTAssertFalse(session.completed)
    }

    func testCorrectChoiceWaitsForExplicitNextAndIgnoresRepeatedInput() {
        var session = ChoiceSession(exercise: .patterns)
        session.choose(session.round.answerID)
        let message = session.message
        session.choose(session.round.choices.first { $0.id != session.round.answerID }!.id)
        XCTAssertEqual(session.message, message)
        XCTAssertEqual(session.index, 0)
        session.next()
        XCTAssertEqual(session.index, 1)
        XCTAssertFalse(session.completed)
    }

    func testSkippingAndWrappingAllRoundTypes() {
        for exercise in ChoiceExercise.allCases {
            var session = ChoiceSession(exercise: exercise)
            for _ in exercise.rounds { session.next() }
            XCTAssertEqual(session.index, 0)
            XCTAssertFalse(session.completed)
            session.next()
            session.restart()
            XCTAssertEqual(session.index, 0)
        }
    }

    func testVisibleMatchingTargetsAlwaysMatchAnswer() {
        for round in ActivityExercises.matching {
            XCTAssertEqual(round.pictures.first?.id, round.answerID)
        }
    }

    func testPatternsRepeatAccordingToTheirDocumentedRule() {
        let periods = [2, 2, 3, 2, 3, 3]
        for (round, period) in zip(ActivityExercises.patterns, periods) {
            for index in period..<round.pictures.count {
                XCTAssertEqual(round.pictures[index], round.pictures[index % period])
            }
            XCTAssertEqual(round.answerID, round.pictures[round.pictures.count % period].id)
        }
    }

    func testSequenceContentHasThreeUniqueStepsAndStableOptions() {
        XCTAssertEqual(Set(ActivityExercises.sequences.map(\.id)).count, ActivityExercises.sequences.count)
        for sequence in ActivityExercises.sequences {
            XCTAssertEqual(sequence.steps.count, 3)
            XCTAssertEqual(Set(sequence.steps.map(\.id)).count, 3)
            XCTAssertEqual(Set(sequence.options.map(\.id)), Set(sequence.steps.map(\.id)))
        }
    }

    func testSequenceWrongDuplicateAndUnknownStepsDoNotAdvance() {
        var session = SequenceSession()
        session.choose(session.sequence.steps[2].id)
        session.choose("invalid")
        XCTAssertTrue(session.placedIDs.isEmpty)
        let first = session.sequence.steps[0].id
        session.choose(first)
        session.choose(first)
        XCTAssertEqual(session.placedIDs, [first])
    }

    func testSequenceCompletionUndoRestartAndSkip() {
        var session = SequenceSession()
        session.undo() // Empty state is safe.
        for step in session.sequence.steps { session.choose(step.id) }
        XCTAssertTrue(session.complete)
        XCTAssertNil(session.nextStep)
        session.undo()
        XCTAssertFalse(session.complete)
        XCTAssertEqual(session.nextStep?.id, session.sequence.steps[2].id)
        session.restart()
        XCTAssertTrue(session.placedIDs.isEmpty)
        for _ in ActivityExercises.sequences { session.next() }
        XCTAssertEqual(session.index, 0)
    }

    func testConversationPromptsAreCompleteAndUnique() {
        XCTAssertGreaterThanOrEqual(ActivityExercises.conversations.count, 8)
        XCTAssertEqual(Set(ActivityExercises.conversations.map(\.id)).count, ActivityExercises.conversations.count)
        for prompt in ActivityExercises.conversations {
            XCTAssertFalse(prompt.question.isEmpty)
            XCTAssertFalse(prompt.invitation.isEmpty)
            XCTAssertFalse(prompt.symbol.isEmpty)
        }
    }

    func testReferencesAreHTTPSAndCoverDistinctEvidence() {
        XCTAssertEqual(ActivityReference.all.count, 4)
        XCTAssertEqual(Set(ActivityReference.all.map(\.id)).count, 4)
        for reference in ActivityReference.all { XCTAssertEqual(reference.url.scheme, "https") }
    }
}
