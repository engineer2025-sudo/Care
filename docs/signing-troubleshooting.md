# Xcode signing, keychain prompts, and retrieval errors

## First isolate the problem

Cancel repeated password prompts. Open the **new 3.0 folder**, not the old project from Recent Projects. Select **CareSphere → iPhone Simulator** and Run. Simulator builds do not use an Apple Development private key. If this works, a phone signing error is separate from application compilation.

This release has **zero remote Swift packages**. The local `ActivityKit` folder must be next to `CareSphere.xcodeproj`. Errors mentioning Jitsi, Giphy, llama, Sherpa, or ZIPFoundation indicate the old project or old workspace is still open. Close it and open the newly unzipped project. Do not copy just the `.xcodeproj` out of its folder.

If errors remain, open **Issue navigator (⌘5)** and inspect the **first red error** and its expanded details. Later errors may be cascades. Record Xcode version, macOS version, selected scheme and destination. Share those and the error text, with names/team IDs redacted if preferred. Never share passwords or private keys.

## “codesign wants to access key Apple Development … in your keychain”

This is macOS protecting the certificate's private key. It is not asking for an app password, and is not the iPhone app's encrypted-data key.

1. Quit Xcode and open **Keychain Access** on the Mac.
2. Select the **login** keychain. If locked, unlock it there first. It normally uses the Mac login password, but a password reset may have left it using the *previous* login-keychain password. The Apple ID password is not interchangeable with this password.
3. In **My Certificates**, expand the relevant **Apple Development** certificate. It needs its associated private key, not just a certificate copied from another machine. Check for expiration and confirm it belongs to the team you selected.
4. Reopen Xcode → **Settings → Accounts**. Select your Apple account and team → **Manage Certificates**. If no valid development identity/private key is available, use **+ → Apple Development** to let Xcode create one on this Mac. If you hit Apple's certificate limit, coordinate with your team; do not revoke other people's certificates.
5. In the app target select **Automatically manage signing**, your team, and a unique bundle identifier. Start with the standard **CareSphere** scheme; it has no HealthKit entitlement requirement.
6. Run on the phone again. Approve only a prompt you expect from Xcode/codesign for that certificate. “Always Allow” is appropriate only if you trust that specific request and the correct keychain password is accepted; do not set “Allow all applications to access this item.”

If Keychain Access itself will not accept the password, application source changes cannot repair that credential. Use Apple's keychain recovery guidance or your Mac administrator. **Do not reset/delete the login keychain, delete all certificates, disable security, or put passwords in Terminal commands as a blanket fix.** A reset can make stored credentials inaccessible.

Read-only local diagnostic (do not send its full output unnecessarily):

```bash
security find-identity -v -p codesigning
```

“0 valid identities” indicates there is no currently valid signing identity visible, not a Swift compiler error. Do not add passwords to this command.

## Other installation errors

| Error | Action |
|---|---|
| Development team required | Choose your own team in Signing & Capabilities. |
| HealthKit entitlement/profile mismatch | Use **CareSphere** for the standard app, or **CareSphere-HealthKit** with an eligible profile. Do not expect Apple Health in the standard build. |
| Developer Mode / untrusted computer | Unlock the phone, trust the Mac, and follow iOS Developer Mode instructions. |
| Device OS unsupported | Install a compatible Xcode and its iOS platform components. |
| Bundle ID unavailable | Change the app target's bundle ID to a unique value. |
| Apple Intelligence unavailable | Requires Xcode 26 build, iOS 26+, compatible hardware, enabled Apple Intelligence and ready model; it is optional. |

We cannot guarantee your Mac's signing setup from an unsigned CI build. No signed IPA or TestFlight release is included.
