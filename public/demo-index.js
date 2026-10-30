fetch('/api/config')
  .then((response) => response.json())
  .then((config) => {
    document.getElementById('env').textContent = `Server is using the ${config.environment} Hub.`;
  });
