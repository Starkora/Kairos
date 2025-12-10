import React, { useEffect, useMemo, useState } from 'react';
import { getToken } from '../../utils/auth';
import API_BASE from '../../utils/apiBase';
import { loadPreferences, savePreferences } from '../../utils/preferences';
import { MdBarChart, MdLightbulb, MdTrendingUp, MdAttachMoney, MdWarning, MdInfo, MdError, MdCalendarToday, MdPushPin } from 'react-icons/md';

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
    const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [expandedHorizons, setExpandedHorizons] = useState<Set<number>>(new Set());

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
        <div className="card" style={{ padding: 16, cursor: 'help' }} title="Total de ingresos registrados (applied=1) en el mes seleccionado. Incluye ingresos y movimientos de ahorro ya aplicados.">
          <div style={{ fontSize: 12, opacity: 0.8 }}>Ingresos del mes</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(kpis.ingresosMes)}</div>
        </div>
        <div className="card" style={{ padding: 16, cursor: 'help' }} title="Total de egresos registrados (applied=1) en el mes seleccionado. Solo incluye gastos ya realizados y aplicados.">
          <div style={{ fontSize: 12, opacity: 0.8 }}>Egresos del mes</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(kpis.egresosMes)}</div>
        </div>
        <div className="card" style={{ padding: 16, cursor: 'help' }} title={`Ahorro neto = Ingresos (${fmt(kpis.ingresosMes)}) - Egresos (${fmt(kpis.egresosMes)})\n\nEs lo que te queda disponible del mes.`}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Ahorro neto</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(kpis.ahorroNeto)}</div>
        </div>
        <div className="card" style={{ padding: 16, cursor: 'help' }} title={kpis.ahorroRate !== null ? `Tasa de ahorro = (Ahorro neto / Ingresos) × 100\n\nIndica qué porcentaje de tus ingresos estás ahorrando. Una tasa saludable es 10-20%.` : 'No se puede calcular (ingresos = 0)'}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Tasa de ahorro</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{kpis.ahorroRate==null? '—' : (kpis.ahorroRate*100).toFixed(1) + '%'}</div>
        </div>
        <div className="card" style={{ padding: 16, cursor: 'help' }} title={`Run rate (ritmo de gasto):\n• Promedio diario = Egresos del mes / Días transcurridos\n• Proyección = Promedio diario × Total de días del mes\n\nSirve para anticipar cuánto gastarás al final del mes si sigues al mismo ritmo.`}>
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
      <div style={{ marginBottom: 16, padding: 12, background: 'var(--color-card, #fff)', borderRadius: 10, fontSize: 14, border: '1px solid var(--color-input-border, #e5e7eb)' }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {React.createElement(MdBarChart as any, { size: 18 })} ¿Qué hace el Asesor Financiero?
        </div>
        <div style={{ opacity: 0.9, color: 'var(--color-text)' }}>
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
            <div style={{ marginBottom: 12, padding: 10, background: 'rgba(16, 185, 129, 0.15)', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <div style={{ color: 'var(--color-text)' }}>
                <b style={{ color: '#059669' }}>Cálculo rápido activado.</b> El forecast de 30 días es una estimación aproximada basada en recurrentes y movimientos futuros. 
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
              <div style={{ opacity: 0.8, display: 'flex', gap: 6 }}>
                {React.createElement(MdLightbulb as any, { size: 18, style: { flexShrink: 0, marginTop: 2 } })}
                <span>
                  <b>¿Qué es esto?</b> Para reducir carga en servidores gratuitos, el forecast detallado se calcula bajo demanda. 
                  Pulsa <b>"Calcular ahora"</b> para ver cómo evolucionará tu saldo en los próximos 30 días considerando tus gastos recurrentes, movimientos futuros y deudas.
                </span>
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
                  const t2 = setTimeout(() => controller2.abort(), 35000); // 35s para 60/90
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
                    setError(e?.name === 'AbortError' ? 'El cálculo de 60/90 días tardó demasiado. Mantén el forecast de 30 días o intenta más tarde.' : (e?.message || 'No se pudo ampliar el análisis'));
                    // Si el ampliado falla, mostrar el error pero mantener el quick
                  }
                finally { setLoading(false); }
              }}
              style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-card, #fff)', color: 'var(--color-text)', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
              title="Extiende el análisis a 60 y 90 días, incluye comisiones bancarias y cálculo preciso de recurrentes. Puede tardar más.">
                Ampliar a 60/90 y comisiones (lento)
              </button>
            </div>
          )}
          {Array.isArray(meta?.forecast) && meta.forecast.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Proyección de cashflow</div>
              <div style={{ opacity: 0.8, marginBottom: 12, fontSize: 14, display: 'flex', gap: 6 }}>
                {React.createElement(MdTrendingUp as any, { size: 18, style: { flexShrink: 0, marginTop: 2 } })}
                <span>
                  <b>¿Cómo leer esta tabla?</b> Muestra cuánto dinero ingresará y saldrá en los próximos 30/60/90 días 
                  (según recurrentes, movimientos futuros y deudas a vencer). El <b>"Saldo proyectado"</b> es lo que tendrías al final del horizonte.
                </span>
              </div>
              {/* Alertas de datos faltantes */}
              {Array.isArray(meta?.forecastWarnings) && meta.forecastWarnings.length > 0 && (
                <div style={{ marginBottom: 12, padding: 12, background: 'rgba(251, 146, 60, 0.15)', borderRadius: 10, borderLeft: '4px solid #f59e0b', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {React.createElement(MdWarning as any, { size: 18 })} Advertencias del cálculo
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--color-text)' }}>
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
                    {meta.forecast.map((f: any, idx: number) => {
                      const isExpanded = expandedHorizons.has(f.days);
                      return (
                        <React.Fragment key={f.days}>
                          <tr style={{ background: idx%2 ? 'var(--color-card-alt, #f9fafb)' : 'var(--color-card, #fff)' }}>
                            <td style={{ padding: '8px 10px' }}>
                              <button 
                                onClick={() => {
                                  const newSet = new Set(expandedHorizons);
                                  if (isExpanded) newSet.delete(f.days);
                                  else newSet.add(f.days);
                                  setExpandedHorizons(newSet);
                                }}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, marginRight: 8, fontSize: 14, fontWeight: 700 }}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                              {f.days} días
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', cursor: 'help' }} title={`Ingresos proyectados incluyen:\n• Movimientos recurrentes de ingreso/ahorro estimados a ${f.days} días\n• Movimientos futuros pendientes (applied=0) con fecha en este horizonte\n\nCálculo aproximado basado en frecuencias configuradas.`}>
                              S/ {Number(f.projectedIngresos||0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', cursor: 'help' }} title={`Egresos proyectados incluyen:\n• Movimientos recurrentes de egreso estimados a ${f.days} días\n• Movimientos futuros pendientes (applied=0) con fecha en este horizonte\n• Deudas con vencimiento en los próximos ${f.days} días\n\nCálculo aproximado basado en frecuencias configuradas.`}>
                              S/ {Number(f.projectedEgresos||0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: Number(f.net||0) < 0 ? '#ef4444' : '#22c55e', cursor: 'help' }} title={`Neto = Ingresos proyectados - Egresos proyectados\n\nEste es el flujo neto esperado en ${f.days} días.`}>
                              S/ {Number(f.net||0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: Number(f.projectedBalanceEnd||0) < 0 ? '#ef4444' : 'var(--color-text)', cursor: 'help' }} title={`Saldo proyectado = Saldo actual (${Number(f.startingBalance||0).toFixed(2)}) + Flujo neto (${Number(f.net||0).toFixed(2)})\n\nEste es el saldo que tendrías al final de ${f.days} días si todo ocurre según lo proyectado.`}>
                              S/ {Number(f.projectedBalanceEnd||0).toFixed(2)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={{ background: idx%2 ? 'var(--color-card-alt, #f9fafb)' : 'var(--color-card, #fff)' }}>
                              <td colSpan={5} style={{ padding: '12px 20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                  {/* Ingresos Detail */}
                                  <div>
                                    <div style={{ fontWeight: 700, marginBottom: 8, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {React.createElement(MdAttachMoney as any, { size: 18 })} Ingresos Detallados (S/ {Number(f.projectedIngresos||0).toFixed(2)})
                                    </div>
                                    {Array.isArray(f.ingresosDetail) && f.ingresosDetail.length > 0 ? (
                                      <div style={{ fontSize: 13, opacity: 0.9 }}>
                                        {f.ingresosDetail.map((item: any, i: number) => (
                                          <div key={i} style={{ marginBottom: 6, padding: '6px 8px', background: 'rgba(34,197,94,0.15)', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)' }}>
                                            <div style={{ fontWeight: 600 }}>{item.descripcion}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8 }}>
                                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {item.tipo === 'recurrente' ? (
                                                  <>{React.createElement(MdCalendarToday as any, { size: 12 })} {item.frecuencia}</>
                                                ) : (
                                                  <>{React.createElement(MdPushPin as any, { size: 12 })} Futuro</>
                                                )}
                                                {' • '}{item.fecha}
                                              </span>
                                              <span style={{ fontWeight: 700 }}>S/ {Number(item.monto||0).toFixed(2)}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: 13, opacity: 0.6, fontStyle: 'italic' }}>
                                        No hay ingresos proyectados en este horizonte.
                                      </div>
                                    )}
                                  </div>
                                  {/* Egresos Detail */}
                                  <div>
                                    <div style={{ fontWeight: 700, marginBottom: 8, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {React.createElement(MdTrendingUp as any, { size: 18, style: { transform: 'scaleY(-1)' } })} Egresos Detallados (S/ {Number(f.projectedEgresos||0).toFixed(2)})
                                    </div>
                                    {Array.isArray(f.egresosDetail) && f.egresosDetail.length > 0 ? (
                                      <div style={{ fontSize: 13, opacity: 0.9 }}>
                                        {f.egresosDetail.map((item: any, i: number) => (
                                          <div key={i} style={{ marginBottom: 6, padding: '6px 8px', background: 'rgba(239,68,68,0.15)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <div style={{ fontWeight: 600 }}>{item.descripcion}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8 }}>
                                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {item.tipo === 'recurrente' ? (
                                                  <>{React.createElement(MdCalendarToday as any, { size: 12 })} {item.frecuencia}</>
                                                ) : item.tipo === 'deuda' ? (
                                                  <>{React.createElement(MdWarning as any, { size: 12 })} Deuda</>
                                                ) : (
                                                  <>{React.createElement(MdPushPin as any, { size: 12 })} Futuro</>
                                                )}
                                                {' • '}{item.fecha}
                                              </span>
                                              <span style={{ fontWeight: 700 }}>S/ {Number(item.monto||0).toFixed(2)}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: 13, opacity: 0.6, fontStyle: 'italic' }}>
                                        No hay egresos proyectados en este horizonte.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>{React.createElement(MdLightbulb as any, { size: 18 })} Recomendaciones inteligentes</div>
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
                  <span style={{ fontSize: 12, color: colorFor(item.severity), fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {item.severity === 'danger' ? (
                      <>{React.createElement(MdError as any, { size: 12 })} URGENTE</>
                    ) : item.severity === 'warning' ? (
                      <>{React.createElement(MdWarning as any, { size: 12 })} ALERTA</>
                    ) : (
                      <>{React.createElement(MdInfo as any, { size: 12 })} INFO</>
                    )}
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
