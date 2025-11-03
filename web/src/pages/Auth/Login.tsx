import React, { useState, useEffect, useRef } from 'react';
// Declaración global para grecaptcha
declare global {
  interface Window {
    grecaptcha?: any;
  }
}
import Swal from 'sweetalert2';
import GoogleAuthButton from './../../components/features/auth/GoogleAuthButton';
import API_BASE from '../../utils/apiBase';
import ReCAPTCHA from 'react-google-recaptcha';

const Login = ({ onLogin }) => {
  // CAPTCHA config (v2 visible o v3 invisible)
  const CAPTCHA_ENABLED = String(process.env.REACT_APP_CAPTCHA_ENABLED || '').toLowerCase() === 'true';
  const CAPTCHA_PROVIDER = (process.env.REACT_APP_CAPTCHA_PROVIDER || 'recaptcha').toLowerCase();
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';
  const RECAPTCHA_VERSION = (process.env.REACT_APP_RECAPTCHA_VERSION || 'v3').toLowerCase(); // 'v2' | 'v3'
  const [captchaReady, setCaptchaReady] = useState(false);
  const recaptchaRef = useRef(null);
  const [captchaTokenV2, setCaptchaTokenV2] = useState(null);

  // Carga dinámica del script de reCAPTCHA v3 cuando está habilitado
  useEffect(() => {
    if (!CAPTCHA_ENABLED) return;
    if (CAPTCHA_PROVIDER !== 'recaptcha') return;
    if (!RECAPTCHA_SITE_KEY) return;
    if (RECAPTCHA_VERSION !== 'v3') return; // solo carga script si es v3
    if (window.grecaptcha) {
      setCaptchaReady(true);
      return;
    }
    const existing = document.querySelector('script[data-captcha="recaptcha-v3"]');
    if (existing) return; // ya en carga
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-captcha', 'recaptcha-v3');
    script.onload = () => setCaptchaReady(true);
    script.onerror = () => {
      console.warn('No se pudo cargar reCAPTCHA');
      setCaptchaReady(false);
    };
    document.body.appendChild(script);
  }, [CAPTCHA_ENABLED, CAPTCHA_PROVIDER, RECAPTCHA_SITE_KEY, RECAPTCHA_VERSION]);

  const getRecaptchaToken = async (action) => {
    if (!CAPTCHA_ENABLED) return null;
    if (CAPTCHA_PROVIDER !== 'recaptcha') return null;
    if (!RECAPTCHA_SITE_KEY) return null;
    if (RECAPTCHA_VERSION === 'v2') {
      // En v2 usamos el token del widget visible
      return captchaTokenV2;
    }
    // Espera a que grecaptcha esté listo
    const ensureReady = () => new Promise((resolve) => {
      const tryReady = () => {
        if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
          window.grecaptcha.ready(() => resolve(true));
        } else {
          setTimeout(tryReady, 100);
        }
      };
      tryReady();
    });
    await ensureReady();
    try {
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action || 'submit' });
      return token;
    } catch (e) {
      console.warn('Error ejecutando reCAPTCHA', e);
      return null;
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  // Registro
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [confirmMethod, setConfirmMethod] = useState('correo'); // 'correo' o 'telefono'
  const [codigo, setCodigo] = useState('');
  const [registroEnviado, setRegistroEnviado] = useState(false);
  const [idRegistrado, setIdRegistrado] = useState(null);
  // Reenvío
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Obtener token de CAPTCHA si está habilitado
      let captchaToken = null;
      if (CAPTCHA_ENABLED) {
        if (RECAPTCHA_VERSION === 'v2') {
          if (!captchaTokenV2) {
            Swal.fire('CAPTCHA', 'Marca el reCAPTCHA antes de continuar.', 'info');
            setLoading(false);
            return;
          }
          captchaToken = captchaTokenV2;
        } else {
          captchaToken = await getRecaptchaToken('login');
        }
      }
      const res = await fetch(`${API_BASE}/api/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({ email, password, plataforma: 'web', captchaToken })
      });
      const data = await res.json();
  if (res.ok && (data.token || data.success)) {
        localStorage.setItem('token', data.token);
        // Soporta tanto data.id como data.user.id
        if (data.id) {
          localStorage.setItem('userId', data.id);
        } else if (data.user && data.user.id) {
          localStorage.setItem('userId', data.user.id);
        }
        Swal.fire('¡Bienvenido!', 'Inicio de sesión exitoso', 'success');
        if (onLogin) onLogin();
      } else {
        // Manejo preciso de errores 401 desde backend
        if (res.status === 401) {
          switch (data && data.code) {
            case 'EMAIL_NOT_FOUND':
              Swal.fire('Correo no encontrado', 'Verifica que tu correo esté bien escrito o regístrate.', 'warning');
              break;
            case 'INVALID_PASSWORD':
              Swal.fire('Contraseña incorrecta', 'Intenta nuevamente o restablece tu contraseña.', 'warning');
              break;
            default:
              Swal.fire('Credenciales inválidas', data.message || 'Revisa tu correo y contraseña.', 'warning');
          }
        } else if (res.status === 403) {
          if (data && data.code === 'ACCOUNT_UNVERIFIED') {
            Swal.fire('Cuenta no verificada', data.message || 'Revisa tu correo para confirmar el registro.', 'info');
          } else if (data && data.code === 'ACCOUNT_NOT_APPROVED') {
            Swal.fire('Cuenta registrada', 'Tu cuenta fue registrada correctamente. Falta la aprobación del administrador para iniciar sesión.', 'info');
          } else {
            Swal.fire('Acceso denegado', data.message || 'No tienes permisos para acceder.', 'info');
          }
        } else {
          Swal.fire('Error', data.message || 'No se pudo iniciar sesión', 'error');
        }
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    // Validación de longitud nombre/apellido
    if ((nombre || '').length > 50) {
      Swal.fire('Nombre demasiado largo', 'El nombre no puede exceder 50 caracteres.', 'warning');
      return;
    }
    if ((apellido || '').length > 50) {
      Swal.fire('Apellido demasiado largo', 'El apellido no puede exceder 50 caracteres.', 'warning');
      return;
    }
    // Validar teléfono: solo dígitos y exactamente 9
    const telDigits = (telefono || '').replace(/\D/g, '');
    if (telDigits.length !== 9) {
      Swal.fire('Teléfono inválido', 'El teléfono debe tener exactamente 9 dígitos.', 'warning');
      return;
    }
    if (regPassword !== regPassword2) {
      Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
      return;
    }
    // Validación de contraseña fuerte
    if (regPassword.length < 8) {
      Swal.fire('Error', 'La contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }
    if (!/[0-9]/.test(regPassword)) {
      Swal.fire('Error', 'La contraseña debe contener al menos un número', 'error');
      return;
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(regPassword)) {
      Swal.fire('Error', 'La contraseña debe contener al menos un signo o símbolo', 'error');
      return;
    }
    setLoading(true);
    try {
      // Obtener token de CAPTCHA si está habilitado
      let captchaToken = null;
      if (CAPTCHA_ENABLED) {
        if (RECAPTCHA_VERSION === 'v2') {
          if (!captchaTokenV2) {
            Swal.fire('CAPTCHA', 'Marca el reCAPTCHA antes de registrarte.', 'info');
            setLoading(false);
            return;
          }
          captchaToken = captchaTokenV2;
        } else {
          captchaToken = await getRecaptchaToken('register');
        }
      }
      const res = await fetch(`${API_BASE}/api/usuarios/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({
          email: correo,
          numero: telDigits,
          password: regPassword,
          nombre,
          apellido,
          confirmMethod,
          plataforma: 'web',
          captchaToken
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRegistroEnviado(true);
        setIdRegistrado(data.id); // Guardar el id del usuario registrado
        Swal.fire('Registro enviado', `Se envió un código de confirmación a tu ${confirmMethod === 'correo' ? 'correo' : 'teléfono'}.`, 'info');
      } else {
        // Manejo de conflictos específicos
        if (res.status === 409) {
          switch (data && data.code) {
            case 'EMAIL_IN_USE':
              Swal.fire('Correo en uso', 'El correo ya está asociado a una cuenta.', 'warning');
              break;
            case 'PHONE_IN_USE':
              Swal.fire('Teléfono en uso', 'El número ya está asociado a una cuenta.', 'warning');
              break;
            case 'EMAIL_AND_PHONE_IN_USE':
              Swal.fire('Correo y teléfono en uso', 'Ambos ya están asociados a una cuenta.', 'warning');
              break;
            default:
              Swal.fire('Conflicto', data.message || 'El correo o el número ya están en uso.', 'warning');
          }
        } else {
          Swal.fire('Error', data.message || data.error || 'No se pudo registrar', 'error');
        }
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    }
    setLoading(false);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!correo) {
        Swal.fire('Error', 'No se pudo obtener el correo para confirmar', 'error');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/usuarios/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({ email: correo, codigo })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoading(false);
  Swal.fire('¡Registro confirmado!', 'Tu cuenta ha sido activada. Ahora solo falta que el administrador apruebe tu cuenta para iniciar sesión.', 'success');
        setShowRegister(false);
        setRegistroEnviado(false);
  setNombre(''); setApellido(''); setCorreo(''); setTelefono(''); setRegPassword(''); setRegPassword2(''); setCodigo('');
        setIdRegistrado(null);
        setCooldownSeconds(0);
      } else {
        setLoading(false);
        Swal.fire('Error', data.error || 'No se pudo confirmar el registro', 'error');
      }
    } catch (err) {
      setLoading(false);
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    }
  };

  const handleResend = async () => {
    if (!correo) {
      Swal.fire('Error', 'No se pudo determinar el correo para reenviar el código.', 'error');
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({ email: correo })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire('Código reenviado', 'Revisa tu bandeja de entrada o SMS.', 'success');
        if (data.nextAllowedAt) {
          const now = Date.now();
          const seconds = Math.max(1, Math.ceil((Number(data.nextAllowedAt) - now) / 1000));
          setCooldownSeconds(seconds);
        } else {
          // Fallback mínimo de 120s por seguridad si no llega el campo
          setCooldownSeconds(120);
        }
      } else if (res.status === 429 && data && data.code === 'RESEND_COOLDOWN') {
        // Extrae segundos del mensaje "Espera X segundos..."
        const match = /([0-9]+)\s*segundos?/.exec(data.message || '');
        const seconds = match ? parseInt(match[1], 10) : 120;
        setCooldownSeconds(seconds);
        Swal.fire('Debes esperar', data.message || 'Intenta nuevamente más tarde.', 'info');
      } else if (res.status === 404 && data && data.code === 'NO_PENDING') {
        Swal.fire('Registro no encontrado', 'Vuelve a iniciar el registro para generar un nuevo código.', 'warning');
      } else if (res.status === 400 && (data.code === 'CODE_EXPIRED' || data.code === 'PENDING_NOT_FOUND')) {
        Swal.fire('Código caducado', 'Vuelve a iniciar el registro para generar un nuevo código.', 'warning');
      } else {
        Swal.fire('Error', data.message || data.error || 'No se pudo reenviar el código', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    }
    setResendLoading(false);
  };

  // Temporizador del cooldown (decrementa 1s hasta 0)
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      // Usar el fondo global del tema (soporta modo oscuro)
      background: 'var(--color-bg)'
    }}>
      <div style={{
        background: 'var(--color-card)',
        padding: '2.5rem 2rem',
        borderRadius: '12px',
        boxShadow: '0 2px 16px var(--card-shadow)',
        minWidth: '340px',
        maxWidth: 400
      }}>
        {!showRegister ? (
          <>
            <h2 style={{
              textAlign: 'center',
              marginBottom: '2rem',
              fontSize: '2.2rem',
              fontWeight: 700,
              // Texto del título según tema
              color: 'var(--color-text)'
            }}>Iniciar Sesión</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  padding: '0.7rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-input-border)',
                  background: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  fontSize: '1rem'
                }}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  padding: '0.7rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-input-border)',
                  background: 'var(--color-input-bg)',
                  color: 'var(--color-text)',
                  fontSize: '1rem'
                }}
              />
              {CAPTCHA_ENABLED && CAPTCHA_PROVIDER === 'recaptcha' && RECAPTCHA_VERSION === 'v2' && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(tok) => setCaptchaTokenV2(tok)}
                    onExpired={() => setCaptchaTokenV2(null)}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.7rem',
                  borderRadius: '6px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
            {CAPTCHA_ENABLED && CAPTCHA_PROVIDER === 'recaptcha' && RECAPTCHA_VERSION === 'v2' && (
              <p style={{ marginTop: 12, fontSize: 11, color: '#999', textAlign: 'center' }}>
                Este sitio está protegido por reCAPTCHA y se aplican la <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de Privacidad</a> y los <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Términos de Servicio</a> de Google.
              </p>
            )}
            <GoogleAuthButton onLogin={onLogin} />
            <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => setShowRegister(true)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                ¿No tienes cuenta? Regístrate
              </button>
              <button onClick={() => window.location.href = '/recuperar-password'} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem', color: 'var(--color-text)' }}>Registro</h2>
            {!registroEnviado ? (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={e => {
                    const v = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ '\- ]/g, '');
                    setNombre(v);
                  }}
                  maxLength={50}
                  required
                  style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }}
                />
                <input
                  type="text"
                  placeholder="Apellido completo"
                  value={apellido}
                  onChange={e => {
                    const v = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ '\- ]/g, '');
                    setApellido(v);
                  }}
                  maxLength={50}
                  style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }}
                />
                <input type="email" placeholder="Correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
                <input
                  type="tel"
                  placeholder="Teléfono (9 dígitos)"
                  value={telefono}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setTelefono(v);
                  }}
                  maxLength={9}
                  required
                  style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }}
                />
                <input type="password" placeholder="Contraseña" value={regPassword} onChange={e => setRegPassword(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
                <input type="password" placeholder="Confirmar contraseña" value={regPassword2} onChange={e => setRegPassword2(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '0.5rem 0' }}>
                  <span>Confirmar vía:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="radio" name="confirmMethod" value="correo" checked={confirmMethod === 'correo'} onChange={() => setConfirmMethod('correo')} /> Correo
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="radio" name="confirmMethod" value="telefono" checked={confirmMethod === 'telefono'} onChange={() => setConfirmMethod('telefono')} /> Teléfono
                  </label>
                </div>
                <button type="submit" disabled={loading} style={{ padding: '0.7rem', borderRadius: 6, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: '1.1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                  {loading ? 'Registrando...' : 'Registrarme'}
                </button>
                {CAPTCHA_ENABLED && CAPTCHA_PROVIDER === 'recaptcha' && RECAPTCHA_VERSION === 'v2' && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(tok) => setCaptchaTokenV2(tok)}
                      onExpired={() => setCaptchaTokenV2(null)}
                    />
                  </div>
                )}
                <button type="button" onClick={() => setShowRegister(false)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}>Volver a iniciar sesión</button>
              </form>
            ) : (
              <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: 8, color: 'var(--color-text)' }}>Ingresa el código que recibiste por {confirmMethod === 'correo' ? 'correo' : 'teléfono'}:</div>
                <input type="text" placeholder="Código de confirmación" value={codigo} onChange={e => setCodigo(e.target.value)} required style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
                <button type="submit" disabled={loading} style={{ padding: '0.7rem', borderRadius: 6, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: '1.1rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                  {loading ? 'Validando...' : 'Confirmar registro'}
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || cooldownSeconds > 0}
                  style={{ padding: '0.6rem', borderRadius: 6, background: 'var(--color-primary)', opacity: resendLoading || cooldownSeconds > 0 ? 0.6 : 1, color: '#fff', fontWeight: 600, fontSize: '1rem', border: 'none', cursor: resendLoading || cooldownSeconds > 0 ? 'not-allowed' : 'pointer' }}
                >
                  {resendLoading ? 'Enviando...' : (cooldownSeconds > 0 ? `Reenviar código (${cooldownSeconds}s)` : 'Reenviar código')}
                </button>
                <button type="button" onClick={() => { setRegistroEnviado(false); setCodigo(''); }} style={{ background: 'none', border: 'none', color: '#60a5fa', fontWeight: 600, cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}>Volver al registro</button>
              </form>
            )}
          </>
        )}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href="/acerca" style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.95rem', fontWeight: 600 }}>Acerca de Kairos</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
