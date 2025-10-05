import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';


// Asignar iconos y colores según la categoría o tipo
function getIconAndColor(mov) {
  if (mov.tipo === 'ingreso') return { icon: '🏦', color: '#009688' };
  if (mov.descripcion?.toLowerCase().includes('comida')) return { icon: '🍎', color: '#e53935' };
  if (mov.descripcion?.toLowerCase().includes('cena')) return { icon: '�️', color: '#e53935' };
  if (mov.descripcion?.toLowerCase().includes('pasaje')) return { icon: '🚗', color: '#1976d2' };
  if (mov.descripcion?.toLowerCase().includes('retiro')) return { icon: '💳', color: '#607d8b' };
  if (mov.descripcion?.toLowerCase().includes('ipad')) return { icon: '🔌', color: '#ff9800' };
  return { icon: mov.tipo === 'egreso' ? '💸' : '💰', color: mov.tipo === 'egreso' ? '#c62828' : '#43a047' };
}


export default function Calendario() {
  // Fecha de hoy a medianoche local
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [value, setValue] = React.useState(today);
  const [movimientos, setMovimientos] = React.useState([]);
  const [exportMode, setExportMode] = React.useState(false);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/transacciones?plataforma=web`, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) ? setMovimientos(data.map(m => ({ ...m, ...getIconAndColor(m) }))) : setMovimientos([]))
      .catch(() => setMovimientos([]));
  }, []);

  // Determinar el día mostrado a la derecha (si hay rango, usar el primer día)
  const selectedDate = React.useMemo(() => {
    if (value instanceof Date) return value;
    if (Array.isArray(value) && value[0] instanceof Date) return value[0];
    return today;
  }, [value, today]);

  const fechaSeleccionada = selectedDate.toISOString().slice(0, 10);
  const movimientosDelDia = movimientos.filter(m => {
    const fechaMov = m.fecha ? m.fecha.slice(0, 10) : '';
    return fechaMov === fechaSeleccionada;
  });

  // Marcar días con movimientos
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const fecha = date.toISOString().slice(0, 10);
      const hayMov = movimientos.some(m => (m.fecha ? m.fecha.slice(0, 10) : '') === fecha);
      if (hayMov) return <span style={{ color: '#6c4fa1', fontWeight: 700, fontSize: 18 }}>•</span>;
    }
    return null;
  };

  const handleExport = async () => {
    // Si no está en modo exportación, activarlo para permitir selección de rango
    if (!exportMode) {
      setExportMode(true);
      Swal.fire({ icon: 'info', title: 'Modo exportación activado', text: 'Selecciona un día o arrastra para elegir un rango y vuelve a presionar Exportar.' });
      return;
    }
    // Exportar con la selección actual
    let start, end;
    if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
      start = value[0].toISOString().slice(0, 10);
      end = value[1].toISOString().slice(0, 10);
    } else if (value instanceof Date) {
      start = value.toISOString().slice(0, 10);
      end = start;
    } else {
      Swal.fire({ icon: 'info', title: 'Selecciona una fecha o rango', text: 'Haz clic en un día o arrastra para seleccionar un rango.' });
      return;
    }
    try {
      const url = `${API_BASE}/api/transacciones/export?start=${start}&end=${end}`;
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'No se pudo exportar', text: data.error || 'Error al generar el Excel.' });
        return;
      }
      const blob = await res.blob();
      const aUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = aUrl;
      a.download = `movimientos_${start}_a_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(aUrl);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo descargar el Excel.' });
    } finally {
      // Salir de modo exportación y volver a selección de un solo día
      setExportMode(false);
      if (Array.isArray(value) && value[0] instanceof Date) {
        setValue(value[0]);
      }
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '32px auto', background: '#f7f7fa', borderRadius: 24, boxShadow: '0 4px 24px #1a1a2a44', padding: 48, color: '#222' }}>
      <h1 style={{ marginBottom: 16, fontWeight: 800, fontSize: 32, letterSpacing: 1 }}>Calendario de Movimientos</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleExport}
          style={{
            background: exportMode ? '#f9a825' : '#2e7d32',
            color: exportMode ? '#222' : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            fontWeight: 700
          }}
        >
          {exportMode ? 'Exportar (usar selección actual)' : 'Exportar movimientos (fechas seleccionadas)'}
        </button>
        {exportMode && (
          <button
            type="button"
            onClick={() => {
              setExportMode(false);
              if (Array.isArray(value) && value[0] instanceof Date) {
                setValue(value[0]);
              }
            }}
            style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700 }}
          >
            Cancelar
          </button>
        )}
      </div>
      {exportMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: '#fff8e1',
          color: '#5d4037',
          border: '1px solid #ffe082',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 16
        }}>
          <div style={{ fontWeight: 700 }}>
            Modo exportación activado
          </div>
          <div style={{ fontSize: 14 }}>
            Selecciona un día o arrastra para elegir un rango y luego presiona Exportar.
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 380 }}>
          <Calendar
            onChange={setValue}
            value={value}
            tileContent={tileContent}
            locale="es-ES"
            calendarType="iso8601"
            selectRange={exportMode}
            className={`big-light-calendar ${exportMode ? 'export-mode' : ''}`}
          />
        </div>
        <div style={{ flex: 2, minWidth: 340 }}>
          <h2 style={{ fontSize: 22, marginBottom: 18, fontWeight: 700, color: '#222' }}>
            Movimientos del {fechaSeleccionada.split('-').reverse().join('/')}
          </h2>
          {movimientosDelDia.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 18 }}>No hay movimientos para este día.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {movimientosDelDia.map(mov => (
                <li key={mov.id} style={{
                  marginBottom: 18,
                  padding: 22,
                  borderRadius: 18,
                  background: mov.tipo === 'ingreso' ? 'linear-gradient(90deg, #1de9b6 0%, #43a047 100%)' : 'linear-gradient(90deg, #ff7043 0%, #c62828 100%)',
                  color: mov.tipo === 'ingreso' ? '#fff' : '#222',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 12px #0002',
                  position: 'relative',
                }}>
                  <span style={{ fontSize: 36, marginRight: 18 }}>{mov.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>{mov.descripcion}</div>
                    <div style={{ fontSize: 15, color: '#e0e0e0', marginBottom: 2 }}>{mov.cuenta}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: mov.tipo === 'ingreso' ? '#fff' : '#222', minWidth: 120, textAlign: 'right' }}>
                    {mov.tipo === 'ingreso' ? '+' : '-'}S/ {mov.monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ position: 'absolute', right: 18, bottom: 18, fontSize: 22, color: mov.tipo === 'ingreso' ? '#43a047' : '#ff7043', display: 'inline' }}>✔</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <style>{`
        .big-light-calendar {
          background: #fff !important;
          border-radius: 18px;
          color: #222 !important;
          font-size: 1.3rem;
          box-shadow: 0 2px 12px #0002;
          border: none;
        }
        .big-light-calendar.export-mode {
          box-shadow: 0 0 0 3px #f9a825 inset, 0 2px 12px #0002;
        }
        .big-light-calendar .react-calendar__tile--active {
          background: #6c4fa1 !important;
          color: #fff !important;
        }
        .big-light-calendar .react-calendar__tile--now {
          background: #b39ddb !important;
          color: #222 !important;
        }
        .big-light-calendar .react-calendar__tile {
          min-height: 60px;
        }
      `}</style>
    </div>
  );
}
