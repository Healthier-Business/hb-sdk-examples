# Native iOS

`HbEmbedView.swift` is one SwiftUI view around `WKWebView`. Give it the address of the mobile page of your server (see `public/mobile.js` in the root of this repository).

```swift
HbEmbedView(pageURL: URL(string: "https://learn.example.com/mobile?kind=course")!) { name, data in
    if name == "completed" {
        // Ask your server for the result before unlocking anything.
    }
}
```

Try it on the sandbox with the root server running (`npm start`): in the simulator `pageURL` is `http://localhost:3000/mobile?kind=course`. A plain `http` address needs an App Transport Security exception for `localhost` in Info.plist (a debug build only). A real phone needs your page on an https address that is registered under Developer > Embed in Hub.

Not built or run on a device.
