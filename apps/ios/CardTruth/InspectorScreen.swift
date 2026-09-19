import SwiftUI
import WebKit
import UIKit

struct InspectorScreen: View {
    let bundle: [String: Any]?
    @State private var exportURL: URL?
    @State private var showingShare = false
    @State private var issue: String?
    var body: some View {
        VStack(spacing: 0) {
            if let issue { Text(issue).font(.footnote).foregroundStyle(.red).padding(12) }
            InspectorWebView(bundle: bundle, onExport: { url in exportURL = url; showingShare = true }, onError: { issue = $0 })
        }
        .sheet(isPresented: $showingShare) {
            if let exportURL { ActivitySheet(items: [exportURL]) }
        }
    }
}

private struct InspectorWebView: UIViewRepresentable {
    let bundle: [String: Any]?
    let onExport: (URL) -> Void
    let onError: (String) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(bundle: bundle, onExport: onExport, onError: onError) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(context.coordinator, name: "cardtruthExport")
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.isOpaque = false
        guard let file = Bundle.main.url(forResource: "CardTruth", withExtension: "html") else {
            onError("Bundled inspector is missing. Run tools/build_standalone.py before building the iOS app."); return view
        }
        view.loadFileURL(file, allowingReadAccessTo: file.deletingLastPathComponent())
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {}
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "cardtruthExport")
        view.stopLoading()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let bundle: [String: Any]?
        let onExport: (URL) -> Void
        let onError: (String) -> Void
        var injected = false
        init(bundle: [String: Any]?, onExport: @escaping (URL) -> Void, onError: @escaping (String) -> Void) {
            self.bundle = bundle; self.onExport = onExport; self.onError = onError
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard !injected, let bundle else { return }; injected = true
            webView.callAsyncJavaScript("return await window.CardTruth.importNativeBundle(bundle);", arguments: ["bundle": bundle], in: nil, in: .page) { [weak self] result in
                if case .failure(let error) = result { self?.onError(error.localizedDescription) }
            }
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { onError(error.localizedDescription) }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { onError(error.localizedDescription) }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if url.isFileURL || url.scheme == "about" { decisionHandler(.allow); return }
            if navigationAction.navigationType == .linkActivated, ["https","http"].contains(url.scheme ?? "") {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url, url.scheme == "https" { UIApplication.shared.open(url) }
            return nil
        }
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard let host = webView.window?.rootViewController else { completionHandler(false); return }
            var presenter = host
            while let shown = presenter.presentedViewController { presenter = shown }
            let alert = UIAlertController(title: "CardTruth", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "Continue", style: .default) { _ in completionHandler(true) })
            presenter.present(alert, animated: true)
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.name == "cardtruthExport", let text = message.body as? String, let data = text.data(using: .utf8), data.count < 80 * 1024 * 1024 else { onError("Invalid report export."); return }
            do {
                guard let value = try JSONSerialization.jsonObject(with: data) as? [String: Any], value["format"] as? String == "cardtruth-inspection" else { onError("Invalid report format."); return }
                let dir = FileManager.default.temporaryDirectory.appendingPathComponent("CardTruthExports", isDirectory: true)
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                let url = dir.appendingPathComponent("cardtruth-\(UUID().uuidString).ctscan.json")
                try data.write(to: url, options: [.atomic, .completeFileProtection])
                onExport(url)
            } catch { onError(error.localizedDescription) }
        }
    }
}

private struct ActivitySheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
