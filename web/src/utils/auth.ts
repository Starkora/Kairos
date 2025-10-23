// utils/auth.js
// Funciones para manejar el token JWT en el frontend

let logoutTimerId = null;

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (!token) return;
  localStorage.setItem('token', token);
  // programar auto-logout basado en el exp del JWT si es posible
  try {
    const exp = getTokenExpiration(token);
    if (exp) scheduleAutoLogout(exp);
  } catch (e) {}
}

export function logout() {
  clearAutoLogout();
  localStorage.removeItem('token');
  window.location.href = '/login'; // Redirige al login
}

export function forceLogout() {
  // Forzar cierre sin confirmaciones
  clearAutoLogout();
  localStorage.removeItem('token');
  try { window.dispatchEvent(new Event('session:expired')); } catch(e) {}
  window.location.href = '/login';
}

export function isLoggedIn() {
  return !!localStorage.getItem('token');
}

export function getTokenExpiration(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return null;
    // exp en segundos (UNIX)
    return payload.exp * 1000;
  } catch (e) {
    return null;
  }
}

export function scheduleAutoLogout(expirationTimeMs) {
  clearAutoLogout();
  if (!expirationTimeMs) return;
  const now = Date.now();
  const delay = expirationTimeMs - now;
  if (delay <= 0) {
    // ya expirado
    forceLogout();
    return;
  }
  // programar setTimeout (máximo seguro ~2^31-1 ms). Si delay es mayor, acortamos a dicho máximo y reprogramamos después
  const MAX_DELAY = 2147483647; // ~24.8 days
  const schedule = (d) => {
    logoutTimerId = setTimeout(() => {
      forceLogout();
    }, d);
  };
  if (delay > MAX_DELAY) {
    schedule(MAX_DELAY);
    // cuando se dispare el primer timeout, la página probablemente siga abierta; pero para simplificar no reprogramamos en este helper.
  } else {
    schedule(delay);
  }
}

export function clearAutoLogout() {
  if (logoutTimerId) {
    clearTimeout(logoutTimerId);
    logoutTimerId = null;
  }
}
