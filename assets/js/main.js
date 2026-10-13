/**
 * Entry point script for the public website foundation page.
 * Phase 0 only demonstrates that the frontend can successfully call the
 * backend's health endpoint — no real features are implemented yet.
 */

(async function initHomePage() {
  const statusEl = document.getElementById('api-status');
  if (!statusEl) return;

  try {
    const data = await Api.get('/health');
    statusEl.innerHTML = `
      <p style="margin:0 0 4px; font-weight:600; color: var(--color-accent-600);">API connected ✓</p>
      <p class="text-muted" style="margin:0; font-size: var(--font-size-sm);">
        Status: ${data.status} · DB: ${data.database}
      </p>
    `;
  } catch (err) {
    statusEl.innerHTML = `
      <p style="margin:0 0 4px; font-weight:600; color:#b91c1c;">API not reachable</p>
      <p class="text-muted" style="margin:0; font-size: var(--font-size-sm);">
        Start the backend locally to see a live connection.
      </p>
    `;
  }
})();

/**
 * Header account state (Phase 2). Swaps "Sign In / Sign Up" for a link to the
 * dashboard when the SERVER confirms a live session. This is display only;
 * it protects nothing. Runs only where the header links exist.
 */
(async function initHeaderAuthState() {
  const signIn = document.getElementById('nav-signin');
  const signUp = document.getElementById('nav-signup');
  if (!signIn || !signUp || typeof Auth === 'undefined') return;

  const user = await Auth.init();
  if (!user) return;

  signIn.textContent = 'Dashboard';
  signIn.href = 'pages/dashboard.html';
  signUp.remove();
})();
