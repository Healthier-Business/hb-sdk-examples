// Example 1: a course. The page never sees the API key: it asks /api/hb/embed, which the server answers
// with a session created by the SDK, and HealthierBusiness.mount() builds the iframe from it.
let controller;
demo.listenForScrollMessage(() => controller);

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
      demo.setStatus(`${percent}% done (lesson ${lessonId})`);
    },
    onCompleted: ({ courseId }) => {
      demo.setProgress(100);
      demo.setStatus('Course completed.', 'ok');
      demo.showResult('Course completed', `Course ${courseId} is finished. Your system can now unlock the next step.`);
    },
    onError: ({ code, message }) => demo.setStatus(`Error ${code}: ${message}`, 'bad'),

    // Every event, including ones without their own callback such as scroll-top and token-expiring.
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
