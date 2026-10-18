import SwiftUI
import PhotosUI
import ImageIO
import CoreImage
import UniformTypeIdentifiers
import CryptoKit
import CommonCrypto
import CareActivityKit

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
    @State private var connectionPhoto: PhotosPickerItem?
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
    @State private var transferPassword = ""
    @AppStorage("caresphere.bareMinimum") private var bareMinimum = false
    @State private var incomingDigest: String?
    @State private var incomingSalt: Data?
    @State private var incomingSource = "file"
    @State private var pendingReceipt: ImportReceipt.Receipt?
    @State private var importReceiptFile = false
    @State private var verifyTransferFile = false
    @State private var verifyReceipt: ImportReceipt.Receipt?
    @State private var verifyFileData: Data?
    @State private var selectedRecords = Set<String>()
    @State private var incomingRecords = Set<String>()
    @State private var incomingTransfer: TransferPayload?
    @State private var transferURL: URL?
    @State private var importTransferFile = false
    @State private var transferBusy = false
    @State private var transferGeneration = UUID()
    @State private var confirmTransfer = false
    @FocusState private var nearbyCodeFocused: Bool
    @StateObject private var nearbyAdvertisement = NearbyAdvertisement()
    @StateObject private var nearbyDiscovery = NearbyDiscovery()
    @State private var nearbyHost = LocalTransferHost()
    @State private var nearbyReceiver = LocalTransferReceiver()
    @State private var nearbyGeneration = UUID()
    @State private var nearbyBusy = false
    @State private var offeredAddress = ""
    @State private var offeredCode = ""
    @State private var receiveAddress = ""
    @State private var receiveCode = ""
    @State private var networkAddress = ""
    @State private var nearbyStatus = ""
    private let sections = ["Start here", "Visual routines", "Communication", "My photos", "My people", "Comfort", "Appointments", "Recovery & backup", "Interest activities", "Apple Intelligence", "Device sharing"]
    private let phrases = ["I need a break", "It is too loud", "Please explain again", "Yes", "No", "I would like help"]
    private let packs = ["Nature": ["What do you notice outside?", "Would you choose a garden, beach or forest?", "Point to something that grows."], "Music": ["What sounds do you enjoy?", "Would you like music or quiet?", "Tell a story about a song, or skip."], "Familiar objects": ["What makes a place comfortable?", "Which object do you like nearby?", "Describe a familiar everyday task."]]
    var body: some View {
        NavigationStack {
            Form {
                Section { Picker(AppLanguage.text("Choose a tool"), selection: $section) { ForEach(sections, id: \.self) { Text(AppLanguage.text($0)).tag($0) } } }
                if !status.isEmpty { Section { Text(AppLanguage.text(status)).accessibilityAddTraits(.updatesFrequently) } }
                content
            }
            .navigationTitle(AppLanguage.text("My support tools"))
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(AppLanguage.text("Done")) { dismiss() } } }
            .onChange(of: section) { _ in stopNearby(); draft = ""; detail = ""; third = ""; shown = ""; status = ""; password = ""; transferPassword = ""; transferGeneration = UUID(); transferBusy = false; incomingTransfer = nil; incomingDigest = nil; incomingSalt = nil; pendingReceipt = nil; verifyReceipt = nil; verifyFileData = nil; planID = nil; assistant.clearResponse(); SpeechService.shared.stop() }
            .onDisappear { stopNearby(); transferPassword = ""; transferGeneration = UUID(); incomingDigest = nil; incomingSalt = nil; verifyReceipt = nil; verifyFileData = nil; assistant.clearResponse(); SpeechService.shared.stop() }
            .onChange(of: phase) { value in if value == .background { stopNearby() }; if value != .active { SpeechService.shared.stop(); assistant.clearResponse(); paused = true } }
            .onChange(of: connectionPhoto) { item in Task { await readConnectionPhoto(item) } }
            .onChange(of: selectedPhoto) { item in Task { await loadPhoto(item) } }
            .onChange(of: assistant.response) { reviewed = $0 }
            .confirmationDialog(AppLanguage.text("Open another app?"), isPresented: Binding(get: { pendingURL != nil }, set: { if !$0 { pendingURL = nil } })) {
                if let url = pendingURL { Button(AppLanguage.text("Continue")) { UIApplication.shared.open(url); pendingURL = nil } }
                Button(AppLanguage.text("Cancel"), role: .cancel) { pendingURL = nil }
            } message: { Text(AppLanguage.text("Review the recipient in the next app. Nothing is sent automatically. External providers have their own privacy terms.")) }
            .alert(AppLanguage.text("Prepare selected copies?"), isPresented: $confirmTransfer) {
                Button(AppLanguage.text("Cancel"), role: .cancel) { }
                Button(AppLanguage.text("Prepare encrypted file")) { prepareTransfer() }
            } message: { Text(AppLanguage.text("Only your selected notes and routines are included. Recipients can keep or forward copies. You cannot recall them remotely. Tell the recipient the passphrase separately.")) }
            .fileImporter(isPresented: $importTransferFile, allowedContentTypes: [.json, .data]) { result in
                do {
                    let url = try result.get(); let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                    guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) <= 1_000_000 else { throw DeviceTransfer.Failure.invalid }
                    let data = try Data(contentsOf: url); let pass = transferPassword; let generation = UUID(); transferGeneration = generation; transferBusy = true; incomingTransfer = nil
                    Task {
                        let result = await Task.detached { Result { try DeviceTransfer.open(data, password: pass) } }.value
                        guard transferGeneration == generation else { return }; transferBusy = false
                        switch result { case .success(let payload):
                            incomingTransfer = payload; incomingRecords = []
                            incomingDigest = ImportReceipt.fileSha256(data)
                            incomingSalt = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]).flatMap { ($0["salt"] as? String).flatMap { Data(base64Encoded: $0) } }
                            incomingSource = "file"
                            status = "Unlocked locally. Preview and select records before importing."
                        case .failure: status = "Cannot unlock this CareSphere transfer. Check the file and passphrase. Nothing was imported." }
                    }
                } catch { status = "Could not read this transfer. Nothing was imported." }
            }
            .fileImporter(isPresented: $importReceiptFile, allowedContentTypes: [.json, .data]) { result in
                do {
                    let url = try result.get(); let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                    guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) <= 100_000 else { throw ImportReceipt.Failure.invalid }
                    verifyReceipt = try ImportReceipt.parse(String(decoding: try Data(contentsOf: url), as: UTF8.self))
                    verifyFileData = nil
                    status = "Receipt loaded. Enter the transfer passphrase, then choose Verify receipt."
                } catch { status = "This is not a CareSphere import receipt." }
            }
            .fileImporter(isPresented: $verifyTransferFile, allowedContentTypes: [.json, .data]) { result in
                do {
                    let url = try result.get(); let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                    guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) <= 1_000_000 else { throw ImportReceipt.Failure.invalid }
                    verifyFileData = try Data(contentsOf: url)
                    status = "Transfer file added. Choose Verify receipt."
                } catch { status = "Could not read this transfer file." }
            }
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
            .alert(AppLanguage.text("Replace local records?"), isPresented: $confirmRestore) {
                Button(AppLanguage.text("Cancel"), role: .cancel) { restoreData = nil }
                Button(AppLanguage.text("Replace"), role: .destructive) { do { if let data = restoreData { try store.restoreBackup(data); status = "Restored. Review medication schedules before enabling reminders." } } catch { status = "Restore could not finish. Existing data was not replaced." }; restoreData = nil }
            } message: { Text(restoreSummary + " Make a current backup first if needed.") }
        }
    }
    @ViewBuilder private var content: some View {
        switch section {
        case "Start here":
            Section(AppLanguage.text("Start with one thing")) {
                InfoText(AppLanguage.text("Activities work without a profile. Choose comfort settings or make a routine whenever you are ready. Permissions are requested only for features you choose."))
                Toggle(AppLanguage.text("Simple Mode — three destinations"), isOn: $store.personalSupport.simple)
                Button(AppLanguage.text("Choose comfort settings")) { section = "Comfort" }
                Button(AppLanguage.text("Make a visual routine")) { section = "Visual routines" }
                Text(AppLanguage.text("Turn Simple Mode off here at any time to restore every destination."))
            }
        case "Visual routines": plans
        case "Communication":
            Section(AppLanguage.text("Point, display or speak")) {
                InfoText(AppLanguage.text("A supplement to your existing communication system, not a replacement."))
                if !shown.isEmpty { Text(shown).font(.largeTitle); Button(AppLanguage.text("Speak this phrase")) { say(shown) }; Button(AppLanguage.text("Clear / stop")) { SpeechService.shared.stop(); shown = "" } }
                ForEach(phrases.map { AppLanguage.text($0) } + store.personalSupport.phrases, id: \.self) { phrase in Button(phrase) { SpeechService.shared.stop(); shown = phrase }.frame(minHeight: 44) }
                TextField(AppLanguage.text("My own phrase"), text: $draft)
                Button(AppLanguage.text("Add phrase")) { let value = String(draft.trimmingCharacters(in: .whitespacesAndNewlines).prefix(240)); if !value.isEmpty && !phrases.contains(value) && !store.personalSupport.phrases.contains(value) { store.personalSupport.phrases.append(value); draft = "" } }.disabled(store.personalSupport.phrases.count >= 24)
                ForEach(store.personalSupport.phrases, id: \.self) { phrase in Button(AppLanguage.format("Remove: {0}", [phrase]), role: .destructive) { store.personalSupport.phrases.removeAll { $0 == phrase } } }
            }
        case "My photos": photos
        case "My people": contacts
        case "Comfort":
            Section(AppLanguage.text("Your preferences, not assumptions")) {
                Toggle(AppLanguage.text("Simple Mode"), isOn: $store.personalSupport.simple)
                Toggle(AppLanguage.text("Bare minimum mode"), isOn: $bareMinimum)
                Toggle(AppLanguage.text("Reduce visual motion"), isOn: $store.reduceVisualMotion)
                Toggle(AppLanguage.text("Higher contrast"), isOn: $store.highContrast)
                Toggle(AppLanguage.text("Speak after I start or advance a routine"), isOn: $store.personalSupport.speakSteps)
                Picker(AppLanguage.text("Choices in personal photo matching"), selection: $store.personalSupport.choices) { ForEach(2...4, id: \.self) { Text("\($0)").tag($0) } }
                InfoText(AppLanguage.text("Activity-specific choice controls remain in the library. Text follows iPhone Accessibility settings. Sound never starts automatically."))
            }
        case "Appointments": questions
        case "Recovery & backup": recovery
        case "Interest activities":
            Section(AppLanguage.text("Follow an interest")) {
                Picker(AppLanguage.text("Interest"), selection: $interest) { ForEach(packs.keys.sorted(), id: \.self) { Text(AppLanguage.text($0)).tag($0) } }
                Text(AppLanguage.text((packs[interest] ?? [""])[promptIndex % 3])).font(.title2)
                Button(AppLanguage.text("Next / skip")) { promptIndex += 1 }
                InfoText(AppLanguage.text("Speak, point, listen or skip. Answers are not recorded; these are leisure prompts, not treatment."))
            }
        case "Apple Intelligence": intelligence
        default: deviceSharing
        }
    }
    private var transferableRecords: [TransferRecord] {
        store.notes.map { TransferRecord(id: "n:" + $0.id.uuidString, type: "note", text: $0.body) } +
        store.routines.map { TransferRecord(id: "r:" + $0.id.uuidString, type: "routine", text: $0.title) }
    }
    private var deviceSharing: some View {
        Section(AppLanguage.text("Device-to-device · no backend")) {
            InfoText(AppLanguage.text("1. Select notes or routines and prepare an encrypted file. 2. Send using AirDrop, another app, or Save to Files. 3. On the other device open CareSphere → My support tools → Device sharing, choose the received file and preview before importing."))
            Text(AppLanguage.text("Use direct local Wi-Fi / hotspot transfer below for iPhone or Android, or use the system share sheet. This is not Bluetooth pairing or automatic sync. Other sharing apps may use their own cloud. Copies cannot be remotely revoked."))
            SecureField(AppLanguage.text("Transfer passphrase · 12+ characters"), text: $transferPassword)
                .onChange(of: transferPassword) { _ in stopNearby(); incomingTransfer = nil; transferGeneration = UUID(); transferBusy = false; if let url = transferURL { try? FileManager.default.removeItem(at: url) }; transferURL = nil }
                .onChange(of: selectedRecords) { _ in stopNearby(); if let url = transferURL { try? FileManager.default.removeItem(at: url) }; transferURL = nil }
            Text(AppLanguage.text("Tell the recipient the passphrase separately. No recovery is possible. Photos, medicines, measurements and encryption keys are excluded."))
            ForEach(transferableRecords) { record in
                Toggle("\(record.type): \(record.text)", isOn: Binding(get: { selectedRecords.contains(record.id) }, set: { value in if value { selectedRecords.insert(record.id) } else { selectedRecords.remove(record.id) } }))
            }
            Button(AppLanguage.text("Review and prepare transfer")) { confirmTransfer = true }.disabled(transferBusy || selectedRecords.isEmpty || transferPassword.count < 12)
            if transferBusy { ProgressView(AppLanguage.text("Protecting your data…")) }
            if let url = transferURL {
                ShareLink("Send encrypted file · AirDrop / share sheet", item: url)
                Button(AppLanguage.text("Clear prepared file")) { stopNearby(); try? FileManager.default.removeItem(at: url); transferURL = nil }
            }
            nearbyControls
            Button(AppLanguage.text("Receive: choose a transfer file")) { stopNearby(); incomingTransfer = nil; importTransferFile = true }.disabled(transferBusy || transferPassword.count < 12)
            if let payload = incomingTransfer {
                InfoText(AppLanguage.text("Preview received copies. Not verified clinical information. Existing records are never replaced.")).font(.headline)
                ForEach(payload.records) { record in
                    let imported = (store.personalSupport.receivedItems ?? []).contains(payload.id + ":" + record.id)
                    Toggle("\(record.type): \(record.text)\(imported ? " · Already imported" : "")", isOn: Binding(get: { incomingRecords.contains(record.id) }, set: { value in if value { incomingRecords.insert(record.id) } else { incomingRecords.remove(record.id) } })).disabled(imported)
                }
                Button(AppLanguage.text("Import selected copies")) {
                    do {
                        let imported = try store.importTransfer(payload, selected: incomingRecords)
                        var made: ImportReceipt.Receipt? = nil
                        if let digest = incomingDigest, let salt = incomingSalt {
                            made = try? ImportReceipt.create(transfer: payload.id, fileSha256: digest, imported: imported, source: incomingSource, macSalt: salt, passphrase: transferPassword)
                        }
                        incomingTransfer = nil; incomingRecords = []; transferPassword = ""
                        incomingDigest = nil; incomingSalt = nil
                        pendingReceipt = made
                        status = made == nil ? "Imported \(imported.count) copies. Existing records were not replaced." : "Imported \(imported.count) copies. An import receipt is ready below."
                    }
                    catch { status = "Import could not finish. Check capacity and secure storage. Nothing was replaced." }
                }.disabled(incomingRecords.isEmpty)
                Button(AppLanguage.text("Cancel import")) { incomingTransfer = nil; incomingRecords = []; incomingDigest = nil; incomingSalt = nil }
            }
            if let receipt = pendingReceipt {
                Text(AppLanguage.text("Import receipt")).font(.headline)
                InfoText(AppLanguage.text("Records what was imported here, authenticated with the transfer passphrase. Anyone who knows that passphrase can verify it. This is not identity verification, not a delivery guarantee, and not a medical record. Send it back to the person who shared the records if they should know."))
                Text(receiptJSON(receipt)).font(.caption.monospaced())
                ShareLink(item: receiptJSON(receipt)) { Label(AppLanguage.text("Share receipt"), systemImage: "square.and.arrow.up") }
                Button(AppLanguage.text("Copy receipt")) { UIPasteboard.general.string = receiptJSON(receipt); status = "Receipt JSON copied." }
                Button(AppLanguage.text("Done")) { pendingReceipt = nil }
            }
            Button(AppLanguage.text("Verify an import receipt")) { importReceiptFile = true }.disabled(transferBusy)
            if let receipt = verifyReceipt {
                Text(AppLanguage.format("Receipt loaded: {0} record(s). Enter the transfer passphrase, then verify.", [String(receipt.imported.count)]))
                if verifyFileData != nil {
                    Button(AppLanguage.text("Remove transfer file (verify passphrase only)")) { verifyFileData = nil }
                } else {
                    Button(AppLanguage.text("Also choose the transfer file for the strongest check")) { verifyTransferFile = true }
                }
                Button(AppLanguage.text("Verify receipt")) { runReceiptVerify() }.disabled(transferPassword.count < 12)
                Button(AppLanguage.text("Cancel verification")) { verifyReceipt = nil; verifyFileData = nil }
            }
        }
    }
    private var nearbyControls: some View {
        Group {
            Text(AppLanguage.text("Connect nearby · iPhone or Android")).font(.headline)
            Text(AppLanguage.text("Join the same Wi-Fi, or join the other phone's hotspot. Internet is not needed. Keep both apps open. Search for the label shown on the sending phone, or enter its address manually. You still need its 8-digit code and encryption passphrase. Allow Local Network when asked."))
            if !nearbyStatus.isEmpty { Text(AppLanguage.text(nearbyStatus)).accessibilityAddTraits(.updatesFrequently) }
            if transferURL != nil {
                let addresses = LocalTransferWire.addresses()
                if addresses.count > 1 {
                    Picker(AppLanguage.text("Sending network address"), selection: $networkAddress) {
                        Text(AppLanguage.text("Choose network")).tag("")
                        ForEach(addresses, id: \.self) { Text($0).tag($0) }
                    }.disabled(nearbyBusy || !offeredAddress.isEmpty)
                }
                Button(AppLanguage.text("Offer to a nearby device")) { offerNearby() }.disabled(nearbyBusy || transferBusy || !offeredAddress.isEmpty)
            }
            if !offeredAddress.isEmpty {
                if let image = connectionQR() {
                    Image(uiImage:image).interpolation(.none).resizable().scaledToFit().frame(maxWidth:280).padding(16).background(Color.white)
                        .accessibilityLabel(AppLanguage.text("Connection QR code. The address and code are also written below."))
                }
                InfoText(AppLanguage.text("QR contains only connection details. Keep this offer open. It does not contain your records or passphrase."))
                Text("Device address: \(offeredAddress)").textSelection(.enabled)
                Text(AppLanguage.format("Connection code: {0}", [offeredCode])).font(.title2.monospacedDigit()).textSelection(.enabled)
                    .accessibilityLabel(AppLanguage.text("Connection code. ") + offeredCode.map { String($0) }.joined(separator: ", "))
                InfoText(AppLanguage.text("Offer expires after five minutes or when you leave/background this screen. The code is not the encryption passphrase. Tell the recipient both separately from any public channel."))
            }
            if !nearbyAdvertisement.status.isEmpty { Text(AppLanguage.text(nearbyAdvertisement.status)) }
            Button(AppLanguage.text("Find nearby devices")) { stopNearby(); nearbyDiscovery.start() }
                .disabled(nearbyBusy || transferBusy || !offeredAddress.isEmpty)
            if nearbyDiscovery.scanning { Button(AppLanguage.text("Stop searching")) { nearbyDiscovery.stop() } }
            if !nearbyDiscovery.status.isEmpty { Text(AppLanguage.text(nearbyDiscovery.status)).accessibilityAddTraits(.updatesFrequently) }
            ForEach(nearbyDiscovery.peers) { peer in
                Button("Choose \(peer.name) · \(peer.address)") {
                    receiveAddress = peer.address; receiveCode = ""; nearbyDiscovery.stop(); nearbyCodeFocused = true
                    nearbyStatus = "Address selected. Enter the code shown on that phone and the separately agreed passphrase. Nothing has connected or imported yet."
                }
            }
            PhotosPicker(selection:$connectionPhoto,matching:.images) { Text(AppLanguage.text("Read connection QR from a photo")) }
                .disabled(nearbyBusy || transferBusy || !offeredAddress.isEmpty)
            TextField(AppLanguage.text("Sender address · e.g. 192.168.1.5:12345"), text: $receiveAddress)
                .textInputAutocapitalization(.never).autocorrectionDisabled().disabled(nearbyBusy)
            TextField(AppLanguage.text("Sender's 8-digit connection code"), text: $receiveCode)
                .keyboardType(.numberPad).focused($nearbyCodeFocused).disabled(nearbyBusy)
            Button(AppLanguage.text("Connect and receive encrypted copy")) { receiveNearby() }
                .disabled(nearbyBusy || transferBusy || transferPassword.count < 12 || receiveAddress.isEmpty || receiveCode.count != 8)
            if nearbyBusy { ProgressView(AppLanguage.text("Connecting locally…")) }
            if nearbyBusy || !offeredAddress.isEmpty { Button(AppLanguage.text("Stop nearby connection")) { stopNearby(); nearbyStatus = "Local connection stopped. Received copies cannot be recalled." } }
            InfoText(AppLanguage.text("If a guest network blocks other devices, try a private hotspot or use the encrypted-file option. A connection failure never imports records.")).font(.caption)
        }
    }
    private func connectionQR() -> UIImage? {
        guard let value=try? ConnectionSetup.encode(address:offeredAddress,code:offeredCode),
              let filter=CIFilter(name:"CIQRCodeGenerator") else { return nil }
        filter.setValue(Data(value.utf8),forKey:"inputMessage")
        guard let output=filter.outputImage?.transformed(by:CGAffineTransform(scaleX:8,y:8)),
              let image=CIContext().createCGImage(output,from:output.extent) else { return nil }
        return UIImage(cgImage:image)
    }
    @MainActor private func readConnectionPhoto(_ item:PhotosPickerItem?) async {
        guard let item else { return }; defer { connectionPhoto=nil }
        do {
            guard let bytes=try await item.loadTransferable(type:Data.self), bytes.count<=10_000_000,
                  let source=CGImageSourceCreateWithData(bytes as CFData,nil),
                  let image=CGImageSourceCreateThumbnailAtIndex(source,0,[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceThumbnailMaxPixelSize:1600,kCGImageSourceCreateThumbnailWithTransform:true] as CFDictionary),
                  let detector=CIDetector(ofType:CIDetectorTypeQRCode,context:nil,options:[CIDetectorAccuracy:CIDetectorAccuracyHigh]),
                  let value=(detector.features(in:CIImage(cgImage:image)).first as? CIQRCodeFeature)?.messageString else { throw LocalTransferWire.Failure.invalid }
            let info=try ConnectionSetup.parse(value)
            guard section == "Device sharing", phase != .background else { return }
            receiveAddress=info.0;receiveCode=info.1
            nearbyStatus="QR details loaded. Check the sender, enter the separate passphrase, then connect. Nothing has been imported."
        } catch { nearbyStatus="Could not read a valid CareSphere connection QR. Use the written address and code instead." }
    }
    private func stopNearby() {
        nearbyCodeFocused = false; nearbyGeneration = UUID(); nearbyHost.stop(); nearbyReceiver.cancel(); nearbyDiscovery.stop(); nearbyAdvertisement.stop()
        nearbyBusy = false; offeredAddress = ""; offeredCode = ""; nearbyStatus = ""
    }
    private func offerNearby() {
        stopNearby()
        do {
            guard let file = transferURL else { return }
            let choices = LocalTransferWire.addresses()
            guard let address = choices.count == 1 ? choices.first : choices.first(where: { $0 == networkAddress }) else {
                nearbyStatus = "Join a private Wi-Fi or hotspot. If several network addresses are listed, choose the one used by the other phone."; return
            }
            let contents = try Data(contentsOf: file), generation = nearbyGeneration
            nearbyBusy = true
            nearbyHost.start(contents: contents, address: address, ready: { result in
                guard nearbyGeneration == generation else { return }; nearbyBusy = false
                switch result {
                case .success(let info): offeredAddress = info.0; offeredCode = info.1; nearbyAdvertisement.start(address: info.0); nearbyStatus = "Offering only the prepared encrypted copy on your local network. This is not confirmation of delivery."
                case .failure: nearbyStatus = "Could not offer locally. Check Wi-Fi and Local Network permission in Settings, then retry."
                }
            }, ended: {
                guard nearbyGeneration == generation else { return }
                nearbyAdvertisement.stop(); nearbyBusy = false; offeredAddress = ""; offeredCode = ""; nearbyStatus = "Local offer ended. Start a new offer to try again."
            })
        } catch { nearbyBusy = false; nearbyStatus = "Could not read the prepared encrypted file. Prepare it again." }
    }
    private func receiveNearby() {
        stopNearby(); incomingTransfer = nil; incomingRecords = []
        let generation = nearbyGeneration, pass = transferPassword
        nearbyBusy = true
        nearbyReceiver.receive(address: receiveAddress, code: receiveCode) { result in
            guard nearbyGeneration == generation else { return }
            switch result {
            case .failure:
                nearbyBusy = false; nearbyStatus = "Could not connect. Check the address and code, same Wi-Fi/hotspot, Local Network permission and that the sender's offer is still open. Nothing was imported."
            case .success(let bytes):
                Task {
                    let opened = await Task.detached { Result { try DeviceTransfer.open(bytes, password: pass) } }.value
                    guard nearbyGeneration == generation else { return }; nearbyBusy = false
                    switch opened {
                    case .success(let payload):
                        incomingTransfer = payload
                        incomingDigest = ImportReceipt.fileSha256(bytes)
                        incomingSalt = ((try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any]).flatMap { ($0["salt"] as? String).flatMap { Data(base64Encoded: $0) } }
                        incomingSource = "nearby"
                        nearbyStatus = "Received and unlocked locally. Review and select copies below. Nothing has been imported."
                    case .failure: nearbyStatus = "Received bytes could not be unlocked. Check the passphrase with the sender. Nothing was imported."
                    }
                }
            }
        }
    }
    private func receiptJSON(_ receipt: ImportReceipt.Receipt) -> String {
        let data = (try? JSONEncoder().encode(receipt)) ?? Data()
        guard let object = try? JSONSerialization.jsonObject(with: data),
              let pretty = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]) else { return String(decoding: data, as: UTF8.self) }
        return String(decoding: pretty, as: UTF8.self)
    }
    private func runReceiptVerify() {
        guard let receipt = verifyReceipt else { return }
        defer { verifyReceipt = nil; verifyFileData = nil }
        do {
            if let file = verifyFileData {
                let bound = try ImportReceipt.verifyAgainstTransfer(receipt, passphrase: transferPassword, transferFile: file)
                let base = AppLanguage.format("Verified. Import of {0} record(s) at {1} (source: {2}).", [bound.details["count"] ?? "", bound.details["imported_at"] ?? "", bound.details["source"] ?? ""])
                let extra = (bound.fileMatches && bound.importedPresent)
                    ? AppLanguage.text("Also checked the transfer file: its hash and all imported record IDs match this receipt.")
                    : AppLanguage.text("The transfer file does not fully match this receipt. Its hash or record IDs differ.")
                status = base + " " + extra
            } else {
                let details = try ImportReceipt.verify(receipt, passphrase: transferPassword)
                status = AppLanguage.format("Verified. Import of {0} record(s) at {1} (source: {2}).", [details["count"] ?? "", details["imported_at"] ?? "", details["source"] ?? ""]) + " " + AppLanguage.text("File binding not checked without the transfer file.")
            }
        } catch {
            status = AppLanguage.text("Receipt not verified. Wrong passphrase or a changed receipt. Nothing about this import is confirmed.")
        }
    }
    private func prepareTransfer() {
        stopNearby()
        let payload = TransferPayload(records: transferableRecords.filter { selectedRecords.contains($0.id) })
        let pass = transferPassword; let generation = UUID(); transferGeneration = generation; transferBusy = true
        Task {
            let result = await Task.detached { Result { try DeviceTransfer.seal(payload, password: pass) } }.value
            guard transferGeneration == generation else { return }; transferBusy = false
            do {
                let bytes = try result.get()
                let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("Transfers", isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                for old in (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey])) ?? [] {
                    if let date = try? old.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate, date < Date().addingTimeInterval(-86400) { try? FileManager.default.removeItem(at: old) }
                }
                let url = directory.appendingPathComponent(UUID().uuidString + ".caretransfer")
                try bytes.write(to: url, options: [.atomic, .completeFileProtection]); transferURL = url
                status = "Encrypted file prepared. Use the share sheet to send it; nothing leaves automatically."
            } catch { status = "Could not prepare the transfer. Choose up to 100 notes/routines, with notes up to 4,000 characters and routine titles up to 240." }
        }
    }
    @ViewBuilder private var plans: some View {
        if let plan = store.personalSupport.plans.first(where: { $0.id == planID }), !plan.steps.isEmpty {
            Section(plan.title) {
                Text(AppLanguage.format("Step {0} of {1}", [String(step + 1), String(plan.steps.count)]))
                if paused { Text(AppLanguage.text("Take your time.")); Button(AppLanguage.text("Continue")) { paused = false } }
                else {
                    Text(plan.steps[step]).font(.title2)
                    if let photo = store.personalSupport.photos.first(where: { $0.id == plan.photoID }), let image = supportImage(photo.jpeg) { Image(uiImage: image).resizable().scaledToFit().accessibilityLabel(photo.caption) }
                    Button(AppLanguage.text("Read this step")) { say(plan.steps[step]) }
                    Button(AppLanguage.text("Done / next")) { advance(plan) }
                    Button(AppLanguage.text("Skip")) { advance(plan) }
                    Button(AppLanguage.text("Take a break")) { SpeechService.shared.stop(); paused = true }
                }
                Button(AppLanguage.text("End routine")) { planID = nil; SpeechService.shared.stop() }
            }
        } else {
            Section(AppLanguage.text("Your own instructions")) {
                InfoText(AppLanguage.text("One step per line. Do not use this to change prescribed medication instructions."))
                TextField(AppLanguage.text("Routine title"), text: $draft)
                TextEditor(text: $detail).frame(minHeight: 120).accessibilityLabel(AppLanguage.text("Steps, one per line"))
                Picker(AppLanguage.text("Optional photo"), selection: $photoID) { Text(AppLanguage.text("No photo")).tag(nil as UUID?); ForEach(store.personalSupport.photos) { Text($0.caption).tag(Optional($0.id)) } }
                Button(AppLanguage.text("Save visual routine")) {
                    let steps = detail.components(separatedBy: .newlines).map { String($0.trimmingCharacters(in: .whitespaces).prefix(240)) }.filter { !$0.isEmpty }
                    guard !steps.isEmpty, !draft.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    store.personalSupport.plans.append(VisualPlan(title: String(draft.prefix(120)), steps: Array(steps.prefix(40)), photoID: photoID)); draft = ""; detail = ""
                }.disabled(store.personalSupport.plans.count >= 30)
            }
            Section(AppLanguage.text("Saved routines")) { ForEach(store.personalSupport.plans) { plan in Button(AppLanguage.format("Start {0}", [plan.title])) { planID = plan.id; step = 0; paused = false; if store.personalSupport.speakSteps, let first = plan.steps.first { say(first) } } }.onDelete { store.personalSupport.plans.remove(atOffsets: $0) } }
        }
    }
    private func advance(_ plan: VisualPlan) { SpeechService.shared.stop(); if step + 1 < plan.steps.count { step += 1; if store.personalSupport.speakSteps { say(plan.steps[step]) } } else { planID = nil; status = "Routine ended. No score or completion record was saved." } }
    private func say(_ value: String) { if !SpeechService.shared.speak(value, enabled: true, voiceIdentifier: store.voiceIdentifier) { status = AppLanguage.text("No installed voice for this language. The words remain visible.") } }
    private var photos: some View {
        Section(AppLanguage.text("Local photos · up to 10")) {
            Text(AppLanguage.text("Choose photos you have permission to use. No recognition or identity quizzes. Selected pictures are resized and stored encrypted on this phone."))
            TextField(AppLanguage.text("Photo description"), text: $draft)
            PhotosPicker("Choose one photo", selection: $selectedPhoto, matching: .images).disabled(store.personalSupport.photos.count >= 10)
            if !store.personalSupport.photos.isEmpty {
                let photo = store.personalSupport.photos[photoIndex % store.personalSupport.photos.count]
                if let image = supportImage(photo.jpeg) { Image(uiImage: image).resizable().scaledToFit().accessibilityLabel(photo.caption) }
                Text(photo.caption); Text(AppLanguage.text("What do you notice? Share, point, listen or skip."))
                Button(AppLanguage.text("Next photo")) { photoIndex += 1 }
                NavigationLink("Photo matching") { PersonalPhotoPairs(photos: Array(store.personalSupport.photos.prefix(store.personalSupport.choices))) }.disabled(store.personalSupport.photos.count < 2)
                Button(AppLanguage.text("Remove displayed photo"), role: .destructive) { store.personalSupport.photos.removeAll { $0.id == photo.id } }
            }
        }
    }
    @MainActor private func loadPhoto(_ item: PhotosPickerItem?) async {
        do {
            guard let item, let bytes = try await item.loadTransferable(type: Data.self), bytes.count < 10_000_000,
                  let image = supportImage(bytes), image.size.width > 0, image.size.height > 0 else { status = "Choose a readable photo under 10 MB."; return }
            let scale = min(1, 512 / max(image.size.width, image.size.height))
            let format = UIGraphicsImageRendererFormat(); format.scale = 1
            let resized = UIGraphicsImageRenderer(size: CGSize(width: image.size.width * scale, height: image.size.height * scale), format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: CGSize(width: image.size.width * scale, height: image.size.height * scale))) }
            guard let jpeg = resized.jpegData(compressionQuality: 0.65), jpeg.count < 180_000, store.personalSupport.photos.count < 10 else { status = "Choose a smaller photo."; return }
            store.personalSupport.photos.append(PersonalPhoto(caption: draft.isEmpty ? "My photo" : String(draft.prefix(120)), jpeg: jpeg)); draft = ""; selectedPhoto = nil; status = "Photo saved locally."
        } catch { status = "Photo could not be loaded. Nothing was added." }
    }
    private var contacts: some View {
        Section(AppLanguage.text("People you actually know")) {
            TextField(AppLanguage.text("Name"), text: $draft); TextField(AppLanguage.text("Phone number"), text: $detail).keyboardType(.phonePad); TextField(AppLanguage.text("HTTPS video link (optional)"), text: $third).textInputAutocapitalization(.never)
            Button(AppLanguage.text("Save contact")) {
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
            InfoText(AppLanguage.text("Nobody is notified or monitored automatically. Ask permission before saving someone's details."))
        }
    }
    private var questions: some View {
        Section(AppLanguage.text("Keep questions for your next visit")) {
            TextField(AppLanguage.text("Question to ask"), text: $draft)
            Button(AppLanguage.text("Save question")) { guard !draft.trimmingCharacters(in: .whitespaces).isEmpty else { return }; store.personalSupport.questions.append(VisitQuestion(text: String(draft.prefix(1000)))); draft = "" }.disabled(store.personalSupport.questions.count >= 100)
            ForEach($store.personalSupport.questions) { $question in
                VStack(alignment: .leading) { Text(question.text); Toggle(AppLanguage.text("Important"), isOn: $question.important); Toggle(AppLanguage.text("Discussed"), isOn: $question.discussed); TextField(AppLanguage.text("Follow-up"), text: $question.followup) }
            }.onDelete { store.personalSupport.questions.remove(atOffsets: $0) }
            ShareLink("Review & share questions", item: store.personalSupport.questions.sorted { $0.important && !$1.important }.map { "\($0.important ? "IMPORTANT: " : "")\($0.text)\nFollow-up: \($0.followup)" }.joined(separator: "\n\n")).disabled(store.personalSupport.questions.isEmpty)
            Text(AppLanguage.text("The share sheet lets you choose the recipient. Shared text is no longer protected by this app's encryption."))
        }
    }
    @ViewBuilder private var recovery: some View {
        Section(AppLanguage.text("Recently deleted · 30 days")) {
            ForEach(store.personalSupport.deletedNotes) { entry in VStack(alignment: .leading) { Text(entry.note.body); Button(AppLanguage.text("Restore note")) { store.restoreDeletedNote(entry) } } }
                .onDelete { store.personalSupport.deletedNotes.remove(atOffsets: $0) }
            Text(AppLanguage.text("Swipe to permanently erase a retained note. Previously shared copies cannot be removed."))
        }
        Section(AppLanguage.text("Encrypted iPhone backup")) {
            SecureField(AppLanguage.text("Passphrase · at least 12 characters"), text: $password)
            Text(AppLanguage.text("Includes your care records, photos and retained deleted notes. Keep the passphrase separately; there is no recovery. iPhone backups are not interchangeable with Android or web backups."))
            Button(AppLanguage.text("Create encrypted backup")) {
                do { backupDocument = SupportBackupFile(data: try SupportBackup.lock(store.backupSnapshot(), password: password)); exportBackup = true }
                catch { status = "Could not create the backup. Use a passphrase with at least 12 characters." }
            }.disabled(password.count < 12)
            Button(AppLanguage.text("Choose backup to preview")) { importBackup = true }.disabled(password.count < 12)
        }
    }
    private var intelligence: some View {
        Section(AppLanguage.text("Optional on-device drafting")) {
            Text(assistant.availabilityMessage)
            Button(AppLanguage.text("Check availability")) { assistant.refreshAvailability() }
            Text(AppLanguage.text("Only the text you choose below is sent to Apple's on-device framework. Output may be wrong. Never use it to change medication instructions or make clinical decisions."))
            Menu("Copy a note into the draft") { ForEach(store.notes) { note in Button(String(note.body.prefix(70))) { draft = String(note.body.prefix(2000)); assistant.clearResponse() } } }
            TextEditor(text: $draft).frame(minHeight: 120).accessibilityLabel(AppLanguage.text("Source text for Apple Intelligence"))
            Picker(AppLanguage.text("Draft task"), selection: $aiMode) { Text(AppLanguage.text("Simplify wording")).tag("Simplify wording"); Text(AppLanguage.text("Appointment questions")).tag("Appointment questions"); Text(AppLanguage.text("Everyday steps")).tag("Everyday steps") }
            Button(AppLanguage.text("Generate a draft")) { Task { await assistant.draftSupport(text: String(draft.prefix(2000)), mode: aiMode) } }.disabled(!assistant.isAvailable || assistant.isGenerating || draft.trimmingCharacters(in: .whitespaces).isEmpty)
            if assistant.isGenerating { ProgressView(AppLanguage.text("Creating draft…")); Button(AppLanguage.text("Cancel generation")) { assistant.cancel() } }
            if let error = assistant.generationErrorText { Text(error) }
            if !assistant.response.isEmpty {
                TextEditor(text: $reviewed).frame(minHeight: 120).accessibilityLabel(AppLanguage.text("Review and edit generated draft"))
                Button(AppLanguage.text("Save reviewed draft as a new note")) { store.addNote(author: "You · reviewed AI draft", body: String(reviewed.prefix(4000))); assistant.clearResponse(); reviewed = ""; status = "Reviewed draft saved as a new note. The source note was not changed." }.disabled(reviewed.trimmingCharacters(in: .whitespaces).isEmpty)
                Button(AppLanguage.text("Discard draft")) { assistant.clearResponse(); reviewed = "" }
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
                Text(AppLanguage.text("Find a matching photo at your own pace. No score or timer."))
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())]) {
                    ForEach(0..<(photos.count * 2), id: \.self) { index in
                        Button {
                            guard revealed.count < 2, !revealed.contains(index), !matched.contains(index) else { return }
                            revealed.append(index)
                            if revealed.count == 2, revealed[0] % photos.count == revealed[1] % photos.count { matched.formUnion(revealed); revealed = [] }
                        } label: {
                            if revealed.contains(index) || matched.contains(index), let image = supportImage(photos[index % photos.count].jpeg) { Image(uiImage: image).resizable().scaledToFit().accessibilityLabel(photos[index % photos.count].caption) }
                            else { Text("Card \(index + 1)").frame(minHeight: 80) }
                        }.disabled(matched.contains(index))
                    }
                }
                Button(AppLanguage.text("Clear selection")) { revealed = [] }
                Button(AppLanguage.text("Start again")) { revealed = []; matched = [] }
            }.padding()
        }.navigationTitle(AppLanguage.text("Photo matching"))
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

// Downsample during decoding instead of allocating the full camera image.
private func supportImage(_ data: Data) -> UIImage? {
    guard let source = CGImageSourceCreateWithData(data as CFData, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 512
          ] as CFDictionary) else { return nil }
    return UIImage(cgImage: image)
}
