const Sensors = (() => {
  const state = {
    heading: 0,
    tiltX: 0,
    tiltY: 0,
    lat: null,
    lon: null,
    gpsReady: false,
    motionReady: false,
    cameraReady: false,
    signal: 0.55
  };

  let smoothHeading = 0;

  async function startCamera(video) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    state.cameraReady = true;
  }

  async function startMotion() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') return false;
    }

    window.addEventListener('deviceorientation', (e) => {
      let raw = 0;
      if (e.webkitCompassHeading !== undefined) raw = e.webkitCompassHeading;
      else raw = (360 - (e.alpha || 0)) % 360;

      let diff = raw - smoothHeading;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      smoothHeading = (smoothHeading + diff * 0.08 + 360) % 360;

      state.heading = smoothHeading;
      state.tiltX = e.beta || 0;
      state.tiltY = e.gamma || 0;

      const northDiff = Math.abs(((state.heading + 180) % 360) - 180);
      const northSignal = Math.pow(1 - northDiff / 180, 2.2);
      const motionSignal = Math.min(1, (Math.abs(state.tiltX) + Math.abs(state.tiltY)) / 120);
      state.signal = Math.max(0.35, Math.min(1, northSignal * 0.65 + motionSignal * 0.35 + 0.25));
      state.motionReady = true;
    }, true);

    return true;
  }

  function startGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition((pos) => {
      state.lat = pos.coords.latitude;
      state.lon = pos.coords.longitude;
      state.gpsReady = true;
    }, () => {}, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
  }

  return { state, startCamera, startMotion, startGPS };
})();
