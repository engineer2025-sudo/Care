import CareActivityKit
import SwiftUI
import MapKit

struct SosView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var location: LocationService
    @EnvironmentObject private var store: CareStore
    @State private var includeLocation = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(AppLanguage.text("Need urgent help?"))
                        .font(.title.weight(.bold))
                        .accessibilityAddTraits(.isHeader)
                    Text(AppLanguage.text("In the United States, call 911 for immediate danger. Outside the US, use the local emergency number. CareSphere does not contact anyone automatically."))
                        .font(.body)
                    Link(destination: URL(string: "tel:911")!) {
                        Label(AppLanguage.text("Call 911"), systemImage: "phone.fill")
                            .font(.title3.weight(.bold))
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .padding(.vertical, 8)
                            .background(Color.red, in: RoundedRectangle(cornerRadius: 16))
                            .foregroundStyle(.white)
                    }
                    SectionCard(title: AppLanguage.text("Send it now"), systemImage: "bolt.fill") {
                        if emergencyContactName.isEmpty {
                            Text(AppLanguage.text("Add an emergency contact in Settings & privacy first. Until then you can share the message yourself below."))
                                .foregroundStyle(.secondary)
                        } else {
                            Text(AppLanguage.text("Apple does not let an app send a text silently. A Shortcut you create once sends this message through Apple Shortcuts, with no server or account."))
                                .foregroundStyle(.secondary)
                            Button {
                                if let url = SosMessage.shortcutURL(message: emergencyShareMessage) {
                                    openURL(url)
                                }
                            } label: {
                                Label(AppLanguage.text("Send now with Shortcuts"), systemImage: "bolt.fill")
                                    .frame(maxWidth: .infinity, minHeight: 44)
                            }
                            .buttonStyle(.borderedProminent)
                            DisclosureGroup(AppLanguage.text("Set up instant sending (one time)")) {
                                VStack(alignment: .leading, spacing: 8) {
                                    ForEach(setupSteps.indices, id: \.self) { index in
                                        Text("\(index + 1). \(setupSteps[index])")
                                            .font(.footnote)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                    Button(AppLanguage.text("Open Shortcuts")) {
                                        if let url = URL(string: "shortcuts://") { openURL(url) }
                                    }
                                    .font(.footnote.weight(.semibold))
                                    Text(AppLanguage.text("The Shortcut sends the message; CareSphere cannot confirm delivery or a response."))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.top, 6)
                            }
                        }
                    }
                    SectionCard(title: AppLanguage.text("Share a request for help"), systemImage: "square.and.arrow.up") {
                        Text(AppLanguage.text("Choose a messaging app and recipient, then review and send the message yourself. CareSphere cannot confirm delivery or a response."))
                            .foregroundStyle(.secondary)

                        if includeLocation, let fix = location.location {
                            Label(String(format: AppLanguage.text("Location ready to share") + ": %.5f, %.5f", fix.coordinate.latitude, fix.coordinate.longitude), systemImage: "location")
                                .font(.subheadline)
                            Text("Location recorded \(fix.timestamp.formatted(date: .omitted, time: .shortened)). \(fix.horizontalAccuracy >= 0 ? "Accuracy about \(Int(fix.horizontalAccuracy)) meters." : "Accuracy unavailable.")")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        if includeLocation, let error = location.errorText {
                            Text("\(AppLanguage.text("Location unavailable or permission denied. You can still share an SOS message without coordinates.")) (\(error))")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        Button { includeLocation = true; location.request() } label: {
                            Label(location.isLocating ? AppLanguage.text("Getting location…") : location.location == nil ? AppLanguage.text("Add my location (optional)") : AppLanguage.text("Refresh my location"), systemImage: "location")
                                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                        }
                        .buttonStyle(.bordered)
                        .disabled(location.isLocating)

                        if includeLocation {
                            Button(AppLanguage.text("Remove location from message")) { includeLocation = false }
                                .frame(minHeight: 44)
                        }
                        Text(AppLanguage.text("Message preview")).font(.headline)
                        Text(emergencyShareMessage)
                            .textSelection(.enabled)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14))
                        ShareLink(item: emergencyShareMessage) {
                            Label(AppLanguage.text("Choose how to share"), systemImage: "square.and.arrow.up")
                                .frame(maxWidth: .infinity, minHeight: 44)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    Text(AppLanguage.text("No medical profile is attached. Only the name and optional location shown above are included."))
                        .font(.footnote).foregroundStyle(.secondary)
                }
                .carePagePadding()
            }
            .background(Color.ink)
            .navigationTitle(AppLanguage.text("Emergency SOS"))
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(AppLanguage.text("Close")) { dismiss() }
                        .accessibilityLabel(AppLanguage.text("Close emergency actions"))
                }
            }
        }
        .presentationDetents([.large])
    }

    private var setupSteps: [String] {
        SosMessage.setupSteps(contactName: emergencyContactName)
    }

    private var emergencyContactName: String {
        store.profile.emergencyContact.name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var emergencyShareMessage: String {
        var recorded: SosLocation?
        if includeLocation, let fix = location.location {
            recorded = SosLocation(
                latitude: fix.coordinate.latitude,
                longitude: fix.coordinate.longitude,
                recordedAt: fix.timestamp.formatted(date: .abbreviated, time: .shortened)
            )
        }
        return SosMessage.compose(displayName: store.displayName, location: recorded)
    }
}
