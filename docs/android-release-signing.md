# Owner-controlled Android release signing

The supplied APK is still a **debuggable development build**. This repository now supports owner-controlled release signing; that is configuration, not a claim that an owner-signed APK has been issued.

The owner must create/manage a private Android keystore using Android Studio's **Generate Signed Bundle / APK** flow or their own approved key-management process. Keep a secure backup and the same signing identity for future updates. Do not put passwords or private keys in chat, Git, source ZIPs or shared build logs.

`android/app/build.gradle.kts` reads four environment variables, supplied securely in the owner's build environment:

- `CARE_KEYSTORE`: absolute path to the owner's keystore.
- `CARE_STORE_PASSWORD`: keystore password.
- `CARE_KEY_ALIAS`: the intended signing alias.
- `CARE_KEY_PASSWORD`: private-key password.

Supplying only some of these variables fails configuration. With none, the release variant is unsigned rather than silently signed with a test key. With all four, `./gradlew testDebugUnitTest lintDebug assembleRelease` builds a non-debuggable release APK using that identity. No secrets are printed by the configuration. Review build-machine and CI secret-handling policy separately.

Before distributing: verify with Android SDK `apksigner verify --verbose --print-certs`, check package/version/debuggable flags, test clean install and an update **without data loss** from the prior owner-signed release, and perform the real-device checklist. A release cannot update an unrelated debug certificate. Do not tell users to uninstall until they have a verified backup.

Keep Google Play/Health Connect permission declarations, a public privacy policy/support contact, consent flows and store reviews aligned with the app's actual behavior. Publishing to Play or TestFlight requires owner accounts and approval; no credentials or signing material are included here.
