import SwiftUI
#if os(iOS)
import UIKit
#else
import AppKit
#endif


private struct CareSphereHighContrastKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var careSphereHighContrast: Bool {
        get { self[CareSphereHighContrastKey.self] }
        set { self[CareSphereHighContrastKey.self] = newValue }
    }
}

extension Color {
    static let card = {
        #if os(iOS)
        return Color(UIColor.secondarySystemBackground)
        #else
        return Color(NSColor.controlBackgroundColor)
        #endif
    }()
    static let cardInner = {
        #if os(iOS)
        return Color(UIColor.tertiarySystemBackground)
        #else
        return Color(NSColor.unemphasizedSelectedContentBackgroundColor)
        #endif
    }()
}

extension View {
    @ViewBuilder
    func inlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }
}

struct SectionCard<Content: View>: View {
    let title: String
    let systemImage: String
    @Environment(\.careSphereHighContrast) private var highContrast
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: systemImage)
                .font(.headline)
                .foregroundStyle(.primary)
                .accessibilityAddTraits(.isHeader)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(highContrast ? Color.primary.opacity(0.72) : .clear,
                              lineWidth: highContrast ? 2 : 0)
        }
    }
}

struct StatusChip: View {
    let text: String
    var color: Color = .emeraldText
    @Environment(\.careSphereHighContrast) private var highContrast

    var body: some View {
        Text(text)
            .font(.caption2.weight(.heavy))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.18), in: Capsule())
            .foregroundStyle(color)
            .overlay {
                Capsule().strokeBorder(highContrast ? color : .clear,
                                       lineWidth: highContrast ? 1.5 : 0)
            }
    }
}

struct BigMetricButton<Label: View>: View {
    let title: String
    let subtitle: String
    @Environment(\.careSphereHighContrast) private var highContrast
    @ViewBuilder var label: Label
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    label
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary).accessibilityHidden(true)
                }
                Text(title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.primary)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Color.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(highContrast ? Color.primary.opacity(0.72) : .clear,
                                  lineWidth: highContrast ? 2 : 0)
            }
        }
        .buttonStyle(.plain)
    }
}

extension View {
    func celebrate() {
        HapticsService.success()
    }
}

func hapticWarning() {
    HapticsService.warning()
}

func hapticError() {
    HapticsService.error()
}


extension View {
    func carePagePadding() -> some View {
        self.padding(16)
            .frame(maxWidth: 900)
            .frame(maxWidth: .infinity, alignment: .center)
    }
}

// MARK: - Bare minimum mode
/// Explanatory/guidance copy. Renders nothing in Bare minimum mode so screens
/// keep only controls and personal content. Status messages, empty states and
/// safety warnings use their own elements and stay visible.
struct InfoText: View {
    @AppStorage("caresphere.bareMinimum") private var bareMinimum = false
    private let content: String
    private let font: Font?
    init(_ content: String, font: Font? = nil) { self.content = content; self.font = font }
    var body: some View {
        if !bareMinimum {
            if let font { Text(content).font(font) } else { Text(content) }
        }
    }
}
