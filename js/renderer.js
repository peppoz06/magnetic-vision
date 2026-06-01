const Renderer = (() => {
  let canvas, ctx, compass, cctx;
  let w = 0, h = 0, time = 0;
  const stars = [];

  function init(canvasEl, compassEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d', { alpha: true });
    compass = compassEl;
    cctx = compass.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 180; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4, p: Math.random() * Math.PI * 2 });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = window.innerWidth;
    h = window.innerHeight;
  }

  function draw(state) {
    time += 0.016;
    const heading = state.heading || 0;
    const signal = Math.max(state.signal || 0.45, 0.38);
    const tiltX = state.tiltX || 0;
    const tiltY = state.tiltY || 0;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0, 4, 10, ${0.10 + signal * 0.12})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    drawMagneticMist(signal, heading);
    drawFluidField(heading, signal, tiltX, tiltY);
    drawPulses(heading, signal);
    drawParticles(heading, signal);
    drawInterference(signal, tiltX, tiltY);
    ctx.globalCompositeOperation = 'source-over';
    drawCompass(heading, signal);
  }

  function drawMagneticMist(signal, heading) {
    const cx = w / 2 + Math.sin(time * .55) * 50;
    const cy = h * .55 + Math.cos(time * .42) * 50;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .75);
    g.addColorStop(0, `rgba(216,76,255,${0.10 * signal})`);
    g.addColorStop(.35, `rgba(0,245,255,${0.07 * signal})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate((heading * Math.PI / 180) - Math.PI/2);
    for (let y = -h; y < h; y += 28) {
      const alpha = 0.018 + Math.sin(y * .018 + time * 2) * .012 + signal * .018;
      ctx.fillStyle = `rgba(0,245,255,${alpha})`;
      ctx.fillRect(-w, y, w * 2, 4);
    }
    ctx.restore();
  }

  function drawFluidField(heading, signal, tiltX, tiltY) {
    const base = heading * Math.PI / 180 - Math.PI / 2;
    const cx = w * .5 + Math.sin(time * .8 + tiltY * .02) * 90;
    const cy = h * .55 + Math.cos(time * .6 + tiltX * .02) * 90;

    for (let i = 0; i < 130; i++) {
      const seed = i * 12.989;
      let x = cx + Math.cos(seed) * (20 + i * 1.5);
      let y = cy + Math.sin(seed) * (20 + i * 1.5);
      ctx.beginPath();
      ctx.moveTo(x, y);

      for (let j = 0; j < 96; j++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy) + 0.001;
        const swirl = Math.atan2(dy, dx) + Math.PI / 2;
        const magnetic = base + Math.sin((x + y) * .006 + time + seed) * .75;
        const mix = 0.50 + signal * .35;
        const a = lerpAngle(swirl, magnetic, mix);
        const step = 3.2 + signal * 3.8;
        x += Math.cos(a) * step + Math.sin(dist * .018 + time) * .8;
        y += Math.sin(a) * step + Math.cos(dist * .018 + time) * .8;
        ctx.lineTo(x, y);
      }

      const hue = i % 4 === 0 ? 292 : 184;
      ctx.strokeStyle = `hsla(${hue},100%,${58 + signal * 22}%,${0.035 + signal * .13})`;
      ctx.lineWidth = 0.55 + signal * 1.2;
      ctx.shadowBlur = 8 + signal * 20;
      ctx.shadowColor = hue === 292 ? 'rgba(216,76,255,.7)' : 'rgba(0,245,255,.7)';
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function drawPulses(heading, signal) {
    const base = heading * Math.PI / 180 - Math.PI / 2;
    const centers = [
      { x: w * .5, y: h * .55, off: 0, hue: 186 },
      { x: w * .33 + Math.cos(time) * 80, y: h * .36 + Math.sin(time * .7) * 70, off: 1.7, hue: 292 },
      { x: w * .70 + Math.sin(time * .9) * 70, y: h * .68 + Math.cos(time * .55) * 60, off: 3.1, hue: 205 }
    ];

    centers.forEach(c => {
      const pulse = (time * .65 + c.off) % 1;
      for (let k = 0; k < 7; k++) {
        const r = (pulse * 180 + k * 34) * (0.7 + signal);
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${c.hue},100%,64%,${(1 - Math.min(r / 420, 1)) * .16 * signal})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 55 + signal * 60);
      g.addColorStop(0, `hsla(${c.hue},100%,70%,${.45 * signal})`);
      g.addColorStop(.35, `hsla(${c.hue},100%,60%,${.12 * signal})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(c.x - 160, c.y - 160, 320, 320);

      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(base) * 180, c.y + Math.sin(base) * 180);
      ctx.strokeStyle = `rgba(236,255,255,${.08 * signal})`;
      ctx.stroke();
    });
  }

  function drawParticles(heading, signal) {
    const a = heading * Math.PI / 180 - Math.PI / 2;
    for (const s of stars) {
      const x = ((s.x * w + Math.cos(a) * time * 28 * (0.4 + signal) + w) % w);
      const y = ((s.y * h + Math.sin(a) * time * 28 * (0.4 + signal) + h) % h);
      const tw = .35 + .65 * Math.sin(time * 3 + s.p);
      ctx.beginPath();
      ctx.arc(x, y, s.r * (0.8 + signal), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,245,255,${(.12 + .55 * tw) * signal})`;
      ctx.fill();
    }
  }

  function drawInterference(signal, tiltX, tiltY) {
    const noiseAmount = Math.min(1, (Math.abs(tiltX) + Math.abs(tiltY)) / 130) * signal;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * h;
      const x = Math.random() * w;
      const len = 30 + Math.random() * 160;
      ctx.fillStyle = `rgba(0,119,255,${0.015 + noiseAmount * .045})`;
      ctx.fillRect(x, y, len, 1 + Math.random() * 2);
    }
  }

  function drawCompass(heading, signal) {
    const cw = compass.width, ch = compass.height;
    cctx.clearRect(0, 0, cw, ch);
    const cx = cw/2, cy = ch/2;
    cctx.strokeStyle = `rgba(0,245,255,${.25 + signal * .45})`;
    cctx.lineWidth = 1;
    cctx.beginPath(); cctx.arc(cx, cy, 36, 0, Math.PI*2); cctx.stroke();
    cctx.save();
    cctx.translate(cx, cy);
    cctx.rotate((heading * Math.PI/180));
    cctx.beginPath();
    cctx.moveTo(0, -30); cctx.lineTo(9, 8); cctx.lineTo(0, 3); cctx.lineTo(-9, 8); cctx.closePath();
    cctx.fillStyle = 'rgba(0,245,255,.85)'; cctx.fill();
    cctx.restore();
    cctx.fillStyle = 'rgba(236,255,255,.75)';
    cctx.font = '10px Arial';
    cctx.textAlign = 'center';
    cctx.fillText('N', cx, 13);
  }

  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  return { init, draw };
})();
