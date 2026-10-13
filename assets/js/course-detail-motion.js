/**
 * Course Detail — motion layer (course.html only).
 *
 * Deliberately NOT GSAP: this page has no scroll-linked tilt/parallax,
 * just a one-time hero entrance and a single reveal-on-scroll pass for the
 * body sections, so a dependency-free IntersectionObserver is enough and
 * keeps this page light (home.css's GSAP bundle is not loaded here).
 *
 * Respects the same two signals the rest of the site uses:
 *   - prefers-reduced-motion: reduce
 *   - window.KC_LOW_POWER (perf-mode.js)
 * Content is never hidden by this script if motion is skipped — .cd-reveal
 * and .cd-hero-in are visible by default in CSS; JS only adds the
 * "animate in" treatment when motion is allowed.
 */
(function initCourseDetailMotion() {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lowPower = window.KC_LOW_POWER === true;
  var motionOK = !reduceMotion && !lowPower;

  var contentEl = document.getElementById('course-content');
  if (!contentEl) return;

  function runHeroEntrance() {
    if (!motionOK) return;
    var els = document.querySelectorAll('.cd-hero-in');
    // Arm (hide) then flip to ready on the next frame so the browser has a
    // pre-animation state to transition from, instead of content ever being
    // invisible if JS fails partway.
    els.forEach(function (el) { el.classList.add('cd-hero-pending'); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.forEach(function (el) { el.classList.add('is-hero-ready'); });
      });
    });
  }

  function setupReveal() {
    var targets = document.querySelectorAll('.cd-reveal');
    if (!targets.length) return;
    if (!motionOK || typeof IntersectionObserver === 'undefined') {
      targets.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    targets.forEach(function (el) { el.classList.add('cd-reveal-armed'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /**
   * The jump-nav only lists sections that actually rendered (curriculum and
   * tags blocks are server-driven and may be hidden entirely — see
   * course-detail.js). Its active-link state is plain scroll tracking
   * (always on, independent of motionOK — this is layout state, not
   * animation).
   */
  function setupJumpNav() {
    var nav = document.getElementById('cd-jumpnav');
    if (!nav) return;

    var curriculumBlock = document.getElementById('curriculum-block');
    var tagsBlock = document.getElementById('tags-block');
    var jumpCurriculum = document.getElementById('jump-curriculum');
    var jumpDetails = document.getElementById('jump-details');

    function sync() {
      var anySecondaryVisible = false;
      if (curriculumBlock && !curriculumBlock.hidden) {
        jumpCurriculum.hidden = false;
        anySecondaryVisible = true;
      }
      if (tagsBlock && !tagsBlock.hidden) {
        jumpDetails.hidden = false;
        anySecondaryVisible = true;
      }
      nav.hidden = !anySecondaryVisible;
    }

    // Curriculum/tags visibility flips asynchronously (curriculum fetch is
    // a secondary call — see course-detail.js). Watch both blocks' [hidden]
    // attribute rather than polling.
    var mo = new MutationObserver(sync);
    [curriculumBlock, tagsBlock].forEach(function (el) {
      if (el) mo.observe(el, { attributes: true, attributeFilter: ['hidden'] });
    });
    sync();

    var links = nav.querySelectorAll('.cd-jumpnav-link');
    var sections = Array.prototype.slice.call(links)
      .map(function (a) { return { link: a, el: document.getElementById(a.dataset.jump) }; })
      .filter(function (s) { return s.el; });
    if (!sections.length) return;

    // Active section = the last one whose top has scrolled past the line
    // just below the sticky header + jump-nav. Plain scroll-position check
    // (rather than IntersectionObserver rootMargin) because these targets
    // are thin <h2> elements near the very top of the scroll range, where
    // root-margin edges are easy to get wrong.
    var ticking = false;
    function updateActive() {
      ticking = false;
      var line = nav.getBoundingClientRect().bottom + 16;
      var current = sections[0];
      sections.forEach(function (s) {
        if (s.el.getBoundingClientRect().top <= line) current = s;
      });
      links.forEach(function (a) {
        a.classList.toggle('is-active', a === current.link);
      });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActive);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateActive();
  }

  // course-detail.js unhides #course-content once the course has loaded,
  // then renders into it synchronously (outcomes/requirements/buy card) and
  // asynchronously (curriculum). Watch for the unhide rather than assuming
  // a fixed delay.
  var contentObserver = new MutationObserver(function () {
    if (!contentEl.hidden) {
      contentObserver.disconnect();
      runHeroEntrance();
      setupReveal();
      setupJumpNav();
    }
  });
  if (contentEl.hidden) {
    contentObserver.observe(contentEl, { attributes: true, attributeFilter: ['hidden'] });
  } else {
    runHeroEntrance();
    setupReveal();
    setupJumpNav();
  }
})();
