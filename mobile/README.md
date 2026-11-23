# Mobile apps

The embedded frame is a web page of the Hub, so a mobile app shows it in a web view. The web view does not open the frame itself. It opens **a page of your own website** (your registered origin), and that page uses the SDK exactly as in the browser examples. The page passes the events to the app.

```
app (HbEmbed)  -->  your page /mobile  -->  POST /api/hb/embed (your server, API key)  -->  Hub
       ^                   |
       +--- events (completed, passed, ...) through the bridge ---+
```

- `../public/mobile.html` and `../public/mobile.js` are that page. They mount a course or test and call the bridge. Run the server (`npm start`) and open `http://localhost:3000/mobile?kind=course` in the app.
- The app side is one package per platform, in [hb-sdk-mobile](https://github.com/Healthier-Business/hb-sdk-mobile): React Native, Flutter, iOS (SwiftUI) and Android (Kotlin). Each shows the page in a web view, passes only well formed messages from your own origin to your code, keeps the web view on your origin and opens other links in the system browser.

Why a page of your website and not the frame directly: the Hub only serves the frame to the origin you registered, checks the `Referer`, and needs the SDK's handshake. A web view that loads a local file or a custom scheme has no such origin, so the frame answers `frame_invalid`.

## What your app and server must do

- **Sign the user in on your page.** The demo has no login. Your page and your `/api/hb/embed` route use your own session, and the route decides who the candidate is. Pass the app's sign-in to the web view the way you do for any web view (a short-lived link or a session cookie), never a long-lived key.
- **Treat events as hints.** An event can be forged by anything that can run script in the page. Show a result, then read the result from your server (API or webhook) before you grant anything.
- **Test video and downloads on a real device.** Full screen video and certificate downloads depend on the web view's settings and on the version of the operating system.
