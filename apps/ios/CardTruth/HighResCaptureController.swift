import AVFoundation
import Foundation

/// All capture-session mutation and continuation ownership are serialized on queue.
/// JPEG evidence only. Neither RAW metrology nor LiDAR measurements are claimed.
final class HighResCaptureController: NSObject, AVCapturePhotoCaptureDelegate, @unchecked Sendable {
    let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "cardtruth.camera", qos: .userInitiated)
    private let output = AVCapturePhotoOutput()
    private var configured = false
    private var startRequest: UUID?
    private var captureID: Int64?
    private var continuation: CheckedContinuation<Data, Error>?
    private var captured: Data?
    private var processingError: Error?

    enum CaptureError: LocalizedError {
        case denied, unavailable, busy, stopped, noData, timedOut
        var errorDescription: String? {
            switch self {
            case .denied: return "Camera access is off. Enable it in Settings, or import photos in the inspector."
            case .unavailable: return "A compatible rear camera could not be configured."
            case .busy: return "A photo is already being captured."
            case .stopped: return "Capture was interrupted. Return to the camera and try again."
            case .noData: return "The camera did not return a usable photo. Please retake it."
            case .timedOut: return "The camera did not finish in time. Please try again."
            }
        }
    }

    func prepareAndStart() async throws {
        let request = UUID()
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            queue.async { self.startRequest = request; c.resume() }
        }
        let allowed: Bool
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: allowed = true
        case .notDetermined: allowed = await AVCaptureDevice.requestAccess(for: .video)
        default: allowed = false
        }
        guard allowed else { throw CaptureError.denied }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            queue.async {
                guard self.startRequest == request else { c.resume(throwing: CaptureError.stopped); return }
                do {
                    if !self.configured { try self.configure() }
                    if !self.session.isRunning { self.session.startRunning() }
                    c.resume()
                } catch { c.resume(throwing: error) }
            }
        }
    }

    private func configure() throws {
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = .photo
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else { throw CaptureError.unavailable }
        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else { throw CaptureError.unavailable }
        session.addInput(input)
        guard session.canAddOutput(output) else { session.removeInput(input); throw CaptureError.unavailable }
        session.addOutput(output)
        output.maxPhotoQualityPrioritization = .quality
        if let dimensions = device.activeFormat.supportedMaxPhotoDimensions.max(by: { Int64($0.width) * Int64($0.height) < Int64($1.width) * Int64($1.height) }) {
            output.maxPhotoDimensions = dimensions
        }
        configured = true
    }

    func stop() {
        queue.async {
            self.startRequest = nil
            self.finish(.failure(CaptureError.stopped))
            if self.session.isRunning { self.session.stopRunning() }
        }
    }

    func capture() async throws -> Data {
        try await withCheckedThrowingContinuation { c in
            queue.async {
                guard self.continuation == nil else { c.resume(throwing: CaptureError.busy); return }
                guard self.session.isRunning else { c.resume(throwing: CaptureError.stopped); return }
                let settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
                settings.photoQualityPrioritization = .quality
                settings.maxPhotoDimensions = self.output.maxPhotoDimensions
                if let connection = self.output.connection(with: .video), connection.isVideoRotationAngleSupported(90) {
                    connection.videoRotationAngle = 90
                }
                self.continuation = c; self.captureID = settings.uniqueID
                self.captured = nil; self.processingError = nil
                self.output.capturePhoto(with: settings, delegate: self)
                self.queue.asyncAfter(deadline: .now() + 20) {
                    if self.captureID == settings.uniqueID { self.finish(.failure(CaptureError.timedOut)) }
                }
            }
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        let id = photo.resolvedSettings.uniqueID
        let data = photo.fileDataRepresentation()
        queue.async {
            guard self.captureID == id else { return }
            self.captured = data
            self.processingError = error
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings, error: Error?) {
        queue.async {
            guard self.captureID == resolvedSettings.uniqueID else { return }
            if let issue = error ?? self.processingError { self.finish(.failure(issue)) }
            else if let data = self.captured, !data.isEmpty { self.finish(.success(data)) }
            else { self.finish(.failure(CaptureError.noData)) }
        }
    }

    private func finish(_ result: Result<Data, Error>) {
        let c = continuation
        continuation = nil; captureID = nil; captured = nil; processingError = nil
        c?.resume(with: result)
    }
}
