import React from 'react';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';

export default function Categorias() {
  // Categorías de ingreso/egreso
  const [categorias, setCategorias] = React.useState([]);
  const [pageCat, setPageCat] = React.useState(1);
  const pageSizeCat = 6; // filas por página
  const [form, setForm] = React.useState({ nombre: '', tipo: 'ingreso' });
  const [loading, setLoading] = React.useState(true);
  // Categoría de cuenta
  const [formCuenta, setFormCuenta] = React.useState({ nombre: '' });
  const [loadingCuenta, setLoadingCuenta] = React.useState(false);
  const [categoriasCuenta, setCategoriasCuenta] = React.useState([]);
  const [loadingTablaCuenta, setLoadingTablaCuenta] = React.useState(true);
  // Obtener categorías de cuenta al cargar
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
        if (Array.isArray(data)) setCategoriasCuenta(data);
        else setCategoriasCuenta([]);
        setLoadingTablaCuenta(false);
      })
      .catch(() => {
        setCategoriasCuenta([]);
        setLoadingTablaCuenta(false);
      });
  }, []);

  // Derivar paginación de categorías (ingreso/egreso)
  const totalPagesCat = Math.max(1, Math.ceil(((Array.isArray(categorias) ? categorias.length : 0)) / pageSizeCat));
  const pageCategorias = React.useMemo(() => {
    const lista = Array.isArray(categorias) ? categorias : [];
    const start = (pageCat - 1) * pageSizeCat;
    return lista.slice(start, start + pageSizeCat);
  }, [categorias, pageCat]);

  // Asegurar que la página actual esté dentro de rango cuando cambie la cantidad
  React.useEffect(() => {
    if (pageCat > totalPagesCat) setPageCat(totalPagesCat);
  }, [totalPagesCat, pageCat]);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/categorias?plataforma=web`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
      })
      .then(data => {
        console.log('Datos recibidos en GET /api/categorias:', data); // Depuración
        if (Array.isArray(data)) setCategorias(data);
        else setCategorias([]);
        setLoading(false);
      })
      .catch(() => {
        setCategorias([]);
        setLoading(false);
      });
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    console.log('Estado del formulario actualizado:', form); // Depuración
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nombre || !form.tipo) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Debes ingresar un nombre y seleccionar un tipo.' });
      return;
    }
    const result = await Swal.fire({
      title: '¿Agregar esta categoría?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c4fa1',
    });
    if (result.isConfirmed) {
      setLoading(true);
      console.log('Datos enviados en POST /api/categorias:', { ...form, plataforma: 'web' }); // Depuración
      const res = await fetch(`${API_BASE}/api/categorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ ...form, plataforma: 'web' })
      });
      setLoading(false);
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Categoría agregada', showConfirmButton: false, timer: 1200 });
        setForm({ nombre: '', tipo: 'ingreso' });
        // Refrescar tabla
        setLoading(true);
        fetch(`${API_BASE}/api/categorias?plataforma=web`, {
          headers: {
            'Authorization': 'Bearer ' + getToken()
          }
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(data => {
            if (Array.isArray(data)) setCategorias(data);
            else setCategorias([]);
            setLoading(false);
          })
          .catch(() => {
            setCategorias([]);
            setLoading(false);
          });
      } else {
        // Leer la respuesta del servidor para mostrar detalle del error
        let text = await res.text();
        let parsed = null;
        try { parsed = JSON.parse(text); } catch (e) { /* no JSON */ }
        console.error('Error al crear categoría, status:', res.status, 'body:', parsed || text);
        const message = (parsed && (parsed.message || parsed.error)) ? (parsed.message || parsed.error) : (`HTTP ${res.status}` + (typeof text === 'string' ? (': ' + text) : ''));
        Swal.fire({ icon: 'error', title: 'Error', text: message });
      }
    }
  };

  // Formulario de categoría de cuenta
  const handleChangeCuenta = e => {
    const { name, value } = e.target;
    setFormCuenta(f => ({ ...f, [name]: value }));
  };
  const handleSubmitCuenta = async e => {
    e.preventDefault();
    if (!formCuenta.nombre) {
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
      setLoadingCuenta(true);
      const res = await fetch(`${API_BASE}/api/categorias-cuenta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(formCuenta)
      });
      setLoadingCuenta(false);
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Categoría de cuenta agregada', showConfirmButton: false, timer: 1200 });
        setFormCuenta({ nombre: '' });
        // Refrescar tabla
        setLoadingTablaCuenta(true);
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
            if (Array.isArray(data)) setCategoriasCuenta(data);
            else setCategoriasCuenta([]);
            setLoadingTablaCuenta(false);
          })
          .catch(() => {
            setCategoriasCuenta([]);
            setLoadingTablaCuenta(false);
          });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar la categoría de cuenta.' });
      }
    }
  };

  const handleEdit = (id) => {
    const categoria = categorias.find(c => c.id === id);
    if (!categoria) return;
    Swal.fire({
      title: 'Editar categoría',
      html: `<input id='nombre' class='swal2-input' value='${categoria.nombre}' placeholder='Nombre'>
             <select id='tipo' class='swal2-input'>
               <option value='ingreso' ${categoria.tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
               <option value='egreso' ${categoria.tipo === 'egreso' ? 'selected' : ''}>Egreso</option>
               <option value='ahorro' ${categoria.tipo === 'ahorro' ? 'selected' : ''}>Ahorro</option>
             </select>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
  const nombre = (document.getElementById('nombre') as HTMLInputElement).value;
  const tipo = (document.getElementById('tipo') as HTMLSelectElement).value;
        return { nombre, tipo };
      }
    }).then(result => {
      if (result.isConfirmed) {
        fetch(`/api/categorias/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({ ...result.value, plataforma: 'web' })
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(() => {
            Swal.fire({ icon: 'success', title: 'Categoría actualizada', showConfirmButton: false, timer: 1200 });
            setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...result.value } : c));
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: '¿Eliminar categoría?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f44336',
    }).then(result => {
      if (result.isConfirmed) {
        fetch(`/api/categorias/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + getToken()
          }
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(() => {
            Swal.fire({ icon: 'success', title: 'Categoría eliminada', showConfirmButton: false, timer: 1200 });
            setCategorias(prev => prev.filter(c => c.id !== id));
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  const handleEditCuenta = (id) => {
    const categoria = categoriasCuenta.find(c => c.id === id);
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
        fetch(`/api/categorias-cuenta/${id}`, {
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
            setCategoriasCuenta(prev => prev.map(c => c.id === id ? { ...c, ...result.value } : c));
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  const handleDeleteCuenta = (id) => {
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
        fetch(`/api/categorias-cuenta/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + getToken()
          }
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(() => {
            Swal.fire({ icon: 'success', title: 'Categoría de cuenta eliminada', showConfirmButton: false, timer: 1200 });
            setCategoriasCuenta(prev => prev.filter(c => c.id !== id));
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  const buttonStyle = {
    // ya no se usa para acciones; mantenido temporalmente por compatibilidad
  };

  const buttonDangerStyle = {
    // ya no se usa para acciones; mantenido temporalmente por compatibilidad
  };

  const buttonContainerStyle = {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <div className="card categories-card">
      {/* Bloque de Categorías ingreso/egreso */}
      <div style={{ marginBottom: 48 }}>
  <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 26, color: 'var(--color-text)' }}>Categorías</h2>
  <div style={{ background: 'var(--color-card)', borderRadius: 10, padding: 24, marginBottom: 32 }}>
          <form onSubmit={handleSubmit} className="categories-form" style={{ marginBottom: 24 }}>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre de la categoría"
              value={form.nombre}
              onChange={handleChange}
              required
              style={{ padding: 8, borderRadius: 6, width: '100%', minWidth: 0 }}
            />
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 6, width: '100%', minWidth: 0 }}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="ahorro">Ahorro</option>
            </select>
            <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, width: '100%' }}>
              Agregar
            </button>
          </form>
        </div>
  <div style={{ background: 'var(--color-card)', borderRadius: 10, padding: 24 }}>
          {loading ? (
            <div>Cargando...</div>
          ) : (
            <>
            <div className="table-responsive tabla-categorias-wrapper"><table className="tabla-categorias" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr style={{ background: 'var(--color-table-header-bg)' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
                  <th style={{ textAlign: 'center', padding: 8 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageCategorias.map(cat => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--color-input-border)' }}>
                    <td style={{ fontWeight: 600, padding: 8 }}>{cat.nombre}</td>
                    <td style={{ padding: 8 }}>{cat.tipo}</td>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      <div className="acciones" style={buttonContainerStyle}>
                        <button onClick={() => handleEdit(cat.id)}
                          style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}
                          aria-label="Editar" title="Editar">
                          <svg className="icon-accion" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c4fa1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(cat.id)}
                          style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}
                          aria-label="Eliminar" title="Eliminar">
                          <svg className="icon-accion" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {/* Controles de paginación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                {(() => {
                  const total = Array.isArray(categorias) ? categorias.length : 0;
                  const start = total ? (pageCat - 1) * pageSizeCat + 1 : 0;
                  const end = Math.min(pageCat * pageSizeCat, total);
                  return `Mostrando ${start}-${end} de ${total}`;
                })()}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPageCat(p => Math.max(1, p - 1))}
                  disabled={pageCat <= 1}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', cursor: pageCat <= 1 ? 'not-allowed' : 'pointer' }}>
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPageCat(p => Math.min(totalPagesCat, p + 1))}
                  disabled={pageCat >= totalPagesCat}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', cursor: pageCat >= totalPagesCat ? 'not-allowed' : 'pointer' }}>
                  Siguiente
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      </div>

      {/* Bloque de Categoría de Cuenta */}
      <div>
  <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 26, color: 'var(--color-text)' }}>Categoría de Cuenta</h2>
        <div style={{ background: 'var(--color-card)', borderRadius: 10, padding: 24, marginBottom: 32 }}>
          <form onSubmit={handleSubmitCuenta} className="categories-form" style={{ marginBottom: 0 }}>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre de la categoría de cuenta"
              value={formCuenta.nombre}
              onChange={handleChangeCuenta}
              required
              style={{ padding: 8, borderRadius: 6, width: '100%', minWidth: 0 }}
            />
            <button type="submit" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, width: '100%' }}>
              Agregar Categoría de Cuenta
            </button>
          </form>
          {loadingCuenta && <div style={{ marginTop: 8 }}>Guardando...</div>}
        </div>
        {/* Tabla de categorías de cuenta */}
  <div style={{ background: 'var(--color-card)', borderRadius: 10, padding: 24 }}>
          {loadingTablaCuenta ? (
            <div>Cargando...</div>
          ) : (
            <div className="table-responsive tabla-categorias-cuenta-wrapper"><table className="tabla-categorias-cuenta" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              {/* Ajuste de anchos de columnas: reducimos Nombre y ampliamos Fecha de creación */}
              <colgroup>
                <col style={{ width: '45%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--color-table-header-bg)' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Fecha de creación</th>
                  <th style={{ textAlign: 'center', padding: 8 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(categoriasCuenta) ? categoriasCuenta : []).map(cat => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--color-input-border)' }}>
                    <td style={{ fontWeight: 600, padding: 8 }}>{cat.nombre}</td>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{cat.created_at ? cat.created_at.substring(0, 10) : ''}</td>
                    <td style={{ textAlign: 'center', padding: 8 }}>
                      <div className="acciones-cc" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => handleEditCuenta(cat.id)}
                          style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}
                          aria-label="Editar" title="Editar">
                          <svg className="icon-accion-cc" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c4fa1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteCuenta(cat.id)}
                          style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}
                          aria-label="Eliminar" title="Eliminar">
                          <svg className="icon-accion-cc" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
      {/* Tooltips nativos via title en los botones */}
    </div>
  );
}
