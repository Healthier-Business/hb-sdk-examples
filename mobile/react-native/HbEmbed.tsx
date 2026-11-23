// React Native: shows the course or test page of your server in a WebView and hands the events to your screen.
// Needs: npm install react-native-webview
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export type HbEvent = { name: string; data: Record<string, unknown> };

type Props = {
  /** The address of your page, for example https://learn.example.com/mobile?kind=course. It must be a registered origin. */
  pageUrl: string;
  onEvent: (event: HbEvent) => void;
};

export function HbEmbed({ pageUrl, onEvent }: Props) {
  const pageOrigin = new URL(pageUrl).origin;

  const onMessage = (message: WebViewMessageEvent) => {
    // Only trust messages from your own page, and only the shape you expect.
    if (!message.nativeEvent.url.startsWith(pageOrigin)) {
      return;
    }
    try {
      const event = JSON.parse(message.nativeEvent.data) as HbEvent;
      if (typeof event.name === 'string') {
        onEvent(event);
      }
    } catch {
      // Not a message from the page.
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: pageUrl }}
        onMessage={onMessage}
        // Your page may load itself and the Hub frame. Everything else stays outside the app's web view.
        originWhitelist={[`${pageOrigin}*`, 'https://*']}
        javaScriptEnabled
        domStorageEnabled
        // Course videos: play inline and allow full screen.
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={{ flex: 1 }} />}
      />
    </View>
  );
}
