import React, { useEffect, useMemo, useState } from 'react';
import API_BASE from '../utils/apiBase';
import { getToken } from '../utils/auth';
import { loadPreferences, savePreferences } from '../utils/preferences';

type KPIs = {
  ingresosMes: number;
  egresosMes: number;
  ahorroNeto: number;
  ahorroRate: number | null;
  runRate: {
    dailyAvgEgreso: number;
    projectedEgresos: number;
    daysElapsed: number;
    daysInMonth: number;
  }
};

type Insight = {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

export default function Asesor() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeFuture, setIncludeFuture] = useState<boolean>(true);
  const [firstLoad, setFirstLoad] = useState(true);
  // Selector de mes (YYYY-MM). Por defecto, mes actual.
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Warmup opcional: ping rápido a /api/health/db para despertar el backend
      try {
        const warm = new AbortController();
        const t = setTimeout(() => warm.abort(), 7000);
        await fetch(`${API_BASE}/api/health/db`, { signal: warm.signal }).catch(() => {});
        clearTimeout(t);
      } catch { /* no-op */ }

      const controller = new AbortController();
  // En la primera carga damos más margen por cold start del proveedor; en cargas sucesivas ampliamos a 25s para free-tier
  const timeoutMs = firstLoad ? 45000 : 25000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const [y,m] = selectedMonth.split('-');
      const res = await fetch(`${API_BASE}/api/insights?includeFuture=${includeFuture ? '1' : '0'}&fast=1&year=${encodeURIComponent(y)}&month=${encodeURIComponent(String(parseInt(m,10)))}`,
        { headers: { 'Authorization': 'Bearer ' + getToken() }, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0,160)}`);
      }
      const json = await res.json();
      setKpis(json.kpis || null);
      setInsights(Array.isArray(json.insights) ? json.insights : []);
      setMeta(json.meta || null);
      // Si backend devolvió otro mes (p.ej. por saneamiento), reflejarlo en el selector sin generar bucle
      if (json?.meta?.month && typeof json.meta.month === 'string' && json.meta.month.length === 7) {
        setSelectedMonth(prev => (prev === json.meta.month ? prev : json.meta.month));
      }
      if (firstLoad) setFirstLoad(false);
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setError('Tiempo de espera agotado. El servidor está tardando en responder. Pulsa "Actualizar" para reintentar.');
      } else {
        setError(e?.message || 'No se pudieron cargar insights');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailed = async () => {
    setLoading(true); setError(null);
    try {
      // Warmup corto para despertar DB en free-tier
      try {
        const warm = new AbortController();
        const wt = setTimeout(() => warm.abort(), 5000);
        await fetch(`${API_BASE}/api/health/db`, { signal: warm.signal }).catch(() => {});
        clearTimeout(wt);
      } catch {}
      const controller2 = new AbortController();
      const t2 = setTimeout(() => controller2.abort(), 45000);
      const [y,m] = selectedMonth.split('-');
      const res2 = await fetch(`${API_BASE}/api/insights?includeFuture=${includeFuture ? '1' : '0'}&fast=0&year=${encodeURIComponent(y)}&month=${encodeURIComponent(String(parseInt(m,10)))}`,
        { headers: { 'Authorization': 'Bearer ' + getToken() }, signal: controller2.signal });
      clearTimeout(t2);
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      const json2 = await res2.json();
      setKpis(json2.kpis || null);
      setInsights(Array.isArray(json2.insights) ? json2.insights : []);
      setMeta(json2.meta || null);
      if (json2?.meta?.month && typeof json2.meta.month === 'string' && json2.meta.month.length === 7) {
        setSelectedMonth(prev => (prev === json2.meta.month ? prev : json2.meta.month));
      }
    } catch (e:any) {
      // Fallback automático a vista rápida si la detallada falla o expira
      if (e?.name === 'AbortError') {
        setError('Tiempo de espera agotado en el cálculo detallado. Mostrando vista rápida…');
      } else {
        setError(e?.message || 'No se pudo calcular el forecast. Mostrando vista rápida…');
      }
      try { await fetchData(); } catch {}
    }
    finally { setLoading(false); }
  };

  const fetchDetailedQuick = async () => {
    setLoading(true); setError(null);
    try {
      try {
        const warm = new AbortController();
        const wt = setTimeout(() => warm.abort(), 5000);
        await fetch(`${API_BASE}/api/health/db`, { signal: warm.signal }).catch(() => {});
        clearTimeout(wt);
      } catch {}
      const controller2 = new AbortController();
      const t2 = setTimeout(() => controller2.abort(), 20000);
      const [y,m] = selectedMonth.split('-');
      const url = `${API_BASE}/api/insights?includeFuture=${includeFuture ? '1' : '0'}&fast=0&quick=1&year=${encodeURIComponent(y)}&month=${encodeURIComponent(String(parseInt(m,10)))}`;
      const res2 = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() }, signal: controller2.signal });
      clearTimeout(t2);
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      const json2 = await res2.json();
      setKpis(json2.kpis || null);
      setInsights(Array.isArray(json2.insights) ? json2.insights : []);
      setMeta(json2.meta || null);
      if (json2?.meta?.month && typeof json2.meta.month === 'string' && json2.meta.month.length === 7) {
        setSelectedMonth(prev => (prev === json2.meta.month ? prev : json2.meta.month));
      }
    } catch (e:any) {
      if (e?.name === 'AbortError') {
        setError('Cálculo rápido abortado por tiempo. Te muestro la vista rápida.');
      } else {
        setError(e?.message || 'No se pudo calcular el forecast. Te muestro la vista rápida.');
      }
      try { await fetchData(); } catch {}
    } finally { setLoading(false); }
  };

  // Cargar preferencia inicial desde backend/local al montar
  useEffect(() => {
    (async () => {
      try {
        const prefs = await loadPreferences();
        const inc = prefs?.advisor?.includeFutureForecast;
        if (typeof inc === 'boolean') setIncludeFuture(inc);
      } catch {}
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Si la vista actual es detallada, respetar ese modo; si es "quick", usar quick
    if (meta && meta.fast === false) {
      if (meta.quick) fetchDetailedQuick(); else fetchDetailed();
    } else {
      fetchData();
    }
    // eslint-disable-next-line
  }, [includeFuture]);
  // Auto-cargar cuando cambia el mes seleccionado (con pequeño debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      if (meta && meta.fast === false) {
        if (meta.quick) fetchDetailedQuick(); else fetchDetailed();
      } else {
        fetchData();
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [selectedMonth]);

  // Guardar preferencia al cambiar
  useEffect(() => {
    savePreferences({ advisor: { includeFutureForecast: includeFuture } }).catch(() => {});
  }, [includeFuture]);

  const kpiCards = useMemo(() => {
    if (!kpis) return null;
    const fmt = (n: number) => `S/ ${Number(n || 0).toFixed(2)}`;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Ingresos del mes</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(kpis.ingresosMes)}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Egresos del mes</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(kpis.egresosMes)}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Ahorro neto</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(kpis.ahorroNeto)}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Tasa de ahorro</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{kpis.ahorroRate==null? '—' : (kpis.ahorroRate*100).toFixed(1) + '%'}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Run rate egresos</div>
          <div style={{ fontSize: 16 }}>Promedio diario: <b>{fmt(kpis.runRate.dailyAvgEgreso)}</b></div>
          <div style={{ fontSize: 16 }}>Proyección: <b>{fmt(kpis.runRate.projectedEgresos)}</b></div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Día {kpis.runRate.daysElapsed} de {kpis.runRate.daysInMonth}</div>
        </div>
      </div>
    );
  }, [kpis]);

  const colorFor = (sev: Insight['severity']) => {
    if (sev === 'danger') return '#ef4444';
    if (sev === 'warning') return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Asesor financiero</h2>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-card)', border: '1px solid var(--color-input-border)', padding: '6px 10px', borderRadius: 10 }} title="Selecciona el mes para ver los KPIs (ingresos/egresos reales de ese mes)">
          <span style={{ fontSize: 12, opacity: 0.8 }}>Mes</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ background: 'transparent', color: 'var(--color-text)', border: 'none', outline: 'none' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-card)', border: '1px solid var(--color-input-border)', padding: '6px 10px', borderRadius: 10, cursor: 'pointer' }} title="Incluye movimientos pendientes (applied=0) y recurrentes en la proyección de cashflow a 30 días">
          <input type="checkbox" checked={includeFuture} onChange={e => setIncludeFuture(e.target.checked)} />
          Incluir movimientos futuros
        </label>
        <button onClick={fetchData} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }} title="Refresca los datos desde el servidor">Actualizar</button>
      </div>
      {/* Explicación breve de la pantalla */}
      <div style={{ marginBottom: 16, padding: 12, background: '#1f2937', borderRadius: 10, fontSize: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>📊 ¿Qué hace el Asesor Financiero?</div>
        <div style={{ opacity: 0.9 }}>
          Te muestra <b>indicadores clave</b> (KPIs) del mes seleccionado: cuánto ingresaste, gastaste y ahorraste. 
          Abajo verás <b>recomendaciones inteligentes</b> (insights) si detectamos riesgos o áreas de mejora, y una <b>proyección de cashflow a 30 días</b> para que sepas cómo estará tu saldo.
        </div>
      </div>
      {meta?.month && (
        <div style={{ marginBottom: 12, opacity: 0.8 }}>Mes: <b>{meta.month}</b></div>
      )}
      {loading ? (
        <div>
          Cargando…<br />
          <small style={{ opacity: 0.7 }}>Si tarda más de 15s, pulsa "Actualizar" para reintentar.</small>
        </div>
      ) : error ? (
        <div style={{ color: '#ef4444' }}>Error: {error}</div>
      ) : (
        <>
          {kpiCards}
          {/* Badge explicativo cuando es modo quick */}
          {meta?.quick && (
            <div style={{ marginBottom: 12, padding: 10, background: '#065f46', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <div>
                <b>Cálculo rápido activado.</b> El forecast de 30 días es una estimación aproximada basada en recurrentes y movimientos futuros. 
                Para un análisis más preciso (con excepciones de fechas y más horizontes), usa el botón <b>"Ampliar a 60/90 y comisiones"</b>.
              </div>
            </div>
          )}
          {/* Forecast 30/60/90 días */}
          {meta?.fast && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 800 }}>Proyección de cashflow</div>
                <button onClick={async () => {
                  // Pedimos una versión ligera del detallado: budgets + forecast a 30 días
                  setLoading(true); setError(null);
                  try {
                    const controller2 = new AbortController();
                    const t2 = setTimeout(() => controller2.abort(), 20000); // aún más rápido con modo quick
                    const [y,m] = selectedMonth.split('-');
                    const url = `${API_BASE}/api/insights?includeFuture=${includeFuture ? '1' : '0'}&fast=0&quick=1&year=${encodeURIComponent(y)}&month=${encodeURIComponent(String(parseInt(m,10)))}`;
                    const res2 = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() }, signal: controller2.signal });
                    clearTimeout(t2);
                    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
                    const json2 = await res2.json();
                    setKpis(json2.kpis || null);
                    setInsights(Array.isArray(json2.insights) ? json2.insights : []);
                    setMeta(json2.meta || null);
                  } catch (e:any) {
                    if (e?.name === 'AbortError') {
                      setError('Cálculo rápido abortado por tiempo. Te muestro la vista rápida.');
                    } else {
                      setError(e?.message || 'No se pudo calcular el forecast. Te muestro la vista rápida.');
                    }
                    try { await fetchData(); } catch {}
                  }
                  finally { setLoading(false); }
                }} disabled={loading}
                style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: loading ? '#374151' : 'var(--color-card)', color: 'var(--color-text)', fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                title="Calcula una proyección rápida de 30 días con presupuestos y movimientos futuros. Tarda pocos segundos.">
                  {loading ? 'Calculando…' : 'Calcular ahora'}
                </button>
              </div>
              <div style={{ opacity: 0.8 }}>
                💡 <b>¿Qué es esto?</b> Para reducir carga en servidores gratuitos, el forecast detallado se calcula bajo demanda. 
                Pulsa <b>"Calcular ahora"</b> para ver cómo evolucionará tu saldo en los próximos 30 días considerando tus gastos recurrentes, movimientos futuros y deudas.
              </div>
            </div>
          )}
          {/* Acción opcional para ampliar más detalle cuando el servidor esté libre */}
          {meta?.fast === false && Array.isArray(meta?.forecast) && meta.forecast.length === 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={async () => {
                setLoading(true); setError(null);
                try {
                  const controller2 = new AbortController();
                  const t2 = setTimeout(() => controller2.abort(), 45000);
                  const [y,m] = selectedMonth.split('-');
                  const url = `${API_BASE}/api/insights?includeFuture=${includeFuture ? '1' : '0'}&fast=0&year=${encodeURIComponent(y)}&month=${encodeURIComponent(String(parseInt(m,10)))}&details=budgets,recurrent,fees,forecast&horizons=30,60,90`;
                  const res2 = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() }, signal: controller2.signal });
                  clearTimeout(t2);
                  if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
                  const json2 = await res2.json();
                  setKpis(json2.kpis || null);
                  setInsights(Array.isArray(json2.insights) ? json2.insights : []);
                  setMeta(json2.meta || null);
                  } catch (e:any) { 
                    setError(e?.message || 'No se pudo ampliar el análisis');
                    // Si el ampliado falla, mostrar el error pero mantener el quick
                  }
                finally { setLoading(false); }
              }}
              style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: '#374151', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}
              title="Extiende el análisis a 60 y 90 días, incluye comisiones bancarias y cálculo preciso de recurrentes. Puede tardar más.">
                Ampliar a 60/90 y comisiones (lento)
              </button>
            </div>
          )}
          {Array.isArray(meta?.forecast) && meta.forecast.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Proyección de cashflow</div>
              <div style={{ opacity: 0.8, marginBottom: 12, fontSize: 14 }}>
                📈 <b>¿Cómo leer esta tabla?</b> Muestra cuánto dinero ingresará y saldrá en los próximos 30/60/90 días 
                (según recurrentes, movimientos futuros y deudas a vencer). El <b>"Saldo proyectado"</b> es lo que tendrías al final del horizonte.
              </div>
              {/* Alertas de datos faltantes */}
              {Array.isArray(meta?.forecastWarnings) && meta.forecastWarnings.length > 0 && (
                <div style={{ marginBottom: 12, padding: 12, background: '#92400e', borderRadius: 10, borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ Advertencias del cálculo</div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                    {meta.forecastWarnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <button onClick={() => {
                  try {
                    const header = ['Horizonte','Ingresos','Egresos','Neto','Saldo proyectado'];
                    const lines = [header];
                    (meta?.forecast || []).forEach((f: any) => {
                      lines.push([
                        String(f.days) + ' días',
                        String(Number(f.projectedIngresos||0).toFixed(2)),
                        String(Number(f.projectedEgresos||0).toFixed(2)),
                        String(Number(f.net||0).toFixed(2)),
                        String(Number(f.projectedBalanceEnd||0).toFixed(2))
                      ]);
                    });
                    const csv = lines.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `forecast_${meta?.month || ''}.csv`;
                    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                  } catch {}
                }}
                style={{ padding: '6px 10px', borderRadius: 10, background: '#10b981', color: '#0b2e1e', border: 'none', fontWeight: 700 }}>
                  Exportar CSV
                </button>
                <button onClick={async () => {
                  try {
                    const header = ['Horizonte','Ingresos','Egresos','Neto','Saldo proyectado'];
                    const rows: string[][] = [header];
                    (meta?.forecast || []).forEach((f: any) => {
                      rows.push([
                        `${f.days} días`,
                        `S/ ${Number(f.projectedIngresos||0).toFixed(2)}`,
                        `S/ ${Number(f.projectedEgresos||0).toFixed(2)}`,
                        `S/ ${Number(f.net||0).toFixed(2)}`,
                        `S/ ${Number(f.projectedBalanceEnd||0).toFixed(2)}`,
                      ]);
                    });
                    const text = rows.map(r => r.join(' | ')).join('\n');
                    await navigator.clipboard.writeText(text);
                  } catch {}
                }}
                style={{ padding: '6px 10px', borderRadius: 10, background: '#fbbf24', color: '#3b2a00', border: 'none', fontWeight: 700 }}>
                  Copiar forecast
                </button>
                <button onClick={async () => {
                  try {
                    const XLSX = await import('xlsx');
                    const rows = (meta?.forecast || []).map((f: any) => ({
                      Horizonte: `${f.days} días`,
                      Ingresos: Number(Number(f.projectedIngresos||0).toFixed(2)),
                      Egresos: Number(Number(f.projectedEgresos||0).toFixed(2)),
                      Neto: Number(Number(f.net||0).toFixed(2)),
                      'Saldo proyectado': Number(Number(f.projectedBalanceEnd||0).toFixed(2))
                    }));
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Forecast');
                    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `forecast_${meta?.month || ''}.xlsx`;
                    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                  } catch {
                    // fallback rápido: nada (ya tenemos CSV)
                  }
                }}
                style={{ padding: '6px 10px', borderRadius: 10, background: '#22d3ee', color: '#083344', border: 'none', fontWeight: 700 }}>
                  Exportar XLSX
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 580, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: '#2563eb' }}>
                      <th style={{ color: '#fff', padding: '8px 10px', textAlign: 'left' }}>Horizonte</th>
                      <th style={{ color: '#fff', padding: '8px 10px', textAlign: 'right' }}>Ingresos</th>
                      <th style={{ color: '#fff', padding: '8px 10px', textAlign: 'right' }}>Egresos</th>
                      <th style={{ color: '#fff', padding: '8px 10px', textAlign: 'right' }}>Neto</th>
                      <th style={{ color: '#fff', padding: '8px 10px', textAlign: 'right' }}>Saldo proyectado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.forecast.map((f: any, idx: number) => (
                      <tr key={f.days} style={{ background: idx%2 ? '#1f2937' : '#111827' }}>
                        <td style={{ padding: '8px 10px' }}>{f.days} días</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>S/ {Number(f.projectedIngresos||0).toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>S/ {Number(f.projectedEgresos||0).toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: Number(f.net||0) < 0 ? '#ef4444' : '#22c55e' }}>S/ {Number(f.net||0).toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: Number(f.projectedBalanceEnd||0) < 0 ? '#ef4444' : 'var(--color-text)' }}>S/ {Number(f.projectedBalanceEnd||0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>💡 Recomendaciones inteligentes</div>
          <div style={{ opacity: 0.8, marginBottom: 12, fontSize: 14 }}>
            Estas recomendaciones aparecen <b>automáticamente</b> cuando detectamos situaciones que requieren tu atención:
            <ul style={{ marginTop: 6, paddingLeft: 20 }}>
              <li><b>Ritmo de gasto alto:</b> Si tu proyección de egresos supera tus ingresos.</li>
              <li><b>Presupuestos excedidos/en alerta:</b> Si alguna categoría gasta más del umbral configurado.</li>
              <li><b>Tasa de ahorro baja/negativa:</b> Si ahorras menos del 5% o gastas más de lo que ingresas.</li>
              <li><b>Egresos recurrentes altos:</b> Si compromisos fijos (suscripciones, préstamos) superan el 70% de tus ingresos.</li>
              <li><b>Metas sin avance:</b> Si tienes metas creadas hace más de 60 días sin aportes.</li>
              <li><b>Comisiones bancarias elevadas:</b> Si pagas más del 2-5% de tus ingresos en comisiones.</li>
              <li><b>Saldo negativo proyectado:</b> Si el forecast indica que tu saldo caerá por debajo de cero.</li>
            </ul>
            Puedes <b>ocultar</b> una recomendación por 7, 30 o 90 días si ya la atendiste o no aplica ahora.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {insights.length === 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 700 }}>✅ Sin recomendaciones por ahora</div>
                <div style={{ opacity: 0.8 }}>Todo se ve bien. ¡Sigue así!</div>
              </div>
            )}
            {insights.map(item => (
              <div key={item.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${colorFor(item.severity)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{item.title}</div>
                  <span style={{ fontSize: 12, color: colorFor(item.severity), fontWeight: 800 }}>
                    {item.severity === 'danger' ? '🔴 URGENTE' : item.severity === 'warning' ? '⚠️ ALERTA' : 'ℹ️ INFO'}
                  </span>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 12px 0', fontFamily: 'inherit' }}>{item.body}</pre>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {item.cta && (
                    <a href={item.cta.href} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>{item.cta.label}</a>
                  )}
                  {[7,30,90].map(days => (
                    <button key={days}
                      onClick={async () => {
                        try {
                          await fetch(`${API_BASE}/api/insights/dismiss`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                            body: JSON.stringify({ id: item.id, days })
                          });
                        } catch {}
                        setInsights(prev => prev.filter(x => x.id !== item.id));
                      }}
                      title={`Ocultar esta recomendación durante ${days} días (si ya la atendiste o no aplica)`}
                      style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer' }}>
                      Ocultar {days}d
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
