# Device-to-device sharing — no backend

CareSphere transfers **selected notes and routines as encrypted snapshots**. No account, hosted backend, subscription, internet connection or third-party relay is needed for native local transfer. One phone temporarily serves one encrypted copy directly to the other phone. There is no automatic synchronization or proprietary Bluetooth pairing.

## Direct connection inside the native apps — all three phone combinations

Available in iPhone **3.4.0 (11)** and Android **1.4.0 (5)**, for iPhone ↔ iPhone, Android ↔ Android and iPhone ↔ Android. Both phones need the current native app. The browser keeps the file workflow below because browsers cannot use this native socket listener.

1. Connect both phones to the **same private Wi-Fi**, or enable a phone's personal hotspot and join it from the other phone. Configure Wi-Fi/hotspot in system Settings; CareSphere does not turn it on or pair radios automatically. Internet service is not required by this transfer protocol; hotspot availability still depends on the phone/OS/carrier.
2. On the sender, open **My support tools → Device sharing**, select notes/routines, enter a unique encryption passphrase and prepare the encrypted copy.
3. Choose **Offer to a nearby device**. If multiple network interfaces are listed, choose the address on the receiving phone's network. Allow iPhone **Local Network** permission when asked.
4. The sender displays a generic **CareSphere offer label**, a **device address** (private IPv4 and port) and **eight-digit connection code**. Keep this screen open. On the receiver, tap **Find nearby devices** and select the label shown on the sender. This fills the address but does not connect, unlock or import. Enter the sender’s connection code and the separately agreed encryption passphrase, then continue. If the offer does not appear, enter its address/code in **Connect to a nearby device** (iPhone: **Connect and receive encrypted copy**). The code and passphrase are different. Tell them privately; neither is an identity certificate.
5. The recipient reviews the unlocked notes/routines and selects **Import selected copies**. Receiving bytes alone does not save care records. Existing data is not replaced, and previously received records remain marked as imported.
6. Choose **Stop nearby connection** when finished. The offer also stops after five minutes, after the request limit, or when you leave/background the sharing screen. Restarting generates a new connection code. No connection is remembered between launches.

Discovery is a foreground **Find nearby devices** action, not continuous scanning or automatic pairing. It stops after one minute, on **Stop searching**, or when you leave/background the tool. The sender advertises only while offering. A list entry is not proof of the sender’s identity or successful delivery. Manual address-and-code connection remains available. No router configuration, port forwarding, external website or separate transfer app is required. Guest/public Wi-Fi may isolate devices; VPNs or hotspot restrictions can also block them. Try a private hotspot or the encrypted-file fallback. IPv6-only networks are not supported by this first direct-connection version.

### Connection QR setup (iPhone 3.6 / Android 1.6)

The sender displays a QR while offering. Receiver chooses **Read connection QR from a photo** to load its address/code, then separately enters the encryption passphrase and deliberately connects. This is **photo decoding**, not an in-app live camera scanner. Keep the sender foregrounded while the receiving phone takes/selects a photo. If the sender leaves to export a screenshot, its offer stops; start a fresh offer and use the new details.

The QR encodes exactly `CARESPHERE-CONNECT-1|<privateIPv4>:<port>|<8-digit-code>`. It contains no records or passphrase. Both apps validate the existing strict private endpoint rules and reject extra fields, public IPs, DNS names and arbitrary paths. It is not a trusted identity. Reading a QR does not connect or import automatically.

**Stages are not receipts:** prepared → offered → received/unlocked → selected/imported are local UI states. The sender does not receive authenticated confirmation of a saved import. Receipts and richer full-fidelity record types remain unimplemented; do not confuse these with duplicate-prevention markers stored only on the recipient.

### Transport privacy and limits

- Only the deliberately prepared encrypted `.caretransfer` bytes are served; no arbitrary files, care database, passphrase, photos or local encryption key are exposed.
- The listener binds one selected private IPv4 interface on a random high port. The receiver only accepts canonical RFC1918 IPv4 literals and explicit high ports—no public IPs, hostnames, redirects, user-info or arbitrary paths.
- HTTP framing is unencrypted on the local link; **care contents are separately end-to-end passphrase-encrypted using the format below**. A network observer can see addresses, the connection code, transfer size and encrypted bytes. Use a unique, strong passphrase and a trusted private network. The connection code is an extra access gate, not encryption or proof of identity.
- At most 16 accepted connections per offer, bounded headers (4 KiB), a 1 MB envelope limit, connection timeouts and a five-minute offer lifetime. No background sharing service runs. Multicast discovery runs only during an explicitly started search or active offer. Stopping cannot recall bytes already received.
- Android now declares `INTERNET` because Android requires it for local sockets too. This feature does not contact an internet backend. iPhone requests Local Network access only when networking is used. Other optional features, such as external video handoffs, retain their own internet requirements.

### Nearby discovery protocol and privacy

Native apps use the standard DNS-SD/Bonjour service **`_care-xfer._tcp.`** on the local network. The sender advertises a random generic `CareSphere-…` instance name, its listening port, and TXT fields `v=1` and `ipv4=<bound private IPv4>`. No care text, profile name, connection code or encryption passphrase is placed in those fields. The operating system may also expose its usual local hostname/network metadata; prefer trusted private Wi-Fi rather than a public network.

The recipient accepts at most 32 service candidates per search. It accepts a result only if the version is supported, the advertised private IPv4 also occurs in the service’s resolved addresses, and the port is a valid high port. Display labels are bounded and control/bidirectional characters are removed. TXT results are never treated as trusted identity or permission to connect. Lost services are removed; all results are cleared when search stops. Routers/hotspots that block multicast can prevent discovery even when manually addressed transfer works. IPv6-only results are excluded; use a supported private IPv4 network or file sharing.

No multicast support library or third-party discovery SDK is included. iPhone uses Foundation Bonjour with a declared Local Network purpose/service type; Android uses the platform NsdManager. Legacy Android may let an OS-owned name-resolution request finish after Stop; its late result is discarded and cannot reconnect or import.

## Encrypted-file fallback — native apps and web

### Send a file

1. Open **My support tools → Device sharing** (web: **Device-to-device sharing**).
2. Select only the notes/routines you want the other person to receive.
3. Enter a long, unique passphrase—preferably four or more unrelated words, at least 12 characters. Keep it separate from the file. CareSphere cannot recover it.
4. Review the selection and prepare the encrypted `.caretransfer` file.
5. Use **AirDrop / the iPhone share sheet**, **Quick Share / the Android share sheet**, or a browser's file-sharing option. If browser file sharing is unavailable, save the file and send it from Files. The app does not send it automatically.

Nearby options depend on the OS, installed apps and browser. AirDrop is not a universal iPhone-to-Android transport. For cross-platform delivery, use a compatible local file-transfer app, removable storage/cable, or another file-sharing app you choose. Those apps may use their own internet/cloud services. CareSphere does not create a backend or relay your file.

### Receive a file

1. Save the received file on the receiving device.
2. Open CareSphere → **My support tools → Device sharing**.
3. Enter the passphrase provided separately and choose **Receive: choose a transfer file**.
4. Review the unlocked text. Nothing is imported automatically. These are someone's shared records, not verified clinical information or proof of their identity.
5. Check the records to keep and choose **Import selected copies**.

Imports create new notes/routines; existing records are never overwritten. Routine completion is reset. Note timestamps describe the newly imported copy, not an original clinical observation. Reopening the same file marks previously received records as already imported (the app retains up to 2,000 receipt markers). Independently exported snapshots have new transfer IDs and may contain the same text; review them before importing.

**You cannot remotely revoke or erase a received copy.** Expiring/revocable cloud links were deliberately removed when the requirement changed to no backend. Ask recipients not to forward files. Retain only the copies you need; delete the encrypted file from Downloads/Files separately if desired. Removing it inside CareSphere cannot erase an OS-level received/shared copy.

Photos, medication schedules, measurements, contacts and local encryption keys are excluded from these transfers. Do not paste secrets into notes just to transmit them. Full encrypted backups are separate, platform-specific recovery files; they are not interchangeable with `.caretransfer` files.

## Technical format, version 1

UTF-8 JSON outer envelope:

- `format`: `CareSphere Transfer`
- `version`: `1`
- `iterations`: `310000` (fixed; unrecognized settings rejected)
- `salt`: standard base64, 16 random bytes
- `iv`: standard base64, 12 random bytes
- `ciphertext`: standard base64, AES-GCM ciphertext followed by a 16-byte authentication tag

Key derivation: NFC-normalized passphrase, UTF-8, PBKDF2-HMAC-SHA256, 310,000 iterations, 256-bit output. Authenticated additional data: the exact UTF-8 bytes `CareSphere transfer v1`. Salt and nonce are regenerated for each export. Passphrase UTF-8 length must be 12–1,024 bytes; the UIs additionally request at least 12 characters.

Decrypted JSON is `{version: 1, id: UUID-string, records: [{id, type, text}]}`. Only `note` and `routine` types are accepted, with no duplicate IDs. Maximums: 100 records, 4,000 UTF-16 code units per note, 240 per routine, 699,984 plaintext UTF-8 bytes, 700,000 ciphertext/tag bytes and a 1,000,000-byte input envelope. Android local limits are 100 notes/24 routines; iOS/web import limits are 500/200. An import exceeding local capacity is rejected, not truncated.

The key/passphrase is not included in the file. Authentication detects corruption or a wrong passphrase; it does not establish who sent a file or prevent a recipient from keeping it. A weak passphrase can still be guessed offline. No protocol security certification is claimed.

## Import receipts, version 1 — passphrase-authenticated

After a transfer is unlocked and selected records are **actually imported**, the receiving app can create a receipt (JSON, interoperable across iPhone/Android/web):

- `format`: `CareSphere Import Receipt`
- `version`: `1`
- `transfer`: the transfer payload's UUID
- `file_sha256`: SHA-256 (lowercase hex) of the exact transferred envelope bytes
- `imported`: imported record IDs in transfer order, unique, 1–100, each matching `[A-Za-z0-9:._-]{1,120}`
- `imported_at`: UTC `yyyy-MM-ddTHH:mm:ssZ`
- `source`: `file` or `nearby`
- `mac_salt`: standard base64 of the transfer envelope's 16-byte salt
- `mac`: lowercase hex HMAC-SHA256

The MAC key is PBKDF2-HMAC-SHA256(NFC passphrase, `mac_salt`, 310,000 iterations, 64 bytes) **bytes 32–63** — an independent key, so the transfer's AES key is never reused. The MAC input is the exact UTF-8 string:

`CareSphere Import Receipt v1|<transfer>|<file_sha256>|<imported joined by ,>|<imported_at>|<source>`

**What verification proves:** a party who knew this transfer's passphrase recorded importing exactly these records from exactly this file at this time. With the original transfer file included, the check also confirms the file hash and that every imported record ID exists in that file.

**What it does not prove:** not identity (anyone with the passphrase can produce a receipt), not delivery (a receipt may never arrive), not non-repudiation, not a medical record. A transfer acknowledgment or preview is never labeled a receipt; receipts are created only after import. A tampered receipt, wrong passphrase, reordered or added IDs, changed time/source/hash, or a different file all fail verification. All three implementations are pinned by one shared cross-platform MAC test vector.

## Verification and remaining device checks

A public synthetic test fixture generated by Web Crypto is decrypted by Swift/CryptoKit and Kotlin/JCE tests, including a decomposed-Unicode passphrase. Tests cover tampering, incorrect passphrases, bounds and duplicate receipts. The browser interaction test receives and imports while offline. The Android emulator test opens an actual browser-produced file through the system document picker, selects a note, imports it and checks it in Care.

Native tests cover the shared HTTP framing, public/ambiguous address rejection, payload/header bounds, live private-network socket exchanges and explicit stop. The Android emulator additionally fetches a browser-produced encrypted fixture over its private LAN interface, unlocks it and selectively imports a routine. These automated results are recorded by successful release CI, not a claim of testing physical phones.

Actual phone-to-phone transfers in **both directions for each of the three pairings**, Wi-Fi/hotspot discovery and routing, Local Network denial/recovery, screen locking, five-minute expiry, router isolation, AirDrop and Quick Share still need physical-device acceptance testing. There is no fake “paired” or “delivered” status. The native iOS build and Simulator launch do not prove physical sharing or Apple Intelligence model availability.


### Previous direct-transfer baseline CI references

- iPhone native builds, package suite and Simulator launch: https://github.com/engineer2025-sudo/Care/actions/runs/38650593353
- Android native suite, lint, signing and required emulator file/LAN receive-import flow: https://github.com/engineer2025-sudo/Care/actions/runs/38650593358
- Unchanged web application checks: https://github.com/engineer2025-sudo/Care/actions/runs/38632018619

The package contains 38 Swift and 27 JVM test cases. Native host-machine live-socket cases explicitly skip if the runner has no private IPv4 interface; the Android emulator LAN import is a required, non-optional smoke step. Passing CI does not replace the physical pairing matrix above.


### Discovery validation

Three extra pure validation tests on each native platform cover compatible advertised/resolved address matching, public/ambiguous/unsupported endpoint rejection and safe bounded labels. The Android CI also builds a separate **test APK**, which creates independent real platform publisher/browser instances, resolves a real DNS-SD result, transfers and decrypts an encrypted test snapshot over the resulting address, and verifies Stop. It does not inject a fake peer into the app’s device list. The test APK and its synthetic records are not part of the installable app APK.

Final build/run references are in each download’s `BUILD_VERIFICATION.json`. Emulator publication/discovery on one virtual device is not proof of discovery between physical phones. Repeat all three physical phone pairings, in both directions, on a private router and hotspot before relying on this feature.

### Current discovery release CI

- iPhone 3.4 (11), including the final focus/lifecycle changes: https://github.com/engineer2025-sudo/Care/actions/runs/38654306971
- Android 1.4 (5), including raw instrumentation-result verification and emulator-only safety guard: https://github.com/engineer2025-sudo/Care/actions/runs/38655163288

Both runs completed successfully. The earlier Android run exposed a test-wrapper output-format issue after a successful native discovery test; a subsequent emulator lost its ADB connection before the new checks. Neither failed run is used for the downloadable APK. The final run passed the full required flow without skipping the discovery test.
