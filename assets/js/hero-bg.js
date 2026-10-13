/**
 * THE KNIGHT CLUB — Custom Hero Background
 * Animated canvas: flowing aurora + grid + floating orbs + shooting stars
 * Pure vanilla JS/Canvas — no library dependency
 *
 * Low-power devices (see perf-mode.js, loaded before this script) get a
 * single static frame instead of the animation loop: same art, drawn once,
 * no requestAnimationFrame, no mousemove listeners, no per-frame GC churn.
 *
 * R1 fix (theme-specific overrides, item I): on the home page in dark mode,
 * site.css's "DARK HERO" block (`html:not([data-site-theme="light"])
 * .home-page #hero-canvas { opacity: 0; }`) intentionally hides this canvas
 * and shows a static wave-SVG hero background instead — that CSS is correct
 * and deliberate (see its own comment), but this script didn't know about
 * it, so it still ran the full draw loop — resize listener, two mousemove
 * listeners, requestAnimationFrame every frame — forever, for a canvas that
 * was never visible. It now checks the same condition the CSS uses and
 * skips/stops the loop while hidden, and starts it (if not already running)
 * when the canvas becomes visible — including the public-site theme toggle,
 * which flips data-site-theme live without a page reload, and bfcache
 * restores, which can land on either theme.
 */
(function initHeroBG() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  // Only the home page's dark theme hides this canvas via CSS (see comment
  // above); any other page/theme combination keeps the previous behaviour.
  function hiddenByDarkHeroCSS() {
    return (
      document.body.classList.contains('home-page') &&
      document.documentElement.getAttribute('data-site-theme') !== 'light'
    );
  }
  const LOW_POWER = window.KC_LOW_POWER === true;
  const ctx = canvas.getContext('2d');
  let W, H, raf, mouse = { x: 0.5, y: 0.5 };
  let orbs = [], stars = [], gridLines = [];
  let tick = 0;

  // Public-site Light/Dark (set by site-theme-init.js on <html>).
  const isLight = () => document.documentElement.getAttribute('data-site-theme') === 'light';

  // ---- Resize ----
  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildGrid();
  }

  // ---- Grid lines (perspective) ----
  function buildGrid() {
    gridLines = [];
    const cols = 14, rows = 10;
    for (let i = 0; i <= cols; i++) {
      gridLines.push({ type: 'v', t: i / cols });
    }
    for (let j = 0; j <= rows; j++) {
      gridLines.push({ type: 'h', t: j / rows });
    }
  }

  // ---- Orbs ----
  function makeOrb() {
    return {
      x: Math.random(),
      y: Math.random(),
      r: 0.08 + Math.random() * 0.18,
      hue: 255 + Math.random() * 40,
      sat: 70 + Math.random() * 30,
      alpha: 0.12 + Math.random() * 0.18,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004
    };
  }

  function initOrbs() {
    // Fewer orbs on low-power devices: still get the aurora look, far less
    // per-frame gradient work (gradients are the most expensive draw call here).
    orbs = Array.from({ length: LOW_POWER ? 3 : 6 }, makeOrb);
  }

  // ---- Shooting stars ----
  function makeStar() {
    return {
      x: Math.random(),
      y: Math.random() * 0.6,
      len: 0.06 + Math.random() * 0.1,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
      speed: 0.004 + Math.random() * 0.006,
      alpha: 0,
      life: 0,
      maxLife: 60 + Math.floor(Math.random() * 60),
      active: false,
      delay: Math.floor(Math.random() * 300)
    };
  }

  function initStars() {
    stars = Array.from({ length: 5 }, makeStar);
  }

  // ---- Draw aurora blobs ----
  function drawAurora() {
    const light = isLight();
    orbs.forEach(o => {
      const pulse = Math.sin(tick * o.speed + o.phase);
      const r = (o.r + pulse * 0.02) * Math.min(W, H);
      const x = (o.x + mouse.x * 0.03) * W;
      const y = (o.y + mouse.y * 0.02) * H;
      // Light mode: much lower alpha so these read as a faint premium
      // shimmer rather than visible colored blobs on the white base.
      const alpha = light ? (o.alpha + pulse * 0.04) * 0.35 : o.alpha + pulse * 0.04;

      // Light mode: pull the hue range toward periwinkle/indigo (no magenta).
      const hue = light ? 236 + (o.hue - 255) * 0.45 : o.hue;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `hsla(${hue}, ${o.sat}%, 65%, ${alpha})`);
      grad.addColorStop(0.5, `hsla(${hue + 15}, ${o.sat - 10}%, 55%, ${alpha * 0.5})`);
      grad.addColorStop(1, `hsla(${hue}, ${o.sat}%, 40%, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // drift
      o.x += o.vx + Math.sin(tick * 0.001 + o.phase) * 0.0001;
      o.y += o.vy + Math.cos(tick * 0.0013 + o.phase) * 0.0001;
      if (o.x < -0.2) o.x = 1.2;
      if (o.x > 1.2) o.x = -0.2;
      if (o.y < -0.2) o.y = 1.2;
      if (o.y > 1.2) o.y = -0.2;
    });
  }

  // ---- Draw perspective grid ----
  function drawGrid() {
    const horizon = H * 0.52;
    const vanishX = W * (0.5 + (mouse.x - 0.5) * 0.08);
    // Light mode: the technical grid should be barely-there, not a visible
    // perspective floor — restrained per the Scale To Sky reference.
    const fade = isLight() ? 0.022 : 0.06;

    ctx.save();
    gridLines.forEach(line => {
      if (line.type === 'v') {
        // vertical lines converge to vanishing point
        const bx = line.t * W;
        const progress = (bx - vanishX) / W;
        const spread = W * 0.5;
        ctx.beginPath();
        ctx.moveTo(vanishX + progress * 1, horizon);
        ctx.lineTo(bx, H);
        const alpha = fade * (1 - Math.abs(progress) * 1.2);
        if (alpha > 0) {
          ctx.strokeStyle = `rgba(139, 69, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      } else {
        // horizontal lines
        const py = horizon + (line.t) * (H - horizon);
        if (py < horizon) return;
        const depthT = (py - horizon) / (H - horizon);
        const alpha = fade * depthT * depthT;
        if (alpha < 0.003) return;
        // perspective: wider at bottom
        const xL = vanishX - (vanishX) * depthT;
        const xR = vanishX + (W - vanishX) * depthT;
        ctx.beginPath();
        ctx.moveTo(xL, py);
        ctx.lineTo(xR, py);
        ctx.strokeStyle = `rgba(139, 69, 255, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // ---- Draw shooting stars ----
  function drawShootingStars() {
    if (isLight()) return; // a starfield motif doesn't fit the Light atmosphere
    stars.forEach(s => {
      if (!s.active) {
        s.delay--;
        if (s.delay <= 0) {
          s.active = true;
          s.x = 0.1 + Math.random() * 0.6;
          s.y = 0.05 + Math.random() * 0.35;
          s.life = 0;
          s.delay = 180 + Math.floor(Math.random() * 400);
        }
        return;
      }
      s.life++;
      const t = s.life / s.maxLife;
      s.alpha = t < 0.2 ? t / 0.2 : t > 0.75 ? (1 - t) / 0.25 : 1;

      const x1 = s.x * W;
      const y1 = s.y * H;
      const dx = Math.cos(s.angle) * s.len * W;
      const dy = Math.sin(s.angle) * s.len * W;

      const grad = ctx.createLinearGradient(x1, y1, x1 + dx, y1 + dy);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(0.4, `rgba(192, 160, 255, ${s.alpha * 0.9})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${s.alpha})`);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + dx, y1 + dy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(x1 + dx, y1 + dy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.8})`;
      ctx.fill();

      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;

      if (s.life >= s.maxLife) {
        s.active = false;
        s.life = 0;
      }
    });
  }

  // ---- Draw floating dust particles ----
  let dust = [];
  function initDust() {
    // Dust particles are the single biggest per-frame cost (80 arcs + fills).
    // Cut hard on low-power devices; skip entirely isn't needed since this
    // path only runs for the single static frame anyway when LOW_POWER.
    dust = Array.from({ length: LOW_POWER ? 24 : 80 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.5,
      alpha: 0.1 + Math.random() * 0.3,
      vy: -0.0002 - Math.random() * 0.0003,
      vx: (Math.random() - 0.5) * 0.0001,
      phase: Math.random() * Math.PI * 2
    }));
  }

  function drawDust() {
    const light = isLight();
    dust.forEach(d => {
      const flicker = 0.7 + 0.3 * Math.sin(tick * 0.05 + d.phase);
      // Light mode: dust reads as visible specks on a white background,
      // so it's dimmed to a faint shimmer instead of removed outright.
      const a = light ? d.alpha * flicker * 0.3 : d.alpha * flicker;
      ctx.beginPath();
      ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(196, 181, 253, ${a})`;
      ctx.fill();
      d.y += d.vy;
      d.x += d.vx + Math.sin(tick * 0.002 + d.phase) * 0.00008;
      if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
    });
  }

  // ---- Nebula streaks ----
  // Light mode: a restrained two-tone atmosphere (soft lavender + warm
  // cream glow) instead of the Dark "deep space" nebula — Dark's draw
  // path and values below are untouched.
  function drawNebula() {
    if (isLight()) {
      const g1 = ctx.createRadialGradient(W * 0.28, H * 0.12, 0, W * 0.28, H * 0.12, W * 0.55);
      g1.addColorStop(0, `rgba(109, 61, 245, 0.13)`);
      g1.addColorStop(1, `rgba(109, 61, 245, 0)`);
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W * 0.82, H * 0.7, 0, W * 0.82, H * 0.7, W * 0.45);
      g2.addColorStop(0, `rgba(217, 163, 110, 0.11)`);
      g2.addColorStop(1, `rgba(217, 163, 110, 0)`);
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const t = tick * 0.0008;
    const cx = W * (0.5 + Math.sin(t) * 0.15);
    const cy = H * (0.35 + Math.cos(t * 0.7) * 0.1);

    // Large central aurora
    const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
    g1.addColorStop(0, `rgba(100, 40, 200, 0.18)`);
    g1.addColorStop(0.4, `rgba(139, 69, 255, 0.10)`);
    g1.addColorStop(0.8, `rgba(80, 20, 160, 0.04)`);
    g1.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // Side aurora left
    const g2 = ctx.createRadialGradient(W * 0.1, H * 0.4, 0, W * 0.1, H * 0.4, W * 0.35);
    g2.addColorStop(0, `rgba(80, 20, 180, 0.12)`);
    g2.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Side aurora right
    const g3 = ctx.createRadialGradient(W * 0.9, H * 0.3, 0, W * 0.9, H * 0.3, W * 0.3);
    g3.addColorStop(0, `rgba(160, 80, 255, 0.10)`);
    g3.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- Main render loop ----
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Base: deep space (dark) or soft lavender (light)
    const light = isLight();
    ctx.fillStyle = light ? '#f3f0ff' : '#0a0714';
    ctx.fillRect(0, 0, W, H);

    drawNebula();
    drawAurora();
    drawGrid();
    drawDust();
    drawShootingStars();

    // Top vignette
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    topGrad.addColorStop(0, light ? 'rgba(243, 240, 255, 0.55)' : 'rgba(10, 7, 20, 0.35)');
    topGrad.addColorStop(1, light ? 'rgba(243, 240, 255, 0)' : 'rgba(10, 7, 20, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H);

    // Bottom fade into page
    const botGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
    botGrad.addColorStop(0, light ? 'rgba(243, 240, 255, 0)' : 'rgba(10, 7, 20, 0)');
    botGrad.addColorStop(1, light ? 'rgba(243, 240, 255, 1)' : 'rgba(10, 7, 20, 1)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, 0, W, H);

    tick++;
    if (!LOW_POWER) raf = requestAnimationFrame(draw);
  }

  // ---- Mouse parallax ----
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
  }

  // ---- Start / stop ----
  // Split out of the old init() so the loop can be stopped and restarted
  // without a page reload (R1 fix, see file header comment).
  let started = false;
  let onResize = null;

  function start() {
    if (started || hiddenByDarkHeroCSS()) return;
    started = true;

    resize();
    initOrbs();
    initStars();
    initDust();
    draw(); // low-power: this is the ONLY frame drawn (draw() stops the raf loop itself above)

    if (LOW_POWER) return; // no resize re-render loop, no mousemove tracking, no raf

    onResize = () => {
      cancelAnimationFrame(raf);
      resize();
      draw();
    };
    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousemove', onMouseMove, { passive: true });
  }

  function stop() {
    if (!started) return;
    started = false;
    cancelAnimationFrame(raf);
    if (onResize) window.removeEventListener('resize', onResize);
    canvas.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousemove', onMouseMove);
  }

  // React to the theme flipping live (toggle button, cross-tab storage sync
  // both dispatch 'sitethemechange' — see site-theme-init.js) and to bfcache
  // restores, which can land the page back on either theme.
  function sync() {
    if (hiddenByDarkHeroCSS()) stop();
    else start();
  }
  window.addEventListener('sitethemechange', sync);
  window.addEventListener('pageshow', sync);

  // Wait for layout
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync);
  } else {
    sync();
  }
})();
