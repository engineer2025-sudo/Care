import SwiftUI

struct RootTabView: View {
    @EnvironmentObject private var store: CareStore
    @State private var showSettings = false
    @State private var showSOS = false

    var body: some View {
        VStack(spacing: 0) {
            // Header — mirrors the web app: brand, settings gear, SOS.
            HStack(spacing: 12) {
                Text("💚")
                    .font(.title2)
                VStack(alignment: .leading, spacing: 0) {
                    Text("CareSphere")
                        .font(.headline.weight(.heavy))
                        .foregroundStyle(Color.emerald)
                    Text("Senior care · isolation prevention · autism support")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape.fill")
                        .font(.system(size: 15, weight: .bold))
                        .padding(10)
                        .background(Color.card, in: Circle())
                }
                .accessibilityLabel("Settings")
                Button {
                    showSOS = true
                } label: {
                    Label("SOS", systemImage: "phone.fill")
                        .font(.caption.weight(.black))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)
                        .background(.red, in: Capsule())
                        .foregroundStyle(.white)
                }
                .accessibilityLabel("Emergency SOS")
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
            .background(.bar)

            TabView {
                OverviewView()
                    .tabItem { Label("Overview", systemImage: "house.fill") }
                TherapyView()
                    .tabItem { Label("Therapy", systemImage: "gamecontroller.fill") }
                CoffeeCirclesView()
                    .tabItem { Label("Circles", systemImage: "person.2.fill") }
                CareCircleView()
                    .tabItem { Label("Care", systemImage: "shield.fill") }
                VitalsView()
                    .tabItem { Label("Vitals", systemImage: "waveform.path.ecg") }
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showSOS) { SosView() }
    }
}
