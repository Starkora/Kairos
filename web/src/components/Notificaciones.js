import React from 'react';
import API_BASE from '../utils/apiBase';
import { getToken } from '../utils/auth';
import Swal from 'sweetalert2';

// Agregar estilos al componente de Notificaciones
export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = React.useState({ frecuencia: 'diaria', medio: 'correo', horaInicio: '', intervaloHoras: '', dia: '' });
  const [notificacionesList, setNotificacionesList] = React.useState([]);
  const [isEditing, setIsEditing] = React.useState(false); // Popup editar
  const [isAdding, setIsAdding] = React.useState(false);   // Popup agregar

  const handleNotificacionesChange = (e) => {
    const { name, value } = e.target;
    setNotificaciones(prev => ({ ...prev, [name]: value }));
  };

  const guardarConfiguracion = () => {
    console.log('Datos enviados al backend:', notificaciones);
  fetch(`${API_BASE}/api/notificaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify(notificaciones)
    })
      .then(async res => {
        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Configuración guardada',
            text: 'Tus preferencias de notificación han sido guardadas exitosamente.',
            confirmButtonColor: '#6C4AB6'
          });
          // Después de guardar la configuración, recargar las notificaciones
          fetchNotificaciones();
        } else {
          const data = await res.json().catch(() => ({}));
          if (res.status === 409 && data && data.code === 'LIMIT_REACHED') {
            Swal.fire({ icon: 'info', title: 'Límite alcanzado', text: data.message || 'Solo puedes tener hasta 2 notificaciones configuradas.' });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Hubo un problema al guardar la configuración.',
              confirmButtonColor: '#6C4AB6'
            });
          }
        }
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al guardar la configuración.',
          confirmButtonColor: '#6C4AB6'
        });
      });
  };

  const fetchNotificaciones = () => {
  fetch(`${API_BASE}/api/notificaciones`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotificacionesList(data);
        } else {
          console.error('La respuesta no es un arreglo:', data);
          setNotificacionesList([]);
        }
        console.log('Notificaciones recibidas del backend:', data); // Depuración
      })
      .catch(err => {
        console.error('Error al obtener notificaciones:', err);
        setNotificacionesList([]);
      });
  };

  const handleEdit = (id) => {
    // Lógica para manejar la edición de la notificación
    const notificacionAEditar = notificacionesList.find(notif => notif.id === id);
    if (notificacionAEditar) {
      setNotificaciones({
        id: notificacionAEditar.id, // Agregar el ID para la edición
        frecuencia: notificacionAEditar.frecuencia,
        medio: notificacionAEditar.medio,
        horaInicio: notificacionAEditar.hora_inicio,
        intervaloHoras: notificacionAEditar.intervalo_horas,
        dia: notificacionAEditar.dia
      });
      setIsEditing(true); // Mostrar el popup
    }
  };

  const handleDelete = (id) => {
    // Lógica para manejar la eliminación de la notificación
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6C4AB6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`${API_BASE}/api/notificaciones/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + getToken()
          }
        })
          .then(res => {
            if (res.ok) {
              Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'La notificación ha sido eliminada exitosamente.',
                confirmButtonColor: '#6C4AB6'
              });
              // Recargar las notificaciones después de eliminar
              fetchNotificaciones();
            } else {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al eliminar la notificación.',
                confirmButtonColor: '#6C4AB6'
              });
            }
          })
          .catch(() => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Hubo un problema al eliminar la notificación.',
              confirmButtonColor: '#6C4AB6'
            });
          });
      }
    });
  };

  const handleEditSubmit = () => {
    console.log('Editando notificación:', notificaciones);
    fetch(`${API_BASE}/api/notificaciones/${notificaciones.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify(notificaciones)
    })
      .then(res => {
        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Notificación actualizada',
            text: 'La notificación ha sido actualizada exitosamente.',
            confirmButtonColor: '#6C4AB6'
          });
          fetchNotificaciones();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al actualizar la notificación.',
            confirmButtonColor: '#6C4AB6'
          });
        }
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al actualizar la notificación.',
          confirmButtonColor: '#6C4AB6'
        });
      });
  };

  React.useEffect(() => {
    fetchNotificaciones();
  }, []);

  return (
    <div className="card" style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#6C4AB6' }}>Notificaciones</h1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => {
            // Resetear formulario y abrir modal de agregar
            setNotificaciones({ frecuencia: 'diaria', medio: 'correo', horaInicio: '', intervaloHoras: '', dia: '' });
            setIsEditing(false);
            if (Array.isArray(notificacionesList) && notificacionesList.length >= 2) {
              Swal.fire({ icon: 'info', title: 'Límite alcanzado', text: 'Solo puedes tener hasta 2 notificaciones configuradas.' });
              return;
            }
            setIsAdding(true);
          }}
          disabled={Array.isArray(notificacionesList) && notificacionesList.length >= 2}
          style={{ padding: '10px 20px', backgroundColor: (Array.isArray(notificacionesList) && notificacionesList.length >= 2) ? '#b9a8e6' : '#6C4AB6', color: '#fff', border: 'none', borderRadius: '8px', cursor: (Array.isArray(notificacionesList) && notificacionesList.length >= 2) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          Agregar Notificación
        </button>
      </div>
  <h2 style={{ textAlign: 'center', color: '#6C4AB6', marginTop: 24 }}>Notificaciones Configuradas</h2>
  <div className="table-responsive notificaciones">
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '10px' }}>Frecuencia</th>
            <th style={{ border: '1px solid #ccc', padding: '10px' }}>Medio</th>
            <th style={{ border: '1px solid #ccc', padding: '10px' }}>Hora de Inicio</th>
            <th style={{ border: '1px solid #ccc', padding: '10px' }}>Intervalo (Horas)</th>
            <th style={{ border: '1px solid #ccc', padding: '10px' }}>Día</th>
            <th style={{ border: '1px solid #ccc', padding: '10px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(notificacionesList) && notificacionesList.length > 0 ? (
            notificacionesList.map((notificacion, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{notificacion.frecuencia}</td>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{notificacion.medio}</td>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{notificacion.hora_inicio}</td>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{notificacion.intervalo_horas}</td>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>{notificacion.dia || 'N/A'}</td>
                <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                  <button onClick={() => handleEdit(notificacion.id)} title="Editar" style={{ padding: '6px', backgroundColor: '#6C4AB6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '5px', marginBottom: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Editar">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                      <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(notificacion.id)} className="icon-btn" style={{ padding: 8, backgroundColor: '#d33', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Eliminar">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                    </svg>
                    <span className="tooltip">Eliminar</span>
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '10px' }}>No hay notificaciones configuradas.</td>
            </tr>
          )}
        </tbody>
  </table>
  </div>
      {/* Popup Agregar */}
      {isAdding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }}>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 4px 8px rgba(0,0,0,0.2)', zIndex: 1000, width: 520, maxWidth: '90vw' }}>
            <h2 style={{ textAlign: 'center', color: '#6C4AB6' }}>Agregar Notificación</h2>
            <form style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <label style={{ fontSize: 16, fontWeight: 'bold' }}>
                Frecuencia:
                <select name="frecuencia" value={notificaciones.frecuencia} onChange={handleNotificacionesChange} style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc', marginTop: 5 }}>
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                </select>
              </label>
              {notificaciones.frecuencia === 'semanal' && (
                <label style={{ fontSize: 16, fontWeight: 'bold' }}>
                  Día de la semana:
                  <select name="dia" value={notificaciones.dia} onChange={handleNotificacionesChange} style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc', marginTop: 5 }}>
                    <option value="">Seleccione un día</option>
                    <option value="lunes">Lunes</option>
                    <option value="martes">Martes</option>
                    <option value="miercoles">Miércoles</option>
                    <option value="jueves">Jueves</option>
                    <option value="viernes">Viernes</option>
                    <option value="sabado">Sábado</option>
                    <option value="domingo">Domingo</option>
                  </select>
                </label>
              )}
              <label style={{ fontSize: 16, fontWeight: 'bold' }}>
                Hora de inicio:
                <input type="time" name="horaInicio" value={notificaciones.horaInicio} onChange={handleNotificacionesChange} style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc', marginTop: 5 }} />
              </label>
              <label style={{ fontSize: 16, fontWeight: 'bold' }}>
                Intervalo de horas:
                <input type="number" name="intervaloHoras" value={notificaciones.intervaloHoras} onChange={handleNotificacionesChange} style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc', marginTop: 5 }} placeholder="Ejemplo: 2" />
              </label>
              <label style={{ fontSize: 16, fontWeight: 'bold' }}>
                Medio:
                <select name="medio" value={notificaciones.medio} onChange={handleNotificacionesChange} style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc', marginTop: 5 }}>
                  <option value="correo">Correo</option>
                  <option value="sms">SMS</option>
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => { guardarConfiguracion(); setIsAdding(false); }} style={{ padding: '10px 20px', backgroundColor: '#6C4AB6', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}>
                  Guardar Configuración
                </button>
                <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '10px 20px', backgroundColor: '#d33', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }}>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', zIndex: 1000, width: 520, maxWidth: '90vw' }}>
          <h2 style={{ textAlign: 'center', color: '#6C4AB6' }}>Editar Notificación</h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Frecuencia:
              <select name="frecuencia" value={notificaciones.frecuencia} onChange={handleNotificacionesChange} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px' }}>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
              </select>
            </label>
            {notificaciones.frecuencia === 'semanal' && (
              <label style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Día de la semana:
                <select name="dia" value={notificaciones.dia} onChange={handleNotificacionesChange} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px' }}>
                  <option value="">Seleccione un día</option>
                  <option value="lunes">Lunes</option>
                  <option value="martes">Martes</option>
                  <option value="miercoles">Miércoles</option>
                  <option value="jueves">Jueves</option>
                  <option value="viernes">Viernes</option>
                  <option value="sabado">Sábado</option>
                  <option value="domingo">Domingo</option>
                </select>
              </label>
            )}
            <label style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Hora de inicio:
              <input type="time" name="horaInicio" value={notificaciones.horaInicio} onChange={handleNotificacionesChange} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px' }} />
            </label>
            <label style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Intervalo de horas:
              <input type="number" name="intervaloHoras" value={notificaciones.intervaloHoras} onChange={handleNotificacionesChange} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px' }} placeholder="Ejemplo: 2" />
            </label>
            <label style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Medio:
              <select name="medio" value={notificaciones.medio} onChange={handleNotificacionesChange} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px' }}>
                <option value="correo">Correo</option>
                <option value="sms">SMS</option>
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={handleEditSubmit} style={{ padding: '10px 20px', backgroundColor: '#6C4AB6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                Guardar Cambios
              </button>
              <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '10px 20px', backgroundColor: '#d33', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
      <style>{`
        .icon-btn { position: relative; }
        .icon-btn .tooltip {
          position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px);
          background: #222; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap;
          opacity: 0; pointer-events: none; transition: opacity .12s ease, transform .12s ease; box-shadow: 0 2px 8px rgba(0,0,0,.18);
        }
        .icon-btn .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #222; }
        .icon-btn:hover .tooltip, .icon-btn:focus .tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>
    </div>
  );
}
