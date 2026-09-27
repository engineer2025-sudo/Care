import Foundation
import Combine
#if canImport(LlamaSwift)
@preconcurrency import LlamaSwift
#endif

/// Manages an optional GGUF model. Model weights are never bundled in the app:
/// users explicitly download or import them into Application Support, keeping
/// the installer small and allowing the same CPU-capable runtime on Intel Macs.
@MainActor
final class LocalAssistantService: ObservableObject {
    static let recommendedModelName = "Qwen2.5 1.5B Instruct · Q4_K_M"
    static let recommendedModelSize = "about 1.1 GB"
    static let recommendedModelURL = URL(string:
        "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf?download=true")!

    @Published private(set) var modelURL: URL?
    @Published private(set) var installedModelLabel = "No local model installed"
    @Published private(set) var isDownloading = false
    @Published private(set) var isImporting = false
    @Published private(set) var isGenerating = false
    @Published private(set) var response = ""
    @Published private(set) var errorText: String?

    private let modelPathKey = "caresphere.localAssistant.modelPath"
    private let modelNameKey = "caresphere.localAssistant.modelName"

    init() {
        if let savedPath = UserDefaults.standard.string(forKey: modelPathKey) {
            let savedURL = URL(fileURLWithPath: savedPath)
            if FileManager.default.fileExists(atPath: savedPath),
               (try? ModelFileStorage.hasGGUFHeader(at: savedURL)) == true {
                modelURL = savedURL
                installedModelLabel = UserDefaults.standard.string(forKey: modelNameKey)
                    ?? (savedURL.lastPathComponent == ModelFileStorage.recommendedFilename
                        ? Self.recommendedModelName : savedURL.lastPathComponent)
            } else {
                UserDefaults.standard.removeObject(forKey: modelPathKey)
                UserDefaults.standard.removeObject(forKey: modelNameKey)
            }
        }
    }

    var isModelInstalled: Bool { modelURL != nil }

    var installedModelSize: String? {
        guard let modelURL,
              let values = try? modelURL.resourceValues(forKeys: [.fileSizeKey]),
              let size = values.fileSize else { return nil }
        return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)
    }

    func downloadRecommendedModel() async {
        guard !isDownloading, !isImporting else { return }
        isDownloading = true
        errorText = nil
        defer { isDownloading = false }

        do {
            let request = URLRequest(
                url: Self.recommendedModelURL,
                cachePolicy: .reloadIgnoringLocalCacheData,
                timeoutInterval: 120)
            let (temporaryURL, response) = try await URLSession.shared.download(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw LocalAssistantError.downloadFailed
            }
            let installedURL = try ModelFileStorage.installDownloadedFile(from: temporaryURL)
            modelURL = installedURL
            installedModelLabel = Self.recommendedModelName
            UserDefaults.standard.set(installedURL.path, forKey: modelPathKey)
            UserDefaults.standard.set(installedModelLabel, forKey: modelNameKey)
        } catch {
            errorText = error.localizedDescription
        }
    }

    /// Copies an imported GGUF into the app's private model directory. The
    /// caller keeps the security-scoped URL open until this async copy returns.
    func importModel(from sourceURL: URL) async {
        guard !isDownloading, !isImporting else { return }
        isImporting = true
        errorText = nil
        defer { isImporting = false }

        do {
            let installedURL = try await Task.detached(priority: .userInitiated) {
                try ModelFileStorage.installImportedFile(from: sourceURL)
            }.value
            modelURL = installedURL
            installedModelLabel = sourceURL.lastPathComponent
            UserDefaults.standard.set(installedURL.path, forKey: modelPathKey)
            UserDefaults.standard.set(installedModelLabel, forKey: modelNameKey)
        } catch {
            errorText = error.localizedDescription
        }
    }

    func removeModel() {
        guard let modelURL else { return }
        if ModelFileStorage.isInsideModelDirectory(modelURL) {
            try? FileManager.default.removeItem(at: modelURL)
        }
        self.modelURL = nil
        installedModelLabel = "No local model installed"
        response = ""
        errorText = nil
        UserDefaults.standard.removeObject(forKey: modelPathKey)
        UserDefaults.standard.removeObject(forKey: modelNameKey)
    }

    func ask(question: String, references: [HealthReference]) async {
        guard let modelURL else {
            errorText = "Install or import a GGUF model before asking the on-device assistant."
            return
        }
        let safeQuestion = String(question.trimmingCharacters(in: .whitespacesAndNewlines).prefix(500))
        guard !safeQuestion.isEmpty else { return }

        // Kokoro is also an on-device inference session. Release its cached ONNX
        // model before loading the much larger Qwen GGUF to conserve device RAM.
        await KokoroSpeechService.shared.releaseInferenceMemory()

        isGenerating = true
        errorText = nil
        response = ""
        defer { isGenerating = false }

        let prompt = Self.makePrompt(question: safeQuestion, references: references)
        do {
            response = try await LocalLlamaRuntime.shared.complete(
                modelPath: modelURL.path,
                prompt: prompt,
                maximumNewTokens: 180)
        } catch {
            errorText = error.localizedDescription
        }
    }

    private static func makePrompt(question: String, references: [HealthReference]) -> String {
        let passages = references.prefix(4).enumerated().map { index, reference in
            let title = escapeSpecialTokens(reference.title)
            let excerpt = escapeSpecialTokens(String(reference.excerpt.prefix(850)))
            let publisher = escapeSpecialTokens(reference.publisher)
            return "[\(index + 1)] \(title) — \(publisher)\n\(excerpt)\nSource: \(reference.url)"
        }.joined(separator: "\n\n")
        let sourceText = passages.isEmpty
            ? "No matching reference passages were found. Say that you could not find a source; do not guess medical facts."
            : passages

        let safeQuestion = escapeSpecialTokens(question)
        return """
        <|im_start|>system
        You are CareSphere's small, offline health-literacy helper. You are not a clinician and must not diagnose, triage, prescribe, interpret an individual test as a diagnosis, or recommend starting, stopping, skipping, or changing a medicine or dose. Use only the reference passages below for medical facts. If they do not answer the question, say so and suggest asking a licensed clinician or pharmacist. Never invent a citation or a source. Keep the answer calm, plain-language, and brief. If the user describes immediate danger or a life-threatening emergency, tell them to contact local emergency services now. This answer is educational only and not medical advice.
        <|im_end|>
        <|im_start|>user
        Question: \(safeQuestion)

        Retrieved reference passages:
        \(sourceText)
        <|im_end|>
        <|im_start|>assistant
        """
    }

    private static func escapeSpecialTokens(_ text: String) -> String {
        // Prevent a pasted reference or user question from injecting llama.cpp
        // control tokens into the fixed system/user chat template.
        text.replacingOccurrences(of: "<|", with: "< |")
    }
}

private enum ModelFileStorage {
    static let recommendedFilename = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
    private static let directoryName = "CareSphere/Models"
    private static let installedFilename = recommendedFilename

    static func installDownloadedFile(from source: URL) throws -> URL {
        guard try hasGGUFHeader(at: source) else { throw LocalAssistantError.invalidModel }
        let directory = try modelDirectory()
        let staged = directory.appendingPathComponent("download-\(UUID().uuidString).gguf")
        let installed = directory.appendingPathComponent(installedFilename)
        // Move URLSession's temporary file instead of copying a >1 GB model;
        // this avoids temporarily requiring twice the available storage.
        try FileManager.default.moveItem(at: source, to: staged)
        return try commit(staged: staged, to: installed)
    }

    static func installImportedFile(from source: URL) throws -> URL {
        guard source.pathExtension.lowercased() == "gguf",
              try hasGGUFHeader(at: source) else {
            throw LocalAssistantError.invalidModel
        }
        guard source.lastPathComponent.lowercased().contains("qwen") else {
            throw LocalAssistantError.unsupportedModel
        }
        let directory = try modelDirectory()
        let staged = directory.appendingPathComponent("import-\(UUID().uuidString).gguf")
        let installed = directory.appendingPathComponent(installedFilename)
        try FileManager.default.copyItem(at: source, to: staged)
        return try commit(staged: staged, to: installed)
    }

    static func hasGGUFHeader(at url: URL) throws -> Bool {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        guard let header = try handle.read(upToCount: 4) else { return false }
        return header == Data("GGUF".utf8)
    }

    static func isInsideModelDirectory(_ url: URL) -> Bool {
        guard let directory = try? modelDirectory().standardizedFileURL.path,
              url.standardizedFileURL.path.hasPrefix(directory + "/") else { return false }
        return true
    }

    private static func modelDirectory() throws -> URL {
        let base = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true)
        let directory = base.appendingPathComponent(directoryName, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    private static func commit(staged: URL, to destination: URL) throws -> URL {
        do {
            if FileManager.default.fileExists(atPath: destination.path) {
                try FileManager.default.removeItem(at: destination)
            }
            try FileManager.default.moveItem(at: staged, to: destination)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var mutableURL = destination
            try? mutableURL.setResourceValues(values)
            return destination
        } catch {
            try? FileManager.default.removeItem(at: staged)
            throw error
        }
    }
}

private enum LocalAssistantError: LocalizedError {
    case downloadFailed
    case invalidModel
    case unsupportedModel
    case runtimeUnavailable
    case modelLoadFailed
    case promptTooLong
    case generationFailed

    var errorDescription: String? {
        switch self {
        case .downloadFailed:
            return "The model download did not complete. Check your connection and available storage, then try again."
        case .invalidModel:
            return "That file is not a valid GGUF model. Choose a .gguf model supported by llama.cpp."
        case .unsupportedModel:
            return "Imported models must be Qwen-family Instruct GGUF files using the ChatML prompt format."
        case .runtimeUnavailable:
            return "The local inference runtime is unavailable in this build. Update CareSphere and try again."
        case .modelLoadFailed:
            return "The GGUF model could not be loaded. It may be incompatible with this device or model format."
        case .promptTooLong:
            return "The question and references are too long for this local model. Try a shorter question."
        case .generationFailed:
            return "The model could not generate a response. Try again with a shorter question."
        }
    }
}

#if canImport(LlamaSwift)
/// llama.cpp inference is isolated to one actor so model/context pointers are
/// never shared between concurrent questions. The model is released after each
/// response to avoid holding ~1.5 GB of memory in the background.
private actor LocalLlamaRuntime {
    static let shared = LocalLlamaRuntime()

    func complete(modelPath: String, prompt: String, maximumNewTokens: Int) throws -> String {
        llama_backend_init()
        defer { llama_backend_free() }

        let modelParameters = llama_model_default_params()
        let model = modelPath.withCString { path in
            llama_model_load_from_file(path, modelParameters)
        }
        guard let model else { throw LocalAssistantError.modelLoadFailed }
        defer { llama_model_free(model) }

        var contextParameters = llama_context_default_params()
        contextParameters.n_ctx = 2048
        contextParameters.n_batch = 2048
        guard let context = llama_init_from_model(model, contextParameters) else {
            throw LocalAssistantError.modelLoadFailed
        }
        defer { llama_free(context) }

        let vocabulary = llama_model_get_vocab(model)
        let utf8Count = prompt.utf8.count
        guard utf8Count < 12_000 else { throw LocalAssistantError.promptTooLong }
        let capacity = utf8Count + 8
        var tokens = [llama_token](repeating: 0, count: capacity)
        let tokenCount = prompt.withCString { promptPointer in
            tokens.withUnsafeMutableBufferPointer { buffer in
                llama_tokenize(
                    vocabulary,
                    promptPointer,
                    Int32(utf8Count),
                    buffer.baseAddress,
                    Int32(buffer.count),
                    true,
                    true)
            }
        }
        guard tokenCount > 0, Int(tokenCount) < Int(contextParameters.n_ctx) - 8 else {
            throw LocalAssistantError.promptTooLong
        }
        let promptTokens = Array(tokens.prefix(Int(tokenCount)))

        var batch = llama_batch_init(contextParameters.n_batch, 0, 1)
        defer { llama_batch_free(batch) }
        batch.n_tokens = Int32(promptTokens.count)
        for index in promptTokens.indices {
            batch.token[index] = promptTokens[index]
            batch.pos[index] = Int32(index)
            batch.n_seq_id[index] = 1
            if let sequenceIds = batch.seq_id,
               let sequenceID = sequenceIds[index] {
                sequenceID[0] = 0
            }
            batch.logits[index] = 0
        }
        batch.logits[Int(batch.n_tokens) - 1] = 1
        guard llama_decode(context, batch) == 0 else {
            throw LocalAssistantError.generationFailed
        }

        var currentPosition = batch.n_tokens
        var generated = ""
        let vocabularySize = Int(llama_vocab_n_tokens(vocabulary))
        let endToken = llama_vocab_eos(vocabulary)
        let generationLimit = min(maximumNewTokens, Int(contextParameters.n_ctx) - Int(tokenCount) - 2)

        for _ in 0..<max(0, generationLimit) {
            guard let logits = llama_get_logits_ith(context, batch.n_tokens - 1) else {
                throw LocalAssistantError.generationFailed
            }
            var bestToken = llama_token(0)
            var bestLogit = logits[0]
            if vocabularySize > 1 {
                for tokenIndex in 1..<vocabularySize where logits[tokenIndex] > bestLogit {
                    bestLogit = logits[tokenIndex]
                    bestToken = llama_token(tokenIndex)
                }
            }
            if bestToken == endToken { break }

            var pieceBuffer = [CChar](repeating: 0, count: 64)
            let pieceLength = llama_token_to_piece(
                vocabulary,
                bestToken,
                &pieceBuffer,
                Int32(pieceBuffer.count),
                0,
                true)
            if pieceLength > 0 {
                let bytes = pieceBuffer.prefix(Int(pieceLength)).map { UInt8(bitPattern: $0) }
                let piece = String(decoding: bytes, as: UTF8.self)
                if piece.contains("<|im_end|>") || piece.contains("<|endoftext|>") { break }
                generated += piece
            }

            batch.n_tokens = 1
            batch.token[0] = bestToken
            batch.pos[0] = currentPosition
            batch.n_seq_id[0] = 1
            if let sequenceIds = batch.seq_id, let sequenceID = sequenceIds[0] {
                sequenceID[0] = 0
            }
            batch.logits[0] = 1
            currentPosition += 1
            guard llama_decode(context, batch) == 0 else {
                throw LocalAssistantError.generationFailed
            }
        }

        let cleaned = generated
            .replacingOccurrences(of: "<|im_end|>", with: "")
            .replacingOccurrences(of: "<|endoftext|>", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { throw LocalAssistantError.generationFailed }
        return cleaned
    }
}
#else
private actor LocalLlamaRuntime {
    static let shared = LocalLlamaRuntime()

    func complete(modelPath: String, prompt: String, maximumNewTokens: Int) throws -> String {
        throw LocalAssistantError.runtimeUnavailable
    }
}
#endif
