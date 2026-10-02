# Local data encryption and privacy boundaries

## Native iOS and macOS apps

- `CareStore` serializes local care data to JSON in memory, then writes only AES-256-GCM authenticated ciphertext to the private Application Support store using CryptoKit.
- A random 256-bit key is kept in Keychain. On iOS the key uses `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`; the encrypted file also uses Complete File Protection and is excluded from device backups. The key is not a Face ID/Touch ID key. On macOS the key is kept in the user's login Keychain and the ciphertext file is limited to owner access (`0600`).
- Existing plaintext `carestore.json` data is read only for migration. It is removed only after a new encrypted file has been successfully written. If decryption or migration fails, the old file is preserved and new writes are stopped or reported rather than replacing the data with defaults.
- The user-requested JSON export is intentionally readable so the user can inspect it and choose where to save it. Once exported, it is outside the app's storage protections and the UI warns the user to handle it carefully.
- Because the iOS key is device-only and the encrypted file is excluded from backup, CareSphere does not silently restore that private store to a different device. Users should keep their own secure backup/export if they need to move data; a secure import flow is a separate feature.

## Web app

- Browser data is encrypted with Web Crypto AES-256-GCM. A non-extractable `CryptoKey` is stored in this origin's IndexedDB; the authenticated ciphertext envelope is stored at the existing localStorage key for migration compatibility.
- Existing plaintext browser data is replaced only after encryption succeeds. If Web Crypto or IndexedDB is unavailable, or ciphertext cannot be authenticated, the app does not fall back to writing plaintext and does not overwrite the existing record. Settings reports that new changes are not being saved.
- This is encryption at rest for stored browser bytes, not an account password, device lock, end-to-end sync, or protection from XSS, malicious extensions, malware, or a person using the unlocked browser session. No CareSphere sync server is configured.
- Erasing data removes the browser record and attempts to remove the origin's encryption key; incomplete browser-storage failures are reported rather than described as successful. Exports remain plain JSON by explicit user choice.

## Release review

Before a public App Store release, complete Apple's export-compliance questionnaire for the actual CryptoKit usage and confirm the `ITSAppUsesNonExemptEncryption` declaration in both generated app plists. The current project value is not a substitute for that release-specific classification. Also review privacy disclosures and supported-platform behavior against the final build.

Apple references:

- CryptoKit AES: https://developer.apple.com/documentation/cryptokit/aes
- AES-GCM 256-bit AEAD: https://developer.apple.com/documentation/cryptokit/hpke/aead/aes_gcm_256
- Keychain accessibility when unlocked and device-only: https://developer.apple.com/documentation/security/ksecattraccessiblewhenunlockedthisdeviceonly
- `ITSAppUsesNonExemptEncryption`: https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption
