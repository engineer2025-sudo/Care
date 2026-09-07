import Foundation
import AVFoundation

/// Procedural sensory soundscapes (rain, ocean, forest, hearth) rendered in
/// real time by an AVAudioEngine + AVAudioSourceNode render callback — the
/// official iOS equivalent of the web app's Web Audio engine. No audio files;
/// all DSP is generated sample-by-sample.
final class SoundScapeEngine {
    static let shared = SoundScapeEngine()

    enum SoundId: String, CaseIterable, Identifiable {
        case rain, ocean, forest, fire
        var id: String { rawValue }

        var title: String {
            switch self {
            case .rain: return "Rain"
            case .ocean: return "Waves"
            case .forest: return "Forest"
            case .fire: return "Hearth"
            }
        }
        var emoji: String {
            switch self {
            case .rain: return "🌧️"
            case .ocean: return "🌊"
            case .forest: return "🌲"
            case .fire: return "🔥"
            }
        }
    }

    private let engine = AVAudioEngine()
    private let stateLock = NSLock()
    private var currentSound: SoundId?
    private var isRunning = false
    private var sourceInstalled = false

    // ── DSP state (touched only on the render thread under stateLock) ──
    private var rngState: UInt32 = 0x9E3779B9
    private var lpFast: Float = 0        // ~1.3 kHz one-pole (rain)
    private var lpSlow: Float = 0        // ~430 Hz one-pole (band split)
    private var lpBed: Float = 0         // deep rumble bed (forest)
    private var brown: Float = 0         // brown-noise integrator
    private var lfoPhase: Float = 0      // slow amplitude swell
    private var crackleEnv: Float = 0
    private var cracklePhase: Float = 0
    private var crackleFreq: Float = 1800
    private var chirpEnv: Float = 0
    private var chirpPhase: Float = 0
    private var chirpBase: Float = 2300
    private var chirpNotesLeft: Int = 0
    private var framesToNextChirp: Int = 88200
    private var framesToNextNote: Int = 0
    private var frameCounter: Int = 0

    private let sampleRate: Float = 44100
    private let twoPi: Float = Float.pi * 2

    // MARK: Public control

    func play(_ sound: SoundId) {
        stateLock.lock()
        currentSound = sound
        stateLock.unlock()
        startEngineIfNeeded()
    }

    func stop() {
        stateLock.lock()
        currentSound = nil
        stateLock.unlock()
        engine.stop()
        isRunning = false
    }

    var isPlaying: Bool { currentSound != nil }
    var playingSound: SoundId? { currentSound }

    // MARK: Engine

    private func startEngineIfNeeded() {
        guard !isRunning else { return }
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixesWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)

        guard let format = AVAudioFormat(standardFormatWithSampleRate: Double(sampleRate), channels: 1) else { return }
        let source = AVAudioSourceNode(format: format) { [weak self] _, _, frameCount, audioBufferList in
            guard let self else { return noErr }
            self.render(Int(frameCount), into: audioBufferList)
            return noErr
        }
        engine.attach(source)
        engine.connect(source, to: engine.mainMixerNode, format: format)
        do {
            try engine.start()
            isRunning = true
        } catch {
            isRunning = false
        }
    }

    private func rand() -> Float {
        // xorshift32 — fast, deterministic enough for noise synthesis.
        var x = rngState
        x ^= x << 13
        x ^= x >> 17
        x ^= x << 5
        rngState = x
        return Float(x) / Float(UInt32.max) * 2 - 1     // [-1, 1]
    }

    private func render(_ frameCount: Int, into audioBufferList: UnsafeMutablePointer<AudioBufferList>) {
        stateLock.lock()
        defer { stateLock.unlock() }

        let sound = currentSound
        var samples = [Float](repeating: 0, count: frameCount)

        for i in 0..<frameCount {
            frameCounter += 1
            let white = rand()
            var out: Float = 0

            switch sound {
            case .rain:
                lpFast += 0.18 * (white - lpFast)
                lpSlow += 0.06 * (lpFast - lpSlow)
                let band = lpFast - lpSlow
                lfoPhase += twoPi * 0.07 / sampleRate
                out = band * (0.16 + 0.05 * sin(lfoPhase))

            case .ocean:
                brown = (brown + 0.02 * white) * 0.997
                lfoPhase += twoPi * 0.08 / sampleRate
                out = brown * 3.2 * (0.45 + 0.45 * sin(lfoPhase))

            case .forest:
                lpBed += 0.02 * (white - lpBed)
                out = lpBed * 0.25

                if chirpNotesLeft == 0 && chirpEnv <= 0.001 {
                    framesToNextChirp -= 1
                    if framesToNextChirp <= 0 {
                        chirpNotesLeft = 2 + Int(rand() * 1.5 + 1.5)   // 2–4 notes
                        chirpBase = 2200 + rand() * 900
                        framesToNextNote = 0
                        framesToNextChirp = Int(sampleRate * (2.2 + rand() * 4.8))
                    }
                }
                if chirpNotesLeft > 0 {
                    framesToNextNote -= 1
                    if framesToNextNote <= 0 && chirpEnv <= 0.001 {
                        chirpEnv = 1
                        framesToNextNote = Int(sampleRate * 0.13)
                        chirpNotesLeft -= 1
                    }
                }
                if chirpEnv > 0.001 {
                    let warble = 1 + 0.15 * sin(chirpPhase * 0.12)
                    chirpPhase += twoPi * chirpBase * warble / sampleRate
                    out += sin(chirpPhase) * chirpEnv * 0.09
                    chirpEnv *= 0.99935
                }

            case .fire:
                brown = (brown + 0.022 * white) * 0.996
                out = brown * 2.6
                if rand() < 1.0 / 9000.0 {
                    crackleEnv = 1
                    crackleFreq = 1200 + (rand() + 1) * 1200
                }
                if crackleEnv > 0.001 {
                    cracklePhase += twoPi * crackleFreq / sampleRate
                    out += sin(cracklePhase) * crackleEnv * 0.25
                    crackleEnv *= 0.9992
                }

            case nil:
                break
            }

            samples[i] = max(-1, min(1, out))
        }

        let ablPointer = UnsafeMutableAudioBufferListPointer(audioBufferList)
        for ab in ablPointer {
            guard let mData = ab.mData else { continue }
            let buffer = UnsafeMutableBufferPointer<Float>(
                start: mData.assumingMemoryBound(to: Float.self),
                count: frameCount)
            for i in 0..<frameCount {
                buffer[i] = samples[i]
            }
        }
    }
}
