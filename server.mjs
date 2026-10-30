// One small server for all three examples. It holds the API key, creates embed sessions with the SDK
// and serves the static pages in ./public. No framework, no extra dependencies.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HealthierBusiness } from '@healthier-business/hub-sdk';

try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: the variables may come from the shell instead.
}

const env = process.env;
const port = Number(env.PORT ?? 3000);
const appOrigin = env.APP_ORIGIN ?? `http://localhost:${port}`;
const publicDir = fileURLToPath(new URL('./public/', import.meta.url));

// The server half of the SDK. It reads HB_API_KEY and HB_BASE_URL from the environment.
// It refuses to run in a browser, which is why the key lives here.
let hb;
try {
  hb = new HealthierBusiness();
} catch (error) {
  console.error(`Cannot start: ${error.message}`);
  console.error('Copy .env.example to .env and set HB_API_KEY and HB_BASE_URL.');
  process.exit(1);
}

/** What each example shows. Ids come from the environment; the browser only learns the non-secret ones. */
const demo = {
  courseId: Number(env.HB_SANDBOX_COURSE_ID) || null,
  testId: Number(env.HB_SANDBOX_TEST_ID) || null,
  candidateRef: env.HB_CANDIDATE_REF || null,
  ohRequestId: Number(env.HB_OH_REQUEST_ID) || null,
  ohFormShortcode: env.HB_OH_FORM_SHORTCODE || null,
};

/**
 * Your own login decides who is signed in. This demo has no login: everybody is the one candidate from .env.
 * The browser only says what it wants to open (`intent`); who it is for comes from here, never from the browser.
 * Anything other than the configured sandbox content is refused.
 */
function authorize({ intent }) {
  if (intent.action === 'refresh') {
    // The handler checks that the session belongs to this person.
    return demo.candidateRef ? { candidateRef: demo.candidateRef } : null;
  }
  if (intent.kind === 'course' && intent.courseId === demo.courseId && demo.candidateRef) {
    return { candidateRef: demo.candidateRef };
  }
  if (intent.kind === 'test' && intent.courseId === demo.testId && demo.candidateRef) {
    return { candidateRef: demo.candidateRef };
  }
  if (intent.kind === 'oh_form' && intent.formShortcode === demo.ohFormShortcode && demo.ohRequestId) {
    return { requestId: demo.ohRequestId };
  }
  return null;
}

// A Fetch API route: Request in, Response out. It creates and refreshes sessions.
const embedRoute = hb.embed.handler({
  allowedOrigins: [appOrigin],
  authorize,
  onError: (error) => console.error('embed error:', error),
});

// The pages may only frame the Hub. This is also the first thing to check when a frame stays blank.
const hubOrigin = new URL(hb.baseUrl).origin;
const securityHeaders = {
  'content-security-policy': `default-src 'self'; frame-src ${hubOrigin}; img-src 'self' data:; object-src 'none'; base-uri 'none'`,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

const pages = { '/': 'index.html', '/course': 'course.html', '/test': 'test.html', '/oh-form': 'oh-form.html' };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Node request to Fetch API Request, so the SDK's handler can be used as it is. */
async function toFetchRequest(req) {
  const body = await readBody(req);
  return new Request(`${appOrigin}${req.url}`, { method: req.method, headers: req.headers, body: body.length ? body : undefined });
}

async function sendFile(res, path, type) {
  const content = await readFile(path);
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache', ...securityHeaders });
  res.end(content);
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, appOrigin);
  try {
    if (pathname === '/api/hb/embed') {
      const response = await embedRoute(await toFetchRequest(req));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }

    if (pathname === '/api/config' && req.method === 'GET') {
      // Non-secret values only: never the key, the candidate or the OH request.
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ courseId: demo.courseId, testId: demo.testId, formShortcode: demo.ohFormShortcode, environment: hb.environment }));
      return;
    }

    if (pathname === '/vendor/hb-embed.min.js') {
      // The browser half of the SDK, taken from the installed package. It holds no key.
      const bundle = fileURLToPath(import.meta.resolve('@healthier-business/hub-sdk/browser/iife'));
      await sendFile(res, bundle, types['.js']);
      return;
    }

    const page = pages[pathname];
    const file = page ?? pathname.slice(1);
    const full = normalize(join(publicDir, file));
    if (req.method === 'GET' && full.startsWith(publicDir) && types[extname(full)]) {
      await sendFile(res, full, types[extname(full)]);
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Server error');
  }
});

server.listen(port, () => {
  console.log(`Healthier Business SDK examples on ${appOrigin}`);
  console.log(`Hub: ${hb.baseUrl} (${hb.environment}, key ${hb.keyPrefix})`);
  const missing = Object.entries({ HB_CANDIDATE_REF: demo.candidateRef, HB_SANDBOX_COURSE_ID: demo.courseId, HB_SANDBOX_TEST_ID: demo.testId, HB_OH_REQUEST_ID: demo.ohRequestId, HB_OH_FORM_SHORTCODE: demo.ohFormShortcode })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    console.log(`Not set (those examples will not open): ${missing.join(', ')}`);
  }
});
