import Foundation
import Combine
#if canImport(FoundationXML)
import FoundationXML
#endif

/// A short, source-linked passage retrieved from an on-device reference library
/// or a user-configured Kiwix server on their private network.
struct HealthReference: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let title: String
    let excerpt: String
    let publisher: String
    let url: String

    init(title: String, excerpt: String, publisher: String, url: String) {
        self.id = url.isEmpty ? "\(publisher):\(title)" : url
        self.title = title
        self.excerpt = excerpt
        self.publisher = publisher
        self.url = url
    }
}

/// Local-first health reference search. The optional NLM MedlinePlus XML archive
/// is downloadable for offline use; a Kiwix connector searches a user's own ZIM
/// archive without copying or uploading the multi-gigabyte .zim file.
@MainActor
final class MedicalLibraryService: ObservableObject {
    @Published var kiwixServerURL: String {
        didSet { UserDefaults.standard.set(kiwixServerURL, forKey: Self.kiwixURLKey) }
    }
    @Published var kiwixContentName: String {
        didSet { UserDefaults.standard.set(kiwixContentName, forKey: Self.kiwixContentKey) }
    }
    @Published private(set) var medlinePlusArticleCount = 0
    @Published private(set) var medlinePlusUpdatedLabel: String?
    @Published private(set) var isUpdatingMedlinePlus = false
    @Published private(set) var updateError: String?
    @Published private(set) var isTestingKiwix = false
    @Published private(set) var kiwixConnectionMessage: String?
    @Published private(set) var kiwixSearchError: String?

    private static let kiwixURLKey = "caresphere.localLibrary.kiwixURL"
    private static let kiwixContentKey = "caresphere.localLibrary.kiwixContentName"
    private var medlineArticles: [HealthReference] = []

    init() {
        #if os(macOS)
        let defaultKiwixURL = "http://127.0.0.1:8080"
        #else
        let defaultKiwixURL = ""
        #endif
        kiwixServerURL = UserDefaults.standard.string(forKey: Self.kiwixURLKey) ?? defaultKiwixURL
        kiwixContentName = UserDefaults.standard.string(forKey: Self.kiwixContentKey) ?? ""
        loadSavedMedlinePlusIndex()
    }

    var hasKiwixSettings: Bool {
        !kiwixServerURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        && !kiwixContentName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var referenceCount: Int { Self.careBasics.count + medlinePlusArticleCount }

    func search(_ query: String) async -> [HealthReference] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }
        let localCorpus = Self.careBasics + medlineArticles
        let localHits = await Task.detached(priority: .userInitiated) {
            ReferenceSearchIndex.search(trimmed, in: localCorpus, limit: 5)
        }.value

        var results = localHits
        kiwixSearchError = nil
        if hasKiwixSettings {
            do {
                let wikiHits = try await KiwixSearchClient.search(
                    query: trimmed,
                    serverAddress: kiwixServerURL,
                    contentName: kiwixContentName)
                results.append(contentsOf: wikiHits)
            } catch {
                // A broken/unavailable local Kiwix server should not hide the
                // offline MedlinePlus results.
                kiwixSearchError = error.localizedDescription
            }
        }

        var seen = Set<String>()
        return results.filter { seen.insert($0.id).inserted }.prefix(8).map { $0 }
    }

    func downloadLatestMedlinePlus() async {
        guard !isUpdatingMedlinePlus else { return }
        isUpdatingMedlinePlus = true
        updateError = nil
        defer { isUpdatingMedlinePlus = false }

        do {
            let indexURL = URL(string: "https://medlineplus.gov/xml.html")!
            let (indexData, _) = try await URLSession.shared.data(from: indexURL)
            let indexHTML = String(decoding: indexData, as: UTF8.self)
            guard let xmlURLString = Self.latestMedlineXMLURL(in: indexHTML),
                  let xmlURL = URL(string: xmlURLString) else {
                throw MedicalLibraryError.latestDatasetNotFound
            }

            let (temporaryXML, response) = try await URLSession.shared.download(from: xmlURL)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw MedicalLibraryError.datasetDownloadFailed
            }
            let parsedArticles = try await Task.detached(priority: .utility) {
                try MedlinePlusXMLParser.parse(fileAt: temporaryXML)
            }.value
            guard !parsedArticles.isEmpty else { throw MedicalLibraryError.emptyDataset }

            let destination = try ReferenceStorage.medlineIndexURL()
            try await Task.detached(priority: .utility) {
                let encoded = try JSONEncoder().encode(parsedArticles)
                try encoded.write(to: destination, options: .atomic)
                ReferenceStorage.excludeFromBackup(at: destination)
            }.value

            medlineArticles = parsedArticles
            medlinePlusArticleCount = parsedArticles.count
            medlinePlusUpdatedLabel = Self.dateLabel(from: xmlURL.lastPathComponent)
        } catch {
            updateError = error.localizedDescription
        }
    }

    func testKiwixConnection() async {
        guard !isTestingKiwix else { return }
        isTestingKiwix = true
        kiwixConnectionMessage = nil
        defer { isTestingKiwix = false }
        do {
            try await KiwixSearchClient.testConnection(serverAddress: kiwixServerURL)
            kiwixConnectionMessage = "Connected to the private Kiwix server."
        } catch {
            kiwixConnectionMessage = error.localizedDescription
        }
    }

    private func loadSavedMedlinePlusIndex() {
        guard let url = try? ReferenceStorage.medlineIndexURL(),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([HealthReference].self, from: data) else { return }
        medlineArticles = decoded
        medlinePlusArticleCount = decoded.count
        medlinePlusUpdatedLabel = "Saved offline"
    }

    private static func latestMedlineXMLURL(in html: String) -> String? {
        let pattern = #"https://medlineplus\.gov/xml/mplus_topics_\d{4}-\d{2}-\d{2}\.xml"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
              let range = Range(match.range, in: html) else { return nil }
        return String(html[range])
    }

    private static func dateLabel(from filename: String) -> String? {
        let pattern = #"\d{4}-\d{2}-\d{2}"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: filename, range: NSRange(filename.startIndex..., in: filename)),
              let range = Range(match.range, in: filename) else { return nil }
        return "Updated \(filename[range])"
    }

    /// Original, general-purpose safety notes to make the guide useful before
    /// the larger reference dataset is downloaded. Not diagnostic instructions.
    private static let careBasics: [HealthReference] = [
        HealthReference(
            title: "Keep a reliable medication list",
            excerpt: "Keep an up-to-date list of medicines, supplements, strengths, and the clinician who prescribed them. Check the current package label and confirm questions with a pharmacist or prescriber. CareSphere records a schedule you enter; it cannot verify a prescription, check interactions, or decide whether a dose should be changed.",
            publisher: "CareSphere safety note · MedlinePlus",
            url: "https://medlineplus.gov/medicinesafety.html"),
        HealthReference(
            title: "Make the home easier to move through",
            excerpt: "Reduce common trip hazards, keep walkways and frequently used items clear, and make lighting easy to reach. A clinician can help review personal balance, vision, and medication concerns. These general ideas do not replace an individual fall-risk assessment.",
            publisher: "CareSphere safety note · CDC",
            url: "https://www.cdc.gov/falls/prevention/index.html"),
        HealthReference(
            title: "Make support sensory-aware and respectful",
            excerpt: "Ask the person what communication and sensory supports work for them. Offer advance notice of changes, a quieter option, and genuine choices when possible. Avoid assuming one strategy works for every autistic person; follow the person's preferences and care team's guidance.",
            publisher: "CareSphere safety note · NIMH",
            url: "https://www.nimh.nih.gov/health/topics/autism-spectrum-disorders-asd"),
        HealthReference(
            title: "Record health readings with context",
            excerpt: "When documenting a measurement, include the date, time, device or source, and any context the care team requested. A single reading or wearable signal is not a diagnosis. Ask a clinician how a specific value should be interpreted for the individual.",
            publisher: "CareSphere safety note · MedlinePlus",
            url: "https://medlineplus.gov/ency/article/007490.htm"),
        HealthReference(
            title: "Urgent symptoms need human help",
            excerpt: "This offline assistant cannot assess emergencies. For immediate danger or severe, rapidly worsening symptoms, contact local emergency services now. In the United States, call 911. Do not wait for an AI response.",
            publisher: "CareSphere safety note",
            url: "https://www.usa.gov/911"),
    ]
}

private enum MedicalLibraryError: LocalizedError {
    case latestDatasetNotFound
    case datasetDownloadFailed
    case emptyDataset

    var errorDescription: String? {
        switch self {
        case .latestDatasetNotFound:
            return "CareSphere could not find the current MedlinePlus XML link. Try again later or import an XML file from MedlinePlus.gov."
        case .datasetDownloadFailed:
            return "The MedlinePlus download did not complete. Check your connection and try again."
        case .emptyDataset:
            return "The downloaded file did not contain any health topics. The previous offline library was kept."
        }
    }
}

private enum ReferenceStorage {
    static func medlineIndexURL() throws -> URL {
        let support = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true)
        let directory = support.appendingPathComponent("CareSphere/References", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        excludeFromBackup(at: directory)
        return directory.appendingPathComponent("medlineplus-health-topics.json")
    }

    static func excludeFromBackup(at url: URL) {
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var mutableURL = url
        try? mutableURL.setResourceValues(values)
    }
}

private enum ReferenceSearchIndex {
    private static let stopWords: Set<String> = [
        "a", "about", "an", "and", "are", "can", "do", "for", "from", "how", "i", "in",
        "is", "it", "me", "my", "of", "on", "or", "the", "this", "to", "what", "when", "with"
    ]

    static func search(_ query: String, in corpus: [HealthReference], limit: Int) -> [HealthReference] {
        let queryWords = words(in: query).filter { !stopWords.contains($0) }
        guard !queryWords.isEmpty else { return [] }
        let normalizedQuery = query.lowercased()

        return corpus.compactMap { article -> (HealthReference, Int)? in
            let title = article.title.lowercased()
            let body = article.excerpt.lowercased()
            var score = 0
            if title.contains(normalizedQuery) { score += 10 }
            for word in queryWords {
                if title.contains(word) { score += 4 }
                if body.contains(word) { score += 1 }
            }
            guard score > 0 else { return nil }
            return (article, score)
        }
        .sorted {
            if $0.1 != $1.1 { return $0.1 > $1.1 }
            return $0.0.title.localizedCaseInsensitiveCompare($1.0.title) == .orderedAscending
        }
        .prefix(limit)
        .map(\.0)
    }

    private static func words(in text: String) -> [String] {
        text.lowercased()
            .split { !$0.isLetter && !$0.isNumber }
            .map(String.init)
            .filter { $0.count > 1 }
    }
}

private enum KiwixSearchClient {
    static func testConnection(serverAddress: String) async throws {
        guard let url = localURL(from: serverAddress, endpoint: "/search/searchdescription.xml") else {
            throw KiwixError.invalidLocalAddress
        }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
        request.setValue("application/xml,text/xml;q=0.9,*/*;q=0.5", forHTTPHeaderField: "Accept")
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw KiwixError.notReachable
        }
    }

    static func search(query: String, serverAddress: String, contentName: String) async throws -> [HealthReference] {
        guard let baseURL = localURL(from: serverAddress, endpoint: nil) else {
            throw KiwixError.invalidLocalAddress
        }
        let trimmedBook = contentName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedBook.isEmpty else { throw KiwixError.missingBookName }
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw KiwixError.invalidLocalAddress
        }
        let basePath = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components.path = (basePath.isEmpty ? "" : "/\(basePath)") + "/search"
        components.queryItems = [
            URLQueryItem(name: "content", value: trimmedBook),
            URLQueryItem(name: "pattern", value: query),
            URLQueryItem(name: "format", value: "xml"),
            URLQueryItem(name: "pageLength", value: "6"),
        ]
        guard let url = components.url else { throw KiwixError.invalidLocalAddress }

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 12)
        request.setValue("application/xml,text/xml;q=0.9", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw KiwixError.notReachable
        }
        guard data.count < 3_000_000 else { throw KiwixError.responseTooLarge }
        return try KiwixSearchXMLParser.parse(data: data, baseURL: baseURL)
    }

    private static func localURL(from rawAddress: String, endpoint: String?) -> URL? {
        let raw = rawAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        guard var components = URLComponents(string: raw),
              let scheme = components.scheme?.lowercased(),
              ["http", "https"].contains(scheme),
              let host = components.host?.lowercased(),
              isPrivateHost(host) else { return nil }
        components.fragment = nil
        components.query = nil
        if let endpoint {
            let path = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            components.path = (path.isEmpty ? "" : "/\(path)") + endpoint
        } else {
            components.path = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }
        return components.url
    }

    private static func isPrivateHost(_ host: String) -> Bool {
        if host == "localhost" || host == "::1" || host.hasSuffix(".local") { return true }
        let octets = host.split(separator: ".").compactMap { UInt8($0) }
        guard octets.count == 4 else {
            return host.hasPrefix("fe80:") || host.hasPrefix("fc") || host.hasPrefix("fd")
        }
        if octets[0] == 10 || octets[0] == 127 || octets[0] == 169 && octets[1] == 254 { return true }
        if octets[0] == 192 && octets[1] == 168 { return true }
        if octets[0] == 172 && (16...31).contains(octets[1]) { return true }
        return false
    }
}

private enum KiwixError: LocalizedError {
    case invalidLocalAddress
    case missingBookName
    case notReachable
    case responseTooLarge
    case invalidSearchResponse

    var errorDescription: String? {
        switch self {
        case .invalidLocalAddress:
            return "Use a local Kiwix URL such as http://127.0.0.1:8080 on Mac or http://MacBook.local:8080 on the same Wi-Fi. Internet hosts are blocked."
        case .missingBookName:
            return "Enter the Kiwix content name (usually the .zim filename without the extension)."
        case .notReachable:
            return "CareSphere could not reach Kiwix. Make sure kiwix-serve is running and the URL and content name are correct."
        case .responseTooLarge:
            return "Kiwix returned an unexpectedly large search response. Try a narrower question."
        case .invalidSearchResponse:
            return "Kiwix returned an unreadable search response. Update Kiwix Tools and try again."
        }
    }
}

private final class KiwixSearchXMLParser: NSObject, XMLParserDelegate {
    private struct Item {
        var title = ""
        var link = ""
        var excerpt = ""
    }

    private var items: [Item] = []
    private var currentItem: Item?
    private var activeField: String?
    private var activeText = ""
    private let baseURL: URL

    private init(baseURL: URL) { self.baseURL = baseURL }

    static func parse(data: Data, baseURL: URL) throws -> [HealthReference] {
        let delegate = KiwixSearchXMLParser(baseURL: baseURL)
        let parser = XMLParser(data: data)
        parser.delegate = delegate
        parser.shouldResolveExternalEntities = false
        guard parser.parse() else { throw KiwixError.invalidSearchResponse }
        return delegate.items.compactMap { item in
            let title = item.title.trimmingCharacters(in: .whitespacesAndNewlines)
            let excerpt = clean(item.excerpt)
            guard !title.isEmpty else { return nil }
            let resolved = URL(string: item.link.trimmingCharacters(in: .whitespacesAndNewlines), relativeTo: baseURL)?.absoluteURL.absoluteString ?? ""
            return HealthReference(
                title: title,
                excerpt: excerpt.isEmpty ? title : excerpt,
                publisher: "Wikipedia · local Kiwix archive",
                url: resolved)
        }
    }

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String: String] = [:]) {
        let element = elementName.lowercased()
        if element == "item" || element == "entry" {
            currentItem = Item()
            return
        }
        guard currentItem != nil else { return }
        if ["title", "link", "description", "content", "summary"].contains(element) {
            activeField = element
            activeText = ""
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if activeField != nil { activeText += string }
    }

    func parser(_ parser: XMLParser, foundCDATA CDATABlock: Data) {
        if activeField != nil { activeText += String(decoding: CDATABlock, as: UTF8.self) }
    }

    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        let element = elementName.lowercased()
        if let field = activeField, field == element, var item = currentItem {
            switch field {
            case "title": item.title += activeText
            case "link": item.link += activeText
            case "description", "content", "summary": item.excerpt += activeText
            default: break
            }
            currentItem = item
            activeField = nil
            activeText = ""
        }
        if element == "item" || element == "entry", let item = currentItem {
            items.append(item)
            currentItem = nil
            activeField = nil
            activeText = ""
        }
    }

    private static func clean(_ text: String) -> String {
        let noTags = text.replacingOccurrences(of: #"<[^>]+>"#, with: " ", options: .regularExpression)
        return noTags
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "\n", with: " ")
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: " ")
    }
}

private final class MedlinePlusXMLParser: NSObject, XMLParserDelegate {
    private var articles: [HealthReference] = []
    private var currentTitle = ""
    private var currentURL = ""
    private var currentID = ""
    private var currentSummary = ""
    private var capturingSummary = false

    static func parse(fileAt url: URL) throws -> [HealthReference] {
        let delegate = MedlinePlusXMLParser()
        guard let parser = XMLParser(contentsOf: url) else { throw MedicalLibraryError.emptyDataset }
        parser.delegate = delegate
        parser.shouldResolveExternalEntities = false
        guard parser.parse() else {
            throw parser.parserError ?? MedicalLibraryError.emptyDataset
        }
        return delegate.articles
    }

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String: String] = [:]) {
        if elementName == "health-topic" {
            currentTitle = attributeDict["title"] ?? ""
            currentURL = attributeDict["url"] ?? ""
            currentID = attributeDict["id"] ?? currentURL
            currentSummary = ""
        } else if elementName == "full-summary" {
            capturingSummary = true
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if capturingSummary { currentSummary += string }
    }

    func parser(_ parser: XMLParser, foundCDATA CDATABlock: Data) {
        if capturingSummary { currentSummary += String(decoding: CDATABlock, as: UTF8.self) }
    }

    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        if elementName == "full-summary" {
            capturingSummary = false
        } else if elementName == "health-topic" {
            let title = currentTitle.trimmingCharacters(in: .whitespacesAndNewlines)
            let summary = currentSummary
                .replacingOccurrences(of: #"<[^>]+>"#, with: " ", options: .regularExpression)
                .split(whereSeparator: \.isWhitespace)
                .joined(separator: " ")
            if !title.isEmpty, !summary.isEmpty {
                let stableURL = currentURL.isEmpty ? "https://medlineplus.gov/" : currentURL
                articles.append(HealthReference(
                    title: title,
                    excerpt: summary,
                    publisher: "MedlinePlus · U.S. National Library of Medicine",
                    url: stableURL + "#\(currentID)"))
            }
            currentTitle = ""
            currentURL = ""
            currentID = ""
            currentSummary = ""
        }
    }
}
