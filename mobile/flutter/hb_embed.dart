// Flutter: shows the course or test page of your server in a WebView and hands the events to your screen.
// Needs: flutter pub add webview_flutter
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

typedef HbEventHandler = void Function(String name, Map<String, dynamic> data);

class HbEmbed extends StatefulWidget {
  /// The address of your page, for example https://learn.example.com/mobile?kind=course. It must be a registered origin.
  final String pageUrl;
  final HbEventHandler onEvent;

  const HbEmbed({super.key, required this.pageUrl, required this.onEvent});

  @override
  State<HbEmbed> createState() => _HbEmbedState();
}

class _HbEmbedState extends State<HbEmbed> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    final pageHost = Uri.parse(widget.pageUrl).host;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      // The page calls hbEmbed.postMessage(json) for every event.
      ..addJavaScriptChannel('hbEmbed', onMessageReceived: (message) {
        try {
          final event = jsonDecode(message.message) as Map<String, dynamic>;
          final name = event['name'];
          if (name is String) {
            widget.onEvent(name, (event['data'] as Map?)?.cast<String, dynamic>() ?? {});
          }
        } catch (_) {
          // Not a message from the page.
        }
      })
      ..setNavigationDelegate(NavigationDelegate(
        // The page and the Hub frame stay inside. A link that leaves your page is not opened in the app's web view.
        onNavigationRequest: (request) {
          final host = Uri.parse(request.url).host;
          return host == pageHost || request.isMainFrame == false
              ? NavigationDecision.navigate
              : NavigationDecision.prevent;
        },
      ))
      ..loadRequest(Uri.parse(widget.pageUrl));
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: _controller);
}
