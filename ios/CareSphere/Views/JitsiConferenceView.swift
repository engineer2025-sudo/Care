import SwiftUI
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
