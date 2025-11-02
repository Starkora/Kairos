import React, { useEffect, useMemo, useState } from 'react';
import apiFetch from '../utils/apiFetch';
import API_BASE from '../utils/apiBase';
import { getToken } from '../utils/auth';
import Swal from 'sweetalert2';

type Presupuesto = { id?: number; categoria_id: number; categoria?: string; anio: number; mes: number; monto: number; gastado?: number };

export default function Presupuestos() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [items, setItems] = useState<Presupuesto[]>([]);
  const [categorias, setCategorias] = useState<{id:number,nombre:string}[]>([]);
  const [loading, setLoading] = useState(true);

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
    const mapPrev = new Map<number, number>();
    (prevData || []).forEach(b => mapPrev.set(Number(b.categoria_id), Number(b.monto || 0)));

    const updated = items.map(it => {
      const prev = mapPrev.get(it.categoria_id);
      if (prev === undefined) return it;
      if (pick.isDenied && Number(it.monto || 0) > 0) return it; // sólo llenar ceros
      return { ...it, monto: prev };
    });
    setItems(updated);
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

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const years = useMemo(() => {
    const y = hoy.getFullYear();
    return [y-1, y, y+1];
  }, [hoy]);

  // Alertas de consumo (80% / 100%)
  const stats = useMemo(() => {
    let warn80 = 0, warn100 = 0;
    items.forEach(it => {
      const m = Number(it.monto || 0);
      const g = Number(it.gastado || 0);
      if (m > 0) {
        const p = (g / m) * 100;
        if (p >= 100) warn100++; else if (p >= 80) warn80++;
      }
    });
    return { warn80, warn100 };
  }, [items]);

  return (
    <div className="card">
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Presupuestos</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select value={anio} onChange={e => { const v = Number(e.target.value); setAnio(v); cargar(v, mes); }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={mes} onChange={e => { const v = Number(e.target.value); setMes(v); cargar(anio, v); }}>
          {meses.map((n,i) => <option key={i+1} value={i+1}>{n}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={copiarDelMesPasado} style={{ padding: '8px 14px', borderRadius: 10, background: '#4b5563', color: '#fff', border: 'none', fontWeight: 600 }}>
          Copiar del mes pasado
        </button>
        <button onClick={armarPresupuesto} style={{ padding: '8px 14px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }}>
          Armar presupuesto
        </button>
      </div>
      {(stats.warn80 > 0 || stats.warn100 > 0) && (
        <div style={{ background: stats.warn100 > 0 ? '#7f1d1d' : '#78350f', color: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
          {stats.warn100 > 0 && <span style={{ marginRight: 12 }}>⚠️ {stats.warn100} categoría(s) superaron el 100%.</span>}
          {stats.warn80 > 0 && <span>⏳ {stats.warn80} categoría(s) están sobre el 80%.</span>}
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
                const warn = pct >= 100 ? '#ef4444' : (pct >= 80 ? '#f59e0b' : '#22c55e');
                return (
                  <tr key={it.categoria_id} style={{ background: idx%2? '#1f2937':'#111827' }}>
                    <td style={{ padding: '10px 14px' }}>{it.categoria || categorias.find(c => c.id===it.categoria_id)?.nombre || it.categoria_id}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <input type="number" step="0.01" defaultValue={it.monto}
                        onChange={e => { it.monto = Number(e.target.value || 0); }}
                        style={{ width: 120 }} />
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>S/ {Number(it.gastado||0).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ background: '#374151', height: 12, borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: warn, height: 12 }} />
                      </div>
                      {(pctReal >= 80) && (
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: pctReal >= 100 ? '#ef4444' : '#f59e0b' }}>
                          {pctReal >= 100 ? 'Sobre el 100%' : 'Sobre el 80%'}
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
