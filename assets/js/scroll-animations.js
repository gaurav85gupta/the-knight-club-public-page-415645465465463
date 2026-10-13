/**
 * THE KNIGHT CLUB — Scroll Animations
 * GSAP + ScrollTrigger: sticky overlap, text reveals, counters
 * Loads after DOM + GSAP CDN
 *
 * Skipped entirely on low-power devices (see perf-mode.js): this file is
 * 20+ scroll-linked tweens, several with scrub:true (continuous repaint
 * tied to the scroll position) and 3D card tilts — exactly the kind of
 * work that janks on weak CPUs/GPUs. Content still appears (CSS below
 * shows everything at opacity:1 with no JS needed) — only the motion
 * is removed, nothing becomes invisible or broken without this script.
 */
(function initScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = window.KC_LOW_POWER === true;
  if (prefersReduced || lowPower) return;

  gsap.registerPlugin(ScrollTrigger);

  /* =========================================================
     1. HERO — staggered entrance
  ========================================================= */
  const heroEls = gsap.utils.toArray('.reveal-up');
  if (heroEls.length) {
    gsap.set(heroEls, { opacity: 0, y: 28 });
    heroEls.forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0,
        duration: 0.85,
        ease: 'power3.out',
        delay: i * 0.1 + 0.2
      });
    });
  }

  /* =========================================================
     2. CINEMATIC HERO OVERLAP
     Hero is pinned (CSS: position sticky). As #founder slides up over it,
     the hero copy scales down, blurs and fades. Once #founder covers the
     viewport the hero is hidden so it never shows through later sections.
  ========================================================= */
  const heroSec   = document.querySelector('.hero.hero-v2');
  const heroInner = heroSec && heroSec.querySelector('.hero-v2-inner');
  const overlapTarget = document.getElementById('founder');

  if (heroSec && heroInner && overlapTarget) {
    gsap.fromTo(heroInner,
      { scale: 1, opacity: 1, filter: 'blur(0px)', transformOrigin: '50% 40%' },
      {
        scale: 0.92, opacity: 0, filter: 'blur(6px)',
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: heroSec,
          start: 0,
          endTrigger: overlapTarget,
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true
        }
      }
    );

    // Hide the pinned hero once it is fully covered (and pause its cost).
    ScrollTrigger.create({
      trigger: overlapTarget,
      start: 'top top',
      end: 'max',
      onToggle: (self) => {
        heroSec.style.visibility = self.isActive ? 'hidden' : 'visible';
      }
    });
  }

  /* =========================================================
     2b. SUBSEQUENT SECTIONS — subtle scale-down stack
     Each section scales down the previous as next arrives
  ========================================================= */
  const contentSections = gsap.utils.toArray('section.section-block');
  contentSections.forEach((sec, i) => {
    if (sec.classList.contains('hero') || sec.id === 'what-is') return;
    if (i === 0) return;

    const prevSec = contentSections[i - 1];
    if (!prevSec || prevSec.classList.contains('hero')) return;

    ScrollTrigger.create({
      trigger: sec,
      start: 'top 85%',
      end: 'top top',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        gsap.set(prevSec, {
          scale:   1 - p * 0.02,
          opacity: 1 - p * 0.12
        });
      }
    });
  });

  /* =========================================================
     3. REVEAL — fade + slide from below
  ========================================================= */
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  /* =========================================================
     4. SKILL BENTO CARDS — stagger cascade
  ========================================================= */
  const skCards = gsap.utils.toArray('.sk-grid li');
  if (skCards.length) {
    gsap.fromTo(skCards,
      { opacity: 0, y: 50, scale: 0.94 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7,
        ease: 'power3.out',
        stagger: { amount: 0.55, from: 'start' },
        scrollTrigger: {
          trigger: '.sk-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  /* =========================================================
     5. APPROACH FLOW — nodes pop in one by one
  ========================================================= */
  const flowItems = gsap.utils.toArray('.flow li');
  if (flowItems.length) {
    gsap.fromTo(flowItems,
      { opacity: 0, scale: 0.8, y: 30 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 0.65,
        ease: 'back.out(1.6)',
        stagger: 0.15,
        scrollTrigger: {
          trigger: '.flow',
          start: 'top 78%',
          toggleActions: 'play none none none'
        }
      }
    );

    // Line draw animation
    ScrollTrigger.create({
      trigger: '.flow',
      start: 'top 75%',
      onEnter: () => {
        document.getElementById('approach-flow')?.classList.add('line-animated');
      }
    });
  }

  /* =========================================================
     6. FOUNDER SECTION — split reveal: photo left, text right
  ========================================================= */
  const founderVisual = document.querySelector('.founder-visual');
  const founderCopy   = document.querySelector('.founder-copy');
  if (founderVisual && founderCopy) {
    gsap.fromTo(founderVisual,
      { opacity: 0, x: -60, rotateY: 8 },
      {
        opacity: 1, x: 0, rotateY: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#founder', start: 'top 75%' }
      }
    );
    gsap.fromTo(founderCopy,
      { opacity: 0, x: 60 },
      {
        opacity: 1, x: 0,
        duration: 1.1,
        ease: 'power3.out',
        delay: 0.15,
        scrollTrigger: { trigger: '#founder', start: 'top 75%' }
      }
    );
  }

  /* =========================================================
     7. STATS COUNTER ANIMATION
  ========================================================= */
  function animateCounter(el) {
    const text  = el.textContent.trim();
    const num   = parseFloat(text.replace(/[^0-9.]/g, ''));
    const suffix = text.replace(/[0-9.]/g, '');
    if (!num) return;
    gsap.fromTo({ val: 0 },
      { val: 0 },
      {
        val: num,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: function () {
          el.textContent = (Number.isInteger(num)
            ? Math.floor(this.targets()[0].val)
            : this.targets()[0].val.toFixed(1)) + suffix;
        },
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  document.querySelectorAll('.hero-stat strong, .founder-stat strong, .founder-metric strong').forEach(animateCounter);

  /* =========================================================
     8. 1% CLUB — dramatic entrance with glow burst
  ========================================================= */
  const clubMark = document.querySelector('.club-mark');
  const clubCopy = document.querySelector('.club-copy');
  if (clubMark) {
    gsap.fromTo(clubMark,
      { opacity: 0, scale: 0.6, filter: 'blur(20px)' },
      {
        opacity: 1, scale: 1, filter: 'blur(0px)',
        duration: 1.2,
        ease: 'power4.out',
        scrollTrigger: { trigger: '#club', start: 'top 78%' }
      }
    );
  }
  if (clubCopy) {
    gsap.fromTo(clubCopy,
      { opacity: 0, x: 50 },
      {
        opacity: 1, x: 0,
        duration: 1.0,
        ease: 'power3.out',
        delay: 0.2,
        scrollTrigger: { trigger: '#club', start: 'top 78%' }
      }
    );
  }

  /* =========================================================
     9. ECO GRID COLUMNS — stagger slide in
  ========================================================= */
  const ecoCols = gsap.utils.toArray('.eco-col');
  if (ecoCols.length) {
    gsap.fromTo(ecoCols,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.18,
        scrollTrigger: { trigger: '.eco-grid', start: 'top 80%' }
      }
    );
  }

  /* =========================================================
     10. AUDIENCE GRID — wave reveal
  ========================================================= */
  const audItems = gsap.utils.toArray('.aud-grid li');
  if (audItems.length) {
    gsap.fromTo(audItems,
      { opacity: 0, y: 30, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.6,
        ease: 'power2.out',
        stagger: { amount: 0.5, grid: [2, 3], from: 'start' },
        scrollTrigger: { trigger: '.aud-grid', start: 'top 82%' }
      }
    );
  }

  /* =========================================================
     11. FAQ — each item slides in from left
  ========================================================= */
  const faqItems = gsap.utils.toArray('.faq-list .faq-item');
  if (faqItems.length) {
    gsap.fromTo(faqItems,
      { opacity: 0, x: -30 },
      {
        opacity: 1, x: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.07,
        scrollTrigger: { trigger: '.faq-list', start: 'top 82%' }
      }
    );
  }

  /* =========================================================
     12. CTA PANEL — scale up from below
  ========================================================= */
  const ctaPanel = document.querySelector('.cta-panel');
  if (ctaPanel) {
    gsap.fromTo(ctaPanel,
      { opacity: 0, scale: 0.95, y: 40 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 1.0,
        ease: 'power3.out',
        scrollTrigger: { trigger: '#cta', start: 'top 82%' }
      }
    );
  }

  /* =========================================================
     13. SECTION TITLES — clip path reveal (text wipe)
  ========================================================= */
  gsap.utils.toArray('.section-title').forEach((el) => {
    gsap.fromTo(el,
      { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
      {
        clipPath: 'inset(0 0% 0 0)', opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  /* =========================================================
     14. (removed) PARALLAX on section backgrounds — R1 foundation fix H.
     Verified against home.css: none of #what-is (no longer exists in the
     homepage markup), #why, or #ecosystem has a background-image or any
     background-position styling at all, so this scrub-linked tween was
     animating backgroundPositionY on sections with nothing to reposition
     — a continuous scroll listener for zero visual effect. Removed rather
     than simplified, since there is no parallax to simplify.
  ========================================================= */

  /* =========================================================
     15. (removed) MAGNETIC BUTTONS
     Intentionally removed — buttons must stay static site-wide.
     All button visuals/behavior now live only in assets/css/buttons.css.
     Do not re-add per-page button transform/animation here or in any
     page-specific CSS/JS — see the "DO NOT ADD BUTTON COLOUR RULES
     ELSEWHERE" note at the bottom of buttons.css.
  ========================================================= */

  /* =========================================================
     16. HERO STATS — number count on load
  ========================================================= */
  // already handled in counter animation above

  /* =========================================================
     17. SK CARD 3D TILT on hover
  ========================================================= */
  document.querySelectorAll('.sk-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width  - 0.5;
      const py = (e.clientY - rect.top)  / rect.height - 0.5;
      gsap.to(card, {
        rotateY:  px * 14,
        rotateX: -py * 10,
        scale: 1.03,
        duration: 0.4,
        ease: 'power2.out',
        transformPerspective: 800
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateY: 0, rotateX: 0, scale: 1,
        duration: 0.6, ease: 'elastic.out(1, 0.5)'
      });
    });
  });

  /* =========================================================
     18. HC CARDS (featured courses) tilt
  ========================================================= */
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.hc-card').forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return;
      const px = (e.clientX - rect.left) / rect.width  - 0.5;
      const py = (e.clientY - rect.top)  / rect.height - 0.5;
      gsap.to(card, {
        rotateY:  px * 10,
        rotateX: -py * 8,
        duration: 0.4,
        ease: 'power2.out',
        transformPerspective: 1000
      });
    });
  });

  document.querySelectorAll('.hc-card').forEach((card) => {
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    });
  });

  /* =========================================================
     19. SECTION HEAD ROW — eyebrow + title stagger
  ========================================================= */
  gsap.utils.toArray('.section-head-row, .section-head-center').forEach((row) => {
    const children = row.querySelectorAll('.eyebrow-plain, .section-title, .section-sub, .link-arrow');
    gsap.fromTo(children,
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: row, start: 'top 85%' }
      }
    );
  });

  /* =========================================================
     20. FEATURED COURSES — re-run tilt when loaded dynamically
  ========================================================= */
  const featuredEl = document.getElementById('featured-courses');
  if (featuredEl) {
    const mo = new MutationObserver(() => {
      ScrollTrigger.refresh();
      featuredEl.querySelectorAll('.hc-card').forEach((card) => {
        gsap.fromTo(card,
          { opacity: 0, y: 40, scale: 0.95 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.12,
            delay: 0.1
          }
        );
      });
      mo.disconnect();
    });
    mo.observe(featuredEl, { childList: true });
  }

})();