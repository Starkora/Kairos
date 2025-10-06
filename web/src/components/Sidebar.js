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
    <aside className={className} style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 style={{margin: '32px 0 24px 0'}}>Kairos</h2>
      <nav style={{flex: 1}}
        onClick={(e) => {
          const target = e.target;
          if (target && target.closest('a') && typeof onNavigate === 'function') {
            onNavigate();
          }
        }}
      >
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/registro">Registro</NavLink>
        <NavLink to="/cuentas">Cuentas</NavLink>
        <NavLink to="/calendario">Calendario</NavLink>
        <NavLink to="/deudas-metas">Deudas y Metas</NavLink>
        <NavLink to="/categorias">Categorías</NavLink>
        <NavLink to="/notificaciones">Notificaciones</NavLink>
        <NavLink to="/micuenta">Mi Cuenta</NavLink>
        <NavLink to="/acercade">Acerca de</NavLink>
        {rol === 'admin' && (
          <>
            <hr />
            <NavLink to="/admin/usuarios-pendientes">Admin: Usuarios pendientes</NavLink>
          </>
        )}
      </nav>
      {isLoggedIn() && (
        <div style={{ width: '100%', textAlign: 'center', marginBottom: 40 }}>
          <LogoutButton />
        </div>
      )}
    </aside>
  );
}
