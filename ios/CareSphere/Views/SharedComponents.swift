import SwiftUI
#if os(iOS)
import UIKit
#else
import AppKit
#endif

// MARK: - Cross-platform semantic colors & helpers
// iOS uses UISystemBackground colors; macOS maps them to AppKit equivalents
// so the same SwiftUI sources compile on both platforms.

extension Color {
    /// Outer card background.
    static let card = {
        #if os(iOS)
        return Color(UIColor.secondarySystemBackground)
        #else
        return Color(NSColor.controlBackgroundColor)
        #endif
    }()
    /// Inner row / element background inside cards.
    static let cardInner = {
        #if os(iOS)
        return Color(UIColor.tertiarySystemBackground)
        #else
        return Color(NSColor.unemphasizedSelectedContentBackgroundColor)
        #endif
    }()
}

extension View {
    /// Inline navigation titles on iOS; no-op on macOS where titles are
    /// already rendered inline in the window chrome.
    @ViewBuilder
    func inlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }
}

/// Card container used across all tabs.
struct SectionCard<Content: View>: View {
    let title: String
    let systemImage: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: systemImage)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.primary)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

/// LIVE / SIMULATED / OFFLINE-style chip used on vitals cards.
struct StatusChip: View {
    let text: String
    var color: Color = .emerald

    var body: some View {
        Text(text)
            .font(.caption2.weight(.heavy))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.18), in: Capsule())
            .foregroundStyle(color)
    }
}

struct BigMetricButton<Label: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder var label: Label
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                label
                Text(title)
                    .font(.title2.weight(.black))
                    .foregroundStyle(.primary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Color.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

extension View {
    /// Gentle success haptic — iOS uses UIKit's notification generator,
    /// macOS uses the NSHapticFeedbackManager.
    func celebrate() {
        #if os(iOS)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        #else
        NSHapticFeedbackManager.defaultPerformer.performFeedback(.alignment, performanceTime: .default)
        #endif
    }
}

// Global haptic helpers usable from any view or model.
func hapticWarning() {
    #if os(iOS)
    UINotificationFeedbackGenerator().notificationOccurred(.warning)
    #else
    NSHapticFeedbackManager.defaultPerformer.performFeedback(.generic, performanceTime: .default)
    #endif
}

func hapticError() {
    #if os(iOS)
    UINotificationFeedbackGenerator().notificationOccurred(.error)
    #else
    NSHapticFeedbackManager.defaultPerformer.performFeedback(.pattern(0.4, 0.4, 2), performanceTime: .default)
    #endif
}
