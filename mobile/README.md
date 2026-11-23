# Mobile apps

The embedded frame is a web page of the Hub, so a mobile app shows it in a web view. The web view does not open the frame itself. It opens **a page of your own website** (your registered origin), and that page uses the SDK exactly as in the browser examples. The page passes the events to the app.

```
app (web view)  -->  your page /mobile  -->  POST /api/hb/embed (your server, API key)  -->  Hub
       ^                   |
       +--- events (completed, passed, ...) through the bridge ---+
```

Why a page of your website and not the frame directly: the Hub only serves the frame to the origin you registered, checks the `Referer`, and needs the SDK's handshake. A web view that loads a local file or a custom scheme has no such origin, so the frame answers `frame_invalid`.

- `../public/mobile.html` and `../public/mobile.js` are that page. They mount a course or test and call the bridge.
- One small wrapper per platform: [React Native](react-native), [Flutter](flutter), [iOS](ios), [Android](android). Each is a single file you copy into your app.

The bridge is the same name in every platform, `hbEmbed`, and carries one JSON text message `{ "name": "completed", "data": { ... } }`.

## What your app and server must do

- **Sign the user in on your page.** The demo has no login. Your page and your `/api/hb/embed` route use your own session, and the route decides who the candidate is. Pass the app's sign-in to the web view the way you do for any web view (a short-lived link or a session cookie), never a long-lived key.
- **Treat events as hints.** An event can be forged by anything that can run script in the page. Show a result, then read the result from your server (API or webhook) before you grant anything.
- **Keep the web view to your page.** The wrappers open links that leave your page in the system browser.
- **Test video and downloads on a real device.** Full screen video and certificate downloads depend on the web view's settings and on the version of the operating system.

Not built or run on a device: these wrappers are small, but check them in your own app before you rely on them.
