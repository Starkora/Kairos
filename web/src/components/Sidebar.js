import { NavLink } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import { isLoggedIn, getToken } from '../utils/auth';


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

export default function Sidebar({ className = 'sidebar', onNavigate }) {
  const { email, name } = getUserInfoFromToken();
  return (
    <aside className={className} style={{position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh'}}>
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
      </nav>
      {isLoggedIn() && (
        <div style={{ width: '100%', textAlign: 'center', marginBottom: 40 }}>
          <LogoutButton />
        </div>
      )}
    </aside>
  );
}
