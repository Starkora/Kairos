import { getToken } from './auth';
import { forceLogout } from './auth';
import API_BASE from './apiBase';

export interface ApiFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export default async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  // Si el URL es relativo (empieza con '/') lo resolvemos contra el backend API_BASE
  const finalUrl = url.startsWith('/') ? `${API_BASE}${url}` : url;
  const headers: Record<string, string> = options.headers ? { ...options.headers } : {};
  const token = getToken();
  if (token && !headers.Authorization) headers.Authorization = 'Bearer ' + token;
  const opts: RequestInit = { ...options, headers };
  try {
    const res = await fetch(finalUrl, opts);
    if (res.status === 401) {
      // Token inválido o expirado, forzar logout
      try { forceLogout(); } catch (e) {}
      throw new Error('Unauthorized');
    }
    // Diagnóstico: si recibimos HTML en una ruta de API, avisar por consola
    try {
      const ct = res.headers.get('content-type') || '';
      if (/\/api\//.test(finalUrl) && /text\/html|text\/plain/i.test(ct)) {
        const txt = await res.clone().text();
        // Solo un preview para no saturar
        console.error('[apiFetch] Respuesta no-JSON para', finalUrl, 'status:', res.status, 'content-type:', ct, 'preview:', txt.slice(0, 160));
      }
    } catch {}
    return res;
  } catch (e) {
    throw e;
  }
}
