import XCTest
@testable import CardTruthCore
final class ScanFlowTests: XCTestCase {
    func testStartsAtFrontCapture() { XCTAssertEqual(ScanFlow().phase, .frontCapture) }
    func testCannotAcceptWithoutPhoto() { var f = ScanFlow(); XCTAssertThrowsError(try f.acceptPending()) }
    func testCannotReceiveEmptyPhoto() { var f = ScanFlow(); XCTAssertThrowsError(try f.receivePhoto(Data())) }
    func testFrontMustBeReviewedBeforeBack() throws {
        var f = ScanFlow(); try f.receivePhoto(Data([1])); XCTAssertEqual(f.phase, .frontReview)
        XCTAssertNil(f.frames[.front]); try f.acceptPending(); XCTAssertEqual(f.phase, .backCapture)
        XCTAssertEqual(f.frames[.front], Data([1]))
    }
    func testRetakeDoesNotCommitUnacceptedPhoto() throws {
        var f = ScanFlow(); try f.receivePhoto(Data([1])); try f.retake()
        XCTAssertEqual(f.phase, .frontCapture); XCTAssertNil(f.pending); XCTAssertTrue(f.frames.isEmpty)
    }
    func testCompleteRequiresTwoAcceptedFrames() throws {
        var f = ScanFlow(); try f.receivePhoto(Data([1])); try f.acceptPending()
        try f.receivePhoto(Data([2])); XCTAssertEqual(f.phase, .backReview)
        try f.acceptPending(); XCTAssertEqual(f.phase, .complete); XCTAssertEqual(f.frames.count, 2)
    }
    func testCannotCaptureOverUnreviewedFrame() throws {
        var f = ScanFlow(); try f.receivePhoto(Data([1])); XCTAssertThrowsError(try f.receivePhoto(Data([2])))
    }
    func testResetClearsAllEvidence() throws {
        var f = ScanFlow(); try f.receivePhoto(Data([1])); try f.acceptPending(); f.reset()
        XCTAssertEqual(f.phase, .frontCapture); XCTAssertTrue(f.frames.isEmpty)
    }
}
