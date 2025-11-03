import React from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import Swal from 'sweetalert2';
import API_BASE from '../../../utils/apiBase';

const GoogleAuthButton = ({ onLogin }) => {
  const fetchWithRetry = async (input: RequestInfo, init: RequestInit, retries = 2) => {
    let lastErr: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(input, { ...init, signal: controller.signal });
        clearTimeout(timeout);
        return res;
      } catch (e) {
        lastErr = e;
        // Reintentar si es aborto/red, con pequeño backoff
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    throw lastErr || new Error('network_error');
  };

  const parseResponseSafe = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) return await res.json();
      const text = await res.text();
      return { message: text?.slice(0, 500) || '' } as any;
    } catch {
      return {} as any;
    }
  };

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/usuarios/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        credentials: 'include', // enviar cookies/sesión si el backend las usa
        body: JSON.stringify({ credential: credentialResponse.credential, plataforma: 'web' })
      }, 2);

      // 502/503/504 típicos de cold start: mostrar mensaje claro
      if ([502, 503, 504].includes(res.status)) {
        Swal.fire('Servidor iniciando', 'El servidor está arrancando o temporalmente no disponible. Intenta nuevamente en unos segundos.', 'info');
        return;
      }

      const data = await parseResponseSafe(res);
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        Swal.fire('¡Bienvenido!', 'Inicio de sesión con Google exitoso', 'success');
        if (onLogin) onLogin();
      } else {
        if (res.status === 403 && data && data.code === 'ACCOUNT_NOT_APPROVED') {
          Swal.fire('Cuenta registrada', 'Tu cuenta fue registrada correctamente. Falta la aprobación del administrador para iniciar sesión.', 'info');
          return;
        }
        const msg = data?.message || 'No se pudo autenticar con Google';
        Swal.fire('Error', String(msg), 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar al servidor. Verifica tu conexión e intenta de nuevo.', 'error');
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => Swal.fire('Error', 'Error al autenticar con Google', 'error')}
        // Deshabilitamos One Tap/FedCM para evitar bloqueos por COOP/FedCM en algunos navegadores/hostings
        useOneTap={false}
      />
    </div>
  );
};

export default GoogleAuthButton;
