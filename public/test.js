// Example 2: the test of a course. Same mount call, with kind: 'test'. A test session needs a fresh launch token,
// so "Start again" creates a new session.
let controller;
demo.listenForScrollMessage(() => controller);

async function start() {
  const config = await demo.loadConfig();
  if (!config.testId) {
    demo.setStatus('HB_SANDBOX_TEST_ID is not set on the server.', 'bad');
    return;
  }
  demo.setStatus('Opening the test...');

  controller = HealthierBusiness.mount(document.getElementById('frame'), {
    endpoint: '/api/hb/embed',
    kind: 'test',
    courseId: config.testId,

    onReady: () => demo.setStatus('Test is open.'),
    onProgress: ({ percent }) => {
      demo.setProgress(percent);
      demo.setStatus(`${percent}% answered`);
    },
    onPassed: ({ score, passMark }) => {
      demo.setStatus('Passed.', 'ok');
      demo.showResult('Passed', `Score ${score}, pass mark ${passMark}.`);
    },
    onFailed: ({ score, passMark }) => {
      demo.setStatus('Not passed.', 'bad');
      demo.showResult('Not passed', `Score ${score}, pass mark ${passMark}.`);
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
