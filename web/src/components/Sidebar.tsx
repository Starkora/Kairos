import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import { isLoggedIn, getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';


function getUserInfoFromToken() {
  const token = getToken();
  if (!token) return {};
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      email: payload.email || '',
      name: payload.name || '',
      rol: payload.rol || 'user'
    };
  } catch {
    return {};
  }
}

export default function Sidebar({ className = 'sidebar', onNavigate }) {
  const initial = getUserInfoFromToken();
  const [email] = useState(initial.email);
  const [name] = useState(initial.name);
  const [rol, setRol] = useState(initial.rol || 'user');

  // Completar rol desde backend si el token no lo trae o para mantenerlo sincronizado
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    // Si ya es admin por token, no hace falta pedirlo; igual, para sincronizar, podemos pedirlo una vez
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/usuarios`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        // data puede ser array o objeto según el controlador
        const u = Array.isArray(data) ? (data[0] || {}) : (data || {});
        if (u.rol) setRol(u.rol);
      } catch (_) {
        // Ignorar errores de red
      }
    })();
    return () => controller.abort();
  }, []);
  return (
    <aside id="app-sidebar" className={className} style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 style={{margin: '32px 0 24px 0'}}>Kairos</h2>
      <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: 8, maxHeight: 'calc(100vh - 180px)' }}>
        <nav
          onClick={(e) => {
            const target = e.target as Element;
            if (target && target.closest('a') && typeof onNavigate === 'function') {
              onNavigate();
            }
          }}
        >
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/registro">Registro de movimientos</NavLink>
          <NavLink to="/cuentas">Cuentas</NavLink>
          <NavLink to="/calendario">Calendario</NavLink>
          <NavLink to="/deudas-metas">Deudas y Metas</NavLink>
          <NavLink to="/categorias">Categorías</NavLink>
          <NavLink to="/notificaciones">Notificaciones</NavLink>
          <NavLink to="/presupuestos">Presupuestos</NavLink>
          <NavLink to="/movimientos-recurrentes">Movimientos Recurrentes</NavLink>
          <NavLink to="/micuenta">Mi Cuenta</NavLink>
          <NavLink to="/acercade">Acerca de</NavLink>
          {rol === 'admin' && (
            <>
              <hr />
              <NavLink to="/admin/usuarios-pendientes">Admin: Usuarios pendientes</NavLink>
            </>
          )}
        </nav>
      </div>
      <style>{`
        /* Scrollbar: thin and subtle; non-invasive fallback to system behavior */
        .sidebar .sidebar-scroll {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: rgba(0,0,0,0.18) transparent;
        }
        .sidebar .sidebar-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .sidebar .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.18);
          border-radius: 6px;
        }
        /* Ocultar sidebar en pantallas pequeñas y permitir mostrarlo con clase '.visible' */
        @media (max-width: 800px) {
          .sidebar { display: none; }
          .sidebar.visible { display: flex !important; position: fixed; left: 0; top: 0; bottom: 0; width: 260px; z-index: 9999; background: var(--color-surface); box-shadow: 0 6px 30px rgba(0,0,0,0.6); }
        }
      `}</style>
      {isLoggedIn() && (
        <div style={{ width: '100%', textAlign: 'center', marginBottom: 40 }}>
          <LogoutButton />
        </div>
      )}
    </aside>
  );
}

// Lógica para manejar el toggle desde otros componentes (Calendario)
if (typeof window !== 'undefined') {
  window.addEventListener('toggle-sidebar', () => {
    const el = document.getElementById('app-sidebar');
    if (!el) return;
    if (el.classList.contains('visible')) el.classList.remove('visible'); else el.classList.add('visible');
  });
}
