# Flutter

`hb_embed.dart` is one widget. Add `webview_flutter` to your app and give it the address of the mobile page of your server (see `public/mobile.js` in the root of this repository).

```dart
HbEmbed(
  pageUrl: 'https://learn.example.com/mobile?kind=course',
  onEvent: (name, data) {
    if (name == 'completed') {
      // Ask your server for the result before unlocking anything.
    }
  },
)
```

Try it on the sandbox with the root server running (`npm start`):

- iOS simulator: `pageUrl` is `http://localhost:3000/mobile?kind=course`.
- Android emulator: run `adb reverse tcp:3000 tcp:3000` and use the same `http://localhost:3000` address. The address `10.0.2.2` is not an origin the sandbox accepts.
- A real phone needs your page on an https address that is registered under Developer > Embed in Hub.
- Android needs `<uses-permission android:name="android.permission.INTERNET" />`. A plain `http://localhost` address also needs a network security config that allows clear text for localhost; use https on a real build.

Not built or run on a device.
