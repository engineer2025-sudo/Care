import SwiftUI
import MessageUI

struct CareSupportFlowView: View {
    let flow: CareSupportFlow

    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var coordinator: CareSupportCoordinator
    @Environment(\.dismiss) private var dismiss

    @State private var step: Step
    @State private var showingVideo = false
    @State private var showingMessageComposer = false

    private enum Step {
        case movementCheck
        case feelingCheck
        case breathing
        case afterBreathing
        case support
        case urgent
    }

    init(flow: CareSupportFlow) {
        self.flow = flow
        switch flow.trigger {
        case .sustainedHeartRate:
            _step = State(initialValue: .movementCheck)
        case .selfReportedStress:
            _step = State(initialValue: .breathing)
        case .urgentQuestion(_):
            _step = State(initialValue: .urgent)
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    switch step {
                    case .movementCheck:
                        movementCheck
                    case .feelingCheck:
                        feelingCheck
                    case .breathing:
                        breathingStep
                    case .afterBreathing:
                        afterBreathing
                    case .support:
                        supportOptions
                    case .urgent:
                        urgentSupport
                    }
                }
                .padding(20)
                .frame(maxWidth: 560, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .background(Color.ink)
            .navigationTitle("Check-in")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { finish() }
                }
            }
        }
        .interactiveDismissDisabled(false)
        .sheet(isPresented: $showingVideo) {
            ConferenceSheet(circle: supportCircle, displayName: store.displayName)
        }
        .sheet(isPresented: $showingMessageComposer) {
            SupportMessageComposer(recipients: [contactPhone], message: caregiverMessage) { _ in
                showingMessageComposer = false
            }
            .ignoresSafeArea()
        }
    }

    private var movementCheck: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("A quick check-in")
                .font(.title2.weight(.bold))
            Text("Are you moving or exercising right now?")
                .font(.title3)
            actionButton("Yes, I'm moving", systemImage: "figure.walk", prominent: true) {
                finish()
            }
            actionButton("No", systemImage: "hand.raised") {
                step = .feelingCheck
            }
            actionButton("Not sure", systemImage: "questionmark.circle") {
                step = .feelingCheck
            }
        }
    }

    private var feelingCheck: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("How are you feeling?")
                .font(.title2.weight(.bold))
            actionButton("I'm okay", systemImage: "checkmark.circle") {
                finish()
            }
            actionButton("I'm stressed", systemImage: "wind", prominent: true) {
                step = .breathing
            }
            actionButton("I need help", systemImage: "person.crop.circle.badge.exclamationmark") {
                step = .support
            }
        }
    }

    private var breathingStep: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Let's pause together")
                .font(.title2.weight(.bold))
            PacedBreathingActivity(
                targetCycles: 3,
                onComplete: { step = .afterBreathing },
                onStop: { step = .afterBreathing })
            actionButton("Skip to check-in", systemImage: "forward.fill") {
                step = .afterBreathing
            }
            actionButton("I need help now", systemImage: "person.crop.circle.badge.exclamationmark") {
                step = .support
            }
        }
    }

    private var afterBreathing: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("How are you now?")
                .font(.title2.weight(.bold))
            actionButton("Better", systemImage: "checkmark.circle", prominent: true) {
                finish()
            }
            actionButton("Contact my caregiver", systemImage: "message.fill") {
                step = .support
            }
            actionButton("Still stressed", systemImage: "wind") {
                step = .support
            }
            actionButton("I need help", systemImage: "person.crop.circle.badge.exclamationmark") {
                step = .support
            }
        }
    }

    private var urgentSupport: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(urgentReason == .selfHarm ? "Please don't hurt yourself." : "This could be dangerous.")
                .font(.title2.weight(.bold))
                .foregroundStyle(.red)
            Text(urgentReason == .selfHarm
                 ? "Move away from anything you could use to hurt yourself. Ask someone nearby to stay with you."
                 : "If you haven't taken it, don't. If you have, get urgent help now.")
                .font(.body)
            emergencyCallActions
            contactActions
            Button("I'm safe right now") { finish() }
                .font(.subheadline.weight(.semibold))
                .padding(.vertical, 8)
        }
    }

    private var supportOptions: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Would you like someone with you?")
                .font(.title2.weight(.bold))
            contactActions
            Button("Close") { finish() }
                .font(.subheadline.weight(.semibold))
                .padding(.vertical, 8)
        }
    }

    @ViewBuilder
    private var emergencyCallActions: some View {
        if Locale.current.region?.identifier == "US" {
            Link(destination: URL(string: "tel:911")!) {
                Label("Call 911", systemImage: "phone.fill")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)

            if urgentReason == .possiblePoisoning {
                Link(destination: URL(string: "tel:18002221222")!) {
                    Label("Call Poison Control", systemImage: "phone.fill")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
            } else if urgentReason == .selfHarm {
                Link(destination: URL(string: "tel:988")!) {
                    Label("Call 988", systemImage: "phone.fill")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
                Link(destination: URL(string: "sms:988")!) {
                    Label("Text 988", systemImage: "message.fill")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
            }
        } else {
            Text("Call your local emergency number or poison center.")
                .font(.subheadline.weight(.semibold))
        }
    }

    @ViewBuilder
    private var contactActions: some View {
        if canTextCaregiver {
            Button {
                showingMessageComposer = true
            } label: {
                Label("Text \(contactName)", systemImage: "message.fill")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
        } else {
            ShareLink(item: caregiverMessage) {
                Label("Share a support message", systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
        }

        Button {
            showingVideo = true
        } label: {
            Label("Open video support", systemImage: "video.fill")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
        .buttonStyle(.bordered)
        Text(canTextCaregiver
             ? "Messages opens a draft; tap Send to share. Anyone with the room link can join."
             : "Choose where to share the message. Anyone with the room link can join.")
            .font(.caption2)
            .foregroundStyle(.secondary)
    }

    @ViewBuilder
    private func actionButton(
        _ title: String,
        systemImage: String,
        prominent: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        if prominent {
            Button(action: action) { actionButtonLabel(title, systemImage: systemImage) }
                .buttonStyle(.borderedProminent)
        } else {
            Button(action: action) { actionButtonLabel(title, systemImage: systemImage) }
                .buttonStyle(.bordered)
        }
    }

    private func actionButtonLabel(_ title: String, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
    }

    private var urgentReason: CareQuestionRisk? {
        guard case .urgentQuestion(let reason) = flow.trigger else { return nil }
        return reason
    }

    private var contactName: String {
        let cleaned = store.profile.emergencyContact.name.trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? "my contact" : cleaned
    }

    private var contactPhone: String {
        store.profile.emergencyContact.phone.filter { $0.isNumber || $0 == "+" }
    }

    private var canTextCaregiver: Bool {
        contactPhone.contains(where: { $0.isNumber }) && MFMessageComposeViewController.canSendText()
    }

    private var caregiverMessage: String {
        let opening = urgentReason != nil
            ? "I need urgent support. Please call me or join me here:"
            : "I could use some support. Please join me here:"
        return "\(opening) https://meet.jit.si/\(flow.room)"
    }

    private var supportCircle: CoffeeCircle {
        CoffeeCircle(id: -1, title: "CareSphere support", emoji: "💚",
                     schedule: "Support check-in", room: flow.room)
    }

    private func finish() {
        coordinator.finish()
        dismiss()
    }
}

private struct SupportMessageComposer: UIViewControllerRepresentable {
    let recipients: [String]
    let message: String
    let onFinish: (MessageComposeResult) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIViewController(context: Context) -> MFMessageComposeViewController {
        let controller = MFMessageComposeViewController()
        controller.recipients = recipients
        controller.body = message
        controller.messageComposeDelegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: MFMessageComposeViewController, context: Context) {}

    final class Coordinator: NSObject, MFMessageComposeViewControllerDelegate {
        private let parent: SupportMessageComposer

        init(parent: SupportMessageComposer) {
            self.parent = parent
        }

        func messageComposeViewController(
            _ controller: MFMessageComposeViewController,
            didFinishWith result: MessageComposeResult
        ) {
            parent.onFinish(result)
            controller.dismiss(animated: true)
        }
    }
}
