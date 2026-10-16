import CareActivityKit
import SwiftUI

// MARK: - Untimed feelings-word activity

private let feelingOptions: [(name: String, emoji: String)] = [
    ("Happy", "😊"), ("Calm", "😌"), ("Excited", "🤩"), ("Tired", "😴"), ("Not sure", "💭"),
]
private let feelingPictures: [(emoji: String, description: String)] = [
    ("🙂", "A simplified face with a small upward-curving mouth."),
    ("😐", "A simplified face with open eyes and a straight mouth."),
    ("😴", "A simplified face with closed eyes and sleep marks above it."),
    ("😊", "A simplified face with curved eyes and an upward-curving mouth."),
]

struct FeelingsExplorerCard: View {
    @State private var pictureIndex = 0
    @State private var choice: String?

    var body: some View {
        SectionCard(title: AppLanguage.text("Feelings explorer"), systemImage: "face.smiling") {
            Text(AppLanguage.text("What might this person be feeling? Choose any word—or “Not sure.” These emoji are simplified illustrations, not rules for reading real people; there is no right answer or score."))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            VStack(spacing: 10) {
                Text(feelingPictures[pictureIndex].emoji)
                    .font(.system(size: 58))
                    .accessibilityLabel(feelingPictures[pictureIndex].description)
                if let choice {
                    Text("“\(choice)” is one possibility. It is also okay not to know.")
                        .font(.footnote.weight(.medium))
                        .multilineTextAlignment(.center)
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            VStack(spacing: 8) {
                ForEach(feelingOptions, id: \.name) { feeling in
                    Button {
                        choice = feeling.name
                    } label: {
                        HStack(spacing: 12) {
                            Text(feeling.emoji).font(.title2).accessibilityHidden(true)
                            Text(feeling.name).font(.body.weight(.semibold))
                            Spacer()
                            if choice == feeling.name { Image(systemName: "checkmark.circle.fill") }
                        }
                        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                        .padding(.horizontal, 12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(feeling.name)
                    .accessibilityValue(choice == feeling.name ? "Selected" : "")
                }
            }
            Button {
                pictureIndex = (pictureIndex + 1) % feelingPictures.count
                choice = nil
            } label: {
                Label(AppLanguage.text("Next picture"), systemImage: "arrow.right")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .tint(.emerald)
        }
    }
}

// MARK: - Optional pattern-matching activity

struct PatternRecallCard: View {
    @State private var length = 2
    @State private var sequence = [1, 2]
    @State private var inputIndex = 0
    @State private var showGuide = true
    @State private var started = false
    @State private var message = "Choose a length, then start when you are ready."
    private var complete: Bool { started && inputIndex == sequence.count }

    var body: some View {
        SectionCard(title: AppLanguage.text("Remember a pattern"), systemImage: "hand.tap") {
            Text(AppLanguage.text("Tap the numbered pads in the order shown. Keep the guide visible or hide it if you want to try recalling. There is no timer or flashing playback."))
                .foregroundStyle(.secondary)
            Picker(AppLanguage.text("Pattern length"), selection: $length) {
                ForEach(1...4, id: \.self) { Text("\($0) \($0 == 1 ? "step" : "steps")").tag($0) }
            }
            .pickerStyle(.menu)
            .onChange(of: length) { _ in started = false; inputIndex = 0; message = "Start a new pattern when you are ready." }
            if started {
                Toggle(AppLanguage.text("Keep the pattern visible"), isOn: $showGuide)
                if showGuide {
                    Text(sequence.map(String.init).joined(separator: " → "))
                        .font(.title2.weight(.bold))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14))
                        .accessibilityLabel(AppLanguage.text("Pattern: ") + sequence.map(String.init).joined(separator: ", then "))
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(1...4, id: \.self) { pad in
                        Button { choose(pad) } label: {
                            Text("\(pad)").font(.title.weight(.bold))
                                .frame(maxWidth: .infinity, minHeight: 76)
                                .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.secondary.opacity(0.5)))
                        }
                        .buttonStyle(.plain)
                        .disabled(complete)
                        .accessibilityLabel("Pattern pad \(pad)")
                    }
                }
            }
            ActivityFeedback(text: message)
            Button {
                sequence = (0..<length).map { _ in Int.random(in: 1...4) }
                started = true; showGuide = true; inputIndex = 0
                message = "Tap step 1. You can use the visible guide."
            } label: {
                Label(started ? "New pattern" : "Start pattern", systemImage: "play")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            if started {
                Button(AppLanguage.text("Try the same pattern again")) {
                    inputIndex = 0; showGuide = true
                    message = "The same pattern is ready. Start with step 1."
                }.buttonStyle(.bordered).controlSize(.large)
            }
        }
    }

    private func choose(_ pad: Int) {
        guard started, !complete else { return }
        if sequence[inputIndex] == pad {
            inputIndex += 1
            message = complete ? "Pattern completed. Repeat, try another, or leave whenever you like." : "Step added. Choose step \(inputIndex + 1)."
        } else {
            showGuide = true
            message = "The guide is visible. For step \(inputIndex + 1), choose \(sequence[inputIndex])."
        }
    }
}

// MARK: - Picture-pair matching activity

private struct EverydayPicture: Identifiable {
    let id = UUID()
    let pairID: String
    let label: String
    let symbol: String
}

private let everydayPictureOptions = [
    (pairID: "cup", label: "Cup", symbol: "cup.and.saucer.fill"),
    (pairID: "book", label: "Book", symbol: "book.closed.fill"),
    (pairID: "plant", label: "Plant", symbol: "leaf.fill"),
    (pairID: "home", label: "Home", symbol: "house.fill"),
]

private func makeEverydayPictureDeck(pairCount: Int) -> [EverydayPicture] {
    Array(everydayPictureOptions.prefix(pairCount)).flatMap { item in
        [EverydayPicture(pairID: item.pairID, label: item.label, symbol: item.symbol),
         EverydayPicture(pairID: item.pairID, label: item.label, symbol: item.symbol)]
    }.shuffled()
}

struct PicturePairsCard: View {
    @State private var revealAll = true
    @State private var pairCount = 2
    @State private var cards = makeEverydayPictureDeck(pairCount: 2)
    @State private var opened: [UUID] = []
    @State private var matched: Set<String> = []
    @State private var message = "Choose two picture cards to look for a pair."

    var body: some View {
        SectionCard(title: AppLanguage.text("Picture pairs"), systemImage: "square.grid.2x2") {
            Text(AppLanguage.text("Match familiar picture symbols at your own pace. There is no timer or score; unmatched cards stay open until you choose to hide them. This is an optional game, not a memory test."))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Picker(AppLanguage.text("Number of pairs"), selection: $pairCount) {
                Text(AppLanguage.text("2 pairs")).tag(2)
                Text(AppLanguage.text("3 pairs")).tag(3)
                Text(AppLanguage.text("4 pairs")).tag(4)
            }
            .pickerStyle(.menu)
            .onChange(of: pairCount) { _ in reset() }

            Toggle(AppLanguage.text("Keep all pictures visible"), isOn: $revealAll)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(cards.indices, id: \.self) { index in
                    let card = cards[index]
                    let isMatched = matched.contains(card.pairID)
                    let isOpen = revealAll || opened.contains(card.id) || isMatched
                    Button {
                        reveal(card)
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: isOpen ? card.symbol : "square")
                                .font(.title2)
                                .accessibilityHidden(true)
                            if isMatched {
                                Label(AppLanguage.text("Matched"), systemImage: "checkmark.circle.fill").font(.caption)
                            } else if opened.contains(card.id) {
                                Label(AppLanguage.text("Chosen"), systemImage: "checkmark.circle").font(.caption)
                            }
                            Text(isOpen ? card.label : "Card \(index + 1)")
                                .font(.caption.weight(.semibold))
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity, minHeight: 72)
                        .background(isOpen ? Color.emerald.opacity(0.18) : Color.cardInner,
                                    in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .strokeBorder(isMatched || opened.contains(card.id) ? Color.emeraldText : Color.secondary.opacity(0.3), lineWidth: isMatched || opened.contains(card.id) ? 2 : 1))
                    }
                    .buttonStyle(.plain)
                    .disabled(isMatched || opened.count == 2)
                    .accessibilityLabel(isOpen ? "\(card.label), card \(index + 1)\(isMatched ? ", pair found" : "")" : "Hidden picture card \(index + 1)")
                    .accessibilityValue(opened.contains(card.id) ? "Chosen" : "")
                    .accessibilityHint(isMatched ? "Pair found." : "Double-tap to choose this card.")
                }
            }
            Text(message)
                .font(.footnote)
                .frame(maxWidth: .infinity, minHeight: 42, alignment: .leading)
                .accessibilityAddTraits(.updatesFrequently)

            HStack {
                if canHideCards {
                    Button(revealAll ? "Clear selection" : "Hide cards") {
                        opened = []
                        message = "Selection cleared. Choose two when you are ready."
                    }
                    .buttonStyle(.bordered)
                }
                Button(AppLanguage.text("Start over"), action: reset)
                    .buttonStyle(.borderedProminent)
                    .tint(.emerald)
            }
        }
    }

    private var canHideCards: Bool {
        guard opened.count == 2,
              let first = cards.first(where: { $0.id == opened[0] }) else { return false }
        return !matched.contains(first.pairID)
    }

    private func reveal(_ card: EverydayPicture) {
        guard opened.count < 2, !matched.contains(card.pairID), !opened.contains(card.id) else { return }
        opened.append(card.id)
        guard opened.count == 2,
              let first = cards.first(where: { $0.id == opened[0] }) else { return }
        if first.pairID == card.pairID {
            matched.insert(card.pairID)
            opened = []
            message = matched.count == pairCount
                ? "All pairs are visible. Start again or choose a different number of pairs."
                : "Pair found. Take your time with the next one."
        } else {
            message = "These are different pictures. Clear the selection or hide the cards when you are ready."
        }
    }

    private func reset() {
        cards = makeEverydayPictureDeck(pairCount: pairCount)
        opened = []
        matched = []
        message = "Choose two picture cards to look for a pair."
    }
}

// MARK: - Predictable picture-story activity

private struct PictureStoryStep: Identifiable {
    let id: String
    let label: String
    let emoji: String
}

private struct PictureStorySequence: Identifiable {
    let id: String
    let title: String
    let steps: [PictureStoryStep]
}

private let pictureStories = [
    PictureStorySequence(id: "plant", title: "A seed grows", steps: [
        PictureStoryStep(id: "seed", label: "Seed", emoji: "🫘"),
        PictureStoryStep(id: "sprout", label: "Sprout", emoji: "🌱"),
        PictureStoryStep(id: "flower", label: "Flower", emoji: "🌼"),
    ]),
    PictureStorySequence(id: "hands", title: "Wash hands", steps: [
        PictureStoryStep(id: "wet", label: "Wet hands", emoji: "🚰"),
        PictureStoryStep(id: "soap", label: "Use soap", emoji: "🧼"),
        PictureStoryStep(id: "rinse", label: "Rinse", emoji: "💧"),
    ]),
]

struct PictureStoryCard: View {
    @State private var storyIndex = 0
    @State private var stepIndex = 0
    private var story: PictureStorySequence { pictureStories[storyIndex] }
    private var step: PictureStoryStep { story.steps[stepIndex] }

    var body: some View {
        SectionCard(title: AppLanguage.text("Picture story"), systemImage: "text.book.closed") {
            InfoText(AppLanguage.text("Explore a short, predictable picture sequence. These are examples, not instructions—people’s routines and preferences differ. Move forward or back whenever you like."))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Picker(AppLanguage.text("Choose a story"), selection: $storyIndex) {
                ForEach(pictureStories.indices, id: \.self) { index in
                    Text(pictureStories[index].title).tag(index)
                }
            }
            .onChange(of: storyIndex) { _ in stepIndex = 0 }

            VStack(spacing: 10) {
                Text("Picture \(stepIndex + 1) of \(story.steps.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(step.emoji)
                    .font(.system(size: 48))
                    .accessibilityHidden(true)
                Text(step.label)
                    .font(.title3.weight(.bold))
            }
            .frame(maxWidth: .infinity, minHeight: 148)
            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .accessibilityElement(children: .combine)

            HStack {
                Button {
                    stepIndex = max(0, stepIndex - 1)
                } label: {
                    Label(AppLanguage.text("Previous picture"), systemImage: "arrow.left")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(stepIndex == 0)

                Button {
                    stepIndex = stepIndex == story.steps.count - 1 ? 0 : stepIndex + 1
                } label: {
                    Label(stepIndex == story.steps.count - 1 ? "Start again" : "Next picture", systemImage: "arrow.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.emerald)
            }
        }
    }
}

// MARK: - Sensory Soundscapes (AVAudioEngine DSP)

struct SoundscapesCard: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var playing: SoundScapeEngine.SoundId?
    @State private var audioError: String?
    private let engine = SoundScapeEngine.shared

    var body: some View {
        SectionCard(title: AppLanguage.text("Sensory Soundscapes"), systemImage: "speaker.wave.2.fill") {
            InfoText(AppLanguage.text("Generated on-device and available offline. Start at a comfortable volume. Sound respects Silent mode; you can stop anytime."))
                .font(.caption)
                .foregroundStyle(.secondary)
            if let audioError {
                Text(audioError).font(.subheadline).foregroundStyle(.secondary)
            }
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(SoundScapeEngine.SoundId.allCases) { sound in
                    soundscapeButton(sound)
                }
            }
        }
        .onDisappear { engine.stop(); playing = nil }
        .onChange(of: scenePhase) { phase in
            if phase != .active { engine.stop(); playing = nil }
        }
    }

    private func soundscapeButton(_ sound: SoundScapeEngine.SoundId) -> some View {
        let active = playing == sound
        return Button {
            audioError = nil
            if active {
                engine.stop()
                playing = nil
            } else if engine.play(sound) {
                playing = sound
            } else {
                playing = nil
                audioError = "Audio could not start. Check your audio output and try again. Other activities remain available."
            }
        } label: {
            HStack(spacing: 8) {
                Text(sound.emoji)
                VStack(alignment: .leading, spacing: 1) {
                    Text(sound.title).font(.subheadline.weight(.bold))
                    Text(active ? "● Playing" : "Tap to play")
                        .font(.caption2)
                        .foregroundStyle(active ? Color.emeraldText : Color.secondary)
                }
                Spacer()
            }
            .padding(12)
            .background(active ? Color.emerald.opacity(0.18) : Color.cardInner,
                        in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(active ? Color.emerald.opacity(0.6) : .clear, lineWidth: 2))
        }
    }
}

// MARK: - Guided Breathing 4·4·6

struct BreathingCard: View {
    var body: some View {
        SectionCard(title: AppLanguage.text("Paced breathing"), systemImage: "wind") {
            PacedBreathingActivity()
        }
    }
}

/// Shared paced-breathing activity, with an opt-in hold, for activities and support.
/// It guides a pace only; it does not observe or verify a person's breathing.
struct PacedBreathingActivity: View {
    let targetCycles: Int?
    let onComplete: () -> Void
    let onStop: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @EnvironmentObject private var store: CareStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var includeHold = false
    private var phases: [(name: String, seconds: Int, scale: CGFloat)] {
        includeHold
            ? [("Breathe in", 4, 1.0), ("Hold", 4, 1.0), ("Breathe out", 6, 0.55)]
            : [("Breathe in", 4, 1.0), ("Breathe out", 6, 0.55)]
    }
    // A paused hold preference can change before onChange resets phaseIndex.
    // Clamp rendering during that update so toggling the hold cannot index past the array.
    private var currentPhase: (name: String, seconds: Int, scale: CGFloat) {
        phases[min(phaseIndex, phases.count - 1)]
    }
    @State private var running = false
    @State private var phaseIndex = 0
    @State private var count = 4
    @State private var cycles = 0
    @State private var breathScale: CGFloat = 1.0

    init(
        targetCycles: Int? = nil,
        onComplete: @escaping () -> Void = {},
        onStop: @escaping () -> Void = {}
    ) {
        self.targetCycles = targetCycles
        self.onComplete = onComplete
        self.onStop = onStop
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(AppLanguage.text("Breathe naturally if this pace is not comfortable. Stop if you feel dizzy or short of breath. This does not measure breathing."))
                .font(.caption)
                .foregroundStyle(.secondary)
            Toggle(AppLanguage.text("Include a 4-second hold"), isOn: $includeHold)
                .disabled(running)
                .onChange(of: includeHold) { _ in phaseIndex = 0; count = 4 }
            HStack {
                Spacer()
                ZStack {
                    Circle()
                        .fill(Color.teal.opacity(0.22))
                        .frame(width: 128, height: 128)
                        .scaleEffect((reduceMotion || store.reduceVisualMotion) ? 1.0 : breathScale)
                        .animation((reduceMotion || store.reduceVisualMotion) ? nil : .easeInOut(duration: Double(currentPhase.seconds)), value: breathScale)
                    VStack(spacing: 2) {
                        Text("\(count)").font(.title.weight(.black))
                            .accessibilityAddTraits(.updatesFrequently)
                        Text(running ? currentPhase.name.uppercased() : "PAUSED")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.teal)
                    }
                }
                Spacer()
            }
            .padding(.vertical, 4)
            HStack {
                StatusChip(text: "\(cycles) cycles", color: .teal)
                Spacer()
                Button {
                    if running {
                        running = false
                    } else {
                        phaseIndex = 0
                        count = phases[0].seconds
                        breathScale = phases[0].scale
                        if targetCycles != nil { cycles = 0 }
                        running = true
                    }
                } label: {
                    Label(running ? "Pause" : "Begin", systemImage: running ? "pause.fill" : "play.fill")
                        .font(.subheadline.weight(.black))
                        .padding(.horizontal, 22)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.borderedProminent)
            }
            if targetCycles != nil, running {
                Button {
                    running = false
                    onStop()
                } label: {
                    Label(AppLanguage.text("Stop activity"), systemImage: "stop.fill")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.bordered)
            }
        }
        .task(id: running) {
            guard running else { return }
            while running && !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard running, !Task.isCancelled else { return }
                if count > 1 {
                    count -= 1
                } else {
                    phaseIndex = (phaseIndex + 1) % phases.count
                    if phaseIndex == 0 {
                        cycles += 1
                        if let targetCycles, cycles >= targetCycles {
                            running = false
                            onComplete()
                            return
                        }
                    }
                    count = currentPhase.seconds
                    breathScale = currentPhase.scale
                }
            }
        }
        .onDisappear { running = false }
        .onChange(of: scenePhase) { phase in
            if phase != .active { running = false }
        }
    }
}
