import SwiftUI

struct TherapyView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Text("Optional, self-paced activities for shared practice and enjoyment—not therapy, treatment, or assessment. Stop or skip anything at any time.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                    FeelingsExplorerCard()
                    PatternRecallCard()
                    PicturePairsCard()
                    PictureStoryCard()
                    SoundscapesCard()
                    BreathingCard()
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Activities & Sensory")
            .inlineTitle()
        }
    }
}

// MARK: - Untimed feelings-word activity

private let feelingOptions: [(name: String, emoji: String)] = [
    ("Happy", "😊"), ("Calm", "😌"), ("Excited", "🤩"), ("Tired", "😴"), ("Not sure", "💭"),
]
private let feelingPictures = ["🙂", "😐", "😴", "😊"]

struct FeelingsExplorerCard: View {
    @State private var pictureIndex = 0
    @State private var choice: String?

    var body: some View {
        SectionCard(title: "Feelings explorer", systemImage: "face.smiling") {
            Text("What might this person be feeling? Choose any word—or “Not sure.” These emoji are simplified illustrations, not rules for reading real people; there is no right answer or score.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            VStack(spacing: 10) {
                Text(feelingPictures[pictureIndex])
                    .font(.system(size: 58))
                    .accessibilityHidden(true)
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
                Label("Next picture", systemImage: "arrow.right")
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @EnvironmentObject private var store: CareStore
    @State private var sequence: [Int] = []
    @State private var inputIndex = 0
    @State private var lit: Int?
    @State private var phase: Phase = .idle
    @State private var playbackTask: Task<Void, Never>?
    @State private var tapTask: Task<Void, Never>?

    enum Phase { case idle, showing, input, ready, over }

    var body: some View {
        SectionCard(title: "Pattern Recall", systemImage: "gamecontroller") {
            Text("A short, optional pattern activity. It is untimed, has no personal score, and is not a measure of memory or cognitive health. Reduce visual motion in Settings to slow each highlight.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(banner)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 42, alignment: .leading)
                .accessibilityAddTraits(.updatesFrequently)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(0..<4, id: \.self) { pad in
                    Button {
                        tap(pad)
                    } label: {
                        Text("\(pad + 1)")
                            .font(.title.weight(.bold))
                            .frame(maxWidth: .infinity, minHeight: 76)
                            .background(lit == pad ? Color.emerald : Color.cardInner,
                                        in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .foregroundStyle(lit == pad ? Color.white : Color.primary)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .strokeBorder(lit == pad ? Color.emeraldText : Color.secondary.opacity(0.35), lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .disabled(phase != .input)
                    .accessibilityLabel("Pattern pad \(pad + 1)")
                    .accessibilityHint("Tap when it is your turn.")
                    .animation((reduceMotion || store.reduceVisualMotion) ? nil : .easeOut(duration: 0.15), value: lit)
                }
            }
            Button(action: primaryAction) {
                Label(primaryTitle, systemImage: phase == .showing || phase == .input ? "stop.fill" : "play.fill")
                    .font(.subheadline.weight(.bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .tint(.emerald)
        }
        .onDisappear {
            playbackTask?.cancel()
            tapTask?.cancel()
        }
    }

    private var banner: String {
        switch phase {
        case .idle: return "Start when you are ready. There is no timer."
        case .showing: return "Watch the pattern…"
        case .input: return "Your turn — tap the numbered pads in order."
        case .ready: return "Pattern completed. Continue whenever you are ready."
        case .over: return "That is okay. Show the same pattern again, or stop."
        }
    }

    private var primaryTitle: String {
        switch phase {
        case .idle: return "Start pattern"
        case .showing, .input: return "Stop activity"
        case .ready: return "Continue with a new pattern"
        case .over: return "Show this pattern again"
        }
    }

    private func primaryAction() {
        switch phase {
        case .idle:
            let first = [Int.random(in: 0..<4)]
            sequence = first
            play(first)
        case .showing, .input:
            playbackTask?.cancel()
            tapTask?.cancel()
            lit = nil
            phase = .idle
        case .ready, .over:
            play(sequence)
        }
    }

    private func play(_ items: [Int]) {
        playbackTask?.cancel()
        tapTask?.cancel()
        phase = .showing
        inputIndex = 0
        lit = nil
        playbackTask = Task {
            for pad in items {
                guard !Task.isCancelled else { return }
                lit = pad
                let slowerPacing = store.reduceVisualMotion || reduceMotion
                try? await Task.sleep(nanoseconds: slowerPacing ? 1_100_000_000 : 700_000_000)
                guard !Task.isCancelled else { return }
                lit = nil
                try? await Task.sleep(nanoseconds: slowerPacing ? 800_000_000 : 500_000_000)
            }
            guard !Task.isCancelled else { return }
            phase = .input
        }
    }

    private func tap(_ pad: Int) {
        guard phase == .input else { return }
        guard sequence.indices.contains(inputIndex), sequence[inputIndex] == pad else {
            tapTask?.cancel()
            lit = nil
            phase = .over
            return
        }
        lit = pad
        tapTask?.cancel()
        tapTask = Task {
            try? await Task.sleep(nanoseconds: (store.reduceVisualMotion || reduceMotion) ? 600_000_000 : 300_000_000)
            guard !Task.isCancelled else { return }
            lit = nil
        }
        if inputIndex == sequence.count - 1 {
            sequence.append(Int.random(in: 0..<4))
            phase = .ready
        } else {
            inputIndex += 1
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
    @State private var pairCount = 2
    @State private var cards = makeEverydayPictureDeck(pairCount: 2)
    @State private var opened: [UUID] = []
    @State private var matched: Set<String> = []
    @State private var message = "Choose two picture cards to look for a pair."

    var body: some View {
        SectionCard(title: "Picture pairs", systemImage: "square.grid.2x2") {
            Text("Match familiar picture symbols at your own pace. There is no timer or score; unmatched cards stay open until you choose to hide them. This is an optional game, not a memory test.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Picker("Number of pairs", selection: $pairCount) {
                Text("2 pairs").tag(2)
                Text("3 pairs").tag(3)
                Text("4 pairs").tag(4)
            }
            .pickerStyle(.segmented)
            .onChange(of: pairCount) { _ in reset() }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(cards.indices, id: \.self) { index in
                    let card = cards[index]
                    let isMatched = matched.contains(card.pairID)
                    let isOpen = opened.contains(card.id) || isMatched
                    Button {
                        reveal(card)
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: isOpen ? card.symbol : "square")
                                .font(.title2)
                                .accessibilityHidden(true)
                            Text(isOpen ? card.label : "Card \(index + 1)")
                                .font(.caption.weight(.semibold))
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity, minHeight: 72)
                        .background(isOpen ? Color.emerald.opacity(0.18) : Color.cardInner,
                                    in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .strokeBorder(isMatched ? Color.emeraldText : Color.secondary.opacity(0.3), lineWidth: isMatched ? 2 : 1))
                    }
                    .buttonStyle(.plain)
                    .disabled(isMatched || opened.count == 2)
                    .accessibilityLabel(isOpen ? "\(card.label)\(isMatched ? ", pair found" : "")" : "Hidden picture card \(index + 1)")
                    .accessibilityHint(isOpen ? "Picture card." : "Double-tap to reveal.")
                }
            }
            Text(message)
                .font(.footnote)
                .frame(maxWidth: .infinity, minHeight: 42, alignment: .leading)
                .accessibilityAddTraits(.updatesFrequently)

            HStack {
                if canHideCards {
                    Button("Hide cards") {
                        opened = []
                        message = "Cards hidden. Choose two when you are ready."
                    }
                    .buttonStyle(.bordered)
                }
                Button("Start over", action: reset)
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
            message = "These are different pictures. They will stay open until you choose Hide cards."
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
        SectionCard(title: "Picture story", systemImage: "text.book.closed") {
            Text("Explore a short, predictable picture sequence. These are examples, not instructions—people’s routines and preferences differ. Move forward or back whenever you like.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Picker("Choose a story", selection: $storyIndex) {
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
                    Label("Previous picture", systemImage: "arrow.left")
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
    @State private var playing: SoundScapeEngine.SoundId?
    private let engine = SoundScapeEngine.shared

    var body: some View {
        SectionCard(title: "Sensory Soundscapes", systemImage: "speaker.wave.2.fill") {
            Text("Generated live on-device with AVAudioEngine and works offline. Audio preferences vary; start at a comfortable device volume and stop anytime.")
                .font(.caption)
                .foregroundStyle(.secondary)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(SoundScapeEngine.SoundId.allCases) { sound in
                    soundscapeButton(sound)
                }
            }
        }
    }

    private func soundscapeButton(_ sound: SoundScapeEngine.SoundId) -> some View {
        let active = playing == sound
        return Button {
            if active {
                engine.stop()
                playing = nil
            } else {
                engine.play(sound)
                playing = sound
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
        SectionCard(title: "Guided Breathing 4·4·6", systemImage: "wind") {
            PacedBreathingActivity()
        }
    }
}

/// Shared 4·4·6 activity used by Therapy and the optional support check-in.
/// It guides a pace only; it does not observe or verify a person's breathing.
struct PacedBreathingActivity: View {
    let targetCycles: Int?
    let onComplete: () -> Void
    let onStop: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @EnvironmentObject private var store: CareStore
    private let phases: [(name: String, seconds: Int, scale: CGFloat)] = [
        ("Breathe in", 4, 1.0), ("Hold", 4, 1.0), ("Breathe out", 6, 0.55),
    ]
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
            Text("Follow the count if comfortable. The hold is optional. This does not measure breathing.")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                Spacer()
                ZStack {
                    Circle()
                        .fill(Color.teal.opacity(0.22))
                        .frame(width: 128, height: 128)
                        .scaleEffect((reduceMotion || store.reduceVisualMotion) ? 1.0 : breathScale)
                        .animation((reduceMotion || store.reduceVisualMotion) ? nil : .easeInOut(duration: Double(phases[phaseIndex].seconds)), value: breathScale)
                    VStack(spacing: 2) {
                        Text("\(count)").font(.title.weight(.black))
                            .accessibilityAddTraits(.updatesFrequently)
                        Text(running ? phases[phaseIndex].name.uppercased() : "PAUSED")
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
                    Label("Stop activity", systemImage: "stop.fill")
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
                guard running else { return }
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
                    count = phases[phaseIndex].seconds
                    breathScale = phases[phaseIndex].scale
                }
            }
        }
        .onDisappear { running = false }
    }
}
