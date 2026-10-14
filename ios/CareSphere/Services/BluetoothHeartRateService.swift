import Foundation
import CoreBluetooth

struct HeartRateMonitorCandidate: Identifiable {
    let id: UUID
    let name: String
    var shortID: String { String(id.uuidString.suffix(4)) }
}

/// Main-queue CoreBluetooth callbacks. Scanning does not connect to the first
/// stranger's monitor: the person explicitly selects a discovered device.
final class BluetoothHeartRateService: NSObject, ObservableObject {
    @Published var bpm: Int?
    @Published var sensorName: String?
    @Published private(set) var isConnected = false
    @Published private(set) var isPairing = false
    @Published private(set) var candidates: [HeartRateMonitorCandidate] = []
    @Published var statusMessage = "Not connected. Choose Pair to look for your monitor."

    static let heartRateServiceUUID = CBUUID(string: "180D")
    static let heartRateMeasurementUUID = CBUUID(string: "2A37")

    private var central: CBCentralManager?
    private var peripheral: CBPeripheral?
    private var discovered: [UUID: CBPeripheral] = [:]
    private var pairingTimeout: DispatchWorkItem?
    private var readingTimeout: DispatchWorkItem?

    func pair() {
        guard !isConnected, !isPairing else { return }
        candidates = []
        discovered = [:]
        isPairing = true
        statusMessage = "Checking Bluetooth…"
        if central == nil {
            central = CBCentralManager(delegate: self, queue: nil)
        } else if let central {
            centralManagerDidUpdateState(central)
        }
    }

    func connect(to candidate: HeartRateMonitorCandidate) {
        guard isPairing, central?.state == .poweredOn,
              let selected = discovered[candidate.id], peripheral == nil else { return }
        central?.stopScan()
        candidates = []
        peripheral = selected
        selected.delegate = self
        sensorName = candidate.name
        statusMessage = "Connecting to \(candidate.name)…"
        setPairingTimeout(message: "The monitor did not finish connecting. Check its broadcast mode, then try again.")
        central?.connect(selected, options: nil)
    }

    func disconnect() {
        stop(message: "Disconnected. No current heart-rate reading is displayed.")
    }

    func cancelPairing() {
        stop(message: "Pairing canceled. You can look for a monitor again whenever you like.")
    }

    private func startScan() {
        guard isPairing, central?.state == .poweredOn else { return }
        statusMessage = "Looking for heart-rate monitors. Choose yours from the list below."
        central?.scanForPeripherals(withServices: [Self.heartRateServiceUUID],
                                    options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        pairingTimeout?.cancel()
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.isPairing, self.peripheral == nil else { return }
            self.central?.stopScan()
            if self.candidates.isEmpty {
                self.isPairing = false
                self.statusMessage = "No monitor found. Enable heart-rate broadcast, keep it nearby, and try Pair again."
            } else {
                self.statusMessage = "Search finished. Choose your monitor, or cancel and search again."
            }
        }
        pairingTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: timeout)
    }

    private func setPairingTimeout(message: String) {
        pairingTimeout?.cancel()
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.isPairing else { return }
            self.stop(message: message)
        }
        pairingTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 20, execute: timeout)
    }

    private func stop(message: String) {
        pairingTimeout?.cancel()
        readingTimeout?.cancel()
        central?.stopScan()
        let previous = peripheral
        peripheral = nil // Ignore delayed callbacks from a canceled connection.
        if let previous { central?.cancelPeripheralConnection(previous) }
        isConnected = false
        isPairing = false
        bpm = nil
        sensorName = nil
        candidates = []
        discovered = [:]
        statusMessage = message
    }

    private func expireReadingLater() {
        readingTimeout?.cancel()
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.isConnected else { return }
            self.bpm = nil
            self.statusMessage = "No fresh reading for 15 seconds. Check the monitor; the old value is no longer displayed."
        }
        readingTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: timeout)
    }
}

extension BluetoothHeartRateService: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            if isPairing { startScan() }
        case .poweredOff:
            stop(message: "Bluetooth is off. Enable it in iPhone Settings, then choose Pair again.")
        case .unauthorized:
            stop(message: "Bluetooth permission is denied. Review Settings → Privacy & Security → Bluetooth.")
        case .unsupported:
            stop(message: "This device does not support Bluetooth heart-rate monitors.")
        case .resetting:
            stop(message: "Bluetooth is restarting. Wait a moment, then choose Pair again.")
        case .unknown:
            if isPairing { setPairingTimeout(message: "Bluetooth did not become ready. Check iPhone Settings and try again.") }
        @unknown default:
            stop(message: "Bluetooth is unavailable. Try again later.")
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        guard isPairing, self.peripheral == nil, discovered[peripheral.identifier] == nil else { return }
        discovered[peripheral.identifier] = peripheral
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "Unnamed heart-rate monitor"
        candidates.append(HeartRateMonitorCandidate(id: peripheral.identifier, name: name))
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        guard self.peripheral === peripheral, isPairing else { return }
        statusMessage = "Checking the monitor's heart-rate service…"
        peripheral.discoverServices([Self.heartRateServiceUUID])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        guard self.peripheral === peripheral else { return }
        stop(message: "Could not connect. Check the monitor and try again.\(error.map { " " + $0.localizedDescription } ?? "")")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        guard self.peripheral === peripheral else { return }
        stop(message: "The monitor disconnected. No current reading is shown. Choose Pair to reconnect to your device.")
    }
}

extension BluetoothHeartRateService: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard self.peripheral === peripheral else { return }
        guard error == nil,
              let service = peripheral.services?.first(where: { $0.uuid == Self.heartRateServiceUUID }) else {
            stop(message: "A heart-rate service was not found on that monitor. Choose a compatible device and try again.")
            return
        }
        peripheral.discoverCharacteristics([Self.heartRateMeasurementUUID], for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard self.peripheral === peripheral else { return }
        guard error == nil,
              let characteristic = service.characteristics?.first(where: { $0.uuid == Self.heartRateMeasurementUUID }),
              characteristic.properties.contains(.notify) else {
            stop(message: "This monitor could not provide heart-rate notifications. Try another compatible device.")
            return
        }
        peripheral.setNotifyValue(true, for: characteristic)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        guard self.peripheral === peripheral, characteristic.uuid == Self.heartRateMeasurementUUID else { return }
        guard error == nil, characteristic.isNotifying else {
            stop(message: "Heart-rate notifications could not be enabled. Pair again when the monitor is ready.")
            return
        }
        pairingTimeout?.cancel()
        isPairing = false
        isConnected = true
        statusMessage = "Connected to \(sensorName ?? "your monitor"). Waiting for a reading…"
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard self.peripheral === peripheral, characteristic.uuid == Self.heartRateMeasurementUUID else { return }
        guard error == nil, let data = characteristic.value, data.count >= 2 else {
            bpm = nil
            statusMessage = "A monitor reading could not be received. No value is displayed."
            return
        }
        let value: Int
        if data[0] & 0x01 != 0 {
            guard data.count >= 3 else { bpm = nil; return }
            value = Int(UInt16(data[1]) | (UInt16(data[2]) << 8))
        } else {
            value = Int(data[1])
        }
        guard value > 20, value < 250 else {
            bpm = nil
            statusMessage = "The monitor returned a value outside this app's supported display range. No value is shown."
            return
        }
        bpm = value
        statusMessage = "Live reading from \(sensorName ?? "your selected monitor")."
        expireReadingLater()
    }
}
