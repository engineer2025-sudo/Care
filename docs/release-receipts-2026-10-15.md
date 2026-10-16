# Import receipts and Bare minimum mode — October 15, 2026

Versions: **Android 1.8.0 (10), iPhone 3.7.0 (16), web 1.5.0**. Source additions are undergoing matching-source CI validation; packaging requires successful CI on this exact source, not merely passing unit tests.

## Changes

- **Authenticated import receipts (all three platforms, interoperable).** After a CareSphere transfer is unlocked and selected records are actually imported, the receiving app can create a receipt: the transfer ID, the exact transferred file's SHA-256, the imported record IDs in transfer order, a UTC import time, and the source (file or nearby). The receipt is authenticated with an HMAC-SHA256 keyed from the transfer passphrase (PBKDF2-HMAC-SHA256, 310,000 iterations, 64-byte derivation — the receipt MAC key is the second 32 bytes, so the transfer's AES key is never reused).
- **What a receipt is — and is not.** A receipt is created only at real import time. A transfer acknowledgment, a preview, an HTTP response, or a saved file is never labeled a receipt. A verified receipt proves: "a party who knew this transfer's passphrase recorded importing exactly these records from exactly this file at this time." It is **not** identity verification (anyone with the passphrase can produce one), **not** a delivery guarantee, **not** non-repudiation, and **not** a medical record. The UI says this at the point of use.
- **Verification.** Anyone with the passphrase can verify a returned receipt. Optionally including the original transfer file adds a binding check: the file hash must match the receipt and every imported record ID must exist in that file. A tampered receipt, the wrong passphrase, reordered/added record IDs, or a changed timestamp/file hash fails verification.
- **Bare minimum mode (all three platforms).** A device-local display preference that hides explanatory, descriptive and how-to copy everywhere — the least information about how the app works, what things are, when to use them. Status messages, empty states, destructive-action warnings and emergency/safety lines stay visible. Toggle: web Settings and comfort tools; Android Settings · Appearance; iPhone Settings · Accessibility and Support tools · Comfort.
- **670 shared interface messages** (29 new) with English/Spanish/Simplified Chinese/Filipino/Vietnamese translations, cross-platform identical catalogs.

## Required automated evidence

- Shared cross-platform receipt test vector (fixed passphrase with decomposed Unicode, fixed salt/fields → fixed MAC `fd504b0878012a2a…`) asserted in web (node:test), Android (JVM) and iPhone (XCTest) suites — proving the three implementations produce byte-identical MACs.
- Per platform: receipt create/verify round trip; wrong passphrase and every tampered field rejected; file-hash/record-ID binding against a real sealed transfer; strict timestamp/ID/hash validation.
- Existing suites keep passing: iPhone 51 Swift tests + three build/launch paths; Android 48 JVM tests + lint/signature + full emulator smoke; web 45 unit tests + 31 browser tests + offline reopening.

## Still needs actual phones / owner action

Receipts were exercised in unit/instrumented tests, not between two physical phones. Physical iPhone↔Android↔iPhone receipt exchange, ShareLink/share-sheet behavior, and the Apple Intelligence hardware paths remain device checks. The download remains **debug-signed**; owner production signing and store procedures are outstanding. See the [complete checklist](feature-checklist.md), [sharing guide](device-sharing.md) and [Samsung guide](samsung-install.md).

Runs for this release are recorded after CI completes; exact APK and archive hashes are in `BUILD_VERIFICATION.json` inside the archives.
