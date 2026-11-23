// Native iOS (SwiftUI): shows the course or test page of your server in a WKWebView and hands the events to your screen.
import SwiftUI
import WebKit

struct HbEmbedView: UIViewRepresentable {
    /// The address of your page, for example https://learn.example.com/mobile?kind=course. It must be a registered origin.
    let pageURL: URL
    let onEvent: (_ name: String, _ data: [String: Any]) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(pageURL: pageURL, onEvent: onEvent) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        // The page calls window.webkit.messageHandlers.hbEmbed.postMessage(json) for every event.
        configuration.userContentController.add(context.coordinator, name: "hbEmbed")
        // Course videos play inline.
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: pageURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let pageURL: URL
        let onEvent: (String, [String: Any]) -> Void

        init(pageURL: URL, onEvent: @escaping (String, [String: Any]) -> Void) {
            self.pageURL = pageURL
            self.onEvent = onEvent
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            // Only trust messages from your own page, and only the shape you expect.
            guard message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.host == pageURL.host,
                  let text = message.body as? String,
                  let json = try? JSONSerialization.jsonObject(with: Data(text.utf8)) as? [String: Any],
                  let name = json["name"] as? String
            else { return }
            onEvent(name, json["data"] as? [String: Any] ?? [:])
        }

        // The page and the Hub frame stay inside. A link that leaves your page opens in Safari instead.
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard action.targetFrame?.isMainFrame == true, let url = action.request.url, url.host != pageURL.host else {
                decisionHandler(.allow)
                return
            }
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }
    }
}
