import SwiftUI
import UniformTypeIdentifiers

struct HealthGuideView: View {
    @EnvironmentObject private var assistant: LocalAssistantService
    @EnvironmentObject private var careSupport: CareSupportCoordinator
    @StateObject private var library = MedicalLibraryService()

    @State private var question = ""
    @State private var references: [HealthReference] = []
    @State private var isSearching = false
    @State private var statusText: String?
    @State private var showModelImporter = false
    @State private var searchGenerationID = UUID()
    @FocusState private var questionFocused: Bool

    private let quickQuestions = [
        "How can I keep a medication list safely?",
        "What are general ways to reduce trip hazards?",
        "How can I make a routine more sensory-friendly?",
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    heroCard
                    modelCard
                    questionCard
                    if !references.isEmpty { referenceResults }
                    if !assistant.response.isEmpty { answerCard }
                    medlinePlusCard
                    kiwixCard
                    safetyCard
                }
                .padding()
                .frame(maxWidth: 820)
                .frame(maxWidth: .infinity)
            }
            .background(Color.ink)
            .navigationTitle("Health Guide")
            .inlineTitle()
            .fileImporter(
                isPresented: $showModelImporter,
                allowedContentTypes: [.item],
                allowsMultipleSelection: false) { result in
                    guard case .success(let urls) = result, let url = urls.first else { return }
                    let hasSecurityScope = url.startAccessingSecurityScopedResource()
                    Task {
                        await assistant.importModel(from: url)
                        if hasSecurityScope { url.stopAccessingSecurityScopedResource() }
                    }
                }
        }
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label("PRIVATE BY DESIGN", systemImage: "lock.shield.fill")
                    .font(.caption.weight(.heavy))
                    .foregroundStyle(Color.emeraldText)
                Spacer()
                StatusChip(text: "ON DEVICE", color: .emeraldText)
            }
            Text("A calmer way to find answers.")
                .font(.title2.weight(.black))
            Text("Search trusted health references offline. If you install a small language model, it can summarize the passages locally—your questions are not sent to an AI service.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            HStack(spacing: 8) {
                Label("MedlinePlus", systemImage: "cross.case.fill")
                Label("Kiwix / ZIM", systemImage: "books.vertical.fill")
            }
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(
            LinearGradient(colors: [.teal.opacity(0.30), .indigo.opacity(0.22)], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var modelCard: some View {
        SectionCard(title: "On-device language model", systemImage: "cpu") {
            if assistant.isModelInstalled {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.emeraldText)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(assistant.installedModelLabel)
                            .font(.subheadline.weight(.bold))
                        Text(["Local GGUF model", assistant.installedModelSize].compactMap { $0 }.joined(separator: " · "))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Remove", role: .destructive) { assistant.removeModel() }
                        .font(.caption.weight(.bold))
                        .disabled(assistant.isGenerating)
                }
            } else {
                Text("Optional Qwen2.5 1.5B Instruct (Q4_K_M), an open-weights model. It is downloaded only when you choose; the app installer stays small.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack(spacing: 10) {
                    Button {
                        Task { await assistant.downloadRecommendedModel() }
                    } label: {
                        Label("Download · ~1.1 GB", systemImage: "arrow.down.circle.fill")
                            .font(.caption.weight(.heavy))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(assistant.isDownloading || assistant.isImporting)

                    Button {
                        showModelImporter = true
                    } label: {
                        Label("Import GGUF", systemImage: "folder.badge.plus")
                            .font(.caption.weight(.bold))
                    }
                    .buttonStyle(.bordered)
                    .disabled(assistant.isDownloading || assistant.isImporting)
                }
            }

            if assistant.isDownloading || assistant.isImporting {
                ProgressView(assistant.isDownloading ? "Downloading model — keep CareSphere open…" : "Copying model into private storage…")
                    .font(.caption2)
                    .tint(.emerald)
            }
            if let error = assistant.errorText, assistant.generationErrorText == nil {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption2)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            }
            VStack(alignment: .leading, spacing: 5) {
                Text("Small-model limits")
                    .font(.caption.weight(.bold))
                Text("A 1.5B model can be slow on some iPhones and may make mistakes. First use loads about 1.1 GB of weights plus runtime memory. Imported files must be Qwen-family Instruct GGUF models using ChatML. This is an educational helper—not a clinician, diagnosis, or medication checker.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Link("Model card & Apache 2.0 license", destination: URL(string: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF")!)
                    .font(.caption2.weight(.semibold))
            }
            .padding(12)
            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private var questionCard: some View {
        SectionCard(title: "Ask using local references", systemImage: "text.magnifyingglass") {
            TextField("Ask a general health-information question…", text: $question, axis: .vertical)
                .lineLimit(1...4)
                .focused($questionFocused)
                .padding(12)
                .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .submitLabel(.search)
                .onSubmit { searchAndAsk() }
                .accessibilityLabel("Health reference question")

            Button {
                searchAndAsk()
            } label: {
                HStack {
                    if isSearching || assistant.isGenerating {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: assistant.isModelInstalled ? "sparkles" : "magnifyingglass")
                    }
                    Text(assistant.isModelInstalled ? "Search sources & ask on device" : "Search local references")
                        .font(.subheadline.weight(.heavy))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSearching || assistant.isGenerating)

            if let statusText {
                Text(statusText).font(.caption2).foregroundStyle(.secondary)
            }
            if let error = assistant.generationErrorText {
                VStack(alignment: .leading, spacing: 8) {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Your source results are still available. Retrying runs only the local model; it does not repeat the reference search.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Button {
                        Task { await askLocalModelSafely(question: question, references: references) }
                    } label: {
                        Label("Retry local generation", systemImage: "arrow.clockwise")
                            .font(.caption.weight(.bold))
                    }
                    .buttonStyle(.bordered)
                    .disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSearching || assistant.isGenerating)
                }
                .padding(10)
                .background(Color.orange.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            if let error = library.kiwixSearchError {
                Label("Wikipedia search: \(error)", systemImage: "wifi.exclamationmark")
                    .font(.caption2)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: 7) {
                Text("Try a question")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                ForEach(quickQuestions, id: \.self) { suggestion in
                    Button {
                        question = suggestion
                        performSearchAndAsk(for: suggestion)
                    } label: {
                        HStack {
                            Text(suggestion)
                                .font(.caption.weight(.medium))
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 6)
                            Image(systemName: "arrow.up.left")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(Color.emeraldText)
                        }
                        .padding(10)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var referenceResults: some View {
        SectionCard(title: "Sources found · \(references.count)", systemImage: "books.vertical.fill") {
            ForEach(references) { reference in
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(reference.title)
                                .font(.subheadline.weight(.bold))
                            Text(reference.publisher)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(Color.emeraldText)
                        }
                        Spacer(minLength: 6)
                        if let url = URL(string: reference.url), !reference.url.isEmpty {
                            Link(destination: url) {
                                Image(systemName: "arrow.up.right.square")
                                    .font(.caption.weight(.bold))
                            }
                            .accessibilityLabel("Open source: \(reference.title)")
                        }
                    }
                    Text(reference.excerpt)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(5)
                        .textSelection(.enabled)
                }
                .padding(12)
                .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }

    private var answerCard: some View {
        SectionCard(title: "On-device summary", systemImage: "sparkles") {
            HStack {
                StatusChip(text: "LOCAL MODEL", color: .teal)
                Text("Generated on this device")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Text(assistant.response)
                .font(.body)
                .textSelection(.enabled)
                .fixedSize(horizontal: false, vertical: true)
            Text("Educational information only. The small model can be wrong; verify with your care team or pharmacist. Do not use for emergencies, diagnosis, or medication decisions.")
                .font(.caption2)
                .foregroundStyle(.orange)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var medlinePlusCard: some View {
        SectionCard(title: "MedlinePlus offline library", systemImage: "cross.case.fill") {
            Text("Get the current English health-topic dataset from the U.S. National Library of Medicine. It is about 30 MB as XML and stays in CareSphere's private app storage after import.")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("\(library.medlinePlusArticleCount.formatted()) health topics")
                        .font(.subheadline.weight(.bold))
                    Text(library.medlinePlusUpdatedLabel ?? "Built-in safety notes available offline")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if library.isUpdatingMedlinePlus {
                    ProgressView().tint(.emerald)
                } else {
                    Button(library.medlinePlusArticleCount == 0 ? "Download" : "Update") {
                        Task { await library.downloadLatestMedlinePlus() }
                    }
                    .buttonStyle(.borderedProminent)
                    .font(.caption.weight(.bold))
                }
            }
            if let error = library.updateError {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption2)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Link("Data, update schedule & attribution", destination: URL(string: "https://medlineplus.gov/xml.html")!)
                .font(.caption2.weight(.semibold))
            Text("MedlinePlus content is general patient education—not individualized treatment. Search works offline after the dataset is downloaded.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var kiwixCard: some View {
        SectionCard(title: "Wikipedia ZIM · Kiwix server", systemImage: "books.vertical") {
            Text("This build does not include a ZIM reader: keep your 6.9 GB archive where it is and run Kiwix Server separately. CareSphere sends searches only to the private server address below; it does not bundle or copy the archive.")
                .font(.caption)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 9) {
                TextField("Kiwix server · http://127.0.0.1:8080", text: $library.kiwixServerURL)
                    .disableKiwixTextCorrections()
                    .padding(10)
                    .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .accessibilityLabel("Local Kiwix server address")
                TextField("Kiwix content name · usually the .zim filename", text: $library.kiwixContentName)
                    .disableKiwixTextCorrections()
                    .padding(10)
                    .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .accessibilityLabel("Kiwix content name")
                Button {
                    Task { await library.testKiwixConnection() }
                } label: {
                    HStack {
                        if library.isTestingKiwix { ProgressView().tint(.white) }
                        Label("Test private connection", systemImage: "point.3.connected.trianglepath.dotted")
                    }
                    .font(.caption.weight(.bold))
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(library.isTestingKiwix)
                if let message = library.kiwixConnectionMessage {
                    Text(message)
                        .font(.caption2)
                        .foregroundStyle(message.hasPrefix("Connected") ? Color.emeraldText : .orange)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(12)
            .background(Color.cardInner.opacity(0.65), in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                Text("One-time setup on Mac")
                    .font(.caption.weight(.bold))
                Text("Install Kiwix Tools, then serve the existing file:")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("brew install kiwix-tools\nkiwix-serve --port=8080 --address=0.0.0.0 \"/path/to/your-library.zim\"")
                    .font(.system(.caption2, design: .monospaced))
                    .textSelection(.enabled)
                    .padding(9)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.22), in: RoundedRectangle(cornerRadius: 10))
                Text("Use the .zim content name (normally its filename without .zim). The command listens on the Mac's network interfaces so iPhone/iPad can connect; use it only on a trusted Wi-Fi, do not port-forward it, and enter the Mac's private IP or MacBook.local address on the iPhone. For Mac-only access, bind to 127.0.0.1 instead. HTTP is restricted to private/local hosts.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var safetyCard: some View {
        SectionCard(title: "Important safety boundary", systemImage: "cross.case") {
            Text("CareSphere is not a medical device and cannot diagnose, triage, check drug interactions, or recommend a dose. The language model is small and may be wrong. For an emergency, call local emergency services; in the U.S., call 911.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func searchAndAsk() {
        performSearchAndAsk(for: question)
    }

    private func performSearchAndAsk(for rawQuestion: String) {
        let trimmed = rawQuestion.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        questionFocused = false
        statusText = nil
        if let risk = CareQuestionSafety.classify(trimmed) {
            // Interrupt before reference search or model inference. Do not keep
            // the sensitive question in the text field or send it to anyone.
            searchGenerationID = UUID()
            isSearching = false
            references = []
            question = ""
            assistant.presentSafetyResponse(for: risk)
            careSupport.begin(.urgentQuestion(risk))
            return
        }
        guard !isSearching, !assistant.isGenerating else { return }
        isSearching = true
        let requestID = UUID()
        searchGenerationID = requestID
        Task {
            let found = await library.search(trimmed)
            guard searchGenerationID == requestID else { return }
            references = found
            if assistant.isModelInstalled {
                await askLocalModelSafely(question: trimmed, references: found)
            } else {
                statusText = found.isEmpty
                    ? "No matching passage found in the installed offline references."
                    : "Install a GGUF model to summarize these references offline."
            }
            if searchGenerationID == requestID { isSearching = false }
        }
    }

    private func askLocalModelSafely(question: String, references: [HealthReference]) async {
        if let risk = CareQuestionSafety.classify(question) {
            searchGenerationID = UUID()
            isSearching = false
            self.references = []
            self.question = ""
            assistant.presentSafetyResponse(for: risk)
            careSupport.begin(.urgentQuestion(risk))
            return
        }
        await assistant.ask(question: question, references: references)
    }
}

private extension View {
    @ViewBuilder
    func disableKiwixTextCorrections() -> some View {
        #if os(iOS)
        textInputAutocapitalization(.never)
            .autocorrectionDisabled()
        #else
        self
        #endif
    }
}
