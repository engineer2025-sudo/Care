// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CareActivityKit",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [.library(name: "CareActivityKit", targets: ["CareActivityKit"])],
    targets: [
        .target(name: "CareActivityKit", resources: [.process("Resources")]),
        .testTarget(name: "CareActivityKitTests", dependencies: ["CareActivityKit"], resources: [.copy("Fixtures")]),
    ]
)
