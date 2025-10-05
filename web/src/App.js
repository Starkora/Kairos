import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { isLoggedIn, getToken } from './utils/auth';
import MiCuenta from './components/MiCuenta';
import ApiEndpointBadge from './components/ApiEndpointBadge';

function getUserInfoFromToken() {
  const token = getToken();
  if (!token) return {};
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      email: payload.email || '',
      name: payload.name || '',
    };
  } catch {
    return {};
  }
}
import './App.css';




function AppWrapper() {
  // Wrapper para usar useNavigate en App
  return <App />;
}




export default function App() {
  const [userInfo, setUserInfo] = useState(getUserInfoFromToken());

  // Escuchar cambios en el token (login/logout) en otras pestañas
  useEffect(() => {
    const onStorage = () => {
      setUserInfo(getUserInfoFromToken());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Función para refrescar usuario tras login/logout en la misma pestaña
  const refreshUser = () => setUserInfo(getUserInfoFromToken());

  return (
    <Router>
      <AppRoutes email={userInfo.email} name={userInfo.name} refreshUser={refreshUser} />
    </Router>
  );
}

function AppRoutes({ email, name, refreshUser }) {
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
              <Sidebar />
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100vh'}}>
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
                  {(name || email) && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      background: 'var(--color-primary)',
                      borderRadius: 32,
                      padding: '6px 24px 6px 32px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      marginLeft: 'auto',
                      marginRight: '24px'
                    }}>
                      <span style={{fontSize: '1.1rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', letterSpacing: 0.2}}>{name || email}</span>
                      <span style={{fontSize: '1.7rem', color: '#fff', display: 'flex', alignItems: 'center'}}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="8" r="4" fill="#fff" fillOpacity="1"/>
                          <ellipse cx="12" cy="18" rx="7" ry="5" fill="#fff" fillOpacity="1"/>
                        </svg>
                      </span>
                    </div>
                  )}
                </div>
                <main className="main-content" style={{height: 'calc(100vh - 64px)'}}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/registro" element={<Registro />} />
                    <Route path="/cuentas" element={<Cuentas />} />
                    <Route path="/calendario" element={<Calendario />} />
                    <Route path="/notificaciones" element={<Notificaciones />} />
                    <Route path="/acercade" element={<AcercaDe />} />
                    <Route path="/deudas-metas" element={<DeudasMetas />} />
                    <Route path="/categorias" element={<Categorias />} />
                    <Route path="/categorias-cuenta" element={<CategoriasCuenta />} />
                    <Route path="/micuenta" element={<MiCuenta />} />
                  </Routes>
                </main>
                {process.env.REACT_APP_SHOW_API_BADGE === 'true' && <ApiEndpointBadge />}
                {/* Botón de logout personalizado */}
                <button onClick={handleLogout} style={{position:'fixed', left:16, bottom:16, background:'#6C4AB6', color:'#fff', border:'none', borderRadius:20, padding:'10px 28px', fontWeight:600, fontSize:'1rem', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                  <span style={{marginRight:8, fontSize:'1.1em'}}>⎋</span> Cerrar sesión
                </button>
                {/* Enlace a Acerca de */}
                <a href="/acercade" style={{position:'fixed', right:16, bottom:16, color:'#6C4AB6', textDecoration:'underline', fontWeight:600}}>Acerca de</a>
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

