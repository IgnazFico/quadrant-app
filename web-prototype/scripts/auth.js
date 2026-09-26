// ===========================
// QUADRANT — AUTH SCRIPT
// ===========================

document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching
  const tabs = document.querySelectorAll('.auth-tab-btn');
  const forms = {
    login: document.getElementById('form-login'),
    signup: document.getElementById('form-signup'),
    recover: document.getElementById('form-recover'),
  };

  function switchTab(targetTab) {
    tabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === targetTab);
    });
    Object.keys(forms).forEach(key => {
      if (forms[key]) {
        forms[key].classList.toggle('active', key === targetTab);
      }
    });
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('link-to-recover')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('recover');
  });

  // Check URL query parameters (e.g. auth.html?mode=signup)
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  if (mode && forms[mode]) {
    switchTab(mode);
  }

  // Password Strength Calculation
  const passInput = document.getElementById('signup-password');
  const sbar1 = document.getElementById('sbar-1');
  const sbar2 = document.getElementById('sbar-2');
  const sbar3 = document.getElementById('sbar-3');
  const sbar4 = document.getElementById('sbar-4');
  const stext = document.getElementById('strength-text');

  if (passInput) {
    passInput.addEventListener('input', () => {
      const val = passInput.value;
      let score = 0;
      if (val.length >= 8) score++;
      if (val.length >= 12) score++;
      if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      const resetBars = () => {
        [sbar1, sbar2, sbar3, sbar4].forEach(b => b.style.background = '#E5E7EB');
      };
      resetBars();

      if (val.length === 0) {
        stext.textContent = 'Enter password';
        stext.style.color = '#9CA3AF';
      } else if (score <= 1) {
        sbar1.style.background = '#EF4444';
        stext.textContent = 'Weak';
        stext.style.color = '#EF4444';
      } else if (score === 2) {
        sbar1.style.background = '#F59E0B';
        sbar2.style.background = '#F59E0B';
        stext.textContent = 'Fair';
        stext.style.color = '#F59E0B';
      } else if (score === 3) {
        sbar1.style.background = '#10B981';
        sbar2.style.background = '#10B981';
        sbar3.style.background = '#10B981';
        stext.textContent = 'Strong';
        stext.style.color = '#10B981';
      } else {
        sbar1.style.background = '#059669';
        sbar2.style.background = '#059669';
        sbar3.style.background = '#059669';
        sbar4.style.background = '#059669';
        stext.textContent = 'Very strong';
        stext.style.color = '#059669';
      }
    });
  }

  // Handle Login Submission
  forms.login?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = forms.login.querySelector('button[type="submit"]');
    btn.innerHTML = '<span>Deriving Argon2id keys...</span>';
    btn.style.opacity = '0.8';

    setTimeout(() => {
      btn.innerHTML = '<span>Master key unwrapped. Entering...</span>';
      setTimeout(() => {
        window.location.href = 'app.html';
      }, 500);
    }, 700);
  });

  // Handle Signup Submission -> Open Recovery Code Modal
  forms.signup?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = forms.signup.querySelector('button[type="submit"]');
    btn.innerHTML = '<span>Generating 256-bit Libsodium keys...</span>';

    setTimeout(() => {
      const modal = document.getElementById('recovery-modal');
      modal?.classList.remove('hidden');
      btn.innerHTML = '<span>Create Account</span>';
    }, 600);
  });

  // Copy Recovery Code
  const copyBtn = document.getElementById('btn-copy-code');
  const codeEl = document.getElementById('generated-code');
  copyBtn?.addEventListener('click', () => {
    if (codeEl) {
      navigator.clipboard?.writeText(codeEl.textContent || '');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800);
    }
  });

  // Confirm Saved Checkbox
  const confirmSaved = document.getElementById('confirm-saved');
  const finishSignupBtn = document.getElementById('btn-finish-signup');
  confirmSaved?.addEventListener('change', () => {
    if (confirmSaved.checked) {
      finishSignupBtn?.classList.remove('disabled');
    } else {
      finishSignupBtn?.classList.add('disabled');
    }
  });

  finishSignupBtn?.addEventListener('click', () => {
    if (!finishSignupBtn.classList.contains('disabled')) {
      window.location.href = 'app.html#profile';
    }
  });

  // Handle Recovery Submission
  forms.recover?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = forms.recover.querySelector('button[type="submit"]');
    btn.innerHTML = '<span>Re-wrapping master key...</span>';
    setTimeout(() => {
      alert('Master key successfully recovered with your emergency code. You are now logged in.');
      window.location.href = 'app.html';
    }, 800);
  });
});
