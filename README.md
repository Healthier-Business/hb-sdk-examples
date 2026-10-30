# Healthier Business Hub SDK examples

Three small, working examples of the [Healthier Business Hub SDK](https://github.com/Healthier-Business/hb-sdk) (`@healthier-business/hub-sdk`): an **online training course**, a **test** and an **occupational health (OH) form**, each shown inline in your own page.

Each example is plain HTML and JavaScript in the browser, plus one tiny Node server (`node:http`, no framework, no dependencies except the SDK). The server holds your API key and creates the embed session. The browser only receives a short-lived, single-use launch token.

## Prerequisites

- Node.js 20.12 or newer
- A Hub **sandbox** API key, asked for from the Hub team (see [The sandbox](#the-sandbox)). It carries the Online Training embed scope.
- For the OH form example only: an Occupational Health request and form of your own, and a key with `occupational-health:embed:create` (the sandbox has none)
- Your page on `http://localhost:3000` (the sandbox accepts it with no set-up; a real account registers its page under **Developer > Embed** in Hub)

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

4. Open `.env` and set `HB_API_KEY`. Everything else is already filled in with the sandbox values. Never commit `.env`.

5. Start the server.

   ```bash
   npm start
   ```

6. Open <http://localhost:3000>. Pick an example: `/course`, `/test` or `/oh-form`.

The server prints which settings are missing. An example whose id is not set shows a message instead of a frame. With the sandbox values only `/course` and `/test` open; `/oh-form` needs values you supply (see below).

## The sandbox

Hub has a fixed sandbox: one dedicated Online Training client. A sandbox key reaches nothing of a real client, and its catalogue holds only the sandbox course (a lorem ipsum course with a five-question test). It lives on the normal Hub address. Anything other than the sandbox course answers `404 not_found`.

| What | Value | `.env` |
| --- | --- | --- |
| Hub address | `https://hub.hbcompliance.co.uk` | `HB_BASE_URL` |
| Client | `900001` | |
| Course (Online Training course id) | `900001`. Used for the course session **and** for the test session | `HB_SANDBOX_COURSE_ID` |
| Test | `900001`. For reference only: a test session is created with the course id, Hub finds the test of that course | `HB_SANDBOX_TEST_ID` |
| Candidate | id `900001`, `candidate_ref` `5a4d0b1e-0000-4000-8000-000000900001` | `HB_CANDIDATE_REF` |
| Pages accepted with no set-up | `http://localhost:3000`, `:5173`, `:8000`, `:8080` | `APP_ORIGIN` |

**The key.** Ask the Hub team for a sandbox key. They issue it with `php artisan sandbox:issue-key`; it is shown once, so store it at once in `.env` as `HB_API_KEY`. The key is never committed and never goes in the browser.

**The OH form is not in the sandbox.** There is no sandbox Occupational Health request, and the sandbox key has no `occupational-health:embed:create` scope. The `/oh-form` example is complete code but cannot run against the sandbox. To try it, supply from an OH account of your own: a key with that scope (`HB_API_KEY`), the numeric id of an OH request that still has a form to answer (`HB_OH_REQUEST_ID`), that form's shortcode from `GET /requests/{id}/questionnaire` (`HB_OH_FORM_SHORTCODE`), and your page's address registered under Developer > Embed. Until then those two variables stay empty.

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
  onScrollTop: () => log('scroll-top'), // the SDK scrolls the page itself; see Events
});
```

## Example 2: test (`/test`)

Same shape with `kind: 'test'`. The page shows the result of `passed` or `failed`, with `score` and `passMark` (both percentages). A test sends no `progress` events.

```js
HealthierBusiness.mount(el, {
  endpoint: '/api/hb/embed',
  kind: 'test',
  courseId: config.courseId, // the COURSE id (900001), not the test id
  onPassed: ({ score, passMark }) => showResult('Passed', `Score ${score}, pass mark ${passMark}`),
  onFailed: ({ score, passMark }) => showResult('Not passed', `Score ${score}, pass mark ${passMark}`),
});
```

On the server this ends in `hb.embed.createTestSession({ candidateRef, courseId, origin })`. `courseId` is the id of the course whose test to open, the same id as for the course session.

## Example 3: occupational health form (`/oh-form`)

Shows one questionnaire of an OH request. It cannot run against the sandbox (see [The sandbox](#the-sandbox)); the code is complete and works with an OH request and key of your own. The browser sends only the form shortcode. The server returns the numeric request id from `authorize`, so a visitor cannot ask for another person's request.

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

| Event | Callback | Data | Sent for |
| --- | --- | --- | --- |
| `ready` | `onReady` | `kind` | course, test, OH form |
| `progress` | `onProgress` | `percent`, `lessonId` | course only |
| `completed` | `onCompleted` | `courseId` | course |
| `passed` | `onPassed` | `score`, `passMark` | test |
| `failed` | `onFailed` | `score`, `passMark` | test |
| `submitted` | `onSubmitted` | `requestId` | OH form |
| `error` | `onError` | `code`, `message` | all |
| `token-expiring` | `onEvent` | `expires_at` | all; the SDK renews the token for you |

Every event also reaches `onEvent({ name, data })`, which the examples use for the log. The payloads are typed by the SDK exactly as the frame sends them.

The frame resizes itself and the SDK follows, so the page grows with the content. When the learner moves to another lesson the frame asks for its top to be in view (`scroll-top`). The SDK handles that for you: by default it scrolls the page so the top of the frame is visible again if it had scrolled away. The examples pass `onScrollTop` only to log the request; pass `scrollIntoView: false` to switch the scrolling off, or return `false` from `onScrollTop` to do your own scrolling (for example under a sticky header).

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
| The frame is refused, or the page shows `origin_not_allowed` or a `422` on `origin` | The page's origin is not allowed | On the sandbox use one of `http://localhost:3000`, `:5173`, `:8000` or `:8080`. On a real account register your `APP_ORIGIN` under Developer > Embed in Hub, and keep `APP_ORIGIN`, the address in the browser bar and the registered address identical, including the port. |
| The frame is blank, or `frame_timeout` appears | The browser blocked the frame, or the session ended | Check the console for Content-Security-Policy messages (the server allows framing only `HB_BASE_URL`'s origin), turn off ad blockers and privacy extensions for localhost, and check the network tab for the frame request. |
| `session_expired` or `410` | 60 minutes passed without a refresh, or 12 hours in all | Press "Start again" or reload to create a new session. |
| `token_used` or `token_expired` | The launch token was used twice, or sat unused for over 5 minutes | Reload. Each mount creates a new session. |
| `403 session_not_bound` on refresh | The server restarted, or another instance handled the refresh | Reload. With several instances, give the handler a shared `bindings` store (see the SDK README). |
| `401` from `/api/hb/embed` | `authorize` refused | Check that the ids in `.env` are set and match what the page asks for. |
| `404` or `409` when creating a session | The id is not in the sandbox, or the candidate has finished it | Use the sandbox ids. A finished course (`course_not_pending`) cannot be reopened. |
| The server says it cannot start | `HB_API_KEY` missing or not valid | Set `HB_API_KEY` in `.env` to the key you were issued. |
| `403` creating the OH session | The sandbox key has no OH scope | The OH example needs a key and request of your own (see The sandbox). |

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
