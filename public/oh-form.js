// Example 3: an occupational health form. The browser names the form (formShortcode); the server decides which
// OH request it belongs to, so the page cannot open somebody else's request.
let controller;
demo.listenForScrollMessage(() => controller);

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
    onProgress: ({ percent }) => {
      demo.setProgress(percent);
      demo.setStatus(`${percent}% of the form done`);
    },
    onSubmitted: ({ requestId }) => {
      demo.setProgress(100);
      demo.setStatus('Form submitted.', 'ok');
      demo.showResult('Form submitted', `Occupational health request ${requestId} received the answers.`);
    },
    onError: ({ code, message }) => demo.setStatus(`Error ${code}: ${message}`, 'bad'),

    onEvent: ({ name, data }) => {
      demo.log(name, data);
      if (name === 'scroll-top') {
        demo.scrollFrameIntoView();
      }
    },
  });
}

document.getElementById('restart').addEventListener('click', () => {
  controller?.destroy();
  document.getElementById('result').hidden = true;
  demo.setProgress(0);
  start();
});
start();
