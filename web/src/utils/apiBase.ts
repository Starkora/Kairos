// Resuelve la URL base del backend para web en tiempo de ejecución.
// Prioridad:
// 1) Si corre bajo Dev Tunnels (hostname con "-3000.") => reemplaza -3000. por -<puerto backend> (3002 por defecto) y usa HTTPS
// 2) REACT_APP_API_BASE (si se define)
// 3) Si corre bajo localhost => http://localhost:<puerto backend>
// 4) Caso genérico => http(s)://<host>:<puerto backend>

export const API_BASE = (() => {
  // 0) Overrides en tiempo de ejecución
  if (typeof window !== 'undefined') {
    try {
      const urlOverride = window.localStorage.getItem('API_BASE_OVERRIDE');
      if (urlOverride) return urlOverride; // URL completa inyectada por el usuario
    } catch {}
  }

  // 1) Detección del hostname (solo en navegador)
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    let portOverride;
    try { portOverride = window.localStorage.getItem('API_PORT_OVERRIDE') || undefined; } catch {}
    const backendPort = portOverride || process.env.REACT_APP_API_PORT || '3002';

    // Dev Tunnels de VS Code usa patrón: <hash>-3000.<subdominios>.devtunnels.ms
    const devTunnelsRegex = /-3000\.[\w.-]*devtunnels\.ms$/i;
    if (devTunnelsRegex.test(hostname)) {
      // Ignorar REACT_APP_API_BASE para no apuntar a localhost en terceros
      const backendHost = hostname.replace('-3000.', `-${backendPort}.`);
      return `https://${backendHost}`;
    }

    // 2) Variable de entorno explícita (solo si no es Dev Tunnels)
    if (process.env.REACT_APP_API_BASE) {
      return process.env.REACT_APP_API_BASE;
    }

    // 3) Si estás en localhost (React dev server)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:${backendPort}`;
    }

    // 4) Hosting público (p.ej. Vercel): si no hay REACT_APP_API_BASE, usar un backend público por defecto
    const isPublicHosting = /vercel\.app$/i.test(hostname) || /netlify\.app$/i.test(hostname);
    if (isPublicHosting) {
      const fallback = process.env.REACT_APP_PUBLIC_API_BASE || 'https://kr-backend-u06r.onrender.com';
      if (!process.env.REACT_APP_API_BASE) {
        try { console.warn('[apiBase] Usando fallback público:', fallback); } catch {}
      }
      return fallback;
    }

    // 5) Caso genérico: mismo host con puerto backend
    return `${protocol}//${hostname}:${backendPort}`;
  }

  // Fallback CLI / SSR
  return process.env.REACT_APP_API_BASE || 'http://localhost:3002';
})();

export default API_BASE;