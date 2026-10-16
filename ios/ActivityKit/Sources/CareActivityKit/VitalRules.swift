public enum VitalRules {
    /// Input-format bounds, not reference ranges or advice.
    public static func valid(kind: String, first: Int, second: Int?) -> Bool {
        switch kind {
        case "bp":
            guard let second else { return false }
            return (1...400).contains(first) && (1...300).contains(second) && first >= second
        case "oxygen":
            return second == nil && (1...100).contains(first)
        default:
            return false
        }
    }
}
