import AVFoundation
import Combine
import Foundation
import SherpaOnnx
import ZIPFoundation

/// English speakers included with the official Kokoro v0.19 voice pack.
/// The stored identifier is deliberately namespaced so Apple voice identifiers
/// continue to work unchanged in existing CareStore files.
struct KokoroSpeaker: Identifiable, Hashable {
    let id: Int
    let name: String
    let accent: String

    var selection: String { "kokoro:\(id)" }
    var displayName: String { "\(name) · \(accent)" }

    static let english: [KokoroSpeaker] = [
        .init(id: 0, name: "Original (af)", accent: "American English · feminine"),
        .init(id: 1, name: "Bella", accent: "American English · feminine"),
        .init(id: 2, name: "Nicole", accent: "American English · feminine"),
        .init(id: 3, name: "Sarah", accent: "American English · feminine"),
        .init(id: 4, name: "Sky", accent: "American English · feminine"),
        .init(id: 5, name: "Adam", accent: "American English · masculine"),
        .init(id: 6, name: "Michael", accent: "American English · masculine"),
        .init(id: 7, name: "Emma", accent: "British English · feminine"),
        .init(id: 8, name: "Isabella", accent: "British English · feminine"),
        .init(id: 9, name: "George", accent: "British English · masculine"),
        .init(id: 10, name: "Lewis", accent: "British English · masculine"),
    ]
}

/// Optional, on-device Kokoro neural speech. The model is an opt-in download;
/// the native app bundle contains only Sherpa-ONNX and the downloader, not TTS
/// weights. Model installation and inference remain on this device.
@MainActor
final class KokoroSpeechService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    static let shared = KokoroSpeechService()

    private static let archiveURL = URL(string:
        "https://github.com/engineer2025-sudo/Care/releases/download/mac-v2.1.0/CareSphere-Kokoro-Int8-En-v0.19.zip")!
    private static let installedDirectoryName = "kokoro-int8-en-v0_19"
    private static let minimumModelBytes: Int64 = 50_000_000
    private static let temporaryStorageBytes: Int64 = 250_000_000

    @Published private(set) var isModelInstalled = false
    @Published private(set) var isDownloading = false
    @Published private(set) var isGenerating = false
    @Published private(set) var statusMessage: String?
    @Published private(set) var errorMessage: String?

    private let fileManager = FileManager.default
    private let runtime = KokoroRuntime()
    private var audioPlayer: AVAudioPlayer?
    private var playbackFileURL: URL?

    private override init() {
        super.init()
        isModelInstalled = Self.validModelDirectory(at: Self.installedModelURL)
    }

    var isAvailable: Bool { isModelInstalled }

    /// Downloads the separately released, upstream-verified model pack and
    /// extracts it into Application Support (excluded from device backups).
    func downloadModel() async {
        guard !isDownloading, !isGenerating else { return }
        isDownloading = true
        statusMessage = "Downloading the optional Kokoro voice pack (~100 MB)…"
        errorMessage = nil
        defer { isDownloading = false }

        do {
            let supportDirectory = try Self.supportDirectory(create: true)
            try Self.checkAvailableStorage(at: supportDirectory)

            let workDirectory = supportDirectory.appendingPathComponent(
                "kokoro-install-\(UUID().uuidString)", isDirectory: true)
            try fileManager.createDirectory(at: workDirectory, withIntermediateDirectories: true)
            defer { try? fileManager.removeItem(at: workDirectory) }

            var request = URLRequest(url: Self.archiveURL)
            request.timeoutInterval = 30 * 60
            request.cachePolicy = .reloadIgnoringLocalCacheData
            let (downloadedFile, response) = try await URLSession.shared.download(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw KokoroSpeechError.downloadFailed
            }

            let archive = workDirectory.appendingPathComponent("kokoro.zip")
            try fileManager.moveItem(at: downloadedFile, to: archive)
            let archiveAttributes = try fileManager.attributesOfItem(atPath: archive.path)
            guard let archiveSize = archiveAttributes[.size] as? NSNumber,
                  archiveSize.int64Value >= Self.minimumModelBytes else {
                throw KokoroSpeechError.downloadFailed
            }

            statusMessage = "Verifying and installing the voice files…"
            let extracted = workDirectory.appendingPathComponent("extracted", isDirectory: true)
            try fileManager.createDirectory(at: extracted, withIntermediateDirectories: true)
            let extractionProgress = Progress(totalUnitCount: 0)
            try fileManager.unzipItem(
                at: archive,
                to: extracted,
                skipCRC32: false,
                allowUncontainedSymlinks: false,
                progress: extractionProgress)

            guard Self.validModelDirectory(at: extracted) else {
                throw KokoroSpeechError.invalidModel
            }

            // Release a previously loaded runtime before replacing its files.
            stopPlayback()
            await runtime.unload()
            try Self.install(extracted, into: Self.installedModelURL, fileManager: fileManager)
            isModelInstalled = true
            statusMessage = "Kokoro is installed. Choose a speaker above to use it offline."
        } catch {
            statusMessage = nil
            errorMessage = error.localizedDescription
        }
    }

    func removeModel() async {
        guard !isDownloading, !isGenerating else { return }
        stopPlayback()
        await runtime.unload()
        do {
            if fileManager.fileExists(atPath: Self.installedModelURL.path) {
                try fileManager.removeItem(at: Self.installedModelURL)
            }
            isModelInstalled = false
            statusMessage = "The Kokoro voice pack was removed from this device."
            errorMessage = nil
        } catch {
            errorMessage = "Could not remove the voice pack: \(error.localizedDescription)"
        }
    }

    /// Called by the existing reminder speech router for a selected Kokoro voice.
    func speak(_ text: String, speakerID: Int) async {
        guard isModelInstalled, let speaker = KokoroSpeaker.english.first(where: { $0.id == speakerID }) else {
            errorMessage = "Download the Kokoro voice pack in Settings before selecting this speaker."
            return
        }
        guard !isDownloading, !isGenerating else { return }

        stopPlayback()
        errorMessage = nil
        statusMessage = nil
        isGenerating = true
        defer { isGenerating = false }

        let wavURL = fileManager.temporaryDirectory
            .appendingPathComponent("caresphere-kokoro-\(UUID().uuidString)")
            .appendingPathExtension("wav")
        do {
            let outputPath = try await runtime.synthesize(
                text: String(text.prefix(1_500)),
                speakerID: speaker.id,
                modelDirectory: Self.installedModelURL,
                outputPath: wavURL.path)
            let generatedURL = URL(fileURLWithPath: outputPath)
            guard fileManager.fileExists(atPath: generatedURL.path) else {
                throw KokoroSpeechError.synthesisFailed
            }

            #if os(iOS)
            try? AVAudioSession.sharedInstance().setCategory(
                .playback, mode: .spokenAudio, options: [.duckOthers])
            try? AVAudioSession.sharedInstance().setActive(true)
            #endif

            let player = try AVAudioPlayer(contentsOf: generatedURL)
            player.delegate = self
            player.prepareToPlay()
            playbackFileURL = generatedURL
            audioPlayer = player
            guard player.play() else { throw KokoroSpeechError.playbackFailed }
        } catch {
            stopPlayback()
            try? fileManager.removeItem(at: wavURL)
            errorMessage = error.localizedDescription
        }
    }

    /// Releases the native session when the app enters the background or loads
    /// the larger Qwen model, avoiding two inference engines competing for RAM.
    func releaseInferenceMemory() async {
        guard !isGenerating else { return }
        await runtime.unload()
    }

    func stopPlayback() {
        audioPlayer?.stop()
        audioPlayer = nil
        removePlaybackFile()
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        audioPlayer = nil
        removePlaybackFile()
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
    }

    private func removePlaybackFile() {
        if let playbackFileURL {
            try? fileManager.removeItem(at: playbackFileURL)
        }
        playbackFileURL = nil
    }

    private static var installedModelURL: URL {
        (try? supportDirectory(create: false))?
            .appendingPathComponent(installedDirectoryName, isDirectory: true)
            ?? FileManager.default.temporaryDirectory.appendingPathComponent(installedDirectoryName)
    }

    private static func supportDirectory(create: Bool) throws -> URL {
        guard let base = FileManager.default.urls(
            for: .applicationSupportDirectory, in: .userDomainMask).first else {
            throw KokoroSpeechError.storageUnavailable
        }
        let directory = base.appendingPathComponent("CareSphere/Kokoro", isDirectory: true)
        if create {
            try FileManager.default.createDirectory(
                at: directory, withIntermediateDirectories: true)
            var excludedURL = directory
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? excludedURL.setResourceValues(values)
        }
        return directory
    }

    private static func checkAvailableStorage(at directory: URL) throws {
        let values = try? directory.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        if let freeBytes = values?.volumeAvailableCapacityForImportantUsage,
           freeBytes < temporaryStorageBytes {
            throw KokoroSpeechError.notEnoughStorage
        }
    }

    private static func validModelDirectory(at directory: URL) -> Bool {
        let fileManager = FileManager.default
        let modelURL = directory.appendingPathComponent("model.onnx")
        let modelAttributes = try? fileManager.attributesOfItem(atPath: modelURL.path)
        let modelBytes = (modelAttributes?[.size] as? NSNumber)?.int64Value ?? 0
        let requiredFiles = ["voices.bin", "tokens.txt", "LICENSE"]
        guard modelBytes >= minimumModelBytes,
              requiredFiles.allSatisfy({
                  fileManager.fileExists(atPath: directory.appendingPathComponent($0).path)
              }) else { return false }

        let espeakData = directory.appendingPathComponent("espeak-ng-data", isDirectory: true)
        return fileManager.fileExists(atPath: espeakData.appendingPathComponent("phontab").path)
    }

    private static func install(_ staged: URL, into destination: URL, fileManager: FileManager) throws {
        let parent = destination.deletingLastPathComponent()
        try fileManager.createDirectory(at: parent, withIntermediateDirectories: true)
        let backup = parent.appendingPathComponent("kokoro-old-\(UUID().uuidString)", isDirectory: true)
        let hadOldModel = fileManager.fileExists(atPath: destination.path)

        if hadOldModel { try fileManager.moveItem(at: destination, to: backup) }
        do {
            try fileManager.moveItem(at: staged, to: destination)
            if hadOldModel { try? fileManager.removeItem(at: backup) }
        } catch {
            if hadOldModel, fileManager.fileExists(atPath: backup.path) {
                try? fileManager.moveItem(at: backup, to: destination)
            }
            throw error
        }
    }
}

/// Sherpa-ONNX owns the native inference object. Keeping all C-wrapper access
/// actor-isolated ensures the heavier model initialization and synthesis do not
/// block SwiftUI's main thread.
private actor KokoroRuntime {
    private var engine: SherpaOnnxOfflineTtsWrapper?
    private var loadedDirectory: URL?

    func synthesize(text: String, speakerID: Int, modelDirectory: URL, outputPath: String) throws -> String {
        if engine == nil || loadedDirectory != modelDirectory {
            engine = nil
            let kokoro = sherpaOnnxOfflineTtsKokoroModelConfig(
                model: modelDirectory.appendingPathComponent("model.onnx").path,
                voices: modelDirectory.appendingPathComponent("voices.bin").path,
                tokens: modelDirectory.appendingPathComponent("tokens.txt").path,
                dataDir: modelDirectory.appendingPathComponent("espeak-ng-data").path)
            let model = sherpaOnnxOfflineTtsModelConfig(
                kokoro: kokoro,
                numThreads: 2,
                debug: 0,
                provider: "cpu")
            var config = sherpaOnnxOfflineTtsConfig(model: model)
            let created = SherpaOnnxOfflineTtsWrapper(config: &config)
            guard created.tts != nil else { throw KokoroSpeechError.runtimeUnavailable }
            engine = created
            loadedDirectory = modelDirectory
        }

        guard let engine else { throw KokoroSpeechError.runtimeUnavailable }
        let generated = engine.generate(text: text, sid: speakerID, speed: 0.96)
        guard generated.audio != nil, generated.save(filename: outputPath) == 1 else {
            throw KokoroSpeechError.synthesisFailed
        }
        return outputPath
    }

    func unload() {
        engine = nil
        loadedDirectory = nil
    }
}

private enum KokoroSpeechError: LocalizedError {
    case downloadFailed
    case invalidModel
    case notEnoughStorage
    case playbackFailed
    case runtimeUnavailable
    case storageUnavailable
    case synthesisFailed

    var errorDescription: String? {
        switch self {
        case .downloadFailed:
            return "The Kokoro voice download did not complete. Check the connection and try again."
        case .invalidModel:
            return "The downloaded voice pack did not pass its integrity checks. The existing installation was kept."
        case .notEnoughStorage:
            return "Please free about 250 MB of storage and try the optional voice download again."
        case .playbackFailed:
            return "The generated speech could not be played. Try the preview again."
        case .runtimeUnavailable:
            return "The local speech engine could not load. Restart CareSphere and try again."
        case .storageUnavailable:
            return "CareSphere could not access its private model storage."
        case .synthesisFailed:
            return "Kokoro could not generate this spoken reminder. Try an installed Apple voice instead."
        }
    }
}
