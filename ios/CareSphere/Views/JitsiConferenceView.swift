import SwiftUI
#if os(iOS)
import JitsiMeetSDK

/// Native video conferencing via the official Jitsi Meet iOS SDK
/// (JitsiMeetSDK Swift package). `JitsiMeetView` renders the full conference
/// UI — audio/video, chat, participant tiles — inside CareSphere.
struct JitsiConferenceView: UIViewRepresentable {
    let room: String
    let displayName: String

    func makeUIView(context: Context) -> JitsiMeetView {
        let view = JitsiMeetView()
        let options = JitsiMeetConferenceOptions.fromBuilder { builder in
            builder.serverURL = URL(string: "https://meet.jit.si")
            builder.room = room
            builder.userInfo = JitsiMeetUserInfo(displayName: displayName, andEmail: nil, andAvatar: nil)
        }
        view.join(options)
        return view
    }

    func updateUIView(_ uiView: JitsiMeetView, context: Context) {}
}

/// Full-screen conference sheet with a header that keeps CareSphere branding
/// and an escape hatch to Safari.
struct ConferenceSheet: View {
    let circle: CoffeeCircle
    let displayName: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            JitsiConferenceView(room: circle.room, displayName: displayName)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle(circle.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Leave") { dismiss() }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Link(destination: circle.url) {
                            Image(systemName: "safari")
                        }
                    }
                }
        }
    }
}

#else
import AppKit

/// On macOS the Jitsi SDK is unavailable (iOS-only framework), so the room —
/// the very same real meet.jit.si room — opens in the default browser, where
/// macOS provides first-class WebRTC camera/microphone support.
struct ConferenceSheet: View {
    let circle: CoffeeCircle
    let displayName: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 18) {
            Text(circle.emoji)
                .font(.system(size: 52))
            Text(circle.title)
                .font(.title2.weight(.heavy))
                .multilineTextAlignment(.center)
            Text("You'll join as \(displayName). Video rooms run on meet.jit.si — on Mac the room opens in your default browser with full camera & microphone support.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button {
                NSWorkspace.shared.open(circle.url)
                dismiss()
            } label: {
                Label("Open video room in browser", systemImage: "video.fill")
                    .font(.subheadline.weight(.black))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            Link("Copy-safe link · \(circle.url.absoluteString)", destination: circle.url)
                .font(.caption2)
                .lineLimit(1)
                .truncationMode(.middle)
            Button("Close") { dismiss() }
                .font(.caption.weight(.bold))
        }
        .padding(26)
        .frame(width: 440)
    }
}
#endif
