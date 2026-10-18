import CareActivityKit
import SwiftUI

/// Deliberate handoff to the real video provider, not an embedded binary SDK.
struct ConferenceSheet: View {
    let circle: CoffeeCircle
    let displayName: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Label(circle.title, systemImage: "video").font(.title2.bold())
                    InfoText(AppLanguage.text("Continue to Jitsi Meet in your browser. The provider may ask you to sign in to start a room or open its own app. CareSphere does not host or moderate calls."))
                    InfoText(AppLanguage.text("Invite people you trust. Anyone with this room link may be able to join. Your saved care notes and health readings are not shared."))
                        .foregroundStyle(.secondary)
                    Link(destination: circle.url) {
                        Label(AppLanguage.text("Continue to video provider"), systemImage: "arrow.up.right.square")
                            .frame(maxWidth: .infinity, minHeight: 48)
                    }.buttonStyle(.borderedProminent)
                    ShareLink("Share room invitation", item: circle.url)
                        .buttonStyle(.bordered).controlSize(.large)
                    Text(circle.url.absoluteString).font(.footnote).textSelection(.enabled)
                }.carePagePadding()
            }
            .navigationTitle(AppLanguage.text("Join a video room"))
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(AppLanguage.text("Close")) { dismiss() } } }
        }
    }
}
