import SwiftUI
import PhotosUI
import UniformTypeIdentifiers
import CryptoKit
import CommonCrypto

struct PersonalSupportView: View {
    @EnvironmentObject private var store: CareStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var phase
    @StateObject private var assistant = LocalAssistantService()
    @State private var section = "Start here"
    @State private var draft = ""
    @State private var detail = ""
    @State private var third = ""
    @State private var status = ""
    @State private var shown = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var planID: UUID?
    @State private var photoID: UUID?
    @State private var step = 0
    @State private var paused = false
    @State private var photoIndex = 0
    @State private var interest = "Nature"
    @State private var promptIndex = 0
    @State private var pendingURL: URL?
    @State private var password = ""
    @State private var backupDocument: SupportBackupFile?
    @State private var exportBackup = false
    @State private var importBackup = false
    @State private var restoreData: Data?
    @State private var restoreSummary = ""
    @State private var confirmRestore = false
    @State private var aiMode = "Simplify wording"
    @State private var reviewed = ""
    private let sections = ["Start here", "Visual routines", "Communication", "My photos", "My people", "Comfort", "Appointments", "Recovery & backup", "Interest activities", "Apple Intelligence", "Cross-device sharing"]
    private let phrases = ["I need a break", "It is too loud", "Please explain again", "Yes", "No", "I would like help"]
    private let packs = ["Nature": ["What do you notice outside?", "Would you choose a garden, beach or forest?", "Point to something that grows."], "Music": ["What sounds do you enjoy?", "Would you like music or quiet?", "Tell a story about a song, or skip."], "Familiar objects": ["What makes a place comfortable?", "Which object do you like nearby?", "Describe a familiar everyday task."]]
    var body: some View {
        NavigationStack {
            Form {
                Section { Picker("Choose a tool", selection: $section) { ForEach(sections, id: \.self) { Text($0) } } }
                if !status.isEmpty { Section { Text(status).accessibilityAddTraits(.updatesFrequently) } }
                content
            }
            .navigationTitle("My support tools")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .onChange(of: section) { _ in draft = ""; detail = ""; third = ""; shown = ""; status = ""; password = ""; planID = nil; assistant.clearResponse(); SpeechService.shared.stop() }
            .onDisappear { assistant.clearResponse(); SpeechService.shared.stop() }
            .onChange(of: phase) { value in if value != .active { SpeechService.shared.stop(); assistant.clearResponse(); paused = true } }
            .onChange(of: selectedPhoto) { item in Task { await loadPhoto(item) } }
            .onChange(of: assistant.response) { reviewed = $0 }
            .confirmationDialog("Open another app?", isPresented: Binding(get: { pendingURL != nil }, set: { if !$0 { pendingURL = nil } })) {
                if let url = pendingURL { Button("Continue") { UIApplication.shared.open(url); pendingURL = nil } }
                Button("Cancel", role: .cancel) { pendingURL = nil }
            } message: { Text("Review the recipient in the next app. Nothing is sent automatically. External providers have their own privacy terms.") }
            .fileExporter(isPresented: $exportBackup, document: backupDocument, contentType: .json, defaultFilename: "CareSphere-iPhone-backup") { result in
                if case .failure = result { status = "The backup was not saved. Try again." }
                password = ""; backupDocument = nil
            }
            .fileImporter(isPresented: $importBackup, allowedContentTypes: [.json]) { result in
                do {
                    let url = try result.get(); let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                    let values = try url.resourceValues(forKeys: [.fileSizeKey]); guard (values.fileSize ?? 0) < 12_000_000 else { throw SupportBackupError.invalid }
                    let data = try SupportBackup.unlock(Data(contentsOf: url), password: password)
                    restoreSummary = try store.inspectBackup(data); restoreData = data; confirmRestore = true
                } catch { status = "Cannot unlock this iPhone backup. Check its file and passphrase. Nothing changed." }
                password = ""
            }
            .alert("Replace local records?", isPresented: $confirmRestore) {
                Button("Cancel", role: .cancel) { restoreData = nil }
                Button("Replace", role: .destructive) { do { if let data = restoreData { try store.restoreBackup(data); status = "Restored. Review medication schedules before enabling reminders." } } catch { status = "Restore could not finish. Existing data was not replaced." }; restoreData = nil }
            } message: { Text(restoreSummary + " Make a current backup first if needed.") }
        }
    }
    @ViewBuilder private var content: some View {
        switch section {
        case "Start here":
            Section("Start with one thing") {
                Text("Activities work without a profile. Choose comfort settings or make a routine whenever you are ready. Permissions are requested only for features you choose.")
                Toggle("Simple Mode — three destinations", isOn: $store.personalSupport.simple)
                Button("Choose comfort settings") { section = "Comfort" }
                Button("Make a visual routine") { section = "Visual routines" }
                Text("Turn Simple Mode off here at any time to restore every destination.")
            }
        case "Visual routines": plans
        case "Communication":
            Section("Point, display or speak") {
                Text("A supplement to your existing communication system, not a replacement.")
                if !shown.isEmpty { Text(shown).font(.largeTitle); Button("Speak this phrase") { say(shown) }; Button("Clear / stop") { SpeechService.shared.stop(); shown = "" } }
                ForEach(phrases + store.personalSupport.phrases, id: \.self) { phrase in Button(phrase) { SpeechService.shared.stop(); shown = phrase }.frame(minHeight: 44) }
                TextField("My own phrase", text: $draft)
                Button("Add phrase") { let value = String(draft.trimmingCharacters(in: .whitespacesAndNewlines).prefix(240)); if !value.isEmpty && !phrases.contains(value) && !store.personalSupport.phrases.contains(value) { store.personalSupport.phrases.append(value); draft = "" } }.disabled(store.personalSupport.phrases.count >= 24)
                ForEach(store.personalSupport.phrases, id: \.self) { phrase in Button("Remove: \(phrase)", role: .destructive) { store.personalSupport.phrases.removeAll { $0 == phrase } } }
            }
        case "My photos": photos
        case "My people": contacts
        case "Comfort":
            Section("Your preferences, not assumptions") {
                Toggle("Simple Mode", isOn: $store.personalSupport.simple)
                Toggle("Reduce visual motion", isOn: $store.reduceVisualMotion)
                Toggle("Higher contrast", isOn: $store.highContrast)
                Toggle("Speak after I start or advance a routine", isOn: $store.personalSupport.speakSteps)
                Picker("Choices in personal photo matching", selection: $store.personalSupport.choices) { ForEach(2...4, id: \.self) { Text("\($0)").tag($0) } }
                Text("Activity-specific choice controls remain in the library. Text follows iPhone Accessibility settings. Sound never starts automatically.")
            }
        case "Appointments": questions
        case "Recovery & backup": recovery
        case "Interest activities":
            Section("Follow an interest") {
                Picker("Interest", selection: $interest) { ForEach(packs.keys.sorted(), id: \.self) { Text($0) } }
                Text((packs[interest] ?? [""])[promptIndex % 3]).font(.title2)
                Button("Next / skip") { promptIndex += 1 }
                Text("Speak, point, listen or skip. Answers are not recorded; these are leisure prompts, not treatment.")
            }
        case "Apple Intelligence": intelligence
        default:
            Section("Optional sharing service") {
                Text("The web support tools include encrypted read-only invitations, 24-hour expiry and revocation. A separately configured HTTPS sharing service is required. This native app is not connected to that service and does not synchronize your records.")
                Text("Use the existing visit brief or share sheet to deliberately share selected information. Previously shared copies cannot be recalled. There are no automatic caregiver alerts.")
            }
        }
    }
    @ViewBuilder private var plans: some View {
        if let plan = store.personalSupport.plans.first(where: { $0.id == planID }), !plan.steps.isEmpty {
            Section(plan.title) {
                Text("Step \(step + 1) of \(plan.steps.count)")
                if paused { Text("Take your time."); Button("Continue") { paused = false } }
                else {
                    Text(plan.steps[step]).font(.title2)
                    if let photo = store.personalSupport.photos.first(where: { $0.id == plan.photoID }), let image = UIImage(data: photo.jpeg) { Image(uiImage: image).resizable().scaledToFit().accessibilityLabel(photo.caption) }
                    Button("Read this step") { say(plan.steps[step]) }
                    Button("Done / next") { advance(plan) }
                    Button("Skip") { advance(plan) }
                    Button("Take a break") { SpeechService.shared.stop(); paused = true }
                }
                Button("End routine") { planID = nil; SpeechService.shared.stop() }
            }
        } else {
            Section("Your own instructions") {
                Text("One step per line. Do not use this to change prescribed medication instructions.")
                TextField("Routine title", text: $draft)
                TextEditor(text: $detail).frame(minHeight: 120).accessibilityLabel("Steps, one per line")
                Picker("Optional photo", selection: $photoID) { Text("No photo").tag(nil as UUID?); ForEach(store.personalSupport.photos) { Text($0.caption).tag(Optional($0.id)) } }
                Button("Save visual routine") {
                    let steps = detail.components(separatedBy: .newlines).map { String($0.trimmingCharacters(in: .whitespaces).prefix(240)) }.filter { !$0.isEmpty }
                    guard !steps.isEmpty, !draft.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    store.personalSupport.plans.append(VisualPlan(title: String(draft.prefix(120)), steps: Array(steps.prefix(40)), photoID: photoID)); draft = ""; detail = ""
                }.disabled(store.personalSupport.plans.count >= 30)
            }
            Section("Saved routines") { ForEach(store.personalSupport.plans) { plan in Button("Start \(plan.title)") { planID = plan.id; step = 0; paused = false; if store.personalSupport.speakSteps, let first = plan.steps.first { say(first) } } }.onDelete { store.personalSupport.plans.remove(atOffsets: $0) } }
        }
    }
    private func advance(_ plan: VisualPlan) { SpeechService.shared.stop(); if step + 1 < plan.steps.count { step += 1; if store.personalSupport.speakSteps { say(plan.steps[step]) } } else { planID = nil; status = "Routine ended. No score or completion record was saved." } }
    private func say(_ value: String) { SpeechService.shared.speak(value, enabled: true, voiceIdentifier: store.voiceIdentifier) }
    private var photos: some View {
        Section("Local photos · up to 10") {
            Text("Choose photos you have permission to use. No recognition or identity quizzes. Selected pictures are resized and stored encrypted on this phone.")
            TextField("Photo description", text: $draft)
            PhotosPicker("Choose one photo", selection: $selectedPhoto, matching: .images).disabled(store.personalSupport.photos.count >= 10)
            if !store.personalSupport.photos.isEmpty {
                let photo = store.personalSupport.photos[photoIndex % store.personalSupport.photos.count]
                if let image = UIImage(data: photo.jpeg) { Image(uiImage: image).resizable().scaledToFit().accessibilityLabel(photo.caption) }
                Text(photo.caption); Text("What do you notice? Share, point, listen or skip.")
                Button("Next photo") { photoIndex += 1 }
                NavigationLink("Photo matching") { PersonalPhotoPairs(photos: Array(store.personalSupport.photos.prefix(store.personalSupport.choices))) }.disabled(store.personalSupport.photos.count < 2)
                Button("Remove displayed photo", role: .destructive) { store.personalSupport.photos.removeAll { $0.id == photo.id } }
            }
        }
    }
    @MainActor private func loadPhoto(_ item: PhotosPickerItem?) async {
        do {
            guard let item, let bytes = try await item.loadTransferable(type: Data.self), bytes.count < 10_000_000,
                  let image = UIImage(data: bytes), image.size.width > 0, image.size.height > 0 else { status = "Choose a readable photo under 10 MB."; return }
            let scale = min(1, 512 / max(image.size.width, image.size.height))
            let format = UIGraphicsImageRendererFormat(); format.scale = 1
            let resized = UIGraphicsImageRenderer(size: CGSize(width: image.size.width * scale, height: image.size.height * scale), format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: CGSize(width: image.size.width * scale, height: image.size.height * scale))) }
            guard let jpeg = resized.jpegData(compressionQuality: 0.65), jpeg.count < 180_000, store.personalSupport.photos.count < 10 else { status = "Choose a smaller photo."; return }
            store.personalSupport.photos.append(PersonalPhoto(caption: draft.isEmpty ? "My photo" : String(draft.prefix(120)), jpeg: jpeg)); draft = ""; selectedPhoto = nil; status = "Photo saved locally."
        } catch { status = "Photo could not be loaded. Nothing was added." }
    }
    private var contacts: some View {
        Section("People you actually know") {
            TextField("Name", text: $draft); TextField("Phone number", text: $detail).keyboardType(.phonePad); TextField("HTTPS video link (optional)", text: $third).textInputAutocapitalization(.never)
            Button("Save contact") {
                let phone = String(detail.filter { "+0123456789() .-".contains($0) }.prefix(32))
                let video = URL(string: third).flatMap { $0.scheme == "https" && $0.host != nil && $0.user == nil ? $0.absoluteString : nil } ?? ""
                guard !draft.trimmingCharacters(in: .whitespaces).isEmpty, !phone.isEmpty || !video.isEmpty else { status = "Enter a name and phone number or valid HTTPS link."; return }
                store.personalSupport.contacts.append(TrustedPerson(name: String(draft.prefix(80)), phone: phone, video: video)); draft = ""; detail = ""; third = ""
            }.disabled(store.personalSupport.contacts.count >= 20)
            ForEach(store.personalSupport.contacts) { person in
                VStack(alignment: .leading, spacing: 12) {
                    Text(person.name).font(.headline)
                    if !person.phone.isEmpty { Button("Call \(person.name)") { pendingURL = URL(string: "tel:" + person.phone.filter { "+0123456789".contains($0) }) }; Button("Message \(person.name)") { pendingURL = URL(string: "sms:" + person.phone.filter { "+0123456789".contains($0) }) } }
                    if !person.video.isEmpty { Button("Video with \(person.name)") { pendingURL = URL(string: person.video) } }
                }
            }.onDelete { store.personalSupport.contacts.remove(atOffsets: $0) }
            Text("Nobody is notified or monitored automatically. Ask permission before saving someone's details.")
        }
    }
    private var questions: some View {
        Section("Keep questions for your next visit") {
            TextField("Question to ask", text: $draft)
            Button("Save question") { guard !draft.trimmingCharacters(in: .whitespaces).isEmpty else { return }; store.personalSupport.questions.append(VisitQuestion(text: String(draft.prefix(1000)))); draft = "" }.disabled(store.personalSupport.questions.count >= 100)
            ForEach($store.personalSupport.questions) { $question in
                VStack(alignment: .leading) { Text(question.text); Toggle("Important", isOn: $question.important); Toggle("Discussed", isOn: $question.discussed); TextField("Follow-up", text: $question.followup) }
            }.onDelete { store.personalSupport.questions.remove(atOffsets: $0) }
            ShareLink("Review & share questions", item: store.personalSupport.questions.sorted { $0.important && !$1.important }.map { "\($0.important ? "IMPORTANT: " : "")\($0.text)\nFollow-up: \($0.followup)" }.joined(separator: "\n\n")).disabled(store.personalSupport.questions.isEmpty)
            Text("The share sheet lets you choose the recipient. Shared text is no longer protected by this app's encryption.")
        }
    }
    @ViewBuilder private var recovery: some View {
        Section("Recently deleted · 30 days") {
            ForEach(store.personalSupport.deletedNotes) { entry in VStack(alignment: .leading) { Text(entry.note.body); Button("Restore note") { store.restoreDeletedNote(entry) } } }
                .onDelete { store.personalSupport.deletedNotes.remove(atOffsets: $0) }
            Text("Swipe to permanently erase a retained note. Previously shared copies cannot be removed.")
        }
        Section("Encrypted iPhone backup") {
            SecureField("Passphrase · at least 12 characters", text: $password)
            Text("Includes your care records, photos and retained deleted notes. Keep the passphrase separately; there is no recovery. iPhone backups are not interchangeable with Android or web backups.")
            Button("Create encrypted backup") {
                do { backupDocument = SupportBackupFile(data: try SupportBackup.lock(store.backupSnapshot(), password: password)); exportBackup = true }
                catch { status = "Could not create the backup. Use a passphrase with at least 12 characters." }
            }.disabled(password.count < 12)
            Button("Choose backup to preview") { importBackup = true }.disabled(password.count < 12)
        }
    }
    private var intelligence: some View {
        Section("Optional on-device drafting") {
            Text(assistant.availabilityMessage)
            Button("Check availability") { assistant.refreshAvailability() }
            Text("Only the text you choose below is sent to Apple's on-device framework. Output may be wrong. Never use it to change medication instructions or make clinical decisions.")
            Menu("Copy a note into the draft") { ForEach(store.notes) { note in Button(String(note.body.prefix(70))) { draft = String(note.body.prefix(2000)); assistant.clearResponse() } } }
            TextEditor(text: $draft).frame(minHeight: 120).accessibilityLabel("Source text for Apple Intelligence")
            Picker("Draft task", selection: $aiMode) { Text("Simplify wording").tag("Simplify wording"); Text("Appointment questions").tag("Appointment questions"); Text("Everyday steps").tag("Everyday steps") }
            Button("Generate a draft") { Task { await assistant.draftSupport(text: String(draft.prefix(2000)), mode: aiMode) } }.disabled(!assistant.isAvailable || assistant.isGenerating || draft.trimmingCharacters(in: .whitespaces).isEmpty)
            if assistant.isGenerating { ProgressView("Creating draft…"); Button("Cancel generation") { assistant.cancel() } }
            if let error = assistant.generationErrorText { Text(error) }
            if !assistant.response.isEmpty {
                TextEditor(text: $reviewed).frame(minHeight: 120).accessibilityLabel("Review and edit generated draft")
                Button("Save reviewed draft as a new note") { store.addNote(author: "You · reviewed AI draft", body: String(reviewed.prefix(4000))); assistant.clearResponse(); reviewed = ""; status = "Reviewed draft saved as a new note. The source note was not changed." }.disabled(reviewed.trimmingCharacters(in: .whitespaces).isEmpty)
                Button("Discard draft") { assistant.clearResponse(); reviewed = "" }
            }
        }
    }
}

private struct PersonalPhotoPairs: View {
    let photos: [PersonalPhoto]
    @State private var revealed: [Int] = []
    @State private var matched: Set<Int> = []
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Find a matching photo at your own pace. No score or timer.")
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())]) {
                    ForEach(0..<(photos.count * 2), id: \.self) { index in
                        Button {
                            guard revealed.count < 2, !revealed.contains(index), !matched.contains(index) else { return }
                            revealed.append(index)
                            if revealed.count == 2, revealed[0] % photos.count == revealed[1] % photos.count { matched.formUnion(revealed); revealed = [] }
                        } label: {
                            if revealed.contains(index) || matched.contains(index), let image = UIImage(data: photos[index % photos.count].jpeg) { Image(uiImage: image).resizable().scaledToFit().accessibilityLabel(photos[index % photos.count].caption) }
                            else { Text("Card \(index + 1)").frame(minHeight: 80) }
                        }.disabled(matched.contains(index))
                    }
                }
                Button("Clear selection") { revealed = [] }
                Button("Start again") { revealed = []; matched = [] }
            }.padding()
        }.navigationTitle("Photo matching")
    }
}
private enum SupportBackupError: Error { case invalid }
private enum SupportBackup {
    private struct Envelope: Codable { var format = "CareSphere-iPhone-backup-1"; var salt: Data; var sealed: Data }
    private static func key(_ password: String, salt: Data) throws -> SymmetricKey {
        guard password.count >= 12, password.utf8.count <= 4096, salt.count == 16 else { throw SupportBackupError.invalid }
        var output = [UInt8](repeating: 0, count: 32)
        let result = password.withCString { pass in salt.withUnsafeBytes { bytes in CCKeyDerivationPBKDF(CCPBKDFAlgorithm(kCCPBKDF2), pass, password.utf8.count, bytes.bindMemory(to: UInt8.self).baseAddress, salt.count, CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256), 310000, &output, 32) } }
        guard result == kCCSuccess else { throw SupportBackupError.invalid }; return SymmetricKey(data: output)
    }
    static func lock(_ data: Data, password: String) throws -> Data {
        let salt = Data((0..<16).map { _ in UInt8.random(in: .min ... .max) })
        let sealed = try AES.GCM.seal(data, using: key(password, salt: salt), authenticating: Data("CareSphere-iPhone-backup-1".utf8))
        guard let combined = sealed.combined else { throw SupportBackupError.invalid }
        return try JSONEncoder().encode(Envelope(salt: salt, sealed: combined))
    }
    static func unlock(_ data: Data, password: String) throws -> Data {
        guard data.count < 12_000_000 else { throw SupportBackupError.invalid }
        let box = try JSONDecoder().decode(Envelope.self, from: data); guard box.format == "CareSphere-iPhone-backup-1" else { throw SupportBackupError.invalid }
        return try AES.GCM.open(AES.GCM.SealedBox(combined: box.sealed), using: key(password, salt: box.salt), authenticating: Data(box.format.utf8))
    }
}
private struct SupportBackupFile: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data
    init(data: Data) { self.data = data }
    init(configuration: ReadConfiguration) throws { data = configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: data) }
}
