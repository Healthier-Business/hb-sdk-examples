# Healthier Business Hub SDK examples

Three small, working examples of the [Healthier Business Hub SDK](https://github.com/Healthier-Business/hb-sdk) (`@healthier-business/hub-sdk`): an **online training course**, a **test** and an **occupational health (OH) form**, each shown inline in your own page.

Each example is plain HTML and JavaScript in the browser, plus one tiny Node server (`node:http`, no framework, no dependencies except the SDK). The server holds your API key and creates the embed session. The browser only receives a short-lived, single-use launch token.

## Prerequisites

- Node.js 20.12 or newer
- A Hub **sandbox** API key (`hbk_test_...`) with the scopes `online-training:embed:create` and `occupational-health:embed:create`
- The sandbox address, the sandbox candidate, course, test and OH request ids (see [The sandbox](#the-sandbox))
- Your page's address registered under **Developer > Embed** in Hub: `http://localhost:3000` for these examples

## Quick start

1. Clone the repository and go into it.

   ```bash
   git clone <this repository>
   cd hb-sdk-examples
   ```

2. Install. (Until the SDK is on npm, see [Using a local copy of the SDK](#using-a-local-copy-of-the-sdk).)

   ```bash
   npm install
   ```

3. Copy the settings file.

   ```bash
   cp .env.example .env
   ```

4. Open `.env` and set `HB_API_KEY` and `HB_BASE_URL`, plus the ids listed in it. Never commit `.env`.

5. Start the server.

   ```bash
   npm start
   ```

6. Open <http://localhost:3000>. Pick an example: `/course`, `/test` or `/oh-form`.

The server prints which settings are missing. An example whose id is not set shows a message instead of a frame.

## The sandbox

A sandbox key only sees the **sandbox course** and the **sandbox test**. Anything else answers `404 not_found` or `409`. Set them in `.env`:

| Variable | What it is |
| --- | --- |
| `HB_BASE_URL` | The sandbox address, from the sandbox page of the developer portal |
| `HB_CANDIDATE_REF` | The sandbox candidate that "signs in" in the demo |
| `HB_SANDBOX_COURSE_ID` | The sandbox course |
| `HB_SANDBOX_TEST_ID` | The sandbox test, opened as a `test` session (the test of a course) |
| `HB_OH_REQUEST_ID`, `HB_OH_FORM_SHORTCODE` | An OH request that still has a form to answer, and that form |

> TODO: the Hub team is creating the sandbox course and test. Fill in the final ids and the sandbox URL in `.env.example` and here once they exist, and confirm that `HB_SANDBOX_TEST_ID` is the id to pass for a test session.

## How the pieces fit

```
browser                       your server (server.mjs)                  Hub
  |  POST /api/hb/embed  ----->  hb.embed.handler()  ---- API key ---->  create session
  |  <---- session (launch token, frame URL) ----------------------------
  |  mount() opens the iframe, sends the launch token to it by postMessage
  |  iframe  <------------------------------------------------------>  Hub (content)
  |  events (progress, passed, ...) come back by postMessage
```

- `server.mjs` creates the SDK client (`new HealthierBusiness()` reads `HB_API_KEY` and `HB_BASE_URL`) and one route, `POST /api/hb/embed`, with `hb.embed.handler(...)`. It also serves the pages in `public/` and the SDK's browser file at `/vendor/hb-embed.min.js`.
- `public/course.js`, `public/test.js` and `public/oh-form.js` call `HealthierBusiness.mount(...)`.
- `public/demo.js` only draws the status, result and event log.

## Example 1: course (`/course`)

Shows the sandbox course. A progress bar follows `progress` events and a message appears on `completed`.

Server (`server.mjs`): you decide who is signed in and what they may open.

```js
const embedRoute = hb.embed.handler({
  allowedOrigins: [appOrigin],
  authorize: ({ intent }) => {
    if (intent.kind === 'course' && intent.courseId === demo.courseId) {
      return { candidateRef: demo.candidateRef }; // from your own login, never from the browser
    }
    return null; // 401
  },
});
```

Page (`public/course.js`):

```js
const controller = HealthierBusiness.mount(document.getElementById('frame'), {
  endpoint: '/api/hb/embed',
  kind: 'course',
  courseId: config.courseId,
  onProgress: ({ percent, lessonId }) => setProgress(percent),
  onCompleted: ({ courseId }) => showResult('Course completed'),
  onError: ({ code, message }) => showError(code, message),
  onEvent: ({ name, data }) => { if (name === 'scroll-top') scrollFrameIntoView(); },
});
```

## Example 2: test (`/test`)

Same shape with `kind: 'test'`. The page shows the result of `passed` or `failed`, with `score` and `passMark`.

```js
HealthierBusiness.mount(el, {
  endpoint: '/api/hb/embed',
  kind: 'test',
  courseId: config.testId,
  onPassed: ({ score, passMark }) => showResult('Passed', `Score ${score}, pass mark ${passMark}`),
  onFailed: ({ score, passMark }) => showResult('Not passed', `Score ${score}, pass mark ${passMark}`),
});
```

On the server this ends in `hb.embed.createTestSession({ candidateRef, courseId, origin })`.

## Example 3: occupational health form (`/oh-form`)

Shows one questionnaire of an OH request. The browser sends only the form shortcode. The server returns the numeric request id from `authorize`, so a visitor cannot ask for another person's request.

```js
// server
authorize: ({ intent }) =>
  intent.kind === 'oh_form' && intent.formShortcode === demo.ohFormShortcode
    ? { requestId: demo.ohRequestId }
    : null,

// page
HealthierBusiness.mount(el, {
  endpoint: '/api/hb/embed',
  kind: 'oh_form',
  formShortcode: config.formShortcode,
  onSubmitted: ({ requestId }) => showResult('Form submitted', `Request ${requestId}`),
});
```

On the server this ends in `hb.embed.createOhFormSession({ requestId, formShortcode, origin })`.

## Events

| Event | Callback | Data | Example |
| --- | --- | --- | --- |
| `ready` | `onReady` | `kind` | course, test, OH form |
| `progress` | `onProgress` | `percent`, `lessonId` | course |
| `completed` | `onCompleted` | `courseId` | course |
| `passed` | `onPassed` | `score`, `passMark` | test |
| `failed` | `onFailed` | `score`, `passMark` | test |
| `submitted` | `onSubmitted` | `requestId` | OH form |
| `error` | `onError` | `code`, `message` | all |
| `token-expiring` | `onEvent` | `expires_at` | all; the SDK renews the token for you |
| `scroll-top` | `onEvent` | none | all; the host should scroll the frame into view |

Every event also reaches `onEvent({ name, data })`, which the examples use for the log. The frame resizes itself and the SDK follows, so the page grows with the content. When the frame moves to a new step it can ask the host to bring it back into view with `scroll-top`. The examples handle it in two places: through `onEvent`, and, because the SDK's typed callbacks do not include it, also with a strict window `message` listener in `public/demo.js` that accepts the message only from the exact iframe window and the Hub origin.

## Security model

- **The API key stays on the server.** The server half of the SDK refuses to run in a browser. The browser gets `/vendor/hb-embed.min.js`, which holds no key and cannot call the API.
- **The launch token is single use.** It is valid for 5 minutes, tied to one candidate, one course or form and one website, and sent to the frame by `postMessage`, never in a URL. A refresh replaces it. The SDK refreshes the session for you when the frame sends `token-expiring`.
- **Allowed origins must be registered.** Add your page's address (scheme, host and port, for example `http://localhost:3000`) under **Developer > Embed** in Hub. `allowedOrigins` in `server.mjs` should list the same address. A session is only created for a registered address, and the Hub only lets that address frame the content.
- **The iframe is created by the SDK only.** Do not write your own `<iframe>`; a frame not opened by `mount()` is refused (`frame_invalid`). The SDK sandboxes it and only exchanges messages with its exact window and origin.
- **`authorize` decides access.** The browser says what it wants (`intent`); your server decides for whom. The demo has no login, so everyone is the candidate in `.env`. A real system uses its own session here.
- The pages also send a `Content-Security-Policy` that allows framing only the Hub origin.

## Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| The frame is refused, or the page shows `origin_not_allowed` or a `422` on `origin` | The page's origin is not allowed | Register `http://localhost:3000` (or your `APP_ORIGIN`) under Developer > Embed in Hub, and keep `APP_ORIGIN`, the address in the browser bar and the registered address identical, including the port. |
| The frame is blank, or `frame_timeout` appears | The browser blocked the frame, or the session ended | Check the console for Content-Security-Policy messages (the server allows framing only `HB_BASE_URL`'s origin), turn off ad blockers and privacy extensions for localhost, and check the network tab for the frame request. |
| `session_expired` or `410` | 60 minutes passed without a refresh, or 12 hours in all | Press "Start again" or reload to create a new session. |
| `token_used` or `token_expired` | The launch token was used twice, or sat unused for over 5 minutes | Reload. Each mount creates a new session. |
| `403 session_not_bound` on refresh | The server restarted, or another instance handled the refresh | Reload. With several instances, give the handler a shared `bindings` store (see the SDK README). |
| `401` from `/api/hb/embed` | `authorize` refused | Check that the ids in `.env` are set and match what the page asks for. |
| `404` or `409` when creating a session | The id is not in the sandbox, or the candidate has finished it | Use the sandbox ids. A finished course (`course_not_pending`) cannot be reopened. |
| The server says it cannot start | `HB_API_KEY` or `HB_BASE_URL` missing | Sandbox keys need `HB_BASE_URL`. |

## Using a local copy of the SDK

The SDK may not be published yet. To develop against a local checkout (built with `npm run build` in `hb-sdk`):

```bash
# without touching package.json
npm install --no-save ../hb-sdk

# or link it
cd ../hb-sdk && npm link && cd ../hb-sdk-examples && npm link @healthier-business/hub-sdk
```

`package.json` keeps the normal range `^0.1.0`, so it works unchanged once the package is published. There is no lock file for the same reason (`.npmrc` sets `package-lock=false`).

## License

MIT. See [LICENSE](LICENSE).
