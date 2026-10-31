// Example 4 server routes: read the candidate's access state and start access, with the SDK.
// Fetch API style (Request in, Response out), like hb.embed.handler(), so it is easy to test without a network.
// Only what the page needs is returned: never the candidate ref, credit balances or anything else from the Hub.
import { ApiError, accessStartResult } from '@healthier-business/hub-sdk';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** The error the page may see: the stable code, the Hub's message and the SDK's hint. */
function problem(error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return json(error.status, { error: error.code, message: error.message, hint: error.hint });
  }
  if (error instanceof ApiError && error.code === 'payments_unavailable') {
    return json(503, { error: error.code, message: error.message });
  }
  console.error('access error:', error);
  return json(502, { error: 'hub_unavailable', message: 'The learning service is not reachable right now. Try again shortly.' });
}

/** The state of each course group, the terms and the renewal. */
function publicState(state) {
  return {
    groups: state.groups.map((g) => ({ groupId: g.group_id, title: g.title, payer: g.payer, status: g.status, expiresAt: g.expires_at, renewal: g.renewal })),
    terms: { accepted: state.terms.accepted, version: state.terms.version, acceptedAt: state.terms.accepted_at },
    renewal: { mode: state.renewal.mode, openRequest: state.renewal.open_request },
  };
}

/** What starting access did, in the words the page needs. `result` is typed by the SDK. */
function publicOutcome(result) {
  switch (result.outcome) {
    case 'enabled':
      return { outcome: 'enabled', groups: result.groups.map((g) => ({ title: g.title, expiresAt: g.expires_at })) };
    case 'none':
      return { outcome: 'none' };
    case 'payment_required':
    case 'partial':
      // payment.url is shown only in this answer. Give it to the candidate now; a real system emails it or shows it once.
      return {
        outcome: result.outcome,
        payment: { url: result.payment.url, expiresAt: result.payment.expires_at, amountPence: result.payment.amount_gross_pence, groups: result.payment.groups.map((g) => g.title) },
        started: result.started.groups.map((g) => g.title),
      };
  }
}

/**
 * @param {{ hb: import('@healthier-business/hub-sdk').HealthierBusiness, candidateRef: string | null, returnUrl: string }} options
 * @returns {(request: Request, pathname: string) => Promise<Response | null>} null when the path is not one of these routes.
 */
export function createAccessRoutes({ hb, candidateRef, returnUrl }) {
  return async (request, pathname) => {
    if (pathname !== '/api/access/state' && pathname !== '/api/access/start') return null;
    // Your own login decides who this is. The demo has one candidate; the browser never says who.
    if (!candidateRef) return json(500, { error: 'not_configured', message: 'HB_CANDIDATE_REF is not set on the server.' });

    try {
      if (pathname === '/api/access/state') {
        if (request.method !== 'GET') return json(405, { error: 'method_not_allowed', message: 'Use GET.' });
        const { data } = await hb.onlineTraining.candidates.access({ candidate_ref: candidateRef });
        return json(200, publicState(data));
      }

      if (request.method !== 'POST') return json(405, { error: 'method_not_allowed', message: 'Use POST.' });
      // One id per press of the button: a double click or a retry sends the same id, so access is started (and credits taken) once.
      const attempt = request.headers.get('x-attempt-id') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(attempt)) return json(400, { error: 'bad_request', message: 'Send an X-Attempt-Id header (a uuid) for each press.' });

      const { data } = await hb.onlineTraining.candidates.accessStart(
        { candidate_ref: candidateRef, body: { return_url: returnUrl } },
        { idempotencyKey: `examples-start-${attempt}` },
      );
      return json(200, publicOutcome(accessStartResult(data)));
    } catch (error) {
      // renewal_approval_required (409) arrives here as an ApiError: the page shows its message.
      return problem(error);
    }
  };
}
