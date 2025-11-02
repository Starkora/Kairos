import API_BASE from './apiBase';
import { getToken } from './auth';

export type CalendarFilters = { ingreso: boolean; egreso: boolean; ahorro: boolean; transferencia: boolean };
export type CalendarPreset = { name: string; filters: CalendarFilters };

export type Preferences = {
  budgets?: {
    thresholdWarn?: number;
    thresholdDanger?: number;
  };
  calendar?: {
    filterPresets?: CalendarPreset[];
    lastFilters?: CalendarFilters;
    lastSearch?: string;
  };
  advisor?: {
    includeFutureForecast?: boolean;
  };
};

export async function loadPreferences(): Promise<Preferences> {
  // Cache local con SWR simple (TTL 60s) para evitar golpear el backend repetidas veces
  try {
    const key = 'kairos:prefs:cache';
    const ttlMs = 60_000;
    const now = Date.now();
    const raw = localStorage.getItem(key);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && obj.expires && now < obj.expires && obj.data) {
        // Devolver cache fresco y en paralelo refrescar (no bloqueante)
        refreshPrefs().catch(() => {});
        return obj.data as Preferences;
      }
    }
  } catch {}
  // Si no hay cache, consulta directa
  const fresh = await refreshPrefs().catch(() => ({}));
  return fresh;
}

async function refreshPrefs(): Promise<Preferences> {
  const res = await fetch(`${API_BASE}/api/preferencias`, { headers: { 'Authorization': 'Bearer ' + getToken() } });
  if (!res.ok) return {};
  const json = await res.json().catch(() => ({ data: {} }));
  const data = (json && json.data) || {};
  try {
    localStorage.setItem('kairos:prefs:cache', JSON.stringify({ data, expires: Date.now() + 60_000 }));
  } catch {}
  return data;
}

export async function savePreferences(partial: Preferences): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/preferencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ data: partial })
    });
  } catch (_) {
    // Silencioso: fallback a localStorage está en los componentes
  }
}
