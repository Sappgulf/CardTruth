// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "CardTruthCore",
    platforms: [.iOS("18.0"), .macOS(.v13)],
    products: [.library(name: "CardTruthCore", targets: ["CardTruthCore"])],
    targets: [
        .target(name: "CardTruthCore", path: "CardTruthCore"),
        .testTarget(name: "CardTruthCoreTests", dependencies: ["CardTruthCore"], path: "Tests/CardTruthCoreTests")
    ]
)
