import SwiftUI

/// Opaque, full-window biometric gate. CareSphereApp switches its root view to
/// this view while locked, so protected content is removed rather than rendered
/// underneath a translucent sheet or full-screen cover.
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
                Spacer(minLength: 24)
                ZStack {
                    Circle()
                        .fill(Color.emerald.opacity(0.15))
                        .frame(width: 120, height: 120)
                    Image(systemName: biometryName == "Face ID" ? "faceid" : biometryName == "Touch ID" ? "touchid" : "lock.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.emeraldText)
                }
                VStack(spacing: 8) {
                    Text("CareSphere is locked")
                        .font(.title2.weight(.heavy))
                    Text("Your private care information is hidden until you unlock.")
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
                Spacer(minLength: 24)
                Text("Your care data stays on this device.")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .padding(30)
            .frame(maxWidth: 560)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.ink.ignoresSafeArea())
        .contentShape(Rectangle())
        .onAppear { authenticate() }
    }

    private func authenticate() {
        guard !isAuthenticating else { return }
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
