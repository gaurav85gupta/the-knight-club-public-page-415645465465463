/**
 * auth-flip.js — Combined Login / Signup page controller
 *
 * Handles:
 *  - Tab switching with smooth 3-D flip (desktop) / fade (mobile)
 *  - Floating particle canvas on the brand panel
 *  - URL hash sync so direct links / back button work
 *  - Keyboard nav (←/→ arrows on tabs)
 *
 * No dependencies — runs synchronously before async scripts load.
 */

(function initAuthFlip() {

  /* ── Flip controller ────────────────────────────────────────────── */

  const scene  = document.getElementById('auth-flip-scene');
  const inner  = document.getElementById('auth-flip-inner');
  if (!scene || !inner) return;

  const TABS_SIGNUP = Array.from(document.querySelectorAll('[data-flip-tab="signup"]'));
  const TABS_LOGIN  = Array.from(document.querySelectorAll('[data-flip-tab="login"]'));

  function activateTabs(activeArr, inactiveArr) {
    activeArr.forEach(t => { t.setAttribute('aria-selected','true');  t.tabIndex = 0; });
    inactiveArr.forEach(t => { t.setAttribute('aria-selected','false'); t.tabIndex = -1; });
  }

  function showSignup(push) {
    scene.classList.add('wide');
    inner.classList.add('is-signup');
    activateTabs(TABS_SIGNUP, TABS_LOGIN);
    if (push && history.replaceState) history.replaceState(null, '', '#signup');
    if (window.innerWidth <= 860) scene.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function showLogin(push) {
    scene.classList.remove('wide');
    inner.classList.remove('is-signup');
    activateTabs(TABS_LOGIN, TABS_SIGNUP);
    if (push && history.replaceState) history.replaceState(null, '', '#login');
    if (window.innerWidth <= 860) scene.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  TABS_SIGNUP.forEach(t => t.addEventListener('click', () => showSignup(true)));
  TABS_LOGIN .forEach(t => t.addEventListener('click', () => showLogin(true)));

  // Arrow-key navigation on tab groups
  [...TABS_SIGNUP, ...TABS_LOGIN].forEach(t => {
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const isLogin = t.dataset.flipTab === 'login';
        isLogin ? showSignup(true) : showLogin(true);
        // Focus the newly-active tab on this face
        const target = inner.classList.contains('is-signup')
          ? TABS_SIGNUP.find(x => x.closest('.flip-back') || !x.closest('.flip-back,  .flip-front'))
          : TABS_LOGIN .find(x => x.closest('.flip-front') || !x.closest('.flip-back, .flip-front'));
        if (target) target.focus();
      }
    });
  });

  // data-flip-to="signup|login" — inline text links
  document.querySelectorAll('[data-flip-to="signup"]').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); showSignup(true); }));
  document.querySelectorAll('[data-flip-to="login"]').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); showLogin(true); }));

  // Hash on load
  if (window.location.hash === '#signup') showSignup(false);
  else showLogin(false);


  /* ── Particle canvas ───────────────────────────────────────────── */

  const canvas = document.getElementById('auth-particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], raf;
  const COUNT = 38;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = rect.width;
    H = canvas.height = rect.height;
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function Particle() {
    this.reset = function() {
      this.x  = rand(0, W);
      this.y  = rand(0, H);
      this.r  = rand(1, 2.8);
      this.vx = rand(-0.25, 0.25);
      this.vy = rand(-0.4, -0.1);
      this.alpha = rand(0.08, 0.35);
      this.life = rand(0.4, 1);   // phase offset
    };
    this.reset();
  }

  function initParticles() {
    particles = Array.from({length: COUNT}, () => new Particle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 0.004;
      const a = p.alpha * Math.sin(p.life * Math.PI);

      if (p.y < -6 || a <= 0.005) p.reset();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167,139,250,${Math.max(0, a)})`;
      ctx.fill();
    });
    raf = requestAnimationFrame(draw);
  }

  const mo = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!mo.matches) {
    resize();
    initParticles();
    draw();
    window.addEventListener('resize', () => { resize(); initParticles(); });
  }

  // Clean up if page navigates away
  window.addEventListener('pagehide', () => { if (raf) cancelAnimationFrame(raf); });

})();
