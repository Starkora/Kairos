import React from 'react';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';

export default function Cuentas() {
  const [cuentas, setCuentas] = React.useState([]);
  const [form, setForm] = React.useState({ nombre: '', saldo: '', tipo: '' });
  const [tiposCuenta, setTiposCuenta] = React.useState([{ value: '', label: 'Tipo de cuenta' }]);
  const [editing, setEditing] = React.useState(null); // {id, nombre, tipo}
  const [editData, setEditData] = React.useState({ nombre: '', tipo: '' });

  // Cargar tipos de cuenta desde la API de categorias_cuenta
  React.useEffect(() => {
  fetch(`${API_BASE}/api/categorias-cuenta`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const tipos = data.map(cat => ({ value: cat.nombre, label: cat.nombre }));
          setTiposCuenta([{ value: '', label: 'Tipo de cuenta' }, ...tipos]);
        } else {
          setTiposCuenta([{ value: '', label: 'Tipo de cuenta' }]);
        }
      })
      .catch(() => setTiposCuenta([{ value: '', label: 'Tipo de cuenta' }]));
  }, []);

  // Cargar cuentas desde la API al montar
  React.useEffect(() => {
  fetch(`${API_BASE}/api/cuentas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify({ plataforma: 'web' })
    })
      .then(res => {
        console.log('Respuesta del servidor en POST /api/cuentas:', res.status); // Depuración
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
      })
      .then(data => {
        console.log('Datos recibidos en POST /api/cuentas:', data); // Depuración
        if (Array.isArray(data)) setCuentas(data);
        else setCuentas([]);
      })
      .catch(err => console.error('Error en POST /api/cuentas:', err.message)); // Depuración

  fetch(`${API_BASE}/api/cuentas?plataforma=web`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => {
        console.log('Respuesta del servidor en GET /api/cuentas:', res.status); // Depuración
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
      })
      .then(data => {
        console.log('Datos recibidos en GET /api/cuentas:', data); // Depuración
        if (Array.isArray(data)) setCuentas(data);
        else setCuentas([]);
      })
      .catch(err => console.error('Error en GET /api/cuentas:', err.message)); // Depuración
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre || form.saldo === '' || !form.tipo) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Debes ingresar el nombre, saldo inicial y tipo de cuenta.' });
      return;
    }
    if (Number(form.saldo) < 0) {
      Swal.fire({ icon: 'error', title: 'Saldo inválido', text: 'El saldo inicial no puede ser negativo.' });
      return;
    }
    if (cuentas.some(c => c.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase())) {
      Swal.fire({ icon: 'error', title: 'Nombre repetido', text: 'Ya existe una cuenta con ese nombre.' });
      return;
    }
    Swal.fire({
      title: '¿Seguro que quieres agregar esta cuenta?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c4fa1',
    }).then((result) => {
      if (result.isConfirmed) {
  fetch(`${API_BASE}/api/cuentas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({
            nombre: form.nombre,
            saldo_inicial: form.saldo,
            tipo: form.tipo,
            plataforma: 'web' // Asegúrate de incluir este campo
          })
        })
          .then(res => {
            console.log('Respuesta del servidor en POST /api/cuentas:', res.status); // Depuración
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(data => {
            console.log('Cuenta agregada:', data); // Depuración
            setCuentas(prevCuentas => [...prevCuentas, {
              id: data.id,
              nombre: form.nombre,
              saldo_inicial: form.saldo,
              saldo_actual: form.saldo,
              tipo: form.tipo,
              plataforma: 'web'
            }]); // Actualizar el estado local con datos consistentes
            setForm({ nombre: '', saldo: '', tipo: '' });
            Swal.fire({ icon: 'success', title: 'Cuenta agregada', showConfirmButton: false, timer: 1200 });
          })
          .catch(err => {
            console.error('Error al agregar cuenta:', err.message); // Depuración
            Swal.fire({ icon: 'error', title: 'Error al agregar cuenta', text: err.message });
          });
      }
    });
  };


  const handleDelete = (id) => {
    const cuenta = cuentas.find(c => c.id === id);
    if (!cuenta) return;
    Swal.fire({
      title: `¿Eliminar cuenta?`,
      html: `<b style='color:#f44336;font-size:1.2em;'>${cuenta.nombre}</b><br>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f44336',
    }).then((result) => {
      if (result.isConfirmed) {
        const token = getToken();
        console.log('Token enviado:', token); // Depuración
  fetch(`${API_BASE}/api/cuentas/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + token
          }
        })
          .then(res => {
            console.log('Respuesta del servidor en DELETE /api/cuentas:', res.status); // Depuración
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(data => {
            console.log('Cuenta eliminada:', data); // Depuración
            setCuentas(prevCuentas => prevCuentas.filter(c => c.id !== id)); // Actualizar el estado local
            Swal.fire({ icon: 'success', title: 'Cuenta eliminada', showConfirmButton: false, timer: 1200 });
          })
          .catch(err => {
            console.error('Error al eliminar cuenta:', err.message); // Depuración
            Swal.fire({ icon: 'error', title: 'Error al eliminar cuenta', text: err.message });
          });
      }
    });
  };

  const openEdit = (cuenta) => {
    setEditing({ id: cuenta.id });
    setEditData({ nombre: cuenta.nombre || '', tipo: cuenta.tipo || '' });
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editData.nombre || !editData.tipo) {
      Swal.fire({ icon: 'warning', title: 'Completa los campos', text: 'Nombre y tipo son requeridos.' });
      return;
    }
    // evitar duplicados por nombre (case-insensitive) excepto la misma cuenta
    const dup = cuentas.some(c => c.id !== editing.id && c.nombre.trim().toLowerCase() === editData.nombre.trim().toLowerCase());
    if (dup) {
      Swal.fire({ icon: 'error', title: 'Nombre repetido', text: 'Ya existe una cuenta con ese nombre.' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/cuentas/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ nombre: editData.nombre, tipo: editData.tipo, plataforma: 'web' })
      });
      if (res.status === 409) {
        Swal.fire({ icon: 'error', title: 'Nombre repetido', text: 'Ya existe una cuenta con ese nombre.' });
        return;
      }
      if (!res.ok) throw new Error('No autorizado');
      await res.json();
      setCuentas(prev => prev.map(c => c.id === editing.id ? { ...c, nombre: editData.nombre, tipo: editData.tipo } : c));
      closeEdit();
      Swal.fire({ icon: 'success', title: 'Cuenta actualizada', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'No se pudo actualizar', text: err.message });
    }
  };

  return (
  <div className="card accounts-card" style={{ maxWidth: 700, margin: '24px auto' }}>
      <h1 style={{ marginBottom: 24 }}>Cuentas</h1>
      <form onSubmit={handleSubmit} className="accounts-form" style={{ width: '100%', marginBottom: 24 }}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre de la cuenta"
          value={form.nombre}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 8, borderRadius: 6, minWidth: 0 }}
        />
        <input
          type="number"
          name="saldo"
          placeholder="Saldo inicial"
          value={form.saldo}
          onChange={handleChange}
          required
          min="0"
          style={{ width: '100%', padding: 8, borderRadius: 6, minWidth: 0 }}
        />
        <select
          name="tipo"
          value={form.tipo}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: 8, borderRadius: 6, minWidth: 0 }}
        >
          {tiposCuenta.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
          ))}
        </select>
        <button type="submit" 
          style={{ 
            background: '#6c4fa1', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 8, 
            padding: '8px 0', 
            fontWeight: 600, 
            height: 40, 
            width: '100%',
            minWidth: 0
          }}>
          Agregar
        </button>
      </form>
  <div className="table-responsive">
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ background: '#f7f7fa' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Cuenta</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
            <th style={{ textAlign: 'right', padding: 8 }}>Monto Actual</th>
            <th style={{ textAlign: 'center', padding: 8 }}>Funciones</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(cuentas) ? cuentas : []).map((cuenta) => (
            <tr key={cuenta.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ fontWeight: 600, padding: 8 }}>{cuenta.nombre}</td>
              <td style={{ padding: 8 }}>{cuenta.tipo || '-'}</td>
              <td style={{ color: '#6c4fa1', fontWeight: 700, textAlign: 'right', padding: 8 }}>S/ {(Number(cuenta.saldo_actual) || 0).toLocaleString()}</td>
              <td style={{ textAlign: 'center', padding: 8 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => openEdit(cuenta)}
                    style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}
                    aria-label="Editar" title="Editar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6c4fa1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(cuenta.id)} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }} aria-label="Eliminar" title="Eliminar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
  </table>
  </div>
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={closeEdit}>
          <div style={{ background:'#fff', borderRadius:12, padding:20, width: 420 }} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Editar cuenta</h3>
            <form onSubmit={saveEdit} style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
              <input type="text" placeholder="Nombre" value={editData.nombre} onChange={(e)=>setEditData(s=>({...s, nombre: e.target.value}))} style={{ padding:8, borderRadius:6 }} />
              <select value={editData.tipo} onChange={(e)=>setEditData(s=>({...s, tipo: e.target.value}))} style={{ padding:8, borderRadius:6 }}>
                {tiposCuenta.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
                <button type="button" onClick={closeEdit} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff' }}>Cancelar</button>
                <button type="submit" style={{ padding:'8px 12px', borderRadius:8, border:'none', background:'#6c4fa1', color:'#fff', fontWeight:600 }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
