import Foundation

/// Evidence-led capture flow. No button can mark a missing photo as captured.
public struct ScanFlow {
    public enum Phase: Equatable { case frontCapture, frontReview, backCapture, backReview, complete }
    public enum Side: String, CaseIterable, Codable { case front, back }
    public enum FlowError: Error { case invalidTransition, emptyPhoto }
    public private(set) var phase: Phase = .frontCapture
    public private(set) var frames: [Side: Data] = [:]
    public private(set) var pending: Data?
    public init() {}
    public var isCapturing: Bool { phase == .frontCapture || phase == .backCapture }
    public var activeSide: Side { phase == .frontCapture || phase == .frontReview ? .front : .back }
    public var progress: Double {
        switch phase { case .frontCapture: return 0; case .frontReview: return 0.25; case .backCapture: return 0.5; case .backReview: return 0.75; case .complete: return 1 }
    }
    public mutating func receivePhoto(_ data: Data) throws {
        guard isCapturing else { throw FlowError.invalidTransition }
        guard !data.isEmpty else { throw FlowError.emptyPhoto }
        pending = data
        phase = phase == .frontCapture ? .frontReview : .backReview
    }
    public mutating func acceptPending() throws {
        guard (phase == .frontReview || phase == .backReview), let data = pending else { throw FlowError.invalidTransition }
        frames[activeSide] = data
        phase = phase == .frontReview ? .backCapture : .complete
        pending = nil
    }
    public mutating func retake() throws {
        guard phase == .frontReview || phase == .backReview else { throw FlowError.invalidTransition }
        phase = phase == .frontReview ? .frontCapture : .backCapture
        pending = nil
    }
    public mutating func reset() { self = ScanFlow() }
}
