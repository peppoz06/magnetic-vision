const App = (() => {
  const video = document.getElementById('camera');
  const overlay = document.getElementById('overlay');
  const compass = document.getElementById('compass');
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  const hud = document.getElementById('hud');

  const headingEl = document.getElementById('heading');
  const tiltEl = document.getElementById('tilt');
  const latEl = document.getElementById('lat');
  const lonEl = document.getElementById('lon');
  const barEl = document.getElementById('signal-bar');
  const statusEl = document.getElementById('status');

  let running = false;

  async function start() {
    startBtn.disabled = true;
    startBtn.textContent = 'ATTIVAZIONE...';

    try {
      await Sensors.startCamera(video);
    } catch (e) {
      alert('Camera non disponibile. Controlla permessi e HTTPS/localhost.');
      console.error(e);
      startBtn.disabled = false;
      startBtn.textContent = 'ATTIVA ESPERIENZA';
      return;
    }

    await Sensors.startMotion();
    Sensors.startGPS();
    Renderer.init(overlay, compass);

    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    running = true;
    loop();
  }

  function loop() {
    if (!running) return;
    const s = Sensors.state;
    Renderer.draw(s);

    headingEl.textContent = `${Math.round(s.heading || 0)}°`;
    tiltEl.textContent = `${Math.round(Math.abs(s.tiltX || 0) + Math.abs(s.tiltY || 0))}°`;
    barEl.style.width = `${Math.round((s.signal || .4) * 100)}%`;
    latEl.textContent = s.lat ? `lat ${s.lat.toFixed(4)}` : 'lat --';
    lonEl.textContent = s.lon ? `lon ${s.lon.toFixed(4)}` : 'lon --';
    statusEl.textContent = s.motionReady ? 'percezione magnetica attiva' : 'sensori non calibrati';

    requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', start);
})();
