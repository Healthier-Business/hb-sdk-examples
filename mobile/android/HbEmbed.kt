// Native Android: shows the course or test page of your server in a WebView and hands the events to your screen.
// Needs <uses-permission android:name="android.permission.INTERNET" /> in the manifest.
package com.example.hbembed

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject

/**
 * @param pageUrl the address of your page, for example https://learn.example.com/mobile?kind=course. It must be a registered origin.
 * @param onEvent called on the main thread with the event name and its data.
 */
@SuppressLint("SetJavaScriptEnabled")
fun createHbEmbedView(context: Context, pageUrl: String, onEvent: (name: String, data: JSONObject) -> Unit): WebView {
    val pageHost = Uri.parse(pageUrl).host
    val webView = WebView(context)

    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    // Course videos play without a second tap.
    webView.settings.mediaPlaybackRequiresUserGesture = false

    // The page calls hbEmbed.postMessage(json) for every event. The bridge is only added for your own page (see the client below),
    // and it runs on a background thread, so hand the event to the main thread.
    webView.addJavascriptInterface(object {
        @JavascriptInterface
        fun postMessage(text: String) {
            try {
                val json = JSONObject(text)
                val name = json.getString("name")
                val data = json.optJSONObject("data") ?: JSONObject()
                webView.post { onEvent(name, data) }
            } catch (_: Exception) {
                // Not a message from the page.
            }
        }
    }, "hbEmbed")

    webView.webViewClient = object : WebViewClient() {
        // The page and the Hub frame stay inside. A link that leaves your page opens in the browser instead.
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (!request.isForMainFrame || request.url.host == pageHost) {
                return false
            }
            context.startActivity(Intent(Intent.ACTION_VIEW, request.url))
            return true
        }
    }

    // Full screen video: the player asks for a view to show over the screen. Add this to your activity's layout handling.
    webView.webChromeClient = object : WebChromeClient() {
        private var customView: View? = null

        override fun onShowCustomView(view: View, callback: CustomViewCallback) {
            customView = view
            (webView.parent as? android.view.ViewGroup)?.addView(view)
        }

        override fun onHideCustomView() {
            customView?.let { (it.parent as? android.view.ViewGroup)?.removeView(it) }
            customView = null
        }
    }

    webView.loadUrl(pageUrl)
    return webView
}
