import Foundation
import CoreBluetooth

/// Streams live heart rate from real BLE monitors (Polar, Wahoo, most chest
/// straps and watch pods) using the standard Bluetooth SIG Heart Rate profile
/// — service 0x180D, characteristic 0x2A37 — via CoreBluetooth, the official
/// iOS Bluetooth stack. Parsing follows the GATT Heart Rate Measurement spec
/// (flags bit 0 selects 8- vs 16-bit BPM, little-endian).
final class BluetoothHeartRateService: NSObject, ObservableObject {
    @Published var bpm: Int?
    @Published var sensorName: String?
    @Published var isConnected = false
    @Published var statusMessage = "Not connected — tap Pair to scan for heart-rate monitors."

    static let heartRateServiceUUID = CBUUID(string: "180D")
    static let heartRateMeasurementUUID = CBUUID(string: "2A37")

    private var central: CBCentralManager?
    private var peripheral: CBPeripheral?
    private var measurementCharacteristic: CBCharacteristic?
    private var shouldAutoConnect = false

    func pair() {
        shouldAutoConnect = true
        statusMessage = "Scanning for heart-rate monitors…"
        if central == nil {
            central = CBCentralManager(delegate: self, queue: nil)
        } else {
            centralDidBecomePoweredOn()
        }
    }

    func disconnect() {
        shouldAutoConnect = false
        if let peripheral { central?.cancelPeripheralConnection(peripheral) }
        reset()
    }

    private func reset() {
        DispatchQueue.main.async {
            self.peripheral = nil
            self.measurementCharacteristic = nil
            self.isConnected = false
            self.bpm = nil
            self.statusMessage = "Not connected — tap Pair to scan for heart-rate monitors."
        }
    }

    private func centralDidBecomePoweredOn() {
        central?.scanForPeripherals(
            withServices: [Self.heartRateServiceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    }
}

extension BluetoothHeartRateService: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            centralDidBecomePoweredOn()
        case .poweredOff:
            statusMessage = "Bluetooth is off — enable it in Control Center or Settings."
            reset()
        case .unauthorized:
            statusMessage = "Bluetooth permission denied. Enable it in Settings → Privacy → Bluetooth."
        default:
            break
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        central.stopScan()
        self.peripheral = peripheral
        peripheral.delegate = self
        DispatchQueue.main.async {
            self.sensorName = peripheral.name ?? "Heart-rate sensor"
            self.statusMessage = "Connecting to \(peripheral.name ?? "sensor")…"
        }
        central.connect(peripheral, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        DispatchQueue.main.async { self.statusMessage = "Discovering services…" }
        peripheral.discoverServices([Self.heartRateServiceUUID])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        DispatchQueue.main.async {
            self.statusMessage = "Could not connect\(error.map { ": \($0.localizedDescription)" } ?? ". Try pairing again.")"
        }
    }
}

extension BluetoothHeartRateService: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let service = peripheral.services?.first(where: { $0.uuid == Self.heartRateServiceUUID }) else {
            DispatchQueue.main.async { self.statusMessage = "Heart-rate service not found on this device." }
            return
        }
        peripheral.discoverCharacteristics([Self.heartRateMeasurementUUID], for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristic = service.characteristics?.first(where: { $0.uuid == Self.heartRateMeasurementUUID }) else { return }
        measurementCharacteristic = characteristic
        peripheral.setNotifyValue(true, for: characteristic)
        DispatchQueue.main.async {
            self.isConnected = true
            self.statusMessage = "Live — streaming from \(peripheral.name ?? "BLE sensor") (GATT notifications)."
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard characteristic.uuid == Self.heartRateMeasurementUUID,
              let data = characteristic.value, data.count >= 2 else { return }

        let flags = data[0]
        let bpm: Int
        if flags & 0x01 != 0 {
            guard data.count >= 3 else { return }
            bpm = Int(UInt16(data[1]) | (UInt16(data[2]) << 8))   // 16-bit little-endian
        } else {
            bpm = Int(data[1])                                     // 8-bit
        }
        guard bpm > 20, bpm < 250 else { return }

        DispatchQueue.main.async { self.bpm = bpm }
    }
}
