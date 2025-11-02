import React, { useEffect, useMemo, useState } from 'react';
import apiFetch from '../utils/apiFetch';
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
        apiFetch(`/api/presupuestos?anio=${a}&mes=${m}`),
        apiFetch(`/api/categorias/egreso?plataforma=web`),
      ]);
      const dataBudgets = resBudgets.ok ? await resBudgets.json() : [];
      const dataCats = resCats.ok ? await resCats.json() : [];
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
    await apiFetch('/api/presupuestos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria_id: catId, anio, mes, monto })
    });
    await cargar();
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
    await Promise.all(payloads.map(p => apiFetch('/api/presupuestos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        <button onClick={armarPresupuesto} style={{ padding: '8px 14px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }}>
          Armar presupuesto
        </button>
      </div>
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
                const pct = it.monto > 0 ? Math.min(100, Math.round(100 * (Number(it.gastado||0) / Number(it.monto)))) : 0;
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
