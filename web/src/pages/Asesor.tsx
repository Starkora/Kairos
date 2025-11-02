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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_BASE}/api/insights?includeFuture=${includeFuture ? '1' : '0'}`, { headers: { 'Authorization': 'Bearer ' + getToken() }, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0,160)}`);
      }
      const json = await res.json();
      setKpis(json.kpis || null);
      setInsights(Array.isArray(json.insights) ? json.insights : []);
      setMeta(json.meta || null);
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

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [includeFuture]);

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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-card)', border: '1px solid var(--color-input-border)', padding: '6px 10px', borderRadius: 10 }}>
          <input type="checkbox" checked={includeFuture} onChange={e => setIncludeFuture(e.target.checked)} />
          Incluir movimientos futuros (applied=0)
        </label>
        <button onClick={fetchData} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontWeight: 700 }}>Actualizar</button>
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
          {/* Forecast 30/60/90 días */}
          {Array.isArray(meta?.forecast) && meta.forecast.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Proyección de cashflow</div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {insights.length === 0 && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 700 }}>Sin recomendaciones por ahora</div>
                <div style={{ opacity: 0.8 }}>Todo se ve bien. ¡Sigue así!</div>
              </div>
            )}
            {insights.map(item => (
              <div key={item.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${colorFor(item.severity)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{item.title}</div>
                  <span style={{ fontSize: 12, color: colorFor(item.severity), fontWeight: 800 }}>{item.severity.toUpperCase()}</span>
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
                      title={`Ocultar durante ${days} días`}
                      style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontWeight: 700 }}>
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
