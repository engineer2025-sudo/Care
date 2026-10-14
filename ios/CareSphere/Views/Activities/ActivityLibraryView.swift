import SwiftUI
import CareActivityKit

/// A library, not a wall of simultaneously active games. Each session is isolated.
struct TherapyView: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var category: ActivityCategory = .all
    @State private var query = ""
    @State private var selectedActivity: CareActivity?
    @State private var showingEvidence = false

    private var activities: [CareActivity] { CareActivity.filtered(category: category, query: query) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("A little curiosity. Your own pace.")
                            .font(.title2.weight(.bold))
                            .accessibilityAddTraits(.isHeader)
                        Text("Choose something you enjoy. Play alone or with someone you trust. No scores, streaks, or pressure to finish.")
                            .foregroundStyle(.secondary)
                        Label("\(CareActivity.allCases.count) activities · available offline", systemImage: "checkmark.circle")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.emeraldText)
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.emerald.opacity(0.09), in: RoundedRectangle(cornerRadius: 24))

                    Picker("Explore activities", selection: $category) {
                        ForEach(ActivityCategory.allCases) { category in
                            Text(category.rawValue).tag(category)
                        }
                    }
                    .pickerStyle(.menu)
                    .accessibilityHint("Filter activities by what you would like to do.")

                    if activities.isEmpty {
                        SectionCard(title: "No activities found", systemImage: "magnifyingglass") {
                            Text("Try a different word or browse all activities.")
                                .foregroundStyle(.secondary)
                            Button("Show all activities") { query = ""; category = .all }
                                .buttonStyle(.bordered)
                                .frame(minHeight: 44)
                        }
                    } else {
                        Text("\(activities.count) \(activities.count == 1 ? "activity" : "activities")")
                            .font(.subheadline).foregroundStyle(.secondary)
                        LazyVGrid(columns: typeSize.isAccessibilitySize ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 280))], spacing: 12) {
                            ForEach(activities) { activity in
                                Button { selectedActivity = activity } label: {
                                    ActivityLibraryTile(activity: activity)
                                }
                                .buttonStyle(.plain)
                                .accessibilityIdentifier("activity.\(activity.id)")
                                .accessibilityHint("Opens one activity. You can leave at any time.")
                            }
                        }
                    }
                    Button { showingEvidence = true } label: {
                        Label("Research, safety & playing together", systemImage: "info.circle")
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    }
                    .buttonStyle(.bordered)
                    Text("Designed with accessibility principles in mind. These activities have not been clinically validated to treat dementia or autism.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                .carePagePadding()
            }
            .background(Color.ink)
            .navigationTitle("Activities")
            .searchable(text: $query, prompt: "Find an activity")
            .fullScreenCover(item: $selectedActivity) { ActivitySessionView(activity: $0) }
            .sheet(isPresented: $showingEvidence) { ActivityEvidenceView() }
        }
    }
}

private struct ActivityLibraryTile: View {
    let activity: CareActivity
    @Environment(\.careSphereHighContrast) private var highContrast

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Image(systemName: activity.symbol)
                    .font(.title2)
                    .foregroundStyle(Color.emeraldText)
                    .frame(width: 48, height: 48)
                    .background(Color.emerald.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                    .accessibilityHidden(true)
                Spacer()
                Image(systemName: "arrow.up.right").foregroundStyle(.secondary).accessibilityHidden(true)
            }
            Text(activity.title).font(.headline).foregroundStyle(.primary)
            Text(activity.summary).font(.subheadline).foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Text(activity.support).font(.footnote.weight(.medium)).foregroundStyle(Color.emeraldText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.card, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(highContrast ? Color.primary : Color.primary.opacity(0.12), lineWidth: highContrast ? 2 : 1))
        .accessibilityElement(children: .combine)
    }
}

struct ActivitySessionView: View {
    let activity: CareActivity
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var paused = false
    @State private var showingEvidence = false

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Label("No score · stop whenever you like", systemImage: "leaf")
                        .font(.subheadline).foregroundStyle(Color.emeraldText)
                    // Keep the session mounted while paused so choices are not lost.
                    // Activity lifecycle handlers stop sound/playback on backgrounding.
                    ZStack(alignment: .top) {
                        activityContent
                            .opacity(paused ? 0 : 1)
                            .allowsHitTesting(!paused)
                            .accessibilityHidden(paused)
                        if paused {
                            VStack(spacing: 16) {
                                Image(systemName: "pause.circle").font(.largeTitle).foregroundStyle(Color.emeraldText)
                                Text("Take your time").font(.title2.weight(.bold))
                                Text("Your place is kept while this activity is open.")
                                    .multilineTextAlignment(.center).foregroundStyle(.secondary)
                                Button("Continue activity") { paused = false }
                                    .buttonStyle(.borderedProminent).controlSize(.large)
                            }
                            .padding(20)
                            .frame(maxWidth: .infinity)
                        }
                    }
                    if !paused {
                        DisclosureGroup("About this activity") {
                            Text(activity.purpose).font(.subheadline).foregroundStyle(.secondary).padding(.top, 8)
                            Button("Research & limits") { showingEvidence = true }
                                .frame(minHeight: 44)
                        }
                        .padding(16)
                        .background(Color.card, in: RoundedRectangle(cornerRadius: 16))
                    }
                }
                .id("session-top")
                .carePagePadding()
            }
            .onChange(of: paused) { _ in proxy.scrollTo("session-top", anchor: .top) }
            }
            .background(Color.ink)
            .navigationTitle(activity.title)
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }.accessibilityLabel("Leave activity")
                }
                // Sound and breathing have their own explicit pause controls.
                if activity != .soundscapes && activity != .breathing {
                    ToolbarItem(placement: .primaryAction) {
                        Button(paused ? "Continue" : "Take a break") { paused.toggle() }
                    }
                }
            }
            .sheet(isPresented: $showingEvidence) { ActivityEvidenceView() }
            .onChange(of: scenePhase) { phase in
                if phase != .active && activity != .soundscapes && activity != .breathing {
                    paused = true
                }
            }
        }
    }

    @ViewBuilder private var activityContent: some View {
        switch activity {
        case .picturePairs: PicturePairsCard()
        case .sortTogether: ChoiceActivityView(exercise: .sorting)
        case .completePattern: ChoiceActivityView(exercise: .patterns)
        case .findSame: ChoiceActivityView(exercise: .matching)
        case .everydayOrder: EverydayOrderView()
        case .conversation: ConversationCardsView()
        case .feelings: FeelingsExplorerCard()
        case .pictureStory: PictureStoryCard()
        case .patternRecall: PatternRecallCard()
        case .soundscapes: SoundscapesCard()
        case .breathing: BreathingCard()
        }
    }
}

struct ActivityEvidenceView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    SectionCard(title: "Enjoyment, not a clinical test", systemImage: "heart.text.square") {
                        Text("CareSphere's games have not been clinically evaluated. They do not diagnose, prevent, slow, or treat dementia or autism. Research on a structured, facilitated program cannot be transferred to these standalone games.")
                        Text("Choose activities around the person's interests, not a diagnosis. There is no prescribed daily dose and no need to complete a session.")
                            .foregroundStyle(.secondary)
                    }
                    SectionCard(title: "Playing together", systemImage: "person.2") {
                        Text("Ask whether the person wants to play. Offer a hint or demonstrate, without testing or correcting personal memories. Speaking, pointing, typing elsewhere, or staying quiet are all welcome.")
                        Text("Stop or change activities if they become tiring, frustrating, distressing, or overstimulating. Never insist on eye contact, speed, or a particular emotional response.")
                            .foregroundStyle(.secondary)
                    }
                    SectionCard(title: "Make it comfortable", systemImage: "accessibility") {
                        Text("Try fewer choices, visible hints, and one step at a time. Change text size in iPhone Settings → Accessibility → Display & Text Size. CareSphere Settings offers appearance, higher contrast, and reduced visual movement.")
                        Text("New games are silent, without timers or automatic advancement. Soundscapes play only on request. Game answers are not saved, shared, or turned into health scores.")
                            .foregroundStyle(.secondary)
                    }
                    Text("Research & guidance").font(.title2.weight(.bold)).accessibilityAddTraits(.isHeader)
                    ForEach(ActivityReference.all) { source in
                        SectionCard(title: source.title, systemImage: "book.closed") {
                            Text(source.summary).foregroundStyle(.secondary)
                            Link(destination: source.url) {
                                Label("Read source in browser", systemImage: "arrow.up.right.square")
                                    .frame(minHeight: 44, alignment: .leading)
                            }
                        }
                    }
                    Text("These sources concern different populations and interventions. Adult autism recommendations should not be generalized to children; clinical choices for a child require age-appropriate professional guidance.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                .carePagePadding()
            }
            .background(Color.ink)
            .navigationTitle("Research & safety")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
