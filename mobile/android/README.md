# Native Android

`HbEmbed.kt` is one function that makes a `WebView` for the course or test page of your server (see `public/mobile.js` in the root of this repository). Add the returned view to your layout.

```kotlin
val view = createHbEmbedView(this, "https://learn.example.com/mobile?kind=course") { name, data ->
    if (name == "completed") {
        // Ask your server for the result before unlocking anything.
    }
}
container.addView(view)
```

Try it on the sandbox with the root server running (`npm start`): in the emulator run `adb reverse tcp:3000 tcp:3000` and use `http://localhost:3000/mobile?kind=course`. The address `10.0.2.2` is not an origin the sandbox accepts. A plain `http` address needs a network security config that allows clear text for `localhost` (a debug build only). A real phone needs your page on an https address that is registered under Developer > Embed in Hub.

On Android the JavaScript bridge `hbEmbed` is reachable by every frame in the web view, including the Hub frame inside your page. It can only pass a message to your function, which checks the shape and does nothing else, so keep the function that way and never give it more power. The web view only ever loads your own page and sends links that leave it to the browser. Not built or run on a device.
