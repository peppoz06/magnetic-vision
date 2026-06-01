const video = document.getElementById("camera");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const headingEl = document.getElementById("heading");
const latEl = document.getElementById("lat");
const lonEl = document.getElementById("lon");
const intensityEl = document.getElementById("intensity");

let width, height;

let heading = 0;
let pitch = 0;
let roll = 0;

let latitude = null;
let longitude = null;

let particles = [];

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment"
    },
    audio: false
  });

  video.srcObject = stream;
}

async function requestSensors() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const permission = await DeviceOrientationEvent.requestPermission();

    if (permission !== "granted") {
      alert("Permesso sensori negato.");
      return;
    }
  }

  window.addEventListener("deviceorientation", handleOrientation, true);
}

function handleOrientation(event) {
  if (event.webkitCompassHeading !== undefined) {
    heading = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    heading = 360 - event.alpha;
  }

  pitch = event.beta || 0;
  roll = event.gamma || 0;

  headingEl.textContent = heading.toFixed(1);
}

function requestGPS() {
  if (!navigator.geolocation) return;

  navigator.geolocation.watchPosition(
    (pos) => {
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;

      latEl.textContent = latitude.toFixed(4);
      lonEl.textContent = longitude.toFixed(4);
    },
    () => {
      latEl.textContent = "non disponibile";
      lonEl.textContent = "non disponibile";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );
}

function estimateMagneticInclination(lat) {
  if (lat === null) return 0;

  // Approssimazione poetica/scientificamente informata:
  // vicino ai poli il campo è più verticale,
  // vicino all'equatore più orizzontale.
  return Math.sin((lat * Math.PI) / 180);
}

function createParticles() {
  particles = [];

  for (let i = 0; i < 220; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1.5 + 0.3,
      offset: Math.random() * Math.PI * 2
    });
  }
}

function drawMagneticField(time) {
  ctx.clearRect(0, 0, width, height);

  const inclination = estimateMagneticInclination(latitude);
  const angle = ((heading - 90) * Math.PI) / 180;

  const movementInfluence = Math.sin((pitch + roll) * 0.04);
  const intensity = Math.abs(inclination) + Math.abs(movementInfluence) * 0.5;

  intensityEl.textContent = intensity.toFixed(2);

  drawRetinalFilter(angle, inclination, intensity, time);
  drawFieldLines(angle, inclination, intensity, time);
  drawParticles(angle, intensity, time);
}

function drawRetinalFilter(angle, inclination, intensity, time) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    20,
    width / 2,
    height / 2,
    width * 0.8
  );

  gradient.addColorStop(0, `rgba(80, 180, 255, ${0.08 + intensity * 0.05})`);
  gradient.addColorStop(0.5, `rgba(120, 0, 255, ${0.04 + intensity * 0.04})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);

  for (let y = -height; y < height; y += 26) {
    const alpha =
      0.04 +
      0.06 *
        Math.sin(y * 0.03 + time * 0.002 + inclination * Math.PI);

    ctx.fillStyle = `rgba(80, 220, 255, ${alpha})`;
    ctx.fillRect(-width, y, width * 2, 6);
  }

  ctx.restore();
}

function drawFieldLines(angle, inclination, intensity, time) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);

  ctx.lineWidth = 1.2;

  for (let i = -width; i < width; i += 45) {
    ctx.beginPath();

    for (let y = -height; y < height; y += 20) {
      const wave =
        Math.sin(y * 0.01 + time * 0.001 + i * 0.02) *
        35 *
        (1 + intensity);

      const x = i + wave + inclination * 80;

      if (y === -height) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = `rgba(120, 220, 255, ${0.12 + intensity * 0.08})`;
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles(angle, intensity, time) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  for (const p of particles) {
    p.x += dx * p.speed * (1 + intensity);
    p.y += dy * p.speed * (1 + intensity);

    p.x += Math.sin(time * 0.002 + p.offset) * 0.4;
    p.y += Math.cos(time * 0.002 + p.offset) * 0.4;

    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180, 240, 255, ${0.35 + intensity * 0.25})`;
    ctx.fill();
  }
}

function animate(time) {
  drawMagneticField(time);
  requestAnimationFrame(animate);
}

startBtn.addEventListener("click", async () => {
  await startCamera();
  await requestSensors();
  requestGPS();

  createParticles();
  animate();

  startBtn.style.display = "none";
});