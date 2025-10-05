// utils/auth.js
// Funciones para manejar el token JWT en el frontend

export function getToken() {
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login'; // Redirige al login
}

export function isLoggedIn() {
  return !!localStorage.getItem('token');
}
