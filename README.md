# Healthier Business Hub SDK examples

Four small, working examples of the [Healthier Business Hub SDK](https://www.npmjs.com/package/@healthier-business/hub-sdk) (`@healthier-business/hub-sdk`): an **online training course**, a **test**, an **occupational health (OH) form**, each shown inline in your own page, and **starting a candidate's access** (credits, payment link or renewal approval) before the course opens.

Each example is plain HTML and JavaScript in the browser, plus one tiny Node server (`node:http`, no framework, no dependencies except the SDK). The server holds your API key and creates the embed session. The browser only receives a short-lived, single-use launch token.

## Prerequisites

- Node.js 20.12 or newer
- A sandbox **test key** (`hbk_test_...`) from the developer portal (see [The sandbox](#the-sandbox))
- Your page on `http://localhost:3000` (the sandbox always accepts `http://localhost` on any port; a real account registers its page under **Developer > Embed** in Hub)

## Quick start

1. Clone the repository and go into it.

   ```bash
   git clone <this repository>
   cd hb-sdk-examples
   ```

2. Install. (Example 4 needs SDK 0.2.0. Until that is on npm, see [Using a local copy of the SDK](#using-a-local-copy-of-the-sdk).)

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

6. Open <http://localhost:3000>. Pick an example: `/course`, `/test`, `/oh-form` or `/access`.

The server prints which settings are missing. An example whose id is not set shows a message instead of a frame. With the sandbox values `/course`, `/test` and `/oh-form` all open. `/access` needs a Hub (or sandbox) that supports the access calls; see [Example 4](#example-4-start-access-then-embed-access).

## The sandbox

The sandbox is a safe copy of the Hub API with demo data, run by the Healthier Business developer platform. A sandbox key never reaches the real Hub and nothing is sent or charged.

1. In the developer portal (`https://dev.hbcompliance.co.uk`) create a sandbox and a test key. The key starts `hbk_test_` and is shown once, so store it at once in `.env` as `HB_API_KEY`. It is never committed and never goes in the browser.
2. The sandbox page has an **Embed** section with your exact base URL and the demo ids. `http://localhost` on any port is always allowed, so no origin set-up is needed for this repo.

| What | Value | `.env` |
| --- | --- | --- |
| Sandbox address (the SDK adds `/api/v2`) | `https://dev.hbcompliance.co.uk/sandbox` | `HB_BASE_URL` |
| Candidate | `candidate_ref` `5a4d0b1e-0000-4000-8000-0000000000d1` | `HB_CANDIDATE_REF` |
| Course. Used for the course session **and** for the test session | `1` (courses `1` to `8` work; `9` answers `409 course_not_embeddable`) | `HB_SANDBOX_COURSE_ID` |
| OH request | `999` | `HB_OH_REQUEST_ID` |
| OH form | `clinical_occupational_health` (also `non_clinical_occupational_health`, `student_health`) | `HB_OH_FORM_SHORTCODE` |
| Pages accepted with no set-up | `http://localhost` on any port | `APP_ORIGIN` |

A course or test the candidate has finished answers `409 course_not_pending` until you reset the sandbox in the developer portal.

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
- `access.mjs` and `public/access.js` are example 4: the server routes that read and start access, and the page that uses them.
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
  courseId: config.courseId, // the COURSE id, not a test id
  onPassed: ({ score, passMark }) => showResult('Passed', `Score ${score}, pass mark ${passMark}`),
  onFailed: ({ score, passMark }) => showResult('Not passed', `Score ${score}, pass mark ${passMark}`),
});
```

On the server this ends in `hb.embed.createTestSession({ candidateRef, courseId, origin })`. `courseId` is the id of the course whose test to open, the same id as for the course session.

## Example 3: occupational health form (`/oh-form`)

Shows one questionnaire of an OH request. It runs against the sandbox's demo request `999` (see [The sandbox](#the-sandbox)); on a real account use an OH request and key of your own. The browser sends only the form shortcode. The server returns the numeric request id from `authorize`, so a visitor cannot ask for another person's request.

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

## Example 4: start access, then embed (`/access`)

A course only opens once the candidate's training access is started, the terms are accepted and the access has not ended. The embed never starts access itself: **your server** does, through the API, and the page then opens the course as in example 1.

> **Needs SDK 0.2.0** (`accessStart`, typed access errors, `onTermsAccepted`). It is not on npm yet, so use the local checkout for this example (see [Using a local copy of the SDK](#using-a-local-copy-of-the-sdk)). The Pactyard sandbox does not simulate the access calls yet, so do not expect this page to work against it yet. The page and routes were checked only against a local fake of the Hub.

The page has two steps:

1. **The candidate's access.** It shows the state per course group (`GET /api/access/state`, which calls `hb.onlineTraining.candidates.access()`). **Start access** calls `POST /api/access/start`, which calls `hb.onlineTraining.candidates.accessStart()` with an idempotency key made from one id per button press (a double click starts and charges once). The page shows one of:
   - **enabled**: credits were taken (or the groups were free); the course can be opened.
   - **a payment link**: the candidate pays for the groups. The page shows it as a link that opens in a new tab. The link is shown only in that answer; your server also gets the `online-training.access.started` webhook (`source: "payment"`) when the candidate has paid.
   - **renewal approval**: `409 renewal_approval_required`. The request is recorded and the agency emailed; the page shows the message.
2. **Open the course.** The same `HealthierBusiness.mount()` as example 1. If access is not in place the route answers a typed error and `onError` receives `{ code, message, details }`, with `details.next` (`start_access`, `pay`, `await_approval`, `renew`) saying what to do. The first screen of the frame is the Hub terms for a candidate who has not accepted them: `onTermsAccepted({ version, acceptedAt })` fires when they do, and the log shows it.

```js
// server (access.mjs)
const { data } = await hb.onlineTraining.candidates.accessStart(
  { candidate_ref: candidateRef, body: { return_url } },
  { idempotencyKey: `examples-start-${attempt}` },
);
const result = accessStartResult(data); // switch on result.outcome

// page (public/access.js)
HealthierBusiness.mount(el, {
  endpoint: '/api/hb/embed', kind: 'course', courseId,
  onTermsAccepted: ({ version }) => showTermsAccepted(version),
  onError: ({ code, details }) => showWhatToDo(code, details?.next),
});
```

The server returns the page only what it needs: never the candidate ref or the credit balance. Events such as `completed` can be forged by the person at the browser, so the page only updates the screen: confirm results through the API or a webhook before issuing a certificate.

For a real integration, replace the demo's single candidate with your own login (as in example 1) and give the payment link to the candidate yourself (email or your own page).

## Events

| Event | Callback | Data | Sent for |
| --- | --- | --- | --- |
| `ready` | `onReady` | `kind` | course, test, OH form |
| `progress` | `onProgress` | `percent`, `lessonId` | course only |
| `completed` | `onCompleted` | `courseId` | course |
| `passed` | `onPassed` | `score`, `passMark` | test |
| `failed` | `onFailed` | `score`, `passMark` | test |
| `submitted` | `onSubmitted` | `requestId` | OH form |
| `terms-accepted` | `onTermsAccepted` | `version`, `acceptedAt` | all, for a candidate who had not accepted the terms |
| `error` | `onError` | `code`, `message`, `details` (access codes only) | all |
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
| The frame is refused, or the page shows `origin_not_allowed` or a `422` on `origin` | The page's origin is not allowed | On the sandbox use `http://localhost` on any port. On a real account register your `APP_ORIGIN` under Developer > Embed in Hub, and keep `APP_ORIGIN`, the address in the browser bar and the registered address identical, including the port. |
| The frame is blank, or `frame_timeout` appears | The browser blocked the frame, or the session ended | Check the console for Content-Security-Policy messages (the server allows framing only `HB_BASE_URL`'s origin), turn off ad blockers and privacy extensions for localhost, and check the network tab for the frame request. |
| `session_expired` or `410` | 60 minutes passed without a refresh, or 12 hours in all | Press "Start again" or reload to create a new session. |
| `token_used` or `token_expired` | The launch token was used twice, or sat unused for over 5 minutes | Reload. Each mount creates a new session. |
| `403 session_not_bound` on refresh | The server restarted, or another instance handled the refresh | Reload. With several instances, give the handler a shared `bindings` store (see the SDK README). |
| `401` from `/api/hb/embed` | `authorize` refused | Check that the ids in `.env` are set and match what the page asks for. |
| `course_access_required`, `payment_pending`, `renewal_approval_required` or `access_expired` in the status line or log | The candidate's access is not in place. | Read `details.next`: start access (example 4), have the candidate pay the link, approve the renewal, or renew. |
| `terms_required` in the log | The candidate has not accepted the terms. | The frame shows them first; the candidate accepts there. |
| `/access` fails with `TypeError` or `accessStart is not a function` | The installed SDK is older than 0.2.0. | Use the local checkout of the SDK until 0.2.0 is on npm. |
| `404` or `409` when creating a session | The id is not in the sandbox, or the candidate has finished it | Use the sandbox ids. A finished course (`course_not_pending`) cannot be reopened. |
| The server says it cannot start | `HB_API_KEY` missing or not valid | Set `HB_API_KEY` in `.env` to the key you were issued. |

## Using a local copy of the SDK

The SDK is installed from npm ([`@healthier-business/hub-sdk`](https://www.npmjs.com/package/@healthier-business/hub-sdk)) by `npm install`. Only if you work on the SDK itself, develop against a local checkout (built with `npm run build` in `hb-sdk`):

```bash
# without touching package.json
npm install --no-save ../hb-sdk

# or link it
cd ../hb-sdk && npm link && cd ../hb-sdk-examples && npm link @healthier-business/hub-sdk
```

**Example 4 needs SDK 0.2.0. Until it is published, `npm install` gets 0.1.x, which has no `accessStart`: install the local checkout (`npm install --no-save ../hb-sdk`, built with `npm run build`) before running `/access`.** `package.json` keeps the range `^0.1.0` so that `npm install` keeps working before the release; once 0.2.0 is on npm, change it to `^0.2.0`. There is no lock file (`.npmrc` sets `package-lock=false`), so every install picks the newest matching version.

## License

MIT. See [LICENSE](LICENSE).
