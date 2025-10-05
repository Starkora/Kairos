import React from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import Swal from 'sweetalert2';
import API_BASE from '../utils/apiBase';

const GoogleAuthButton = ({ onLogin }) => {
  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        credentials: 'include', // enviar cookies/sesión si el backend las usa
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        Swal.fire('¡Bienvenido!', 'Inicio de sesión con Google exitoso', 'success');
        if (onLogin) onLogin();
      } else {
        Swal.fire('Error', data.message || 'No se pudo autenticar con Google', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => Swal.fire('Error', 'Error al autenticar con Google', 'error')}
        useOneTap
      />
    </div>
  );
};

export default GoogleAuthButton;
