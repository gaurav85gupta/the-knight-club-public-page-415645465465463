/**
 * THE KNIGHT CLUB — Performance Mode Detector
 * Loads FIRST (before any animation script). Decides once whether this
 * device should get heavy motion (canvas backgrounds, GSAP scroll effects,
 * 3D tilts, parallax) or the lightweight/static experience instead.
 *
 * Exposes:
 *   window.KC_LOW_POWER   -> boolean, true = skip/reduce heavy animation
 *   html.kc-low-power      -> CSS hook, same signal for stylesheets
 *
 * Signals used (any one is enough to flag low-power):
 *   - prefers-reduced-motion: reduce          (explicit user/OS setting)
 *   - navigator.deviceMemory <= 4             (RAM, Chrome/Android/Edge only)
 *   - navigator.hardwareConcurrency <= 4      (CPU cores)
 *   - navigator.connection.saveData           (user opted into data saver)
 *   - navigator.connection.effectiveType      ('slow-2g'/'2g'/'3g')
 *   - small viewport width (<= 480px)         (budget phones, proxy signal)
 *
 * Any script that wants to skip heavy work should check
 * `window.KC_LOW_POWER` (this file runs synchronously, no race).
 */
(function () {
  function detectLowPower() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return true;
      }

      var mem = navigator.deviceMemory;
      if (typeof mem === 'number' && mem <= 2) return true;

      var cores = navigator.hardwareConcurrency;
      if (typeof cores === 'number' && cores <= 2) return true;

      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        if (conn.saveData) return true;
        if (conn.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType)) return true;
      }

      if (window.innerWidth && window.innerWidth <= 480) return true;

      return false;
    } catch (e) {
      // If any API throws/is unsupported, fail toward the SAFE (light) mode
      // rather than risk heavy animation on an unknown device.
      return true;
    }
  }

  var isLowPower = detectLowPower();
  window.KC_LOW_POWER = isLowPower;
  document.documentElement.classList.toggle('kc-low-power', isLowPower);
})();
