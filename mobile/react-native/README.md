# React Native

`HbEmbed.tsx` is one component. Drop it in your app, install `react-native-webview`, and give it the address of the mobile page of your server (see `public/mobile.js` in the root of this repository).

```tsx
<HbEmbed
  pageUrl="https://learn.example.com/mobile?kind=course"
  onEvent={({ name, data }) => {
    if (name === 'completed') {
      // Ask your server for the result before unlocking anything.
    }
  }}
/>
```

Try it on the sandbox with the root server running (`npm start`):

- iOS simulator: `pageUrl` is `http://localhost:3000/mobile?kind=course`.
- Android emulator: run `adb reverse tcp:3000 tcp:3000` and use the same `http://localhost:3000` address. The address `10.0.2.2` is not an origin the sandbox accepts.
- A real phone needs your page on an https address that is registered under Developer > Embed in Hub.

Not built or run on a device.
