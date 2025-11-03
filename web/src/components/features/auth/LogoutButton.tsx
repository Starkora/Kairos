import React from 'react';
import { logout } from '../../../utils/auth';


const LogoutButton = () => (
  <button
    onClick={logout}
    style={{
      background: 'linear-gradient(90deg, #6C4AB6 60%, #8D72E1 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '20px',
      padding: '10px 28px',
      fontWeight: 600,
      fontSize: '1rem',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  margin: '24px 24px 0 0', // margen superior y derecho
      transition: 'background 0.2s, transform 0.2s',
      outline: 'none',
      letterSpacing: '0.5px',
    }}
    onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #8D72E1 60%, #6C4AB6 100%)'}
    onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg, #6C4AB6 60%, #8D72E1 100%)'}
  >
    <span style={{marginRight: 8, fontSize: '1.1em'}}>⎋</span> Cerrar sesión
  </button>
);

export default LogoutButton;
