// Verificador genérico de CAPTCHA (hCaptcha o reCAPTCHA)
async function verifyCaptcha(token, remoteip) {
  const enabled = process.env.CAPTCHA_ENABLED === 'true';
  if (!enabled) return { ok: true };
  const provider = (process.env.CAPTCHA_PROVIDER || 'hcaptcha').toLowerCase();
  const secret = process.env.CAPTCHA_SECRET;
  if (!secret) return { ok: false, error: 'missing_secret' };
  if (!token) return { ok: false, error: 'missing_token' };

  let url;
  let params;
  if (provider === 'recaptcha') {
    url = 'https://www.google.com/recaptcha/api/siteverify';
    params = new URLSearchParams({ secret, response: token, remoteip });
  } else {
    url = 'https://hcaptcha.com/siteverify';
    params = new URLSearchParams({ secret, response: token, remoteip });
  }
  try {
    const resp = await fetch(url, { method: 'POST', body: params });
    const data = await resp.json();
    if (data.success) return { ok: true };
    return { ok: false, error: 'captcha_failed', details: data['error-codes'] || data.errors };
  } catch (e) {
    return { ok: false, error: 'captcha_error', details: e && e.message };
  }
}

function captchaMiddleware(flagEnvName) {
  return async (req, res, next) => {
    const enabled = process.env.CAPTCHA_ENABLED === 'true' && process.env[flagEnvName] === 'true';
    if (!enabled) return next();
    const token = (req.body && (req.body.captchaToken || req.body['g-recaptcha-response'])) || '';
    const r = await verifyCaptcha(token, req.ip);
    if (r.ok) return next();
    return res.status(429).json({ error: 'captcha_required', message: 'Verificación CAPTCHA requerida o fallida', details: r });
  };
}

module.exports = { captchaMiddleware, verifyCaptcha };
