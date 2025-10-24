import React from 'react';
import API_BASE from '../utils/apiBase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, Cell } from 'recharts';
import { getToken } from '../utils/auth';

export default function Dashboard() {
  const [movimientos, setMovimientos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  // Permitir selección múltiple de segmentos
  const [segmentos, setSegmentos] = React.useState({ Ahorro: true, Gasto: false, Ingreso: false });

  const handleSegmentoChange = (e) => {
    const { name, checked } = e.target;
    setSegmentos(prev => ({ ...prev, [name]: checked }));
  };

  React.useEffect(() => {
    fetch(`${API_BASE}/api/transacciones?plataforma=web`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) ? setMovimientos(data) : setMovimientos([]))
      .catch(() => setMovimientos([]))
      .finally(() => setLoading(false));
  }, []);

  // Filtrar movimientos: mostrar solo los que ya están aplicados o cuya fecha es <= hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visibleMovimientos = movimientos.filter(m => {
    try {
      // Si el backend ya incluye el flag `applied`, úsalo
      if (typeof m.applied !== 'undefined' && m.applied !== null) {
        return Number(m.applied) === 1;
      }
      // Fallback: comparar solo la parte de fecha (sin hora)
      if (!m.fecha) return false;
      const movDate = new Date(m.fecha);
      movDate.setHours(0, 0, 0, 0);
      return movDate <= today;
    } catch (e) {
      return false;
    }
  });

  // Calcular totales
  const totalIngreso = visibleMovimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0);
  const totalEgreso = visibleMovimientos.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + Number(m.monto), 0);
  // Ahorro registrado explícitamente (movimientos cuyo tipo es 'ahorro')
  const totalAhorro = visibleMovimientos.filter(m => m.tipo === 'ahorro').reduce((acc, m) => acc + Number(m.monto), 0);

  // Indicadores
  const indicadores = [
    {
      icon: '📉',
      color: '#ff9800',
      titulo: 'Indicadores Egresos',
    valor: visibleMovimientos.filter(m => m.tipo === 'egreso').length,
    },
    {
      icon: '📈',
      color: '#388e3c',
      titulo: 'Indicadores Ingresos',
    valor: visibleMovimientos.filter(m => m.tipo === 'ingreso').length,
    },
    {
      icon: '💵',
      color: '#ff7043',
      titulo: 'Ingreso',
    valor: `S/ ${totalIngreso.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    isAmount: true,
    },
    {
      icon: '🏦',
      color: '#26c6da',
      titulo: 'Gastos',
    valor: `S/ ${totalEgreso.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    isAmount: true,
    },
    {
      icon: '💰',
      color: '#6c4fa1',
      titulo: 'Ahorro',
      valor: `S/ ${totalAhorro.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      isAmount: true,
    },
  ];

  // Resumen para tarjetas
  const resumen = {
    egreso: totalEgreso,
    ingreso: totalIngreso,
    ahorro: totalAhorro,
  };

  // Top egresos por categoría
  const egresosPorCategoria = {};
  visibleMovimientos.filter(m => m.tipo === 'egreso').forEach(m => {
    const cat = m.categoria || 'Sin categoría';
    egresosPorCategoria[cat] = (egresosPorCategoria[cat] || 0) + Number(m.monto);
  });
  type TopEgreso = { categoria: string; monto: number; porcentaje?: number };
  const topEgresos: TopEgreso[] = Object.entries(egresosPorCategoria)
    .map(([categoria, monto]) => ({ categoria, monto: Number(monto) }))
    .sort((a, b) => Number(b.monto) - Number(a.monto))
    .slice(0, 3);
  const totalEgresosTop = topEgresos.reduce((acc, t) => acc + Number(t.monto), 0);
  topEgresos.forEach(t => t.porcentaje = totalEgresosTop ? Math.round((Number(t.monto) / totalEgresosTop) * 100) : 0);

  // Datos para gráficos (totales por mes, siempre 12 meses)
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  // Normalizar fechas y asegurar que todos los meses estén presentes
  const data = meses.map((nombreMes, idx) => {
    // Filtrar movimientos de este mes
    const movsMes = visibleMovimientos.filter(m => {
      if (!m.fecha) return false;
      let fecha = new Date(m.fecha);
      // Si la fecha es inválida, forzar mes 0 (enero)
      if (isNaN(fecha.getTime())) return idx === 0;
      return fecha.getMonth() === idx;
    });
    const Ingreso = movsMes.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0);
    const Gasto = movsMes.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + Number(m.monto), 0);
    // Ahorro por mes: sumar movimientos de tipo 'ahorro' en ese mes
    const Ahorro = movsMes.filter(m => m.tipo === 'ahorro').reduce((acc, m) => acc + Number(m.monto), 0);
    return { mes: nombreMes, Ingreso, Gasto, Ahorro };
  });

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando datos del dashboard...</div>;
  }

  return (
    <div style={{ overflowX: 'hidden' }}>
      <h1>Dashboard</h1>
      {/* Fila de indicadores/resumen */}
      <div style={{ display: 'flex', gap: 24, margin: '24px 0 32px 0', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {indicadores.map((item, idx) => (
          <div key={idx} style={{
            flex: 1,
            minWidth: 220,
            maxWidth: 320,
            background: 'var(--color-card)',
            borderRadius: 16,
            boxShadow: '0 2px 8px var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            padding: '18px 28px',
            margin: '0 0 8px 0',
            gap: 18,
          }}>
            <div style={{ fontSize: 44, color: item.color, background: 'var(--color-input-bg)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: item.color, fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{item.titulo}</div>
              <div style={{ fontWeight: 700, fontSize: 22, color: item.isAmount ? 'var(--color-amount)' : 'var(--color-text)', marginTop: 6 }}>{item.valor}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Segmentador y gráfica horizontal ocupando todo el ancho */}
  <div className="card" style={{ width: '100%', marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold' }}>Seleccionar Segmentos:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="Ahorro" checked={segmentos.Ahorro} onChange={handleSegmentoChange} />
            <span className="segment-label ahorro-label" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Ahorro</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="Gasto" checked={segmentos.Gasto} onChange={handleSegmentoChange} />
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Gastos</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="Ingreso" checked={segmentos.Ingreso} onChange={handleSegmentoChange} />
            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Ingresos</span>
          </label>
          {/* inline ahorro form removed */}
        </div>
  <ResponsiveContainer width="100%" height={600}>
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="mes" type="category" />
            <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
            <Legend />
            {segmentos.Ahorro && <Bar dataKey="Ahorro" fill="#6c4fa1" name="Ahorro" />}
            {segmentos.Gasto && <Bar dataKey="Gasto" fill="#fbc02d" name="Gastos" />}
            {segmentos.Ingreso && <Bar dataKey="Ingreso" fill="#388e3c" name="Ingresos" />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Debajo: resumen de totales (izquierda) y top egresos (derecha) */}
      <div className="flex-row" style={{ width: '100%', gap: 24, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Resumen de totales y gráfica de presupuesto en una sola tarjeta */}
        <div className="card" style={{ flex: 1.2, minWidth: 320, maxWidth: 500, display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 0, padding: 0 }}>
          {/* Leyenda a la izquierda */}
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-card)' }}>
              <h4 style={{ color: 'var(--color-table-header-text)', marginBottom: 16 }}>Resumen de Totales</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }}></span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>Egreso</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500, marginLeft: 8 }}>S/ {resumen.egreso.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }}></span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>Ingreso</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500, marginLeft: 8 }}>S/ {resumen.ingreso.toLocaleString()}</span>
              </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }}></span>
          <span className="resumen-ahorro" style={{ color: 'var(--color-table-header-text)', fontWeight: 'bold' }}>Ahorro</span>
          <span style={{ color: 'var(--color-amount)', fontWeight: 500, marginLeft: 8 }}>S/ {resumen.ahorro.toLocaleString()}</span>
        </div>
            </div>
          </div>
          {/* Gráfica de barras verticales a la derecha */}
            <div style={{ flex: 2, background: 'var(--color-card)', borderTopRightRadius: 12, borderBottomRightRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#888', fontWeight: 500, textAlign: 'right', marginBottom: 8 }}>Resultado de Presupuesto</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                { name: 'Egreso', value: resumen.egreso, fill: '#fbc02d' },
                { name: 'Ingreso', value: resumen.ingreso, fill: '#388e3c' },
                { name: 'Ahorro', value: resumen.ahorro, fill: '#6c4fa1' },
              ]}>
                <XAxis type="category" dataKey="name" tick={{ fontWeight: 'bold', fontSize: 14 }} />
                <YAxis type="number" domain={[0, 10000]} ticks={[0, 2000, 4000, 10000]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell key="egreso" fill="#fbc02d" />
                  <Cell key="ingreso" fill="#388e3c" />
                  <Cell key="ahorro" fill="#6c4fa1" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Top egresos */}
        <div className="card" style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4>3° Indicadores Mayores De Egreso</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {topEgresos.map((item, idx) => (
              <div key={item.categoria} style={{ background: '#ff9800', color: '#fff', borderRadius: 12, padding: 16, flex: 1, textAlign: 'center', minWidth: 100, maxWidth: 140 }}>
                <div style={{ fontWeight: 'bold', fontSize: 20 }}>{idx + 1}°</div>
                <div style={{ fontSize: 18 }}>{item.categoria}</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', margin: '8px 0' }}>S/ {item.monto.toLocaleString()}</div>
                <div style={{ fontSize: 16 }}>{item.porcentaje}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Totales por mes (líneas) */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3>Totales Por Mes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="Ingreso" stroke="#388e3c" strokeWidth={2} />
            <Line type="monotone" dataKey="Gasto" stroke="#fbc02d" strokeWidth={2} />
            <Line type="monotone" dataKey="Ahorro" stroke="#6c4fa1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Movimientos programados / pendientes separados por tipo */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3>Movimientos programados</h3>
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const pendientes = movimientos.filter(m => {
            try {
              if (typeof m.applied !== 'undefined' && m.applied !== null) {
                return Number(m.applied) === 0;
              }
              if (!m.fecha) return false;
              // Obtener fecha actual en zona horaria Perú (UTC-5)
              const now = new Date();
              const peruOffset = -5 * 60; // minutos
              const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
              const peruDate = new Date(utc + peruOffset * 60000);
              peruDate.setHours(0, 0, 0, 0);
              // Fecha del movimiento (solo año, mes, día)
              const movDate = new Date(m.fecha);
              movDate.setHours(0, 0, 0, 0);
              return movDate.getTime() > peruDate.getTime();
            } catch (e) {
              return false;
            }
          });

          // Separar por tipo
          const tipos = ['ingreso', 'egreso', 'ahorro'];
          const pendientesPorTipo = tipos.map(tipo => ({
            tipo,
            lista: pendientes.filter(m => m.tipo === tipo),
            total: pendientes.filter(m => m.tipo === tipo).reduce((acc, m) => acc + Number(m.monto || 0), 0)
          }));

          return (
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {pendientesPorTipo.map(({ tipo, lista, total }) => (
                <div key={tipo} style={{ minWidth: 260, flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8, textTransform: 'capitalize' }}>
                    {tipo === 'ingreso' ? 'Ingresos' : tipo === 'egreso' ? 'Egresos' : 'Ahorro'} pendientes
                  </div>
                  <div style={{ fontSize: 15, marginBottom: 4 }}>Cantidad: <b>{lista.length}</b></div>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>Monto total: <b>S/ {total.toLocaleString()}</b></div>
                  <div style={{ marginBottom: 8, color: '#666' }}>Todos los movimientos programados</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 2 }}>
                    {lista.length === 0 ? (
                      <div style={{ color: '#bbb', fontSize: 15, textAlign: 'center', padding: 12 }}>No hay movimientos programados</div>
                    ) : (
                      [...lista].sort((a, b) => {
                        const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
                        const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
                        return fa - fb;
                      }).map((p, idx) => (
                        <div key={p.id || idx} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--color-card)', padding: 8, borderRadius: 8, boxShadow: '0 1px 4px var(--card-shadow)' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ fontSize: 20 }}>{p.icon || '📅'}</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.categoria || 'Sin categoría'}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{p.cuenta || p.cuenta_nombre || ''}</div>
                              {p.descripcion && (
                                <div style={{ fontSize: 12, color: '#a3a3a3', marginTop: 2, fontStyle: 'italic' }}>{p.descripcion}</div>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700 }}>S/ {Number(p.monto || 0).toLocaleString()}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>{p.fecha ? new Date(p.fecha).toLocaleDateString() : ''}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
