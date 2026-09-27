import SwiftUI

struct CoffeeCirclesView: View {
    @EnvironmentObject private var store: CareStore
    @State private var activeCircle: CoffeeCircle?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    header
                    ForEach(coffeeCircles) { circle in
                        circleCard(circle)
                    }
                    openCircleButton
                    explanation
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Coffee Circles")
            .inlineTitle()
            .sheet(item: $activeCircle) { circle in
                ConferenceSheet(circle: circle, displayName: store.displayName)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Isolation prevention, one cup at a time")
                .font(.title3.weight(.heavy))
            Text("These buttons open real meet.jit.si rooms shared with the web app. They have no CareSphere host, schedule, attendance tracking, or moderation; anyone with a room link can join. Share only with people you trust. You'll appear as \(store.displayName).")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func circleCard(_ circle: CoffeeCircle) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(circle.emoji).font(.title)
                Spacer()
                HStack(spacing: 5) {
                    Image(systemName: "link")
                    Text(circle.schedule).font(.caption2.weight(.bold))
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 4)
                .background(Color.cardInner, in: Capsule())
                .foregroundStyle(.secondary)
            }
            Text(circle.title).font(.headline)
            Text("No CareSphere host, attendance tracking, or moderation. Anyone with this room link can join.")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(circle.room)
                .font(.caption2.monospaced())
                .foregroundStyle(.tertiary)
                .lineLimit(1)
                .truncationMode(.middle)
            HStack(spacing: 10) {
                Button {
                    activeCircle = circle
                } label: {
                    Label("Join in app", systemImage: "video.fill")
                        .font(.subheadline.weight(.black))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                }
                .buttonStyle(.borderedProminent)
                Link(destination: circle.url) {
                    Image(systemName: "safari")
                        .font(.subheadline.weight(.bold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
        .padding(16)
        .background(Color.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var openCircleButton: some View {
        Button {
            let suffix = String(UUID().uuidString.prefix(6))
            activeCircle = CoffeeCircle(
                id: 99, title: "CareSphere Open Circle", emoji: "🫶",
                schedule: "Ad-hoc room", room: "CareSphere-OpenCoffeeCircle-\(suffix)")
        } label: {
            Label("Launch an open circle", systemImage: "plus.circle.fill")
                .font(.subheadline.weight(.black))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
        }
        .buttonStyle(.bordered)
        .tint(.orange)
    }

    private var explanation: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("How the video works", systemImage: "lightbulb.fill")
                .font(.subheadline.weight(.bold))
            Text("Calls run on Jitsi Meet using encrypted WebRTC transport. CareSphere embeds the Jitsi SDK but does not host, schedule, or moderate rooms. Anyone with a room link may join, so verify participants before sharing private health details. Camera and microphone permission prompts appear only when you enable them.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
