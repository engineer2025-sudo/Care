import SwiftUI
import CareActivityKit
import UIKit

private struct ActivityPictureTile: View {
    let picture: ActivityPicture
    var emphasized = false
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: picture.symbol)
                .font(.largeTitle)
                .foregroundStyle(Color.emeraldText)
                .accessibilityHidden(true)
            Text(AppLanguage.text(picture.label))
                .font(.body.weight(.semibold))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 104)
        .background(emphasized ? Color.emerald.opacity(0.12) : Color.cardInner, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(emphasized ? Color.emeraldText : Color.secondary.opacity(0.35), lineWidth: emphasized ? 2 : 1))
        .accessibilityElement(children: .combine)
    }
}

struct ActivityFeedback: View {
    let text: String
    var body: some View {
        Text(AppLanguage.text(text))
            .font(.body)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color.emerald.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
            .onChange(of: text) { message in
                if UIAccessibility.isVoiceOverRunning {
                    UIAccessibility.post(notification: .announcement, argument: AppLanguage.text(message))
                }
            }
    }
}

struct ChoiceActivityView: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var session: ChoiceSession
    @State private var fewerChoices = true
    @State private var showHint = false

    init(exercise: ChoiceExercise) {
        _session = State(initialValue: ChoiceSession(exercise: exercise))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            SectionCard(title: AppLanguage.text("Make it comfortable"), systemImage: "slider.horizontal.3") {
                Toggle(AppLanguage.text("Fewer choices"), isOn: $fewerChoices)
                Text(AppLanguage.text("You can change this anytime. Hints and skipping are always okay."))
                    .font(.footnote).foregroundStyle(.secondary)
            }
            SectionCard(title: AppLanguage.text(session.round.prompt), systemImage: "hand.tap") {
                if session.exercise == .patterns {
                    Text(AppLanguage.text("Read the row from left to right, then top to bottom."))
                        .font(.footnote).foregroundStyle(.secondary)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: typeSize.isAccessibilitySize ? 140 : 90))], spacing: 8) {
                        ForEach(Array(session.round.pictures.enumerated()), id: \.offset) { index, picture in
                            VStack(spacing: 6) {
                                Text("\(index + 1)").font(.caption).foregroundStyle(.secondary)
                                ActivityPictureTile(picture: picture)
                            }
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel("Position \(index + 1): \(picture.label)")
                        }
                    }
                    Label(AppLanguage.text("What comes next?"), systemImage: "questionmark.circle")
                        .font(.headline).padding(.vertical, 8)
                } else if let picture = session.round.pictures.first {
                    ActivityPictureTile(picture: picture, emphasized: true)
                }
                if showHint {
                    ActivityFeedback(text: session.round.hint)
                }
                LazyVGrid(columns: typeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    ForEach(session.round.options(fewerChoices: fewerChoices)) { option in
                        Button { session.choose(option.id) } label: {
                            VStack(spacing: 6) {
                                ActivityPictureTile(picture: option, emphasized: session.completed && option.id == session.round.answerID)
                                if session.completed && option.id == session.round.answerID {
                                    Label(AppLanguage.text("Matched"), systemImage: "checkmark.circle.fill").font(.subheadline)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .disabled(session.completed)
                        .accessibilityLabel(AppLanguage.text(option.label))
                        .accessibilityValue(session.completed && option.id == session.round.answerID ? "Matched" : "")
                    }
                }
                ActivityFeedback(text: session.message)
                Button(AppLanguage.text(showHint ? "Hide hint" : "Show a hint")) { showHint.toggle() }
                    .buttonStyle(.bordered).controlSize(.large)
                    .accessibilityHint(AppLanguage.text("Shows a written cue including the answer."))
                Button {
                    session.next()
                    showHint = false
                } label: {
                    Label(session.completed ? "Next example" : "Skip this example", systemImage: "arrow.right")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                Button(AppLanguage.text("Start again")) { session.restart(); showHint = false }
                    .frame(minHeight: 44)
            }
        }
    }
}

struct EverydayOrderView: View {
    @State private var session = SequenceSession()
    @State private var showHint = false

    var body: some View {
        SectionCard(title: session.sequence.title, systemImage: "list.number") {
            InfoText(AppLanguage.text("Tap the steps in order for this example. No dragging or timer. Your own routine may be different."))
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(session.placedIDs.enumerated()), id: \.offset) { index, id in
                    if let step = session.sequence.steps.first(where: { $0.id == id }) {
                        Label("\(index + 1). \(step.label)", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(Color.emeraldText)
                    }
                }
                if let next = session.nextStep {
                    Text("Choose step \(session.placedIDs.count + 1) of \(session.sequence.steps.count)")
                        .font(.headline)
                    if showHint { ActivityFeedback(text: "Next in this example: \(next.label).") }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14))

            ForEach(session.sequence.options) { step in
                Button {
                    session.choose(step.id)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: step.symbol).frame(width: 28).accessibilityHidden(true)
                        Text(step.label).frame(maxWidth: .infinity, alignment: .leading)
                        if session.placedIDs.contains(step.id) { Image(systemName: "checkmark.circle.fill") }
                    }
                    .padding(14)
                    .frame(minHeight: 56)
                    .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
                .disabled(session.placedIDs.contains(step.id))
                .accessibilityValue(session.placedIDs.contains(step.id) ? "Step added" : "")
            }
            ActivityFeedback(text: session.message)
            if !session.complete {
                Toggle(AppLanguage.text("Show the next step"), isOn: $showHint)
                    .padding(.vertical, 8)
            }
            Button(AppLanguage.text("Undo last step")) { session.undo() }
                .buttonStyle(.bordered).controlSize(.large)
                .disabled(session.placedIDs.isEmpty)
            Button {
                session.next(); showHint = false
            } label: {
                Label(session.complete ? "Next example" : "Skip this example", systemImage: "arrow.right")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            Button(AppLanguage.text("Start this example again")) { session.restart() }.frame(minHeight: 44)
        }
    }
}

struct ConversationCardsView: View {
    @State private var index = 0
    @State private var showIdeas = false
    private var prompt: ConversationPrompt { ActivityExercises.conversations[index] }

    var body: some View {
        SectionCard(title: prompt.title, systemImage: "bubble.left.and.bubble.right") {
            Text(AppLanguage.text("Talk, point, imagine, or simply listen. There is no right answer. Nothing is recorded."))
                .foregroundStyle(.secondary)
            VStack(spacing: 18) {
                Image(systemName: prompt.symbol).font(.largeTitle).foregroundStyle(Color.emeraldText).accessibilityHidden(true)
                Text(prompt.question).font(.title2.weight(.semibold)).multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(24)
            .frame(maxWidth: .infinity)
            .background(Color.emerald.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
            if showIdeas { ActivityFeedback(text: prompt.invitation) }
            Button(showIdeas ? "Hide ideas" : "Give me an idea") { showIdeas.toggle() }
                .buttonStyle(.bordered).controlSize(.large)
            Button {
                index = (index + 1) % ActivityExercises.conversations.count
                showIdeas = false
            } label: {
                Label(AppLanguage.text("Next or skip card"), systemImage: "arrow.right")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            Button(AppLanguage.text("Previous card")) {
                index = (index + ActivityExercises.conversations.count - 1) % ActivityExercises.conversations.count
                showIdeas = false
            }.frame(minHeight: 44)
            InfoText(AppLanguage.text("Playing together? Follow their interests. Do not quiz, correct memories, or press for personal details. Skip any topic that feels uncomfortable."))
                .font(.footnote).foregroundStyle(.secondary)
        }
    }
}


struct SocialMomentCardsView: View {
    @State private var index = 0
    @State private var selected: String?
    private let moments: [(String, [String])] = [
        ("A room feels noisy. What might feel helpful?", ["Move somewhere quieter", "Ask for a quieter moment", "Take a break outside"]),
        ("Someone says hello. What feels comfortable for you?", ["Say hello", "Wave or smile", "Take time before responding"]),
        ("A plan changes. What could help right now?", ["Ask what happens next", "Look at the new plan", "Pause before deciding"])
    ]

    var body: some View {
        let moment = moments[index % moments.count]
        SectionCard(title: AppLanguage.text("Several answers may fit. Choose, reflect, or skip. Nothing is recorded."), systemImage: "bubble.left.and.bubble.right") {
            Text(AppLanguage.text(moment.0)).font(.title3.weight(.semibold))
            ForEach(moment.1, id: \.self) { option in
                Button { selected = option } label: {
                    Text(AppLanguage.text(option)).frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                }
                .buttonStyle(.bordered)
                .accessibilityAddTraits(selected == option ? .isSelected : [])
            }
            if selected != nil {
                ActivityFeedback(text: "That is one option. Your own preference matters; you can also choose differently or skip.")
            }
            Button(AppLanguage.text("Next / skip")) { index = (index + 1) % moments.count; selected = nil }
                .buttonStyle(.borderedProminent).frame(minHeight: 44)
            Text(AppLanguage.text("No answer is scored as correct. Stop whenever you like."))
                .font(.footnote).foregroundStyle(.secondary)
        }
    }
}
