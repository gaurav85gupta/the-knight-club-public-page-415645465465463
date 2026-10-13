/**
 * signup-combined.js — Signup controller for the combined login/signup page.
 *
 * Identical logic to signup.js, adapted for:
 *   - form id  : "signup-form"          (not "login-form")
 *   - submit btn: "signup-submit-btn"   (not "submit-btn")
 *   - alert el : "signup-alert"         (not "form-alert")
 *   - field ids : "s-<name>"            (not plain <name>, avoids clash with login fields)
 *   - On success: stays on the same page and flips to the login face
 *                 (instead of navigating to login.html).
 *
 * The backend flow is identical: POST /auth/register, no auto-login.
 */

(function initSignupCombined() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  const alertEl   = document.getElementById('signup-alert');
  const submitBtn = document.getElementById('signup-submit-btn');

  Forms.initPasswordToggles(form);

  // Already signed in? Skip this whole page.
  Auth.redirectIfAuthenticated();

  // Helper: get a form element by its "s-" prefixed id.
  // The name attributes match what the server expects; the ids are prefixed.
  function el(name) { return document.getElementById('s-' + name); }

  // ---- Client-side validators (mirror signup.js exactly) ------------------

  const validators = {
    userId: () => Forms.check.userId(el('userId').value),
    mobile: () => Forms.check.mobile(el('mobile').value),
    password: () => Forms.check.password(el('password').value),
    confirmPassword: () =>
      el('confirmPassword').value === el('password').value
        ? '' : 'Passwords do not match.',
    fullName: () => {
      const v = el('fullName').value.trim();
      if (v.length < 2) return 'Please provide your full name.';
      if (!/\p{L}/u.test(v)) return 'Please provide your full name.';
      return '';
    },
    dateOfBirth: () => {
      const v = el('dateOfBirth').value;
      if (!v) return 'Please provide your date of birth.';
      if (Number.isNaN(Date.parse(v))) return 'Please provide a valid date of birth.';
      return '';
    },
    gender:  () => (el('gender').value  ? '' : 'Please select a gender option.'),
    address: () => (el('address').value.trim().length >= 5 ? '' : 'Please provide your address.'),
    city:    () => (el('city').value.trim().length    >= 2 ? '' : 'Please provide your city.'),
    state:   () => (el('state').value.trim().length   >= 2 ? '' : 'Please provide your state.'),
    pincode: () => (/^[1-9]\d{5}$/.test(el('pincode').value.trim())
      ? '' : 'Please provide a valid 6-digit pincode.'),
  };

  function validateField(name) {
    const input = el(name);
    const message = validators[name]();
    if (message) Forms.setFieldError(input, message);
    else         Forms.clearFieldError(input);
    return !message;
  }

  function validateAll() {
    let firstInvalid = null;
    for (const name of Object.keys(validators)) {
      if (!validateField(name) && !firstInvalid) firstInvalid = el(name);
    }
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  // Live validation wiring
  for (const name of Object.keys(validators)) {
    const input = el(name);
    input.addEventListener('blur', () => {
      if (input.value !== '') validateField(name);
    });
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('has-error')) validateField(name);
      if (name === 'password' && el('confirmPassword').value) validateField('confirmPassword');
    });
  }

  // DOB: block future dates
  el('dateOfBirth').max = new Date().toISOString().slice(0, 10);

  // ---- Conflict error routing (409) ---------------------------------------
  function showConflict(err) {
    const msg = err.message || '';
    if (/user id/i.test(msg)) {
      Forms.setFieldError(el('userId'), 'This User ID is already taken. Please choose another.');
      el('userId').focus();
    } else if (/mobile/i.test(msg)) {
      Forms.setFieldError(el('mobile'), 'An account with this mobile number already exists. Try signing in instead.');
      el('mobile').focus();
    } else {
      Forms.showAlert(alertEl, msg || 'An account with these details already exists.', 'error');
    }
  }

  // ---- Submit handler -----------------------------------------------------
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn.disabled) return;

    Forms.hideAlert(alertEl);
    // Clear only signup form errors (don't touch login form)
    form.querySelectorAll('.input').forEach(i => Forms.clearFieldError(i));

    if (!validateAll()) return;

    const payload = {
      fullName:        el('fullName').value,
      mobile:          el('mobile').value,
      userId:          el('userId').value,
      password:        el('password').value,
      confirmPassword: el('confirmPassword').value,
      dateOfBirth:     el('dateOfBirth').value,
      gender:          el('gender').value,
      address:         el('address').value,
      city:            el('city').value,
      state:           el('state').value,
      pincode:         el('pincode').value,
    };

    Forms.setLoading(submitBtn, true, 'Creating account…');
    try {
      await Auth.register(payload);

      // Success: store notice and flip to the login face (same page).
      Auth.setNotice('Account created! Sign in with your User ID and password.', 'success');
      Forms.setLoading(submitBtn, false);

      // Flip back to login using the auth-flip controller
      const loginTabs = document.querySelectorAll('[data-flip-tab="login"]');
      if (loginTabs.length) loginTabs[0].click();
      else window.location.replace('login.html');

    } catch (err) {
      Forms.setLoading(submitBtn, false);

      if (!(err instanceof ApiError)) {
        Forms.showAlert(alertEl, 'Something went wrong. Please try again.');
        return;
      }
      if (err.isNetworkError) {
        Forms.showAlert(alertEl, err.message);
      } else if (err.status === 409) {
        showConflict(err);
      } else if (err.isValidation) {
        // Re-map server field names (no prefix) to our prefixed inputs
        const remapped = (err.errors || []).map(e => ({
          field: 's-' + e.field,
          message: e.message,
        }));
        const unmatched = Forms.applyServerErrors(form, remapped);
        if (unmatched.length) Forms.showAlert(alertEl, unmatched.join(' '));
        else if (!err.errors.length) Forms.showAlert(alertEl, err.message);
      } else if (err.isRateLimited) {
        Forms.showAlert(alertEl, 'Too many sign-up attempts. Please wait a while and try again.');
      } else {
        Forms.showAlert(alertEl, err.message || 'Something went wrong. Please try again.');
      }
    }
  });
})();
