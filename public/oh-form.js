// Example 3: an occupational health form. The browser names the form (formShortcode); the server decides which
// OH request it belongs to, so the page cannot open somebody else's request.
let controller;

async function start() {
  const config = await demo.loadConfig();
  if (!config.formShortcode) {
    demo.setStatus('HB_OH_FORM_SHORTCODE is not set on the server.', 'bad');
    return;
  }
  demo.setStatus('Opening the form...');

  controller = HealthierBusiness.mount(document.getElementById('frame'), {
    endpoint: '/api/hb/embed',
    kind: 'oh_form',
    formShortcode: config.formShortcode,

    onReady: () => demo.setStatus('Form is open.'),
    onSubmitted: ({ requestId }) => {
      demo.setStatus('Form submitted.', 'ok');
      demo.showResult('Form submitted', `Occupational health request ${requestId} received the answers.`);
    },
    onError: ({ code, message }) => demo.setStatus(`Error ${code}: ${message}`, 'bad'),

    onEvent: ({ name, data }) => demo.log(name, data),

    // The frame asks for its top to be in view when the learner moves on. The SDK scrolls the page for you (turn it off with
    // scrollIntoView: false); this hook only logs it. Return false from it to skip the default scroll.
    onScrollTop: () => demo.log('scroll-top'),
  });
}

document.getElementById('restart').addEventListener('click', () => {
  controller?.destroy();
  document.getElementById('result').hidden = true;
  start();
});
start();
