// Example 4: start access, then embed. The page asks the server for the access state and for a start; the server uses the SDK.
// Opening the course is the same HealthierBusiness.mount() as example 1: if access is not in place the embed route refuses with a
// typed error and onError tells you what to do (details.next).
const $ = (id) => document.getElementById(id);
let controller;

const NEXT = {
  start_access: 'Press "Start access" first.',
  pay: 'The candidate has a payment link that is not paid yet. Ask them to pay it, then press "Check again".',
  await_approval: 'A renewal waits for your approval in Hub (or the renewal API). Approve it, then press "Check again".',
  renew: 'The access has ended. Press "Start access" to renew it.',
};

const money = (pence) => `£${(pence / 100).toFixed(2)}`;

async function loadState() {
  const response = await fetch('/api/access/state');
  const body = await response.json();
  if (!response.ok) {
    $('state').textContent = `Could not read the access: ${body.message}`;
    return;
  }
  demo.log('access state', body);
  const lines = body.groups.map((g) => `${g.title}: ${g.status}${g.expiresAt ? ` (until ${g.expiresAt.slice(0, 10)})` : ''}, paid by ${g.payer === 'client' ? 'your credits' : 'the candidate'}`);
  const terms = body.terms.accepted ? `terms accepted (version ${body.terms.version})` : 'terms not accepted yet (the frame shows them first)';
  $('state').textContent = `${lines.join('; ') || 'No course groups'}. Renewal: ${body.renewal.mode}${body.renewal.openRequest ? ', request open' : ''}. ${terms}.`;
}

async function startAccess() {
  $('start').disabled = true;
  $('outcome').hidden = true;
  $('pay').hidden = true;
  demo.setStatus('Starting access...');
  try {
    // One id per press: if this request is repeated, the server starts access and takes credits once.
    const response = await fetch('/api/access/start', { method: 'POST', headers: { 'x-attempt-id': crypto.randomUUID() } });
    const body = await response.json();
    demo.log(`access/start ${response.status}`, body.payment ? { ...body, payment: { ...body.payment, url: '(shown below)' } } : body);

    if (!response.ok) {
      // renewal_approval_required lands here: the request is recorded and the agency is told.
      demo.setStatus(`${body.error}: ${body.message}`, body.error === 'renewal_approval_required' ? '' : 'bad');
      if (body.error === 'renewal_approval_required') showOutcome('Renewal approval required: the agency has been asked. Try again once it is approved.');
      return;
    }
    if (body.outcome === 'enabled') {
      showOutcome(`Access is on for ${body.groups.map((g) => g.title).join(', ')}. You can open the course.`);
      demo.setStatus('Access started.', 'ok');
    } else if (body.outcome === 'none') {
      showOutcome('Nothing needed starting: access is already on.');
      demo.setStatus('Access is already on.', 'ok');
    } else {
      showPayment(body);
      demo.setStatus('The candidate pays; access starts after payment.');
    }
  } catch (error) {
    demo.setStatus(`Could not start access: ${error.message}`, 'bad');
  } finally {
    $('start').disabled = false;
    loadState();
  }
}

function showOutcome(text) {
  $('outcome').textContent = text;
  $('outcome').hidden = false;
}

function showPayment({ outcome, payment, started }) {
  let url;
  try {
    url = new URL(payment.url);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    showOutcome('The server returned a payment link that is not a web address.');
    return;
  }
  const part = outcome === 'partial' ? ` ${started.join(', ')} started now.` : '';
  showOutcome(`${payment.groups.join(', ')}: the candidate pays ${money(payment.amountPence)} (link valid until ${payment.expiresAt.slice(0, 10)}).${part} Your server also gets the access.started webhook when they have paid.`);
  $('pay-link').href = url.href;
  $('pay-link').textContent = 'Open the payment page in a new tab';
  $('pay').hidden = false;
}

function openCourse() {
  controller?.destroy();
  $('result').hidden = true;
  $('frame').hidden = false;
  $('course-status').textContent = 'Opening...';
  $('course-status').className = 'status';

  fetch('/api/config').then((r) => r.json()).then((config) => {
    controller = HealthierBusiness.mount($('frame'), {
      endpoint: '/api/hb/embed',
      kind: 'course',
      courseId: config.courseId,

      onReady: () => { $('course-status').textContent = 'Course is open.'; },
      // The first screen of every frame is the Hub terms for a candidate who has not accepted them.
      onTermsAccepted: ({ version, acceptedAt }) => { $('course-status').textContent = `Terms accepted (version ${version}).`; demo.log('terms-accepted', { version, acceptedAt }); loadState(); },
      onCompleted: ({ courseId }) => demo.showResult('Course completed', `Course ${courseId} is finished. Confirm it on your server (API or webhook) before you issue anything.`),
      onError: ({ code, message, details }) => {
        // The four access errors carry details.next: what your system does next.
        const next = details?.next ? ` ${NEXT[details.next] ?? ''}` : '';
        $('course-status').textContent = `${code}: ${message}${next}`;
        $('course-status').className = 'status bad';
        $('frame').hidden = !controller?.session;
      },
      onEvent: ({ name, data }) => demo.log(name, data),
    });
  });
}

// demo.js writes the access status into #status; the course has its own line.
$('start').addEventListener('click', startAccess);
$('reload').addEventListener('click', loadState);
$('open').addEventListener('click', openCourse);
loadState();
