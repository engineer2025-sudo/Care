import SwiftUI

struct TherapyView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    EmotionMatchCard()
                    PatternRecallCard()
                    SoundscapesCard()
                    BreathingCard()
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Therapy & Sensory")
            .inlineTitle()
        }
    }
}

// MARK: - Emotion Recognition (autism emotional-literacy training)

private let emotions: [(name: String, emoji: String)] = [
    ("Happy", "😊"), ("Calm", "😌"), ("Excited", "🤩"), ("Tired", "😴"),
]

struct EmotionMatchCard: View {
    @EnvironmentObject private var store: CareStore
    @State private var target = emotions[0]
    @State private var feedback: String?
    @State private var streak = 0

    var body: some View {
        SectionCard(title: "Emotion Recognition", systemImage: "brain.head.profile") {
            HStack {
                Text("Which face shows **\(target.name)**?")
                    .font(.footnote)
                Spacer()
                StatusChip(text: "Streak \(streak)", color: .indigo)
            }
            VStack(spacing: 6) {
                Text(feedback ?? target.emoji)
                    .font(.system(size: 56))
                Text(feedback ?? " ")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(feedback?.hasPrefix("✨") == true ? Color.emerald : Color.secondary)
                    .frame(height: 14)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(emotions, id: \.name) { emotion in
                    Button {
                        pick(emotion)
                    } label: {
                        Text(emotion.emoji)
                            .font(.largeTitle)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .accessibilityLabel("Option \(emotion.name)")
                }
            }
        }
    }

    private func pick(_ emotion: (name: String, emoji: String)) {
        if emotion.name == target.name {
            streak += 1
            store.emotionScore += 1
            feedback = "✨ Great reading!"
            celebrate()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) {
                target = emotions.randomElement()!
                feedback = nil
            }
        } else {
            streak = 0
            feedback = "Almost — look again 💙"
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { feedback = nil }
        }
    }
}

// MARK: - Pattern Recall (working-memory training)

struct PatternRecallCard: View {
    @EnvironmentObject private var store: CareStore
    @State private var sequence: [Int] = []
    @State private var inputIndex = 0
    @State private var lit: Int?
    @State private var phase: Phase = .idle
    @State private var flashTask: Task<Void, Never>?

    enum Phase { case idle, showing, input, wait, over }

    private let padColors: [Color] = [.emerald, .blue, .orange, .purple]

    var body: some View {
        SectionCard(title: "Pattern Recall", systemImage: "gamecontroller.fill") {
            HStack {
                Text(banner)
                    .font(.footnote.weight(.semibold))
                Spacer()
                StatusChip(text: "Best \(store.bestPattern)", color: .emerald)
            }
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(0..<4, id: \.self) { pad in
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(padColors[pad].opacity(lit == pad ? 1 : 0.55))
                        .scaleEffect(lit == pad ? 1.04 : 1)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(.white.opacity(lit == pad ? 0.8 : 0), lineWidth: 3))
                        .frame(height: 76)
                        .onTapGesture { tap(pad) }
                        .animation(.easeOut(duration: 0.12), value: lit)
                        .accessibilityLabel("Pattern pad \(pad + 1)")
                }
            }
            Button {
                start()
            } label: {
                Label(phase == .idle || phase == .over ? "Start" : "Level \(sequence.count) in progress",
                      systemImage: "play.fill")
                    .font(.subheadline.weight(.black))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
        }
        .onDisappear { flashTask?.cancel() }
    }

    private var banner: String {
        switch phase {
        case .idle: return "Watch the pattern, then repeat it."
        case .showing: return "👀 Watch…"
        case .input: return "Your turn!"
        case .wait: return "Nice! Level up…"
        case .over: return "Round ended at level \(sequence.count). Try again?"
        }
    }

    private func start() {
        sequence = [Int.random(in: 0..<4)]
        Task { await play(sequence) }
    }

    private func play(_ seq: [Int]) async {
        phase = .showing
        inputIndex = 0
        for pad in seq {
            lit = pad
            try? await Task.sleep(nanoseconds: 520_000_000)
            lit = nil
            try? await Task.sleep(nanoseconds: 380_000_000)
        }
        phase = .input
    }

    private func tap(_ pad: Int) {
        guard phase == .input else { return }
        lit = pad
        flashTask?.cancel()
        flashTask = Task {
            try? await Task.sleep(nanoseconds: 200_000_000)
            lit = nil
        }
        guard sequence[inputIndex] == pad else {
            phase = .over
            hapticError()
            return
        }
        if inputIndex == sequence.count - 1 {
            sequence.append(Int.random(in: 0..<4))
            store.bestPattern = max(store.bestPattern, sequence.count)
            celebrate()
            phase = .wait
            Task {
                try? await Task.sleep(nanoseconds: 800_000_000)
                await play(sequence)
            }
        } else {
            inputIndex += 1
        }
    }
}

// MARK: - Sensory Soundscapes (AVAudioEngine DSP)

struct SoundscapesCard: View {
    @State private var playing: SoundScapeEngine.SoundId?
    private let engine = SoundScapeEngine.shared

    var body: some View {
        SectionCard(title: "Sensory Soundscapes", systemImage: "speaker.wave.2.fill") {
            Text("Generated live on-device with AVAudioEngine — noise shaping, LFO swells, procedural birdsong and crackle. Gentle on sensory sensitivities; works offline.")
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
                        .foregroundStyle(active ? Color.emerald : Color.secondary)
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
    private let phases: [(name: String, seconds: Int, scale: CGFloat)] = [
        ("Breathe in", 4, 1.0), ("Hold", 4, 1.0), ("Breathe out", 6, 0.55),
    ]
    @State private var running = false
    @State private var phaseIndex = 0
    @State private var count = 4
    @State private var cycles = 0
    @State private var breathScale: CGFloat = 1.0

    var body: some View {
        SectionCard(title: "Guided Breathing 4·4·6", systemImage: "wind") {
            Text("Down-regulates anxiety and sensory overload — used before social calls, transitions, and bedtime.")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                Spacer()
                ZStack {
                    Circle()
                        .fill(Color.teal.opacity(0.22))
                        .frame(width: 128, height: 128)
                        .scaleEffect(breathScale)
                        .animation(.easeInOut(duration: Double(phases[phaseIndex].seconds)), value: breathScale)
                    VStack(spacing: 2) {
                        Text("\(count)").font(.title.weight(.black))
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
                    if phaseIndex == 0 { cycles += 1 }
                    count = phases[phaseIndex].seconds
                    breathScale = phases[phaseIndex].scale
                }
            }
        }
    }
}
