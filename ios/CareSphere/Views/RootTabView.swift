import SwiftUI

/// Five explicit destinations avoid the system's hidden sixth-tab “More” menu.
@MainActor
final class CareNavigation: ObservableObject {
    enum Tab: Hashable { case today, activities, connect, care, health }
    enum HealthPage: String, CaseIterable { case vitals = "Vitals", guide = "Health Guide" }
    @Published var selectedTab: Tab = .today
    @Published var healthPage: HealthPage = .vitals
}

struct RootTabView: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @EnvironmentObject private var store: CareStore
    @State private var showSupport = false
    @StateObject private var navigation = CareNavigation()
    @State private var showSettings = false
    @State private var showSOS = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Image(systemName: "heart.circle.fill")
                    .font(.title).foregroundStyle(Color.emeraldText).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text("CareSphere").font(.headline.weight(.bold))
                    if !typeSize.isAccessibilitySize {
                        Text("A little support, every day").font(.caption).foregroundStyle(.secondary)
                    }
                }
                .accessibilityElement(children: .combine)
                Spacer(minLength: 4)
                Button { showSupport = true } label: { Image(systemName: "hand.raised").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("My support tools")
                Button { showSettings = true } label: {
                    Image(systemName: "gearshape")
                        .font(.title3)
                        .frame(minWidth: 44, minHeight: 44)
                        .background(Color.card, in: RoundedRectangle(cornerRadius: 14))
                }
                .accessibilityLabel("Settings and accessibility")
                Button { showSOS = true } label: {
                    Text("SOS").font(.subheadline.weight(.bold))
                        .padding(.horizontal, 12).frame(minHeight: 44)
                        .background(Color.red, in: RoundedRectangle(cornerRadius: 14))
                        .foregroundStyle(.white)
                }
                .accessibilityLabel("Emergency SOS")
            }
            .padding(.horizontal, 16).padding(.vertical, 8)
            .background(.bar)

            TabView(selection: $navigation.selectedTab) {
                OverviewView()
                    .tabItem { Label("Today", systemImage: "house") }.tag(CareNavigation.Tab.today)
                TherapyView()
                    .tabItem { Label("Activities", systemImage: "square.grid.2x2") }.tag(CareNavigation.Tab.activities)
                if store.personalSupport.simple {
                    PersonalSupportView().tabItem { Label("My People", systemImage: "person.2") }.tag(CareNavigation.Tab.connect)
                } else {
                CoffeeCirclesView()
                    .tabItem { Label("Connect", systemImage: "person.2") }.tag(CareNavigation.Tab.connect)
                CareCircleView()
                    .tabItem { Label("Care", systemImage: "heart.text.square") }.tag(CareNavigation.Tab.care)
                HealthHomeView()
                    .tabItem { Label("Health", systemImage: "waveform.path.ecg") }.tag(CareNavigation.Tab.health)
                }
            }
        }
        .environmentObject(navigation)
        .onChange(of: store.personalSupport.simple) { _ in navigation.selectedTab = .today }
        .sheet(isPresented: $showSupport) { PersonalSupportView() }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showSOS) { SosView() }
    }
}

private struct HealthHomeView: View {
    @EnvironmentObject private var navigation: CareNavigation
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        VStack(spacing: 0) {
            if typeSize.isAccessibilitySize {
                Picker("Health section", selection: $navigation.healthPage) {
                    ForEach(CareNavigation.HealthPage.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }.pickerStyle(.menu).padding(.horizontal)
            } else {
                Picker("Health section", selection: $navigation.healthPage) {
                    ForEach(CareNavigation.HealthPage.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }.pickerStyle(.segmented).padding(.horizontal).padding(.top, 8)
            }
            switch navigation.healthPage {
            case .vitals: VitalsView()
            case .guide: HealthGuideView()
            }
        }
    }
}
