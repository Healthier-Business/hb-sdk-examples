// Example 5: sensitive areas need the Hub's approval. Check where you stand, and handle the refusals.
// Run with: HB_API_KEY=hbk_... node api-access.mjs   (a sandbox key also needs HB_BASE_URL, see the README)
// Needs SDK 0.3.0 or newer.
import { ApiAccessError, HealthierBusiness, WebhookEventsNotApprovedError } from '@healthier-business/hub-sdk';

const hb = new HealthierBusiness(); // reads HB_API_KEY and HB_BASE_URL

/** What the person running your tool should do for each state, in plain words. */
const NEXT_STEP = {
  not_requested: 'Ask for access in the Hub under Developer > API access.',
  pending: 'Your request is waiting for review. You will be emailed the decision.',
  rejected: 'The request was not approved. Read the reason in the Hub, where you can send a new one.',
  revoked: 'Access was withdrawn. Read the reason in the Hub, where you can send a new request.',
};

// 1. Where do we stand? Works with any valid key, no scope needed. Read the list, never hard-code the areas.
const { data: areas } = await hb.account.apiAccess.get();
for (const area of areas.filter((a) => a.sensitive)) {
  console.log(`${area.label} (${area.area}): ${area.status}${area.decided_at ? ` since ${area.decided_at}` : ''}`);
}
const approved = new Set(areas.filter((a) => a.status === 'approved' || a.status === 'not_required').map((a) => a.area));

// 2. Call an area, and treat the four api_access_* codes as a configuration problem, not an outage. They are never retried.
try {
  const page = await hb.occupationalHealth.requests.list({ per_page: 5 });
  console.log(`${page.meta.total} Occupational Health requests`);
} catch (e) {
  if (e instanceof ApiAccessError) {
    // e.code: api_access_not_approved | api_access_pending | api_access_rejected | api_access_revoked
    console.warn(`${e.areas.join(', ')} needs approval (${e.code}). ${NEXT_STEP[e.state]}`);
    console.warn(`More: ${e.docsUrl}  (request id ${e.requestId})`);
  } else {
    throw e;
  }
}

// 3. Webhook endpoints for a sensitive area: create them only once the area is approved, and handle the refusal anyway.
if (approved.has('occupational-health')) {
  try {
    const endpoint = await hb.webhooks.endpoints.create({ body: { url: 'https://example.com/hooks/hub', events: ['occupational-health.request.submitted'] } });
    console.log('Webhook endpoint', endpoint.data.id);
  } catch (e) {
    if (e instanceof WebhookEventsNotApprovedError) console.warn('These events are not approved:', e.events.join(', '));
    else throw e;
  }
} else {
  console.log('Skipping the Occupational Health webhook endpoint until the area is approved.');
}

// 4. To see the refusals without a real account, call the sandbox with a simulated state:
//    await hb.occupationalHealth.requests.list({}, { headers: { 'X-HB-Simulate-Access': 'pending' } });
//    (not_approved | pending | rejected | revoked; the sandbox itself is always open)
