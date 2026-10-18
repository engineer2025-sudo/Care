import Foundation

public enum ActivityPreferences {
    public static func normalized(_ ids: [String]) -> [String] {
        let known = Set(CareActivity.allCases.map(\.id))
        return Array(Set(ids.filter { known.contains($0) })).sorted()
    }
    public static func toggling(_ id: String, in ids: [String]) -> [String] {
        var favorites = Set(normalized(ids))
        if favorites.contains(id) { favorites.remove(id) } else { favorites.insert(id) }
        return normalized(Array(favorites))
    }
    public static func matches(_ text: String, query: String) -> Bool {
        let words = query.split(whereSeparator: \.isWhitespace)
        return words.allSatisfy { text.localizedStandardContains(String($0)) }
    }
}
