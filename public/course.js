// Example 1: a course. The page never sees the API key: it asks /api/hb/embed, which the server answers
// with a session created by the SDK, and HealthierBusiness.mount() builds the iframe from it.
let controller;

async function start() {
  const config = await demo.loadConfig();
  if (!config.courseId) {
    demo.setStatus('HB_SANDBOX_COURSE_ID is not set on the server.', 'bad');
    return;
  }
  demo.setStatus('Opening the course...');

  controller = HealthierBusiness.mount(document.getElementById('frame'), {
    endpoint: '/api/hb/embed',
    kind: 'course',
    courseId: config.courseId,

    onReady: () => demo.setStatus('Course is open.'),
    onProgress: ({ percent, lessonId }) => {
      demo.setProgress(percent);
      demo.setStatus(`${percent}% done (lesson ${lessonId ?? 'not started'})`);
    },
    onCompleted: ({ courseId }) => {
      demo.setProgress(100);
      demo.setStatus('Course completed.', 'ok');
      demo.showResult('Course completed', `Course ${courseId} is finished. Your system can now unlock the next step.`);
    },
    onError: ({ code, message }) => demo.setStatus(`Error ${code}: ${message}`, 'bad'),

    // Every event, including ones without their own callback such as token-expiring.
    onEvent: ({ name, data }) => demo.log(name, data),

    // The frame asks for its top to be in view when the learner moves on. The SDK scrolls the page for you (turn it off with
    // scrollIntoView: false); this hook only logs it. Return false from it to skip the default scroll.
    onScrollTop: () => demo.log('scroll-top'),
  });
}

document.getElementById('restart').addEventListener('click', () => {
  controller?.destroy();
  document.getElementById('result').hidden = true;
  demo.setProgress(0);
  start();
});
start();
