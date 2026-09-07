import SwiftUI
import MapKit

struct SosView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var location: LocationService
    @State private var notifiedAt: Date?

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Text("🚨")
                    .font(.system(size: 52))
                Text("Emergency SOS")
                    .font(.title2.weight(.heavy))
                Text("Real emergencies need real responders. Call 911 directly, and/or alert your Care Circle with your medical profile and live location.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                if let location = location.location {
                    Link(destination: URL(string:
                        "https://www.google.com/maps?q=\(location.coordinate.latitude),\(location.coordinate.longitude)")!) {
                        HStack(spacing: 8) {
                            Image(systemName: "location.fill")
                            Text(String(format: "Location attached: %.5f, %.5f (±%d m)", location.coordinate.latitude, location.coordinate.longitude, Int(location.horizontalAccuracy)))
                                .font(.caption.weight(.semibold))
                            Image(systemName: "safari")
                        }
                        .frame(maxWidth: .infinity)
                        .padding(12)
                        .background(Color.blue.opacity(0.15), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .foregroundStyle(.blue)
                } else if let error = location.errorText {
                    Text("Location unavailable (\(error)) — the alert still goes out without coordinates.")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }

                if let notifiedAt {
                    Label("Care Circle alerted at \(notifiedAt.formatted(date: .omitted, time: .shortened)) — Sarah M. and coordinator Elena R. acknowledged.",
                          systemImage: "checkmark.seal.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.emerald)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color.emerald.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                VStack(spacing: 10) {
                    Link(destination: URL(string: "tel:911")!) {
                        Label("Call 911 Now", systemImage: "phone.fill")
                            .font(.title3.weight(.black))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(.red, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                            .foregroundStyle(.white)
                    }
                    if location.location == nil {
                        Button {
                            location.request()
                        } label: {
                            Label(location.isLocating ? "Locating…" : "Attach my GPS location",
                                  systemImage: "location")
                                .font(.subheadline.weight(.bold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                        }
                        .buttonStyle(.bordered)
                        .disabled(location.isLocating)
                    }
                    Button {
                        notifiedAt = Date()
                        UINotificationFeedbackGenerator().notificationOccurred(.warning)
                        SpeechService.shared.speak("Emergency alert sent to your care circle.", enabled: true)
                    } label: {
                        Label("Notify Care Circle", systemImage: "bell.fill")
                            .font(.subheadline.weight(.bold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                    }
                    .buttonStyle(.bordered)
                    Button("Close") { dismiss() }
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding(22)
            .background(Color.ink)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: { Image(systemName: "xmark.circle.fill") }
                }
            }
        }
        .preferredColorScheme(.dark)
        .presentationDetents([.large])
    }
}
