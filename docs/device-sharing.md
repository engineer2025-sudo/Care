# Device-to-device sharing — no backend

CareSphere transfers **selected notes and routines as encrypted snapshots**. No account, hosted backend, subscription, internet connection or third-party relay is needed for native local transfer. One phone temporarily serves one encrypted copy directly to the other phone. There is no automatic synchronization or proprietary Bluetooth pairing.

## Direct connection inside the native apps — all three phone combinations

Available in iPhone **3.3.0 (10)** and Android **1.3.0 (4)**, for iPhone ↔ iPhone, Android ↔ Android and iPhone ↔ Android. Both phones need the current native app. The browser keeps the file workflow below because browsers cannot use this native socket listener.

1. Connect both phones to the **same private Wi-Fi**, or enable a phone's personal hotspot and join it from the other phone. Configure Wi-Fi/hotspot in system Settings; CareSphere does not turn it on or pair radios automatically. Internet service is not required by this transfer protocol; hotspot availability still depends on the phone/OS/carrier.
2. On the sender, open **My support tools → Device sharing**, select notes/routines, enter a unique encryption passphrase and prepare the encrypted copy.
3. Choose **Offer to a nearby device**. If multiple network interfaces are listed, choose the address on the receiving phone's network. Allow iPhone **Local Network** permission when asked.
4. The sender displays a **device address** (private IPv4 and port) and **eight-digit connection code**. Keep this screen open. The receiver enters those details in **Connect to a nearby device** (iPhone: **Connect and receive encrypted copy**) and supplies the encryption passphrase. The code and passphrase are different. Tell them privately; neither is an identity certificate.
5. The recipient reviews the unlocked notes/routines and selects **Import selected copies**. Receiving bytes alone does not save care records. Existing data is not replaced, and previously received records remain marked as imported.
6. Choose **Stop nearby connection** when finished. The offer also stops after five minutes, after the request limit, or when you leave/background the sharing screen. Restarting generates a new connection code. No connection is remembered between launches.

This is a **manual address-and-code connection**, not automatic device discovery. No router configuration, port forwarding, external website or separate transfer app is required. Guest/public Wi-Fi may isolate devices; VPNs or hotspot restrictions can also block them. Try a private hotspot or the encrypted-file fallback. IPv6-only networks are not supported by this first direct-connection version.

### Transport privacy and limits

- Only the deliberately prepared encrypted `.caretransfer` bytes are served; no arbitrary files, care database, passphrase, photos or local encryption key are exposed.
- The listener binds one selected private IPv4 interface on a random high port. The receiver only accepts canonical RFC1918 IPv4 literals and explicit high ports—no public IPs, hostnames, redirects, user-info or arbitrary paths.
- HTTP framing is unencrypted on the local link; **care contents are separately end-to-end passphrase-encrypted using the format below**. A network observer can see addresses, the connection code, transfer size and encrypted bytes. Use a unique, strong passphrase and a trusted private network. The connection code is an extra access gate, not encryption or proof of identity.
- At most 16 accepted connections per offer, bounded headers (4 KiB), a 1 MB envelope limit, connection timeouts and a five-minute offer lifetime. No background service or multicast scan runs. Stopping cannot recall bytes already received.
- Android now declares `INTERNET` because Android requires it for local sockets too. This feature does not contact an internet backend. iPhone requests Local Network access only when networking is used. Other optional features, such as external video handoffs, retain their own internet requirements.

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

## Verification and remaining device checks

A public synthetic test fixture generated by Web Crypto is decrypted by Swift/CryptoKit and Kotlin/JCE tests, including a decomposed-Unicode passphrase. Tests cover tampering, incorrect passphrases, bounds and duplicate receipts. The browser interaction test receives and imports while offline. The Android emulator test opens an actual browser-produced file through the system document picker, selects a note, imports it and checks it in Care.

Native tests cover the shared HTTP framing, public/ambiguous address rejection, payload/header bounds, live private-network socket exchanges and explicit stop. The Android emulator additionally fetches a browser-produced encrypted fixture over its private LAN interface, unlocks it and selectively imports a routine. These automated results are recorded by successful release CI, not a claim of testing physical phones.

Actual phone-to-phone transfers in **both directions for each of the three pairings**, Wi-Fi/hotspot discovery and routing, Local Network denial/recovery, screen locking, five-minute expiry, router isolation, AirDrop and Quick Share still need physical-device acceptance testing. There is no fake “paired” or “delivered” status. The native iOS build and Simulator launch do not prove physical sharing or Apple Intelligence model availability.


### Release CI references

- iPhone native builds, package suite and Simulator launch: https://github.com/engineer2025-sudo/Care/actions/runs/38650593353
- Android native suite, lint, signing and required emulator file/LAN receive-import flow: https://github.com/engineer2025-sudo/Care/actions/runs/38650593358
- Unchanged web application checks: https://github.com/engineer2025-sudo/Care/actions/runs/38632018619

The package contains 35 Swift and 24 JVM test cases. Native host-machine live-socket cases explicitly skip if the runner has no private IPv4 interface; the Android emulator LAN import is a required, non-optional smoke step. Passing CI does not replace the physical pairing matrix above.
