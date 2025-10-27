import React from 'react';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';

export default function CategoriasCuenta() {
  const [categorias, setCategorias] = React.useState([]);
  const [form, setForm] = React.useState({ nombre: '' });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/categorias-cuenta`, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
      .then(res => {
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
      })
      .then(data => {
        console.log('Datos recibidos para categorías de cuenta:', data); // Depuración
        setCategorias(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nombre) {
      Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Debes ingresar un nombre de categoría de cuenta.' });
      return;
    }
    const result = await Swal.fire({
      title: '¿Agregar esta categoría de cuenta?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c4fa1',
    });
    if (result.isConfirmed) {
      const res = await fetch(`${API_BASE}/api/categorias-cuenta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Categoría de cuenta agregada', showConfirmButton: false, timer: 1200 });
        setForm({ nombre: '' });
        fetch(`${API_BASE}/api/categorias-cuenta`, { headers: { 'Authorization': 'Bearer ' + getToken() } })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(data => setCategorias(data));
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar la categoría de cuenta.' });
      }
    }
  };

  const handleEdit = (id) => {
    const categoria = categorias.find(c => c.id === id);
    if (!categoria) return;
    Swal.fire({
      title: 'Editar categoría de cuenta',
      html: `<input id='nombre' class='swal2-input' value='${categoria.nombre}' placeholder='Nombre'>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
  const nombre = (document.getElementById('nombre') as HTMLInputElement).value;
        return { nombre };
      }
    }).then(result => {
      if (result.isConfirmed) {
        fetch(`${API_BASE}/api/categorias-cuenta/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify(result.value)
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(() => {
            Swal.fire({ icon: 'success', title: 'Categoría de cuenta actualizada', showConfirmButton: false, timer: 1200 });
            setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...result.value } : c));
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: '¿Eliminar categoría de cuenta?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f44336',
    }).then(result => {
      if (result.isConfirmed) {
        fetch(`${API_BASE}/api/categorias-cuenta/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + getToken() }
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(() => {
            Swal.fire({ icon: 'success', title: 'Categoría de cuenta eliminada', showConfirmButton: false, timer: 1200 });
            setCategorias(prev => prev.filter(c => c.id !== id));
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  return (
    <div style={{ maxWidth: 480, margin: '32px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #eee', padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Categorías de Tipo de Cuenta</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre de la categoría de cuenta"
          value={form.nombre}
          onChange={handleChange}
          required
          style={{ flex: 2, padding: 8, borderRadius: 6 }}
        />
        <button type="submit" style={{ background: '#6c4fa1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600 }}>
          Agregar
        </button>
      </form>
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
          <thead>
            <tr style={{ background: '#f7f7fa' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => (
              <tr key={cat.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ fontWeight: 600, padding: 8 }}>{cat.nombre}</td>
                <td style={{ textAlign: 'center', padding: 8 }}>
                  <button className="icon-btn" style={{ background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, padding: 8, marginRight: 8 }} onClick={() => handleEdit(cat.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Editar">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                      <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                    </svg>
                    <span className="tooltip">Editar</span>
                  </button>
                  <button className="icon-btn" style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 8, padding: 8 }} onClick={() => handleDelete(cat.id)}>
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
            ))}
          </tbody>
        </table>
      )}
      <style>{`
        .icon-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; }
        .icon-btn .tooltip {
          position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px);
          background: #222; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap;
          opacity: 0; pointer-events: none; transition: opacity .12s ease, transform .12s ease; box-shadow: 0 2px 8px rgba(0,0,0,.18);
        }
        .icon-btn .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #222; }
        .icon-btn:hover .tooltip, .icon-btn:focus .tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>
      <style>{`
        .icon-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; }
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
