// Small helpers shared by the three pages. Nothing here is part of the SDK: it only draws the status, the result
// and the event log. Each page's own script shows the SDK calls.
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

  async function loadConfig() {
    const response = await fetch('/api/config');
    return response.json();
  }

  window.demo = { log, setStatus, showResult, setProgress, loadConfig };
})();
