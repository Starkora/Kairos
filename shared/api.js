// Lógica de consumo de API reutilizable para web y mobile
// API_URL dinámico:
// - Permite override con globalThis.KAIROS_API_BASE
// - En React Native (Android emulator), usa 10.0.2.2 por defecto

function resolveApiBase() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.KAIROS_API_BASE) {
      return String(globalThis.KAIROS_API_BASE);
    }
    // Detectar entorno React Native
    const isRN = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
    if (isRN) {
      // Heurística: asumir backend local en host de desarrollo
      return 'http://10.0.2.2:3001/api';
    }
  } catch (_) {}
  return 'http://localhost:3001/api';
}

export const API_URL = resolveApiBase();

export async function loginUsuario(email, password) {
  const response = await fetch(`${API_URL}/usuarios/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error de autenticación');
  return data;
}

export async function getDeudas(token) {
  const response = await fetch(`${API_URL}/deudas`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al obtener deudas');
  return await response.json();
}

export async function getMetas(token) {
  const response = await fetch(`${API_URL}/metas`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error al obtener metas');
  return await response.json();
}

// Puedes agregar aquí más funciones reutilizables para cuentas, categorías, pagos, etc.
