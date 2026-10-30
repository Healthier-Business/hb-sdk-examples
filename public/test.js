// Example 2: the test of a course. Same mount call, with kind: 'test'. The id is the id of the course (as in the course
// example), not the id of the test: Hub finds the test of that course. A launch token works once, so "Start again"
// creates a new session.
let controller;

async function start() {
  const config = await demo.loadConfig();
  if (!config.courseId) {
    demo.setStatus('HB_SANDBOX_COURSE_ID is not set on the server.', 'bad');
    return;
  }
  demo.setStatus('Opening the test...');

  controller = HealthierBusiness.mount(document.getElementById('frame'), {
    endpoint: '/api/hb/embed',
    kind: 'test',
    courseId: config.courseId,

    onReady: () => demo.setStatus('Test is open.'),
    onPassed: ({ score, passMark }) => {
      demo.setStatus('Passed.', 'ok');
      demo.showResult('Passed', `Score ${score}%, pass mark ${passMark}%.`);
    },
    onFailed: ({ score, passMark }) => {
      demo.setStatus('Not passed.', 'bad');
      demo.showResult('Not passed', `Score ${score}%, pass mark ${passMark}%.`);
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
