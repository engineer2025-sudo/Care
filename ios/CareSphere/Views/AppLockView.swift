import SwiftUI

/// Full-screen biometric gate. Shown whenever the app becomes active while
/// biometric lock is enabled — Touch ID on Macs with a Touch Bar sensor,
/// Face ID / Touch ID on iPhone, passcode fallback everywhere.
struct AppLockView: View {
    let onUnlock: () -> Void
    @State private var isAuthenticating = false
    @State private var failureText: String?

    private var biometryName: String { BiometricService.biometryName }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.01, green: 0.10, blue: 0.09),
                         Color(red: 0.02, green: 0.02, blue: 0.09)],
                startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            VStack(spacing: 26) {
                Spacer()
                ZStack {
                    Circle()
                        .fill(Color.emerald.opacity(0.15))
                        .frame(width: 120, height: 120)
                    Image(systemName: biometryName == "Face ID" ? "faceid" : biometryName == "Touch ID" ? "touchid" : "lock.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.emerald)
                }
                VStack(spacing: 6) {
                    Text("CareSphere is locked")
                        .font(.title2.weight(.heavy))
                    Text("Protecting health data, medications and care notes.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                if let failureText {
                    Text(failureText)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)
                        .multilineTextAlignment(.center)
                }
                Button {
                    authenticate()
                } label: {
                    Label("Unlock with \(biometryName)", systemImage: biometryName == "Face ID" ? "faceid" : biometryName == "Touch ID" ? "touchid" : "lock.open")
                        .font(.subheadline.weight(.black))
                        .frame(maxWidth: 280)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isAuthenticating)
                Spacer()
                Text("Your data never leaves this device.")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .padding(30)
        }
        .onAppear { authenticate() }
    }

    private func authenticate() {
        isAuthenticating = true
        failureText = nil
        BiometricService.authenticate(reason: "Unlock CareSphere to view health data") { success, error in
            isAuthenticating = false
            if success {
                onUnlock()
            } else {
                failureText = error ?? "Authentication failed — try again."
            }
        }
    }
}
