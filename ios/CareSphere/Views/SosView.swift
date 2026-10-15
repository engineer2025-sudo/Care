import CareActivityKit
import SwiftUI
import MapKit

struct SosView: View {
    @Environment(\.dismiss) private var dismiss
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
                    SectionCard(title: AppLanguage.text("Share a request for help"), systemImage: "square.and.arrow.up") {
                        Text(AppLanguage.text("Choose a messaging app and recipient, then review and send the message yourself. CareSphere cannot confirm delivery or a response."))
                            .foregroundStyle(.secondary)

                        if includeLocation, let fix = location.location {
                            Label(String(format: "Location ready to share: %.5f, %.5f", fix.coordinate.latitude, fix.coordinate.longitude), systemImage: "location")
                                .font(.subheadline)
                            Text("Location recorded \(fix.timestamp.formatted(date: .omitted, time: .shortened)). \(fix.horizontalAccuracy >= 0 ? "Accuracy about \(Int(fix.horizontalAccuracy)) meters." : "Accuracy unavailable.")")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        if includeLocation, let error = location.errorText {
                            Text("Location unavailable: \(error). You can still choose to share a message without coordinates. Nothing has been sent.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        Button { includeLocation = true; location.request() } label: {
                            Label(location.isLocating ? "Getting location…" : location.location == nil ? "Add my location (optional)" : "Refresh my location", systemImage: "location")
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

    private var emergencyShareMessage: String {
        var message = "CareSphere SOS: \(store.displayName) is requesting help. Please check in now."
        if includeLocation, let fix = location.location {
            let mapsURL = "https://www.google.com/maps?q=\(fix.coordinate.latitude),\(fix.coordinate.longitude)"
            message += " Location recorded at \(fix.timestamp.formatted(date: .abbreviated, time: .shortened)): \(mapsURL)"
        }
        return message
    }
}
