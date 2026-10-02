import Foundation
import CryptoKit
import Security

/// Application-level authenticated encryption for the local care-data file.
/// The 256-bit AES key lives in Keychain; plaintext is never written to the
/// native care-store path.
enum SecureCareStorage {
    private static let fileMarker = Data("CareSphere-AES-256-GCM-v1\n".utf8)
    private static let account = "care-data-aes-256-gcm-v1"
    private static let service = "\(Bundle.main.bundleIdentifier ?? "org.caresphere.CareSphere").care-data-encryption"

    enum StorageError: Error {
        case keychain(OSStatus)
        case invalidKey
        case missingKey
        case malformedCiphertext
    }

    /// Returns nil when a key has not yet been created. In particular, callers
    /// loading existing ciphertext must not create a replacement key on failure.
    static func loadExistingKey() throws -> SymmetricKey? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw StorageError.keychain(status) }
        guard let data = result as? Data, data.count == 32 else { throw StorageError.invalidKey }
        return SymmetricKey(data: data)
    }

    /// Loads or creates a random, non-exported-by-CareSphere 256-bit key.
    static func loadOrCreateKey() throws -> SymmetricKey {
        if let key = try loadExistingKey() { return key }

        let key = SymmetricKey(size: .bits256)
        let data = key.withUnsafeBytes { Data($0) }
        var attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
        ]
        #if os(iOS)
        // The encryption key is available only while the iPhone is unlocked and
        // is not migrated to a different device through Keychain backup/restore.
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        #endif

        let status = SecItemAdd(attributes as CFDictionary, nil)
        if status == errSecDuplicateItem {
            if let concurrentKey = try loadExistingKey() { return concurrentKey }
        }
        guard status == errSecSuccess else { throw StorageError.keychain(status) }
        return key
    }

    static func seal(_ plaintext: Data, using key: SymmetricKey) throws -> Data {
        let box = try AES.GCM.seal(plaintext, using: key)
        guard let combined = box.combined else { throw StorageError.malformedCiphertext }
        var result = fileMarker
        result.append(combined)
        return result
    }

    static func open(_ ciphertext: Data, using key: SymmetricKey) throws -> Data {
        guard ciphertext.starts(with: fileMarker) else { throw StorageError.malformedCiphertext }
        let combined = Data(ciphertext.dropFirst(fileMarker.count))
        let box = try AES.GCM.SealedBox(combined: combined)
        return try AES.GCM.open(box, using: key)
    }

    static func deleteKey() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw StorageError.keychain(status)
        }
    }
}
