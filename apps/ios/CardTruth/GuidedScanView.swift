import AVFoundation
import SwiftUI
import UIKit

struct GuidedScanView: View {
    @StateObject private var model = CaptureModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var inspect = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                Text(model.flow.phase == .complete ? "Both photos are ready." : "Photograph the \(model.flow.activeSide.rawValue).")
                    .font(.title2.bold())
                Text("Use a bare card on a clean, matte surface. Avoid glare. Never press or alter the card for a scan.")
                    .font(.subheadline).foregroundStyle(.secondary)
                ProgressView(value: model.flow.progress)
                if let data = model.flow.pending, let image = UIImage(data: data) {
                    Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 440)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    Text("Check focus, glare and all four corners before accepting.").font(.footnote)
                    Button("Use this photo") { model.accept() }.buttonStyle(.borderedProminent)
                    Button("Retake") { model.retake() }.buttonStyle(.bordered)
                } else if model.flow.phase == .complete {
                    Image(systemName: "checkmark.rectangle.stack").font(.system(size: 65)).padding(35)
                    Text("Next, confirm the outline and printed borders. No automatic grade is claimed.")
                        .font(.subheadline).foregroundStyle(.secondary)
                    Button("Open the local inspector") { inspect = true }.buttonStyle(.borderedProminent)
                } else {
                    CameraPreview(session: model.camera.session)
                        .frame(height: 430).clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay { RoundedRectangle(cornerRadius: 12).stroke(.white.opacity(0.8), style: StrokeStyle(lineWidth: 1.5, dash: [8,6])).frame(width: 220, height: 310).allowsHitTesting(false) }
                    Button(model.busy ? "Capturing…" : "Capture photo") { Task { await model.capture() } }
                        .buttonStyle(.borderedProminent).disabled(!model.ready || model.busy)
                }
                if let error = model.error {
                    Text(error).font(.footnote).foregroundStyle(.red)
                    if model.flow.isCapturing { Button("Retry camera") { Task { await model.start() } } }
                }
                Text("JPEG evidence only. This capture flow does not measure microscopic depth or authenticate a card.")
                    .font(.caption).foregroundStyle(.secondary)
            }.padding(22)
        }
        .navigationTitle("Capture evidence")
        .navigationBarTitleDisplayMode(.inline)
        .task { model.visible = true; await model.start() }
        .onDisappear { model.visible = false; model.pause() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active && model.visible { Task { await model.start() } }
            else { model.pause() }
        }
        .navigationDestination(isPresented: $inspect) {
            InspectorScreen(bundle: model.bundle).navigationTitle("Card inspector")
        }
    }
}

@MainActor
final class CaptureModel: ObservableObject {
    @Published var flow = ScanFlow()
    @Published var error: String?
    @Published var ready = false
    @Published var busy = false
    var visible = false
    let camera = HighResCaptureController()
    var bundle: [String: Any] {
        ["frames": ScanFlow.Side.allCases.compactMap { side -> [String: String]? in
            guard let data = flow.frames[side] else { return nil }
            return ["side": side.rawValue, "jpeg_base64": data.base64EncodedString()]
        }]
    }
    func start() async {
        guard flow.isCapturing, visible else { return }
        do { try await camera.prepareAndStart(); if visible { ready = true; error = nil } else { camera.stop() } }
        catch { if visible { self.error = error.localizedDescription; ready = false } }
    }
    func pause() { camera.stop(); ready = false }
    func capture() async {
        guard ready, !busy else { return }
        busy = true; defer { busy = false }
        do {
            let data = try await camera.capture()
            guard UIImage(data: data) != nil else { throw HighResCaptureController.CaptureError.noData }
            try flow.receivePhoto(data); error = nil; pause()
        } catch { self.error = error.localizedDescription }
    }
    func accept() {
        do { try flow.acceptPending(); if flow.isCapturing { Task { await start() } } else { pause() } }
        catch { self.error = error.localizedDescription }
    }
    func retake() {
        do { try flow.retake(); Task { await start() } }
        catch { self.error = error.localizedDescription }
    }
}

private struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView(); view.previewLayer.session = session; view.previewLayer.videoGravity = .resizeAspectFill; return view
    }
    func updateUIView(_ uiView: PreviewView, context: Context) { uiView.previewLayer.session = session }
}
private final class PreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    override func layoutSubviews() {
        super.layoutSubviews()
        if let connection = previewLayer.connection, connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
    }
}
