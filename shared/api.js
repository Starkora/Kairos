// Lógica de consumo de API reutilizable para web y mobile

export const API_URL = 'http://localhost:3001/api';

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
