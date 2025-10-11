import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';


// NOTE: icons and colors now come from stored movimiento fields (icon, color).


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

  // Función para cargar movimientos y asignar iconos/colores
  const refreshMovimientos = React.useCallback(async () => {
    try {
      const apiFetch = (await import('../utils/apiFetch')).default;
      const res = await apiFetch(`${API_BASE}/api/transacciones?plataforma=web`);
      if (!res.ok) {
        setMovimientos([]);
        return;
      }
  const data = await res.json();
  // Do not auto-assign icons/colors here — use stored values from movimientos (set via Registro)
  setMovimientos(Array.isArray(data) ? data : []);
    } catch (err) {
      setMovimientos([]);
    }
  }, []);

  React.useEffect(() => {
    refreshMovimientos();
  }, [refreshMovimientos]);

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

  const handleEditMovimiento = async (mov) => {
    try {
      // Cargar cuentas y categorias
      const apiFetch = (await import('../utils/apiFetch')).default;
      const [resCuentas, resCategorias] = await Promise.all([
        apiFetch(`${API_BASE}/api/cuentas?plataforma=web`),
        apiFetch(`${API_BASE}/api/categorias/${mov.tipo}?plataforma=web`)
      ]);
      const cuentasList = resCuentas.ok ? await resCuentas.json() : [];
      const categoriasList = resCategorias.ok ? await resCategorias.json() : [];

      const cuentasOptions = (cuentasList || []).map(c => `<option value="${c.id}" ${c.id === mov.cuenta_id ? 'selected' : ''}>${c.nombre}</option>`).join('');
      const categoriasOptions = (categoriasList || []).map(c => `<option value="${c.id}" ${c.id === mov.categoria_id ? 'selected' : ''}>${c.nombre}</option>`).join('');

      const { value: formValues } = await Swal.fire({
        title: 'Editar movimiento',
        html:
          `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:720px">` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Cuenta</label><select id="swal-cuenta" class="swal2-select">${cuentasOptions}</select></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Tipo</label><input id="swal-tipo" class="swal2-input" value="${mov.tipo}" disabled></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Monto</label><input id="swal-monto" class="swal2-input" placeholder="Monto" value="${mov.monto}" type="number" step="0.01"></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Fecha</label><input id="swal-fecha" class="swal2-input" placeholder="Fecha" value="${(mov.fecha||'').slice(0,10)}" type="date"></div>` +
          `<div style="display:flex;flex-direction:column;grid-column:1/3"><label style="font-weight:700;margin-bottom:6px">Descripción</label><input id="swal-descripcion" class="swal2-input" placeholder="Descripción" value="${mov.descripcion || ''}"></div>` +
          `<div style="display:flex;flex-direction:column;grid-column:1/3"><label style="font-weight:700;margin-bottom:6px">Categoría (opcional)</label><select id="swal-categoria" class="swal2-select"><option value="">- Ninguna -</option>${categoriasOptions}</select></div>` +
          `</div>`,
        width: 760,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
          const cuenta_id = document.getElementById('swal-cuenta').value;
          const monto = parseFloat(document.getElementById('swal-monto').value || '0');
          const descripcion = document.getElementById('swal-descripcion').value || '';
          const fecha = document.getElementById('swal-fecha').value || '';
          const categoria_id = document.getElementById('swal-categoria').value || null;
          if (!cuenta_id) { Swal.showValidationMessage('Cuenta requerida'); return false; }
          if (!monto || isNaN(monto) || monto <= 0) { Swal.showValidationMessage('Monto inválido'); return false; }
          if (!fecha) { Swal.showValidationMessage('Fecha requerida'); return false; }
          return { cuenta_id: Number(cuenta_id), monto, descripcion, fecha, categoria_id: categoria_id ? Number(categoria_id) : null };
        }
      });
      if (!formValues) return;
      const body = { cuenta_id: formValues.cuenta_id, tipo: mov.tipo, monto: formValues.monto, descripcion: formValues.descripcion, fecha: formValues.fecha, categoria_id: formValues.categoria_id };
      const res = await apiFetch(`${API_BASE}/api/transacciones/${mov.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Movimiento actualizado', timer: 1200, showConfirmButton: false });
        await refreshMovimientos();
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo actualizar el movimiento.' });
      }
    } catch (e) {
      // apiFetch/forceLogout maneja 401
    }
  };

  // Manejar eliminación de movimiento
  const handleDeleteMovimiento = async (id) => {
    const confirmed = await Swal.fire({
      title: '¿Eliminar movimiento?',
      text: 'Esta acción no se puede deshacer. Se revertirá el saldo correspondiente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmed.isConfirmed) return;
    try {
      const apiFetch = (await import('../utils/apiFetch')).default;
      const res = await apiFetch(`${API_BASE}/api/transacciones/${id}`, { method: 'DELETE' });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false });
        await refreshMovimientos();
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo eliminar el movimiento.' });
      }
    } catch (e) {
      // apiFetch maneja 401
    }
  };

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
    <div className="card calendar-card" style={{ color: 'var(--color-text)' }}>
      <h1 className="calendar-title">Calendario de Movimientos</h1>
      <div className="calendar-actions" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
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
      <div className="calendar-layout">
        <div className="calendar-left">
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
        <div className="calendar-right">
          <h2 style={{ fontSize: 22, marginBottom: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            Movimientos del {fechaSeleccionada.split('-').reverse().join('/')}
          </h2>
          {movimientosDelDia.length === 0 ? (
            <div style={{ color: 'var(--color-muted)', fontSize: 18 }}>No hay movimientos para este día.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {movimientosDelDia.map(mov => (
                <li key={mov.id} style={{
                  marginBottom: 18,
                  padding: 22,
                  borderRadius: 18,
                  background: mov.color ? mov.color : (mov.tipo === 'ingreso' ? 'linear-gradient(90deg, #1de9b6 0%, #43a047 100%)' : 'linear-gradient(90deg, #ff7043 0%, #c62828 100%)'),
                  color: mov.color ? '#fff' : (mov.tipo === 'ingreso' ? '#fff' : '#222'),
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 12px #0002',
                  position: 'relative',
                }}>
                  <span style={{ fontSize: 36, marginRight: 18 }}>{mov.icon || (mov.tipo === 'egreso' ? '💸' : '💰')}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-text)' }}>{mov.descripcion}</div>
                    <div style={{ fontSize: 15, color: 'var(--color-muted)', marginBottom: 2 }}>{mov.cuenta}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 22, color: mov.tipo === 'ingreso' ? '#fff' : '#222', minWidth: 160, textAlign: 'right' }}>
                      {mov.tipo === 'ingreso' ? '+' : '-'}S/ {mov.monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                      <button onClick={() => handleEditMovimiento(mov)} style={{ background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Editar</button>
                      <button onClick={() => handleDeleteMovimiento(mov.id)} style={{ background: 'rgba(0,0,0,0.08)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Eliminar</button>
                    </div>
                  </div>
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
          width: 100%;
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
          .big-light-calendar {
            background: var(--color-card) !important;
            border-radius: 18px;
            color: var(--color-text) !important;
            font-size: 1.3rem;
            box-shadow: 0 2px 12px var(--card-shadow);
            border: none;
            width: 100%;
          }
          .big-light-calendar.export-mode {
            box-shadow: 0 0 0 3px #f9a825 inset, 0 2px 12px var(--card-shadow);
          }
          .big-light-calendar .react-calendar__tile--active {
            background: var(--color-primary) !important;
            color: #fff !important;
          }
          .big-light-calendar .react-calendar__tile--now {
            background: #b39ddb !important;
            color: var(--color-text) !important;
          }
          .big-light-calendar .react-calendar__tile {
            min-height: 60px;
          }
          .big-light-calendar .react-calendar__month-view__weekdays__weekday,
          .big-light-calendar .react-calendar__month-view__weekdays {
            color: var(--color-text) !important;
            font-weight: 700;
          }
          .big-light-calendar .react-calendar__navigation__label,
          .big-light-calendar .react-calendar__navigation__arrow {
            color: var(--color-text) !important;
          }
          .big-light-calendar button { color: var(--color-text) !important; }
          .big-light-calendar abbr { color: var(--color-text) !important; }
      `}</style>
    </div>
  );
}
