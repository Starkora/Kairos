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
};

export async function loadPreferences(): Promise<Preferences> {
  try {
    const res = await fetch(`${API_BASE}/api/preferencias`, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (!res.ok) return {};
    const json = await res.json().catch(() => ({ data: {} }));
    return (json && json.data) || {};
  } catch (_) {
    return {};
  }
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
