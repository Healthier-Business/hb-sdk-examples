// Small helpers shared by the three pages. Nothing here is part of the SDK: it only draws the status, the result
// and the event log, and passes the "scroll-top" request on. Each page's own script shows the SDK calls.
(function () {
  const $ = (id) => document.getElementById(id);

  function log(name, data) {
    const time = new Date().toLocaleTimeString();
    $('log').textContent += `${time}  ${name}  ${data === undefined ? '' : JSON.stringify(data)}\n`;
    $('log').scrollTop = $('log').scrollHeight;
  }

  function setStatus(text, kind) {
    const el = $('status');
    el.textContent = text;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  function showResult(title, details) {
    $('result-title').textContent = title;
    $('result-details').textContent = details || '';
    $('result').hidden = false;
  }

  function setProgress(percent) {
    $('bar').style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  // The frame asks the host page to scroll it back into view (for example after "next question").
  // The SDK passes the frame's events to onEvent; this handles the request by scrolling the iframe's box.
  function scrollFrameIntoView() {
    $('frame').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // The same request can also arrive as a bare window message. Accept it only from the exact frame window and origin.
  function listenForScrollMessage(getController) {
    window.addEventListener('message', (event) => {
      const controller = getController();
      const iframe = $('frame').querySelector('iframe');
      if (!controller || !controller.session || !iframe || event.source !== iframe.contentWindow) return;
      if (event.origin !== new URL(controller.session.frameUrl).origin) return;
      const data = event.data;
      if (data && data.hb === 1 && (data.type === 'scroll-top' || (data.type === 'event' && data.name === 'scroll-top'))) {
        log('scroll-top (window message)');
        scrollFrameIntoView();
      }
    });
  }

  async function loadConfig() {
    const response = await fetch('/api/config');
    return response.json();
  }

  window.demo = { log, setStatus, showResult, setProgress, scrollFrameIntoView, listenForScrollMessage, loadConfig };
})();
