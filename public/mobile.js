// Mobile apps: this page is what a web view in your app opens. It is a normal page of your registered origin, so everything works as in the
// browser examples. It mounts the frame and passes the events to the app through whichever bridge the app has installed.
// Address: /mobile?kind=course (or kind=test). The course id comes from the server config here; a real page would take it from your own route.

/**
 * Sends one message to the app. Every native bridge takes a string, so the message is JSON text.
 * - React Native (react-native-webview): window.ReactNativeWebView.postMessage
 * - iOS (WKWebView): a script message handler named hbEmbed
 * - Android (addJavascriptInterface named hbEmbed) and Flutter (webview_flutter JavaScriptChannel named hbEmbed): hbEmbed.postMessage
 */
function sendToApp(message) {
  const text = JSON.stringify(message);
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(text);
  } else if (window.webkit?.messageHandlers?.hbEmbed) {
    window.webkit.messageHandlers.hbEmbed.postMessage(text);
  } else if (window.hbEmbed?.postMessage) {
    window.hbEmbed.postMessage(text);
  }
}

const status = document.getElementById('status');

function setStatus(text, tone) {
  status.textContent = text;
  status.className = `status ${tone ?? ''}`.trim();
}

async function start() {
  const kind = new URLSearchParams(location.search).get('kind') === 'test' ? 'test' : 'course';
  const config = await fetch('/api/config').then((response) => response.json());
  if (!config.courseId) {
    setStatus('HB_SANDBOX_COURSE_ID is not set on the server.', 'bad');
    return;
  }
  setStatus(kind === 'test' ? 'Opening the test...' : 'Opening the course...');

  HealthierBusiness.mount(document.getElementById('frame'), {
    endpoint: '/api/hb/embed',
    kind,
    courseId: config.courseId,

    onReady: () => {
      setStatus('', '');
      sendToApp({ name: 'ready', data: { kind } });
    },
    onProgress: (data) => sendToApp({ name: 'progress', data }),
    onCompleted: (data) => {
      setStatus('Course completed.', 'ok');
      sendToApp({ name: 'completed', data });
    },
    onPassed: (data) => {
      setStatus('Test passed.', 'ok');
      sendToApp({ name: 'passed', data });
    },
    onFailed: (data) => {
      setStatus('Test not passed.', 'bad');
      sendToApp({ name: 'failed', data });
    },
    onError: (error) => {
      setStatus(`Error ${error.code}: ${error.message}`, 'bad');
      sendToApp({ name: 'error', data: { code: error.code, message: error.message } });
    },
  });
}

start().catch((error) => {
  setStatus(error.message, 'bad');
  sendToApp({ name: 'error', data: { code: 'page_failed', message: error.message } });
});
