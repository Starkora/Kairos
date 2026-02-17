import React, { useState, useEffect, useRef } from 'react';
// Declaración global para grecaptcha
declare global {
  interface Window {
    grecaptcha?: any;
  }
}
import GoogleAuthButton from './../../components/features/auth/GoogleAuthButton';
import API_BASE from '../../utils/apiBase';
import ReCAPTCHA from 'react-google-recaptcha';
import WelcomeModal from '../../components/WelcomeModal';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaTimesCircle, FaSun, FaMoon } from 'react-icons/fa';

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
    // Espera a que grecaptcha esté listo con timeout
    const ensureReady = () => new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos máximo
      const tryReady = () => {
        if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
          window.grecaptcha.ready(() => resolve(true));
        } else if (attempts >= maxAttempts) {
          reject(new Error('reCAPTCHA timeout'));
        } else {
          attempts++;
          setTimeout(tryReady, 100);
        }
      };
      tryReady();
    });
    
    try {
      await ensureReady();
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action || 'submit' });
      return token;
    } catch (e) {
      
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
  const [countryCode, setCountryCode] = useState('+51'); // Código de país
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [confirmMethod, setConfirmMethod] = useState('correo'); // 'correo' o 'telefono'
  const [codigo, setCodigo] = useState('');
  const [registroEnviado, setRegistroEnviado] = useState(false);
  const [idRegistrado, setIdRegistrado] = useState(null);
  // Reenvío
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  // Modal de bienvenida para nuevos usuarios
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  
  // Modo oscuro/claro
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Por defecto oscuro
  });
  
  // Aplicar tema al cargar
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };
  
  // Estados para alertas Bootstrap
  const [alert, setAlert] = useState<{type: 'success' | 'danger' | 'warning' | 'info', message: string} | null>(null);

  // Auto-ocultar alerta después de 5 segundos
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const showAlert = (type: 'success' | 'danger' | 'warning' | 'info', message: string) => {
    setAlert({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar campos vacíos
    if (!email.trim()) {
      showAlert('warning', 'Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      showAlert('warning', 'Por favor ingresa tu contraseña.');
      return;
    }
    
    setLoading(true);
    try {
      // Obtener token de CAPTCHA si está habilitado
      let captchaToken = null;
      if (CAPTCHA_ENABLED) {
        if (RECAPTCHA_VERSION === 'v2') {
          if (!captchaTokenV2) {
            showAlert('info', 'Marca el reCAPTCHA antes de continuar.');
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
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'ngrok-skip-browser-warning': 'true' },
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
        showAlert('success', '¡Bienvenido! Inicio de sesión exitoso.');
        if (onLogin) onLogin();
      } else {
        // Manejo preciso de errores 401 desde backend
        if (res.status === 401) {
          switch (data && data.code) {
            case 'EMAIL_NOT_FOUND':
              showAlert('warning', 'Correo no encontrado. Verifica que tu correo esté bien escrito o regístrate.');
              break;
            case 'INVALID_PASSWORD':
              showAlert('warning', 'Contraseña incorrecta. Intenta nuevamente o restablece tu contraseña.');
              break;
            default:
              showAlert('warning', data.message || 'Credenciales inválidas. Revisa tu correo y contraseña.');
          }
        } else if (res.status === 403) {
          if (data && data.code === 'ACCOUNT_UNVERIFIED') {
            showAlert('info', data.message || 'Cuenta no verificada. Revisa tu correo para confirmar el registro.');
          } else if (data && data.code === 'ACCOUNT_NOT_APPROVED') {
            showAlert('info', 'Tu cuenta fue registrada correctamente. Falta la aprobación del administrador para iniciar sesión.');
          } else {
            showAlert('info', data.message || 'Acceso denegado. No tienes permisos para acceder.');
          }
        } else {
          showAlert('danger', data.message || 'No se pudo iniciar sesión');
        }
      }
    } catch (err) {
      showAlert('danger', 'No se pudo conectar al servidor');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validaciones de campos vacíos
    if (!nombre.trim()) {
      showAlert('warning', 'Por favor ingresa tu nombre completo.');
      return;
    }
    if (!apellido.trim()) {
      showAlert('warning', 'Por favor ingresa tu apellido.');
      return;
    }
    if (!correo.trim()) {
      showAlert('warning', 'Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!telefono.trim()) {
      showAlert('warning', 'Por favor ingresa tu número de teléfono.');
      return;
    }
    if (!regPassword) {
      showAlert('warning', 'Por favor ingresa una contraseña.');
      return;
    }
    if (!regPassword2) {
      showAlert('warning', 'Por favor confirma tu contraseña.');
      return;
    }
    
    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      showAlert('warning', 'Por favor ingresa un correo electrónico válido.');
      return;
    }
    
    // Validación de longitud nombre/apellido
    if ((nombre || '').length > 50) {
      showAlert('warning', 'El nombre no puede exceder 50 caracteres.');
      return;
    }
    if ((apellido || '').length > 50) {
      showAlert('warning', 'El apellido no puede exceder 50 caracteres.');
      return;
    }
    // Validar teléfono: entre 6 y 15 dígitos (estándar internacional)
    const telDigits = (telefono || '').replace(/\D/g, '');
    if (telDigits.length < 6 || telDigits.length > 15) {
      showAlert('warning', 'El teléfono debe tener entre 6 y 15 dígitos.');
      return;
    }
    if (regPassword !== regPassword2) {
      showAlert('danger', 'Las contraseñas no coinciden');
      return;
    }
    // Validación de contraseña fuerte
    if (regPassword.length < 8) {
      showAlert('danger', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!/[0-9]/.test(regPassword)) {
      showAlert('danger', 'La contraseña debe contener al menos un número');
      return;
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(regPassword)) {
      showAlert('danger', 'La contraseña debe contener al menos un signo o símbolo');
      return;
    }
    setLoading(true);
    try {
      // Obtener token de CAPTCHA si está habilitado
      let captchaToken = null;
      if (CAPTCHA_ENABLED) {
        if (RECAPTCHA_VERSION === 'v2') {
          if (!captchaTokenV2) {
            showAlert('info', 'Marca el reCAPTCHA antes de registrarte.');
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
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({
          email: correo,
          numero: countryCode + telDigits, // Número completo con código de país
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
        showAlert('info', `Se envió un código de confirmación a tu ${confirmMethod === 'correo' ? 'correo' : 'teléfono'}`);
      } else {
        // Manejo de conflictos específicos
        if (res.status === 409) {
          switch (data && data.code) {
            case 'EMAIL_IN_USE':
              showAlert('warning', 'El correo ya está asociado a una cuenta.');
              break;
            case 'PHONE_IN_USE':
              showAlert('warning', 'El número ya está asociado a una cuenta.');
              break;
            case 'EMAIL_AND_PHONE_IN_USE':
              showAlert('warning', 'Ambos ya están asociados a una cuenta.');
              break;
            default:
              showAlert('warning', data.message || 'El correo o el número ya están en uso.');
          }
        } else {
          showAlert('danger', data.message || data.error || 'No se pudo registrar');
        }
      }
    } catch (err) {
      showAlert('danger', 'No se pudo conectar al servidor');
    }
    setLoading(false);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    
    // Validar código
    if (!codigo.trim()) {
      showAlert('warning', 'Por favor ingresa el código de confirmación.');
      return;
    }
    
    setLoading(true);
    try {
      if (!correo) {
        showAlert('danger', 'No se pudo obtener el correo para confirmar');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/usuarios/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({ email: correo, codigo })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoading(false);
        
        // Si es nuevo usuario, mostrar modal de bienvenida
        if (data.isNewUser) {
          setNewUserName(nombre);
          setShowWelcomeModal(true);
        } else {
          showAlert('success', '¡Registro confirmado! Tu cuenta ha sido activada exitosamente.');
        }
        
        setShowRegister(false);
        setRegistroEnviado(false);
        setNombre(''); setApellido(''); setCorreo(''); setTelefono(''); setRegPassword(''); setRegPassword2(''); setCodigo('');
        setIdRegistrado(null);
        setCooldownSeconds(0);
      } else {
        setLoading(false);
        showAlert('danger', data.error || 'No se pudo confirmar el registro');
      }
    } catch (err) {
      setLoading(false);
      showAlert('danger', 'No se pudo conectar al servidor');
    }
  };

  const handleResend = async () => {
    if (!correo) {
      showAlert('danger', 'No se pudo determinar el correo para reenviar el código.');
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify({ email: correo })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('success', 'Código reenviado. Revisa tu bandeja de entrada o WhatsApp.');
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
        showAlert('info', data.message || 'Intenta nuevamente más tarde.');
      } else if (res.status === 404 && data && data.code === 'NO_PENDING') {
        showAlert('warning', 'Registro no encontrado. Vuelve a iniciar el registro para generar un nuevo código.');
      } else if (res.status === 400 && (data.code === 'CODE_EXPIRED' || data.code === 'PENDING_NOT_FOUND')) {
        showAlert('warning', 'Código caducado. Vuelve a iniciar el registro para generar un nuevo código.');
      } else {
        showAlert('danger', data.message || data.error || 'No se pudo reenviar el código');
      }
    } catch (err) {
      showAlert('danger', 'No se pudo conectar al servidor');
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
      background: 'var(--color-bg)',
      position: 'relative'
    }}>
      {/* Botón de toggle de tema */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '55px',
          height: '55px',
          borderRadius: '50%',
          border: 'none',
          background: darkMode ? '#FFD700' : '#1a1a2e',
          color: darkMode ? '#1a1a2e' : '#FFD700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
          zIndex: 1000
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15) rotate(20deg)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        }}
        title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {/* @ts-ignore */}
        {darkMode ? <FaSun /> : <FaMoon />}
      </button>
      
      <div style={{
        background: 'var(--color-card)',
        padding: '2.5rem 2rem',
        borderRadius: '12px',
        boxShadow: '0 2px 16px var(--card-shadow)',
        minWidth: '340px',
        maxWidth: 400
      }}>
        {/* Alerta Bootstrap */}
        {alert && (
          <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* @ts-ignore */}
            {alert.type === 'success' && <FaCheckCircle style={{ flexShrink: 0 }} />}
            {/* @ts-ignore */}
            {alert.type === 'danger' && <FaTimesCircle style={{ flexShrink: 0 }} />}
            {/* @ts-ignore */}
            {alert.type === 'warning' && <FaExclamationTriangle style={{ flexShrink: 0 }} />}
            {/* @ts-ignore */}
            {alert.type === 'info' && <FaInfoCircle style={{ flexShrink: 0 }} />}
            <span style={{ flex: 1 }}>{alert.message}</span>
            <button type="button" className="btn-close" onClick={() => setAlert(null)} aria-label="Close"></button>
          </div>
        )}
        
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
                <input type="email" placeholder="Correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
                
                {/* Teléfono con selector de código de país */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={countryCode} 
                    onChange={e => setCountryCode(e.target.value)}
                    style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem', width: '120px' }}
                  >
                    <option value="+1">US +1</option>
                    <option value="+52">MX +52</option>
                    <option value="+51">PE +51</option>
                    <option value="+54">AR +54</option>
                    <option value="+56">CL +56</option>
                    <option value="+57">CO +57</option>
                    <option value="+58">VE +58</option>
                    <option value="+593">EC +593</option>
                    <option value="+591">BO +591</option>
                    <option value="+595">PY +595</option>
                    <option value="+598">UY +598</option>
                    <option value="+55">BR +55</option>
                    <option value="+34">ES +34</option>
                    <option value="+44">GB +44</option>
                    <option value="+49">DE +49</option>
                    <option value="+33">FR +33</option>
                    <option value="+39">IT +39</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Número de teléfono"
                    value={telefono}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setTelefono(v);
                    }}
                    maxLength={15}
                    style={{ flex: 1, padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }}
                  />
                </div>
                
                <input type="password" placeholder="Contraseña" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
                <input type="password" placeholder="Confirmar contraseña" value={regPassword2} onChange={e => setRegPassword2(e.target.value)} style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '0.5rem 0', color: 'var(--color-text)' }}>
                  <span style={{ fontWeight: 500 }}>Confirmar vía:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--color-text)' }}>
                    <input type="radio" name="confirmMethod" value="correo" checked={confirmMethod === 'correo'} onChange={() => setConfirmMethod('correo')} style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }} /> Correo
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--color-text)' }}>
                    <input type="radio" name="confirmMethod" value="telefono" checked={confirmMethod === 'telefono'} onChange={() => setConfirmMethod('telefono')} style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }} /> Teléfono
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
                <input type="text" placeholder="Código de confirmación" value={codigo} onChange={e => setCodigo(e.target.value)} style={{ padding: '0.7rem', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: '1rem' }} />
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
      
      {/* Modal de bienvenida para nuevos usuarios */}
      <WelcomeModal 
        show={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userName={newUserName}
      />
    </div>
  );
};

export default Login;
