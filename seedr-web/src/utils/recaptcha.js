// Get reCAPTCHA token
export const getRecaptchaToken = async (action = 'register') => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.log('ℹ️ reCAPTCHA not configured - skipping verification');
    return null;
  }

  if (!window.grecaptcha) {
    console.warn('⚠️ reCAPTCHA script not loaded yet');
    return null;
  }

  try {
    const token = await window.grecaptcha.execute(siteKey, { action });
    console.log('✅ reCAPTCHA token obtained successfully');
    return token;
  } catch (error) {
    console.error('❌ reCAPTCHA error:', error);
    return null;
  }
};

// Load reCAPTCHA script dynamically
export const loadRecaptchaScript = () => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.warn('VITE_RECAPTCHA_SITE_KEY not configured');
    return;
  }

  // Check if script already loaded
  if (window.grecaptcha) {
    return;
  }

  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
};
