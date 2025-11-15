import React, { useEffect, useMemo, useState } from 'react';
import apiFetch from '../../utils/apiFetch';
import API_BASE from '../../utils/apiBase';
import { getToken } from '../../utils/auth';
import Swal from 'sweetalert2';
import { loadPreferences, savePreferences } from '../../utils/preferences';

type Presupuesto = { id?: number; categoria_id: number; categoria?: string; anio: number; mes: number; monto: number; gastado?: number };
type MovimientoDetalle = { descripcion: string; monto: number; fecha: string };

export default function Presupuestos() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [items, setItems] = useState<Presupuesto[]>([]);
  const [categorias, setCategorias] = useState<{id:number,nombre:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [movimientosPorCategoria, setMovimientosPorCategoria] = useState<Record<number, MovimientoDetalle[]>>({});
  // Umbrales configurables
  const [thresholdWarn, setThresholdWarn] = useState<number>(() => {
    try { const v = localStorage.getItem('kairos-budget-threshold-warn'); return v ? Number(v) : 80; } catch { return 80; }
  });
  const [thresholdDanger, setThresholdDanger] = useState<number>(() => {
    try { const v = localStorage.getItem('kairos-budget-threshold-danger'); return v ? Number(v) : 100; } catch { return 100; }
  });
  // Cargar preferencias desde backend al montar
  useEffect(() => {
    (async () => {
      const prefs = await loadPreferences();
      const warn = prefs?.budgets?.thresholdWarn;
      const danger = prefs?.budgets?.thresholdDanger;
      if (typeof warn === 'number') setThresholdWarn(warn);
      if (typeof danger === 'number') setThresholdDanger(danger);
    })();
    // eslint-disable-next-line
  }, []);
  // Persistir en localStorage y backend cuando cambian
  useEffect(() => {
    try { localStorage.setItem('kairos-budget-threshold-warn', String(thresholdWarn)); } catch {}
    savePreferences({ budgets: { thresholdWarn } }).catch(() => {});
  }, [thresholdWarn]);
  useEffect(() => {
    try { localStorage.setItem('kairos-budget-threshold-danger', String(thresholdDanger)); } catch {}
    savePreferences({ budgets: { thresholdDanger } }).catch(() => {});
  }, [thresholdDanger]);

  const cargar = async (a = anio, m = mes) => {
    setLoading(true);
    try {
      const [resBudgets, resCats] = await Promise.all([
        fetch(`${API_BASE}/api/presupuestos?anio=${a}&mes=${m}`, { headers: { 'Authorization': 'Bearer ' + getToken() } }),
        fetch(`${API_BASE}/api/categorias/egreso?plataforma=web`, { headers: { 'Authorization': 'Bearer ' + getToken() } }),
      ]);
      const parseJson = async (res: Response) => {
        if (!res.ok) return [];
        const ct = res.headers.get('content-type') || '';
        if (!/application\/json/i.test(ct)) {
          // Evitar crash si el backend devuelve HTML
          const text = await res.text();
          console.error('[Presupuestos] Respuesta no JSON:', res.url || '(sin url)', 'status:', res.status, 'content-type:', ct, 'preview:', text.slice(0, 160));
          return [];
        }
        try { return await res.json(); } catch { return []; }
      };
      const dataBudgets = await parseJson(resBudgets);
      const dataCats = await parseJson(resCats);
      setCategorias(Array.isArray(dataCats) ? dataCats : []);
      
      // Cargar movimientos del mes para obtener detalle de gastos
      try {
        const resMovimientos = await fetch(`${API_BASE}/api/transacciones?plataforma=web`, { 
          headers: { 'Authorization': 'Bearer ' + getToken() } 
        });
        const dataMovimientos = await parseJson(resMovimientos);
        
        // Filtrar movimientos del mes y año seleccionados y agrupar por categoría
        const movimientosDelMes = (Array.isArray(dataMovimientos) ? dataMovimientos : []).filter((mov: any) => {
          if (!mov.fecha) return false;
          const fecha = new Date(mov.fecha);
          return fecha.getFullYear() === a && fecha.getMonth() + 1 === m && (mov.tipo === 'egreso' || mov.tipo === 'ahorro');
        });
        
        const movimientosMap: Record<number, MovimientoDetalle[]> = {};
        movimientosDelMes.forEach((mov: any) => {
          if (mov.categoria_id) {
            if (!movimientosMap[mov.categoria_id]) {
              movimientosMap[mov.categoria_id] = [];
            }
            movimientosMap[mov.categoria_id].push({
              descripcion: mov.descripcion || 'Sin descripción',
              monto: Number(mov.monto || 0),
              fecha: mov.fecha
            });
          }
        });
        
        setMovimientosPorCategoria(movimientosMap);
      } catch (err) {
        console.error('Error cargando movimientos:', err);
        setMovimientosPorCategoria({});
      }
      
      // Unir: todas las categorías con presupuesto (o 0)
      const mapByCat = new Map<number, Presupuesto>();
      (Array.isArray(dataBudgets) ? dataBudgets : []).forEach((b: any) => mapByCat.set(Number(b.categoria_id), {
        id: b.id,
        categoria_id: Number(b.categoria_id),
        categoria: b.categoria,
        anio: Number(b.anio),
        mes: Number(b.mes),
        monto: Number(b.monto),
        gastado: Number(b.gastado || 0)
      }));
      const merged: Presupuesto[] = (dataCats || []).map((c: any) => {
        const ex = mapByCat.get(Number(c.id));
        if (ex) return ex;
        return { categoria_id: Number(c.id), categoria: c.nombre, anio: a, mes: m, monto: 0, gastado: 0 };
      });
      setItems(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const guardar = async (catId: number, monto: number) => {
    await fetch(`${API_BASE}/api/presupuestos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ categoria_id: catId, anio, mes, monto })
    });
    await cargar();
  };

  // Copiar los montos presupuestados del mes anterior
  const copiarDelMesPasado = async () => {
    let prevAnio = anio;
    let prevMes = mes - 1;
    if (prevMes <= 0) { prevMes = 12; prevAnio = anio - 1; }

    const pick = await Swal.fire({
      title: 'Copiar del mes pasado',
      text: `Vamos a traer ${prevAnio}-${String(prevMes).padStart(2,'0')} al mes actual.`,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Sobrescribir todos',
      denyButtonText: 'Sólo donde esté en 0',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb'
    });
    if (!pick.isConfirmed && !pick.isDenied) return;

    const resPrev = await fetch(`${API_BASE}/api/presupuestos?anio=${prevAnio}&mes=${prevMes}`, { headers: { 'Authorization': 'Bearer ' + getToken() } });
    const ct = resPrev.headers.get('content-type') || '';
    const prevData: any[] = /application\/json/i.test(ct) ? await resPrev.json() : [];
    // Mapear montos previos y también tener acceso al nombre de la categoría del mes pasado
    const mapPrevMonto = new Map<number, number>();
    const mapPrevNombre = new Map<number, string>();
    (prevData || []).forEach(b => {
      const cid = Number(b.categoria_id);
      mapPrevMonto.set(cid, Number(b.monto || 0));
      if (b.categoria) mapPrevNombre.set(cid, String(b.categoria));
    });

    const curIds = new Set(items.map(it => it.categoria_id));

    // 1) Actualizar lo existente según la opción elegida
    const updatedBase = items.map(it => {
      const prev = mapPrevMonto.get(it.categoria_id);
      if (prev === undefined) return it;
      if (pick.isDenied && Number(it.monto || 0) > 0) return it; // sólo llenar ceros
      return { ...it, monto: prev };
    });

    // 2) Agregar categorías que existían el mes pasado pero no están en la lista actual (por filtros/plataforma)
    const missingFromPrev = (prevData || [])
      .map(b => ({
        categoria_id: Number(b.categoria_id),
        categoria: b.categoria as string | undefined,
        monto: Number(b.monto || 0)
      }))
      .filter(b => !curIds.has(b.categoria_id));

    const appended = missingFromPrev.map(b => ({
      categoria_id: b.categoria_id,
      categoria: b.categoria || mapPrevNombre.get(b.categoria_id) || String(b.categoria_id),
      anio,
      mes,
      monto: b.monto,
      gastado: 0
    }));

    setItems([...updatedBase, ...appended]);
    Swal.fire({ icon: 'success', title: 'Montos copiados', text: 'Revisa y guarda para aplicar.', timer: 1400, showConfirmButton: false });
  };

  // Guarda todos los montos visibles en una sola acción
  const armarPresupuesto = async () => {
    const res = await Swal.fire({
      title: 'Armar presupuesto',
      text: 'Se guardarán los montos editados para todas las categorías del mes seleccionado.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Guardar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb'
    });
    if (!res.isConfirmed) return;
    // Ejecutar en paralelo controlado
    const payloads = items.map(it => ({ categoria_id: it.categoria_id, anio, mes, monto: Number(it.monto || 0) }));
    await Promise.all(payloads.map(p => fetch(`${API_BASE}/api/presupuestos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(p)
    })));
    await cargar();
    Swal.fire({ icon: 'success', title: 'Presupuesto armado', showConfirmButton: false, timer: 1400 });
  };

  // Exportar a CSV (lado cliente)
  const exportarCSV = () => {
    const header = ['Categoria','Presupuesto','Gastado','%Uso','Mes','Año'];
    const lines = [header];
    items.forEach(it => {
      const nombre = it.categoria || (categorias.find(c => c.id === it.categoria_id)?.nombre) || String(it.categoria_id);
      const monto = Number(it.monto || 0);
      const gastado = Number(it.gastado || 0);
      const pct = monto > 0 ? (gastado / monto) * 100 : 0;
      const safe = (s: any) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
      lines.push([
        safe(nombre),
        String(monto.toFixed(2)),
        String(gastado.toFixed(2)),
        String(pct.toFixed(2)),
        String(mes).padStart(2, '0'),
        String(anio)
      ]);
    });
    const csv = lines.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuestos_${anio}_${String(mes).padStart(2,'0')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Exportar a XLSX (intenta dinámico, si falla usa CSV)
  const exportarXLSX = async () => {
    try {
      // Import dinámico para no romper si no está instalado en dev
      const XLSX = await import('xlsx');
      const rows = items.map(it => {
        const nombre = it.categoria || (categorias.find(c => c.id === it.categoria_id)?.nombre) || String(it.categoria_id);
        const monto = Number(it.monto || 0);
        const gastado = Number(it.gastado || 0);
        const pct = monto > 0 ? (gastado / monto) * 100 : 0;
        return {
          Categoria: nombre,
          Presupuesto: Number(monto.toFixed(2)),
          Gastado: Number(gastado.toFixed(2)),
          '%Uso': Number(pct.toFixed(2)),
          Mes: String(mes).padStart(2, '0'),
          Año: anio
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Presupuestos');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presupuestos_${anio}_${String(mes).padStart(2,'0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback a CSV si no está disponible
      Swal.fire({ icon: 'info', title: 'XLSX no disponible', text: 'Generaré un CSV como alternativa.' });
      exportarCSV();
    }
  };

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const years = useMemo(() => {
    const y = hoy.getFullYear();
    return [y-1, y, y+1];
  }, [hoy]);

  // Alertas de consumo (umbrales configurables)
  const stats = useMemo(() => {
    let warn80 = 0, warn100 = 0;
    items.forEach(it => {
      const m = Number(it.monto || 0);
      const g = Number(it.gastado || 0);
      if (m > 0) {
        const p = (g / m) * 100;
        if (p >= thresholdDanger) warn100++; else if (p >= thresholdWarn) warn80++;
      }
    });
    return { warn80, warn100 };
  }, [items, thresholdWarn, thresholdDanger]);

  return (
    <div className="card">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Presupuestos</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={anio} onChange={e => { const v = Number(e.target.value); setAnio(v); cargar(v, mes); }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={mes} onChange={e => { const v = Number(e.target.value); setMes(v); cargar(anio, v); }}>
          {meses.map((n,i) => <option key={i+1} value={i+1}>{n}</option>)}
        </select>
        {/* Controles de umbrales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-card)', border: '1px solid var(--color-input-border)', padding: '6px 10px', borderRadius: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>Umbrales:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
            Alerta
            <input type="number" min={10} max={300} value={thresholdWarn}
              onChange={e => setThresholdWarn(() => {
                const v = Math.max(10, Math.min(300, Number(e.target.value || 0)));
                return v;
              })}
              style={{ width: 60 }} />%
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
            Tope
            <input type="number" min={10} max={300} value={thresholdDanger}
              onChange={e => setThresholdDanger(() => {
                const v = Math.max(10, Math.min(300, Number(e.target.value || 0)));
                return v;
              })}
              style={{ width: 60 }} />%
          </label>
          {/* Presets rápidos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { w: 70, d: 90 },
              { w: 80, d: 100 },
              { w: 90, d: 100 }
            ].map(preset => (
              <button key={`${preset.w}-${preset.d}`}
                onClick={() => { setThresholdWarn(preset.w); setThresholdDanger(preset.d); }}
                title={`Alerta ${preset.w}% / Tope ${preset.d}%`}
                style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                {preset.w}/{preset.d}
              </button>
            ))}
            <button onClick={() => { setThresholdWarn(80); setThresholdDanger(100); }}
              title="Restablecer a 80/100"
              style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
              Restablecer
            </button>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={copiarDelMesPasado} style={{ padding: '8px 14px', borderRadius: 10, background: '#4b5563', color: '#fff', border: 'none', fontWeight: 600 }}>
          Copiar del mes pasado
        </button>
        <button onClick={armarPresupuesto} style={{ padding: '8px 14px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }}>
          Armar presupuesto
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={exportarCSV} style={{ padding: '8px 14px', borderRadius: 10, background: '#10b981', color: '#0b2e1e', border: 'none', fontWeight: 700 }}>
            Exportar CSV
          </button>
          <button onClick={exportarXLSX} style={{ padding: '8px 14px', borderRadius: 10, background: '#22d3ee', color: '#083344', border: 'none', fontWeight: 700 }}>
            Exportar XLSX
          </button>
        </div>
      </div>
      {(stats.warn80 > 0 || stats.warn100 > 0) && (
        <div style={{ background: stats.warn100 > 0 ? '#7f1d1d' : '#78350f', color: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          {stats.warn100 > 0 && <span style={{ marginRight: 12 }}>⚠️ {stats.warn100} categoría(s) superaron el {thresholdDanger}%.</span>}
          {stats.warn80 > 0 && <span>⏳ {stats.warn80} categoría(s) están sobre el {thresholdWarn}%.</span>}
        </div>
      )}
      {loading ? (
        <div>Cargando…</div>
      ) : (
        <div className="kr-table-bg" style={{ width: '100%', overflowX: 'auto', borderRadius: 18 }}>
          <table style={{ minWidth: 720, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#2563eb' }}>
                <th style={{ color: '#fff', padding: '12px 14px', textAlign: 'left' }}>Categoría</th>
                <th style={{ color: '#fff', padding: '12px 14px', textAlign: 'right' }}>Presupuesto</th>
                <th style={{ color: '#fff', padding: '12px 14px', textAlign: 'right' }}>Gastado</th>
                <th style={{ color: '#fff', padding: '12px 14px', textAlign: 'center' }}>Progreso</th>
                <th style={{ color: '#fff', padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const pctReal = it.monto > 0 ? Math.round(100 * (Number(it.gastado||0) / Number(it.monto))) : 0;
                const pct = it.monto > 0 ? Math.min(100, Math.max(0, pctReal)) : 0;
                const warn = pct >= thresholdDanger ? '#ef4444' : (pct >= thresholdWarn ? '#f59e0b' : '#22c55e');
                return (
                  <tr key={it.categoria_id} style={{ background: idx%2? '#1f2937':'#111827' }}>
                    <td style={{ padding: '10px 14px' }}>{it.categoria || categorias.find(c => c.id===it.categoria_id)?.nombre || it.categoria_id}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={Number(it.monto ?? 0)}
                        onChange={e => {
                          const v = Number(e.target.value || 0);
                          setItems(prev => prev.map(p => p.categoria_id === it.categoria_id ? { ...p, monto: v } : p));
                        }}
                        style={{ width: 120 }}
                      />
                    </td>
                    <td 
                      style={{ padding: '10px 14px', textAlign: 'right', cursor: 'pointer', position: 'relative' }}
                      title={movimientosPorCategoria[it.categoria_id]?.length > 0 
                        ? `Detalle de gastos:\n${movimientosPorCategoria[it.categoria_id].map(m => `• ${m.descripcion}: S/ ${m.monto.toFixed(2)} (${new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })})`).join('\n')}`
                        : 'Sin movimientos registrados'
                      }
                    >
                      S/ {Number(it.gastado||0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ background: '#374151', height: 12, borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: warn, height: 12 }} />
                      </div>
                      {(pctReal >= thresholdWarn) && (
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: pctReal >= thresholdDanger ? '#ef4444' : '#f59e0b' }}>
                          {pctReal >= thresholdDanger ? `Sobre el ${thresholdDanger}%` : `Sobre el ${thresholdWarn}%`}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button onClick={() => guardar(it.categoria_id, it.monto)} style={{ padding: '6px 10px', borderRadius: 8 }}>Guardar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
