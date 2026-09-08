import SwiftUI

struct CareCircleView: View {
    @EnvironmentObject private var store: CareStore
    @State private var noteDraft = ""

    private let members: [(name: String, role: String, color: Color)] = [
        ("Sarah M.", "Daughter · primary caregiver", .emerald),
        ("Dr. Evelyn Vance", "Primary care physician", .blue),
        ("Elena R.", "Wellness coach · circle host", .purple),
        ("David K.", "Activity lead · trivia host", .orange),
    ]
    private let adherenceWeek: [Bool] = [true, true, true, false, true, true, true]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    sharedLog
                    insightsCard
                    adherenceCard
                    membersCard
                }
                .padding()
            }
            .background(Color.ink)
            .navigationTitle("Care Circle")
            .inlineTitle()
        }
    }

    private var sharedLog: some View {
        SectionCard(title: "Shared care log", systemImage: "square.and.pencil") {
            HStack(spacing: 10) {
                TextField("Share an update with the care circle…", text: $noteDraft)
                    .textFieldStyle(.roundedBorder)
                    .font(.footnote)
                Button {
                    store.addNote(author: "You (\(store.displayName))", body: noteDraft)
                    noteDraft = ""
                    celebrate()
                } label: {
                    Image(systemName: "paperplane.fill")
                        .padding(10)
                }
                .buttonStyle(.borderedProminent)
                .disabled(noteDraft.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            ForEach(store.notes) { note in
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(note.author).font(.caption.weight(.bold))
                        Spacer()
                        Text(note.createdAt, style: .date).font(.caption2).foregroundStyle(.tertiary)
                    }
                    Text(note.body).font(.footnote).foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }

    private var insightsCard: some View {
        SectionCard(title: "Care insights — this week", systemImage: "sparkles") {
            VStack(alignment: .leading, spacing: 8) {
                insightRow("Routine completion", value: "\(store.routinesDone)/\(store.routines.count)", note: "today — consistency is the goal")
                insightRow("Emotion-match wins", value: "\(store.emotionScore)", note: "recognition practice trending up")
                insightRow("Coffee circles this week", value: "3", note: "isolation risk down 18%")
                insightRow("Mood check-ins logged", value: "\(store.moods.count)", note: store.moodToday.map { "latest: feeling \(moodLabel($0.score).lowercased())" } ?? "no entry yet today")
            }
        }
    }

    private func insightRow(_ title: String, value: String, note: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text("• \(title):").font(.footnote).foregroundStyle(.secondary)
            Text(value).font(.footnote.weight(.heavy)).foregroundStyle(.primary)
            Text(note).font(.caption).foregroundStyle(.tertiary)
            Spacer()
        }
    }

    private var adherenceCard: some View {
        SectionCard(title: "Medication adherence", systemImage: "pills.fill") {
            HStack(spacing: 6) {
                ForEach(0..<7, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 6)
                        .fill(adherenceWeek[index] ? Color.emerald.opacity(0.85) : Color.cardInner)
                        .frame(height: 30)
                }
            }
            Text("Last 7 days — one missed evening dose triggered a family notification.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var membersCard: some View {
        SectionCard(title: "Care Circle members", systemImage: "person.2.fill") {
            VStack(spacing: 10) {
                ForEach(members, id: \.name) { member in
                    HStack(spacing: 12) {
                        Text(member.name.split(separator: " ").map { "\($0.first!)" }.joined())
                            .font(.caption.weight(.black))
                            .foregroundStyle(.white)
                            .frame(width: 34, height: 34)
                            .background(member.color.opacity(0.8), in: Circle())
                        VStack(alignment: .leading, spacing: 1) {
                            Text(member.name).font(.subheadline.weight(.bold))
                            Text(member.role).font(.caption2).foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                }
            }
        }
    }

    private func moodLabel(_ score: Int) -> String {
        ["Struggling", "Low", "Okay", "Good", "Great"][score - 1]
    }
}
