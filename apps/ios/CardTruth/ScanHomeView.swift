import SwiftUI

struct ScanHomeView: View {
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 22) {
                Text("CardTruth").font(.largeTitle.bold())
                Text("Inspect before you submit.").font(.title2)
                Text("Capture front and back, confirm the border measurements, and keep an honest evidence report. Everything stays on your device until you share it.")
                    .foregroundStyle(.secondary)
                NavigationLink("Photograph a card") { GuidedScanView() }
                    .buttonStyle(.borderedProminent)
                NavigationLink("Open inspector / import photos") { InspectorScreen(bundle: nil).navigationTitle("Card inspector") }
                    .buttonStyle(.bordered)
                Divider()
                Text("No validated grade predictor is installed.").font(.headline)
                Text("Centering references are not overall grades. Surface depth, LiDAR metrology, GradeRig control and authenticity verification are not enabled.")
                    .font(.footnote).foregroundStyle(.secondary)
                Spacer()
            }.padding(25)
        }
    }
}
