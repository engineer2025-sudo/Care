import Foundation
/// Portable QR metadata only: no records, passphrase or automatic connection.
public enum ConnectionSetup {
    public static func encode(address:String, code:String) throws -> String {
        _ = try LocalTransferWire.endpoint(address:address, code:code)
        guard address == address.trimmingCharacters(in:.whitespacesAndNewlines) else { throw LocalTransferWire.Failure.invalid }
        return "CARESPHERE-CONNECT-1|\(address)|\(code)"
    }
    public static func parse(_ value:String) throws -> (String,String) {
        guard value.utf8.count <= 100 else { throw LocalTransferWire.Failure.invalid }
        let fields=value.components(separatedBy:"|")
        guard fields.count == 3, fields[0] == "CARESPHERE-CONNECT-1",
              try encode(address:fields[1],code:fields[2]) == value else { throw LocalTransferWire.Failure.invalid }
        return (fields[1],fields[2])
    }
}
