import XCTest
@testable import CareActivityKit
final class HeartRatePacketTests: XCTestCase {
    func testEightBit() { XCTAssertEqual(HeartRatePacket.bpm(from: [0,72]),72) }
    func testSixteenBitLittleEndian() { XCTAssertEqual(HeartRatePacket.bpm(from: [1,200,0]),200) }
    func testTruncated() { let packets: [[UInt8]] = [[],[0],[1,72]]; for bytes in packets { XCTAssertNil(HeartRatePacket.bpm(from: bytes)) } }
    func testContact() { XCTAssertNil(HeartRatePacket.bpm(from: [4,72])); XCTAssertEqual(HeartRatePacket.bpm(from: [6,72]),72) }
    func testRange() { XCTAssertNil(HeartRatePacket.bpm(from: [0,0])); XCTAssertNil(HeartRatePacket.bpm(from: [1,0,1])) }
}
