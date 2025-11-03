import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FaMoon, FaSun } from 'react-icons/fa';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Registro from './components/Registro';
import Cuentas from './components/Cuentas';
import Calendario from './components/Calendario';
import Notificaciones from './components/Notificaciones';
import AcercaDe from './components/AcercaDe';
import AcercaPublic from './components/AcercaPublic';
import DeudasMetas from './components/DeudasMetas';
import Categorias from './components/Categorias';
import CategoriasCuenta from './components/CategoriasCuenta';
import Login from './components/Login';
import RecuperarPasswordPage from './pages/RecuperarPasswordPage';
import LogoutButton from './components/LogoutButton';
import { isLoggedIn, getToken, getTokenExpiration, scheduleAutoLogout, forceLogout } from './utils/auth';
import MiCuenta from './components/MiCuenta';
import ApiEndpointBadge from './components/ApiEndpointBadge';
import AdminUsuariosPendientes from './components/AdminUsuariosPendientes';
import API_BASE from './utils/apiBase';
import MovimientosRecurrentes from './pages/MovimientosRecurrentes';
import Presupuestos from './pages/Presupuestos';
import Asesor from 'pages/Asesor';
import { SpeedInsights } from "@vercel/speed-insights/react";
import './App.css';
import { MdFormatListBulleted } from 'react-icons/md';

function getUserInfoFromToken() {
  const token = getToken();
  if (!token) return {};
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      email: payload.email || '',
      name: payload.name || '',
      rol: payload.rol || undefined,
    };
  } catch {
    return {};
  }
}

function AppWrapper() {
  // Wrapper para usar useNavigate en App
  return <App />;
}




export default function App() {
  const [userInfo, setUserInfo] = useState(getUserInfoFromToken());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Escuchar cambios en el token (login/logout) en otras pestañas
  useEffect(() => {
    const onStorage = () => {
      setUserInfo(getUserInfoFromToken());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Programar auto-logout al iniciar la app (si hay token)
  useEffect(() => {
    const token = getToken();
    if (token) {
      const exp = getTokenExpiration(token);
      if (exp) scheduleAutoLogout(exp);
    }
    // Escuchar evento global de sesión expirada para mostrar feedback o acciones adicionales
    const onExpired = () => {
      // Forzar logout (ya redirige)
      try { forceLogout(); } catch (e) { /* ignore */ }
    };
    window.addEventListener('session:expired', onExpired);
    return () => window.removeEventListener('session:expired', onExpired);
  }, []);

  // Tema: detectar preferencia almacenada o preferencia OS
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
    } catch (e) { }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    try { localStorage.setItem('theme', darkMode ? 'dark' : 'light'); } catch (e) { }
    if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Función para refrescar usuario tras login/logout en la misma pestaña
  const refreshUser = () => setUserInfo(getUserInfoFromToken());

  // Detectar móvil por ancho de ventana y reaccionar a resize (ahora umbral 1024px)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Router>
      <AppRoutes
        email={userInfo.email}
        name={userInfo.name}
        refreshUser={refreshUser}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <SpeedInsights />
    </Router>
  );
}

function AppRoutes({ email, name, refreshUser, sidebarOpen, setSidebarOpen, isMobile, darkMode, setDarkMode }) {
  const navigate = useNavigate();
  // Función para redirigir tras login
  const handleLogin = () => {
    refreshUser();
    navigate('/');
  };
  // Función para refrescar tras logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    refreshUser();
    navigate('/login');
  };
  return (
    <Routes>
      {/* Login es independiente, sin layout */}
      <Route path="/login" element={isLoggedIn() ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
      <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
      {/* Página pública de Acerca */}
      <Route path="/acerca" element={<AcercaPublic />} />
      {/* Resto de la app solo si está logueado */}
      <Route
        path="*"
        element={
          isLoggedIn() ? (
            <div className="app-layout">
              {/* Sidebar: añade clases para móvil */}
              <Sidebar className={`sidebar ${isMobile ? 'mobile' : ''} ${sidebarOpen ? 'open' : ''}`} onNavigate={() => setSidebarOpen(false)} />
              {/* Backdrop como hermano para evitar superposiciones raras */}
              {isMobile && sidebarOpen && (
                <div className="backdrop" onClick={() => setSidebarOpen(false)} />
              )}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh' }}>
                {/* Navbar superior */}
                <div style={{
                  width: '100%',
                  height: 64,
                  background: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  padding: '0 32px',
                  zIndex: 20,
                  position: 'sticky',
                  top: 0
                }}>
                  {/* Botón hamburguesa en móvil */}
                  <button className="hamburger" aria-label="Abrir menú" title="Abrir menú" onClick={() => setSidebarOpen(v => !v)}>
                    {/* Usar react-icons para el icono de lista/bullets */}
                    {MdFormatListBulleted({ className: 'menu-icon', 'aria-hidden': true })}
                  </button>
                  {(name || email) && (
                    <div className="user-header-block">
                      <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', letterSpacing: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60vw' }}>{name || email}</span>
                      <span style={{ fontSize: '1.7rem', color: '#fff', display: 'flex', alignItems: 'center' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="8" r="4" fill="#fff" fillOpacity="1" />
                          <ellipse cx="12" cy="18" rx="7" ry="5" fill="#fff" fillOpacity="1" />
                        </svg>
                      </span>
                      {/* Toggle modo oscuro */}
                      <button onClick={() => setDarkMode(d => !d)} title="Alternar tema" style={{ marginLeft: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
                        {darkMode ? React.createElement(FaMoon as any, { style: { fontSize: 14 } }) : React.createElement(FaSun as any, { style: { fontSize: 14 } })}
                      </button>
                    </div>
                  )}
                </div>
                <main className="main-content" style={{ height: isMobile ? 'auto' : 'calc(100vh - 64px)' }}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/registro" element={<Registro />} />
                    <Route path="/cuentas" element={<Cuentas />} />
                    <Route path="/calendario" element={<Calendario />} />
                    <Route path="/asesor" element={<Asesor />} />
                    <Route path="/notificaciones" element={<Notificaciones />} />
                    <Route path="/presupuestos" element={<Presupuestos />} />
                    <Route path="/movimientos-recurrentes" element={<MovimientosRecurrentes />} />
                    <Route path="/acercade" element={<AcercaDe />} />
                    <Route path="/deudas-metas" element={<DeudasMetas />} />
                    <Route path="/categorias" element={<Categorias />} />
                    <Route path="/categorias-cuenta" element={<CategoriasCuenta />} />
                    <Route path="/micuenta" element={<MiCuenta />} />
                    <Route path="/admin/usuarios-pendientes" element={<AdminOnly><AdminUsuariosPendientes /></AdminOnly>} />
                  </Routes>
                </main>
                {process.env.REACT_APP_SHOW_API_BADGE === 'true' && <ApiEndpointBadge />}
                {/* Controles fijos: siempre en esquinas */}
                <button onClick={handleLogout} className="fixed-bottom-btn" style={{ position: 'fixed', left: 16, bottom: 16, background: '#6C4AB6', color: '#fff', border: 'none', borderRadius: 20, padding: '10px 28px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10, display: (isMobile && !sidebarOpen) ? 'inline-flex' : 'none' }}>
                  <span style={{ marginRight: 8, fontSize: '1.1em' }}>⎋</span> Cerrar sesión
                </button>
                <a href="/acercade" className="fixed-bottom-btn" style={{ position: 'fixed', right: 16, bottom: 16, color: '#6C4AB6', textDecoration: 'underline', fontWeight: 600, background: '#fff', padding: '8px 12px', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: (isMobile && sidebarOpen) ? 'none' : 'inline-flex' }}>Acerca de</a>
              </div>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// Guard de ruta para admin: verifica rol en JWT y, si falta, consulta /api/usuarios
function AdminOnly({ children }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const rol = payload && payload.rol;
      if (rol === 'admin') {
        setAllowed(true);
        setChecking(false);
        return;
      }
    } catch { }

    // Si no hay rol en el token o no es admin, consultar backend
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/usuarios`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('auth');
        const data = await res.json();
        const u = Array.isArray(data) ? (data[0] || {}) : (data || {});
        if (String(u.rol || '').toLowerCase() === 'admin') {
          setAllowed(true);
        } else {
          navigate('/', { replace: true });
          return;
        }
      } catch (e) {
        navigate('/', { replace: true });
        return;
      } finally {
        setChecking(false);
      }
    })();
  }, [navigate]);

  if (checking) {
    return <div style={{ padding: 24 }}>Verificando permisos…</div>;
  }
  return allowed ? children : null;
}

