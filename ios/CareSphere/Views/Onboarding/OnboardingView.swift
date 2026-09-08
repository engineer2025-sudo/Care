import SwiftUI
#if os(iOS)
import ContactsUI

/// Apple Contacts picker for importing the emergency contact (iOS only).
struct ContactPicker: UIViewControllerRepresentable {
    var onPick: (String, String) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> CNContactPickerViewController {
        let picker = CNContactPickerViewController()
        picker.delegate = context.coordinator
        picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
        return picker
    }

    func updateUIViewController(_ uiViewController: CNContactPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, CNContactPickerDelegate {
        let parent: ContactPicker
        init(_ parent: ContactPicker) { self.parent = parent }

        func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
            let name = [contact.givenName, contact.familyName].filter { !$0.isEmpty }.joined(separator: " ")
            let phone = contact.phoneNumbers.first?.value.stringValue ?? ""
            parent.onPick(name, phone)
            parent.dismiss()
        }

        func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
            parent.dismiss()
        }
    }
}
#endif

/// ─────────────────────────────────────────────────────────────────────────
/// CareSphere v2 Setup Wizard — a calm, Apple-style first-run experience:
/// welcome → profile (age) → care focus → medications → routines →
/// emergency contact → security (Touch ID) → permissions → done.
/// ─────────────────────────────────────────────────────────────────────────
struct OnboardingView: View {
    @EnvironmentObject private var store: CareStore
    @EnvironmentObject private var healthKit: HealthKitService
    @EnvironmentObject private var notifications: NotificationService

    @State private var step: Step = .welcome
    @State private var birthDate: Date = Calendar.current.date(byAdding: .year, value: -70, to: Date())!
    @State private var careMode: CareMode = .both
    @State private var meds: [Medication] = []
    @State private var routines: [Routine] = []
    @State private var emergencyName = ""
    @State private var emergencyPhone = ""
    @State private var wantsBiometrics = false
    @State private var contactPickerShown = false

    enum Step: Int, CaseIterable {
        case welcome, profile, focus, medications, routines, contact, security, permissions, done
    }

    private var progress: Double {
        Double(step.rawValue) / Double(Step.allCases.count - 1)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Progress
            VStack(spacing: 8) {
                HStack {
                    Text("CareSphere Setup")
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(Color.emerald)
                    Spacer()
                    Text("Step \(step.rawValue + 1) of \(Step.allCases.count)")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                ProgressView(value: progress)
                    .tint(.emerald)
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)

            Group {
                switch step {
                case .welcome: welcomePage
                case .profile: profilePage
                case .focus: focusPage
                case .medications: medicationsPage
                case .routines: routinesPage
                case .contact: contactPage
                case .security: securityPage
                case .permissions: permissionsPage
                case .done: donePage
                }
            }
            .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                    removal: .move(edge: .leading).combined(with: .opacity)))
            .id(step)
            .animation(.spring(response: 0.45, dampingFraction: 0.85), value: step)

            Spacer(minLength: 0)

            // Navigation
            HStack(spacing: 12) {
                if step != .welcome {
                    Button {
                        withAnimation { step = Step(rawValue: step.rawValue - 1) ?? .welcome }
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.subheadline.weight(.black))
                            .padding(14)
                            .background(Color.cardInner, in: Circle())
                    }
                    .buttonStyle(.plain)
                }
                Button {
                    advance()
                } label: {
                    Label(step == .welcome ? "Get started" : step == .done ? "Enter CareSphere" : "Continue",
                          systemImage: "chevron.right")
                        .labelStyle(.titleAndIcon)
                        .font(.subheadline.weight(.black))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(24)
        }
        .background(backgroundGradient.ignoresSafeArea())
        .preferredColorScheme(.dark)
        .onAppear {
            if meds.isEmpty { meds = store.medications }
            if routines.isEmpty { routines = store.routines }
        }
        #if os(iOS)
        .sheet(isPresented: $contactPickerShown) {
            ContactPicker { name, phone in
                emergencyName = name
                emergencyPhone = phone
            }
        }
        #endif
    }

    // MARK: Steps

    private var welcomePage: some View {
        VStack(spacing: 22) {
            Spacer()
            ZStack {
                Circle().fill(Color.emerald.opacity(0.14)).frame(width: 150, height: 150)
                Circle().fill(Color.emerald.opacity(0.12)).frame(width: 110, height: 110)
                Text("💚").font(.system(size: 62))
            }
            VStack(spacing: 10) {
                Text("Welcome to CareSphere")
                    .font(.largeTitle.weight(.heavy))
                    .multilineTextAlignment(.center)
                Text("A calm companion for independent living — wearable vitals, video coffee circles, medication rhythms and sensory therapy, all yours.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
            }
            HStack(spacing: 14) {
                featureBadge("waveform.path.ecg", "Live vitals")
                featureBadge("video.fill", "Video circles")
                featureBadge("pills.fill", "Reminders")
                featureBadge("gamecontroller.fill", "Therapy")
            }
            Spacer()
            Spacer()
        }
        .padding(28)
    }

    private var profilePage: some View {
        VStack(alignment: .leading, spacing: 22) {
            pageHeader("About you", "We use this to personalize care — nothing leaves your device.", systemImage: "person.crop.circle")
            VStack(alignment: .leading, spacing: 8) {
                Text("Your name").font(.caption.weight(.bold)).foregroundStyle(.secondary)
                TextField("e.g. Alex", text: $store.displayName)
                    .textFieldStyle(.roundedBorder)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Date of birth").font(.caption.weight(.bold)).foregroundStyle(.secondary)
                DatePicker("Date of birth", selection: $birthDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .labelsHidden()
                if let age = Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year {
                    Label("That makes you \(age) — CareSphere will adapt font sizes and pacing for you.", systemImage: "sparkles")
                        .font(.caption)
                        .foregroundStyle(Color.emerald)
                }
            }
        }
        .padding(28)
    }

    private var focusPage: some View {
        VStack(alignment: .leading, spacing: 22) {
            pageHeader("What brings you here?", "CareSphere adapts its pacing, games and reminders to your focus.", systemImage: "switch.2")
            VStack(spacing: 12) {
                ForEach(CareMode.allCases) { mode in
                    Button {
                        careMode = mode
                    } label: {
                        HStack(spacing: 14) {
                            Text(mode.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(mode.label).font(.headline).foregroundStyle(.primary)
                                Text(careModeBlurb(mode)).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: careMode == mode ? "checkmark.circle.fill" : "circle")
                                .font(.title3)
                                .foregroundStyle(careMode == mode ? Color.emerald : Color.secondary)
                        }
                        .padding(16)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(careMode == mode ? Color.emerald.opacity(0.6) : .clear, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(28)
    }

    private func careModeBlurb(_ mode: CareMode) -> String {
        switch mode {
        case .senior: return "Routines, medication rhythms, isolation prevention"
        case .autism: return "Sensory tools, predictability, emotion practice"
        case .both: return "The full CareSphere experience"
        }
    }

    private var medicationsPage: some View {
        VStack(alignment: .leading, spacing: 18) {
            pageHeader("Your medications", "We'll remind you at the right time with lock-screen actions — edit any time in Settings.", systemImage: "pills.fill")
            ScrollView {
                VStack(spacing: 10) {
                    ForEach($meds) { $med in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                TextField("Medication name", text: $med.name)
                                    .textFieldStyle(.roundedBorder)
                                DatePicker("", selection: timeBinding(med), displayedComponents: .hourAndMinute)
                                    .labelsHidden()
                                Button {
                                    meds.removeAll { $0.id == med.id }
                                } label: {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundStyle(.pink)
                                }
                                .buttonStyle(.plain)
                            }
                            TextField("Purpose (e.g. blood pressure)", text: $med.purpose)
                                .textFieldStyle(.roundedBorder)
                                .font(.caption)
                        }
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
            }
            Button {
                meds.append(Medication(name: "", purpose: "", hour: 9, minute: 0))
            } label: {
                Label("Add medication", systemImage: "plus.circle.fill")
                    .font(.subheadline.weight(.bold))
            }
            .buttonStyle(.bordered)
        }
        .padding(28)
    }

    private func timeBinding(_ med: Medication) -> Binding<Date> {
        Binding<Date>(
            get: { CareTime.date(hour: med.hour, minute: med.minute) },
            set: { newDate in
                if let idx = meds.firstIndex(where: { $0.id == med.id }) {
                    let comps = CareTime.hourMinute(from: newDate)
                    meds[idx].hour = comps.hour
                    meds[idx].minute = comps.minute
                }
            })
    }

    private var routinesPage: some View {
        VStack(alignment: .leading, spacing: 18) {
            pageHeader("Daily rhythm", "Predictable routines lower anxiety. Pick the anchors for each day.", systemImage: "calendar.badge.checkmark")
            ScrollView {
                VStack(spacing: 10) {
                    ForEach($routines) { $routine in
                        HStack {
                            Text(routine.emoji)
                            TextField("Routine", text: $routine.title)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                routines.removeAll { $0.id == routine.id }
                            } label: {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundStyle(.pink)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(12)
                        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                }
            }
            Button {
                routines.append(Routine(emoji: "⭐️", title: "New routine"))
            } label: {
                Label("Add routine", systemImage: "plus.circle.fill")
                    .font(.subheadline.weight(.bold))
            }
            .buttonStyle(.bordered)
        }
        .padding(28)
    }

    private var contactPage: some View {
        VStack(alignment: .leading, spacing: 22) {
            pageHeader("Emergency contact", "One tap in SOS calls or texts this person — choose someone close by.", systemImage: "sos.circle")
            VStack(alignment: .leading, spacing: 8) {
                Text("Name").font(.caption.weight(.bold)).foregroundStyle(.secondary)
                TextField("e.g. Sarah M.", text: $emergencyName)
                    .textFieldStyle(.roundedBorder)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Phone").font(.caption.weight(.bold)).foregroundStyle(.secondary)
                TextField("+1 555 010 2030", text: $emergencyPhone)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.phonePad)
            }
            #if os(iOS)
            Button {
                contactPickerShown = true
            } label: {
                Label("Import from Contacts", systemImage: "person.crop.rectangle.stack")
                    .font(.subheadline.weight(.bold))
            }
            .buttonStyle(.bordered)
            #endif
        }
        .padding(28)
    }

    private var securityPage: some View {
        VStack(alignment: .leading, spacing: 22) {
            pageHeader("Lock it down", "Use \(BiometricService.biometryName) to guard health data, medications and notes.", systemImage: "lock.shield")
            Button {
                wantsBiometrics.toggle()
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: wantsBiometrics ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(wantsBiometrics ? Color.emerald : Color.secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Lock with \(BiometricService.biometryName)").font(.headline).foregroundStyle(.primary)
                        Text("App locks whenever it leaves the foreground").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(16)
                .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(wantsBiometrics ? Color.emerald.opacity(0.6) : .clear, lineWidth: 2))
            }
            .buttonStyle(.plain)
            Text("If biometrics ever fail, your device passcode always works — you can never be locked out.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(28)
    }

    private var permissionsPage: some View {
        VStack(alignment: .leading, spacing: 18) {
            pageHeader("Enable superpowers", "Each one is optional and asked by iOS itself — change any time in Settings.", systemImage: "powersleep")
            permissionRow(
                icon: "bell.badge.fill", title: "Medication reminders",
                status: notifications.authorizationStatus == .authorized ? "Enabled ✓" : "Tap Continue to allow",
                action: { notifications.requestAuthorization() })
            #if os(iOS)
            permissionRow(
                icon: "heart.text.square.fill", title: "Apple Health vitals",
                status: healthKit.isAuthorized ? "Enabled ✓" : "Tap Continue to allow",
                action: { healthKit.requestAuthorization() })
            #endif
            Text("CareSphere reads heart rate, blood oxygen and blood pressure only — and never writes anything without asking.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(28)
    }

    private func permissionRow(icon: String, title: String, status: String, action: @escaping () -> Void) -> some View {
        Button {
            action()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(Color.emerald)
                    .frame(width: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline).foregroundStyle(.primary)
                    Text(status).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.tertiary)
            }
            .padding(16)
            .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var donePage: some View {
        VStack(spacing: 22) {
            Spacer()
            ZStack {
                Circle().fill(Color.emerald.opacity(0.15)).frame(width: 140, height: 140)
                Image(systemName: "checkmark.circle")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.emerald)
            }
            VStack(spacing: 8) {
                Text("You're all set, \(store.displayName) 💚")
                    .font(.title.weight(.heavy))
                    .multilineTextAlignment(.center)
                Text(summaryLine)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            Spacer()
            Spacer()
        }
        .padding(28)
    }

    private var summaryLine: String {
        var parts: [String] = []
        if let age = store.profile.age { parts.append("age \(age)") }
        parts.append("\(meds.count) medications")
        parts.append("\(routines.count) routines")
        if !EmergencyContact(name: emergencyName, phone: emergencyPhone).isEmpty {
            parts.append("SOS → \(emergencyName)")
        }
        if wantsBiometrics { parts.append(BiometricService.biometryName) }
        return parts.joined(separator: " · ")
    }

    // MARK: Navigation & commit

    private func advance() {
        commitCurrentStep()
        withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) {
            if step == .done {
                store.hasCompletedOnboarding = true
                HapticsService.success()
            } else {
                step = Step(rawValue: step.rawValue + 1) ?? .done
            }
        }
    }

    private func commitCurrentStep() {
        switch step {
        case .profile:
            store.profile.birthDate = birthDate
            if let age = store.profile.age, age >= 65 { store.voiceReminders = true }
        case .focus:
            store.profile.careMode = careMode
        case .medications:
            store.medications = meds.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
        case .routines:
            store.routines = routines.filter { !$0.title.trimmingCharacters(in: .whitespaces).isEmpty }
        case .contact:
            store.profile.emergencyContact = EmergencyContact(name: emergencyName, phone: emergencyPhone)
        case .security:
            store.biometricEnabled = wantsBiometrics
        default:
            break
        }
    }

    // MARK: Shared pieces

    private func pageHeader(_ title: String, _ subtitle: String, systemImage: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: systemImage)
                .font(.title2.weight(.heavy))
            Text(subtitle)
                .font(.callout)
                .foregroundStyle(.secondary)
        }
    }

    private func featureBadge(_ icon: String, _ label: String) -> some View {
        VStack(spacing: 5) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Color.emerald)
            Text(label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.cardInner, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [Color(red: 0.01, green: 0.09, blue: 0.08),
                     Color(red: 0.02, green: 0.03, blue: 0.08),
                     Color(red: 0.03, green: 0.02, blue: 0.09)],
            startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}
