import Foundation

/// Offline interface localization only. Never pass patient-authored text through this lookup.
public enum AppLanguage {
    public static let preferenceKey = "CareSphere.interfaceLanguage"
    public static let options: [(id: String, name: String)] = [("auto","Use device language"),("en","English"),("es","Español"),("zh-Hans","中文（简体）"),("fil","Filipino / Tagalog"),("vi","Tiếng Việt")]
    public static func resolve(_ tags: [String]) -> String {
        for tag in tags {
            let base = tag.lowercased().replacingOccurrences(of: "_", with: "-").split(separator: "-").first.map(String.init) ?? ""
            if base == "zh" { return "zh-Hans" }
            if base == "tl" || base == "fil" { return "fil" }
            if ["en","es","vi"].contains(base) { return base }
        }
        return "en"
    }
    public static var current: String {
        let preference = UserDefaults.standard.string(forKey: preferenceKey) ?? "auto"
        return options.contains(where: { $0.id == preference }) && preference != "auto" ? preference : resolve(Locale.preferredLanguages)
    }
    public static var localeTag: String { ["en":"en-US","es":"es-US","zh-Hans":"zh-CN","fil":"fil-PH","vi":"vi-VN"][current] ?? "en-US" }
    private static let catalog: [String:[String:String]] = {
        guard let url = Bundle.module.url(forResource: "InterfaceTranslations", withExtension: "json"), let data = try? Data(contentsOf: url),
              let value = try? JSONDecoder().decode([String:[String:String]].self, from: data) else { return [:] }
        return value
    }()
    public static func text(_ source: String, language: String? = nil) -> String { catalog[source]?[language ?? current] ?? source }
    public static func format(_ source: String, _ values: [String], language: String? = nil) -> String {
        var output = text(source, language: language)
        let pattern = try! NSRegularExpression(pattern: #"\{(\d+)\}"#)
        let matches = pattern.matches(in: output, range: NSRange(output.startIndex..., in: output))
        for match in matches.reversed() {
            guard let numberRange = Range(match.range(at: 1), in: output), let index = Int(output[numberRange]), values.indices.contains(index),
                  let range = Range(match.range, in: output) else { continue }
            output.replaceSubrange(range, with: values[index])
        }
        return output
    }
    public static func voiceMatches(_ tag: String, language: String? = nil) -> Bool {
        let base = tag.lowercased().split(separator: "-").first.map(String.init) ?? ""
        switch language ?? current { case "fil": return ["fil","tl"].contains(base); case "zh-Hans": return base == "zh" && !tag.lowercased().split(separator: "-").contains(where: { $0 == "hk" || $0 == "mo" }); default: return base == (language ?? current) }
    }
}
