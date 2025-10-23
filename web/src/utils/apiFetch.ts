import { getToken } from './auth';
import { forceLogout } from './auth';

export interface ApiFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export default async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = options.headers ? { ...options.headers } : {};
  const token = getToken();
  if (token && !headers.Authorization) headers.Authorization = 'Bearer ' + token;
  const opts: RequestInit = { ...options, headers };
  try {
    const res = await fetch(url, opts);
    if (res.status === 401) {
      // Token inválido o expirado, forzar logout
      try { forceLogout(); } catch (e) {}
      throw new Error('Unauthorized');
    }
    return res;
  } catch (e) {
    throw e;
  }
}
