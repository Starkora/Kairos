import React from 'react';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';
import { 
  ActionButtons, 
  DataTable, 
  FormCard, 
  FormInput, 
  FormSelect, 
  FormButton, 
  FormGrid,
  useToast,
  type ColumnConfig
} from './shared';

export default function Categorias() {
  // Categorías de ingreso/egreso
  const [categorias, setCategorias] = React.useState([]);
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
        fetch(`${API_BASE}/api/categorias/${id}`, {
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
    const cat = categorias.find(c => c.id === id);
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
        fetch(`${API_BASE}/api/categorias/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + getToken()
          }
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(async () => {
            setCategorias(prev => prev.filter(c => c.id !== id));
            const undo = await Swal.fire({ icon: 'success', title: 'Categoría eliminada', text: 'Puedes deshacer esta acción.', showCancelButton: true, confirmButtonText: 'Deshacer', cancelButtonText: 'Cerrar', timer: 5000, timerProgressBar: true });
            if (undo.isConfirmed && cat) {
              // recrear
              const resRe = await fetch(`${API_BASE}/api/categorias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ nombre: cat.nombre, tipo: cat.tipo, plataforma: 'web' })
              });
              if (resRe.ok) {
                Swal.fire({ icon: 'success', title: 'Categoría restaurada', timer: 1200, showConfirmButton: false });
                // refrescar
                fetch(`${API_BASE}/api/categorias?plataforma=web`, { headers: { 'Authorization': 'Bearer ' + getToken() } })
                  .then(r => r.ok ? r.json() : [])
                  .then(data => setCategorias(Array.isArray(data) ? data : []))
                  .catch(() => {});
              } else {
                Swal.fire({ icon: 'error', title: 'No se pudo deshacer' });
              }
            }
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
            setCategoriasCuenta(prev => prev.map(c => c.id === id ? { ...c, ...result.value } : c));
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  const handleDeleteCuenta = (id) => {
    const cat = categoriasCuenta.find(c => c.id === id);
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
          headers: {
            'Authorization': 'Bearer ' + getToken()
          }
        })
          .then(res => {
            if (!res.ok) throw new Error('No autorizado');
            return res.json();
          })
          .then(async () => {
            setCategoriasCuenta(prev => prev.filter(c => c.id !== id));
            const undo = await Swal.fire({ icon: 'success', title: 'Categoría de cuenta eliminada', text: 'Puedes deshacer esta acción.', showCancelButton: true, confirmButtonText: 'Deshacer', cancelButtonText: 'Cerrar', timer: 5000, timerProgressBar: true });
            if (undo.isConfirmed && cat) {
              const resRe = await fetch(`${API_BASE}/api/categorias-cuenta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ nombre: cat.nombre })
              });
              if (resRe.ok) {
                Swal.fire({ icon: 'success', title: 'Categoría de cuenta restaurada', timer: 1200, showConfirmButton: false });
                fetch(`${API_BASE}/api/categorias-cuenta`, { headers: { 'Authorization': 'Bearer ' + getToken() } })
                  .then(r => r.ok ? r.json() : [])
                  .then(data => setCategoriasCuenta(Array.isArray(data) ? data : []))
                  .catch(() => {});
              } else {
                Swal.fire({ icon: 'error', title: 'No se pudo deshacer' });
              }
            }
          })
          .catch(err => Swal.fire({ icon: 'error', title: 'Error', text: err.message }));
      }
    });
  };

  const buttonContainerStyle = {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  };

  // Configuración de columnas para categorías
  const categoriasColumns: ColumnConfig<any>[] = [
    { header: 'Nombre', accessor: 'nombre', align: 'left' },
    { header: 'Tipo', accessor: 'tipo', align: 'left' },
    { 
      header: 'Acciones', 
      accessor: (cat) => (
        <ActionButtons 
          onEdit={() => handleEdit(cat.id)} 
          onDelete={() => handleDelete(cat.id)}
        />
      ),
      align: 'center' 
    }
  ];

  // Configuración de columnas para categorías de cuenta
  const categoriasCuentaColumns: ColumnConfig<any>[] = [
    { header: 'Nombre', accessor: 'nombre', align: 'left', width: '45%' },
    { 
      header: 'Fecha de creación', 
      accessor: (cat) => cat.created_at ? cat.created_at.substring(0, 10) : '', 
      align: 'left', 
      width: '35%' 
    },
    { 
      header: 'Acciones', 
      accessor: (cat) => (
        <ActionButtons 
          onEdit={() => handleEditCuenta(cat.id)} 
          onDelete={() => handleDeleteCuenta(cat.id)}
        />
      ),
      align: 'center',
      width: '20%'
    }
  ];

  return (
    <div className="card categories-card">
      {/* Bloque de Categorías ingreso/egreso */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 26, color: 'var(--color-text)' }}>
          Categorías
        </h2>
        
        <FormCard>
          <FormGrid columns={3}>
            <FormInput
              type="text"
              name="nombre"
              placeholder="Nombre de la categoría"
              value={form.nombre}
              onChange={handleChange}
              required
            />
            <FormSelect
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              options={[
                { value: 'ingreso', label: 'Ingreso' },
                { value: 'egreso', label: 'Egreso' },
                { value: 'ahorro', label: 'Ahorro' }
              ]}
            />
            <FormButton type="button" onClick={handleSubmit}>
              Agregar
            </FormButton>
          </FormGrid>
        </FormCard>

        <FormCard>
          <DataTable
            data={categorias}
            columns={categoriasColumns}
            loading={loading}
            className="tabla-categorias"
            wrapperClassName="tabla-categorias-wrapper"
            keyExtractor={(cat) => cat.id.toString()}
            pagination={true}
            pageSize={6}
            searchable={true}
            searchPlaceholder="Buscar categorías..."
            emptyStateTitle="No hay categorías"
            emptyStateDescription="Agrega tu primera categoría para comenzar"
          />
        </FormCard>
      </div>

      {/* Bloque de Categoría de Cuenta */}
      <div>
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 26, color: 'var(--color-text)' }}>
          Categoría de Cuenta
        </h2>
        
        <FormCard>
          <FormGrid columns={2}>
            <FormInput
              type="text"
              name="nombre"
              placeholder="Nombre de la categoría de cuenta"
              value={formCuenta.nombre}
              onChange={handleChangeCuenta}
              required
            />
            <FormButton type="button" onClick={handleSubmitCuenta} disabled={loadingCuenta}>
              {loadingCuenta ? 'Guardando...' : 'Agregar Categoría de Cuenta'}
            </FormButton>
          </FormGrid>
        </FormCard>

        <FormCard>
          <DataTable
            data={categoriasCuenta}
            columns={categoriasCuentaColumns}
            loading={loadingTablaCuenta}
            className="tabla-categorias-cuenta"
            wrapperClassName="tabla-categorias-cuenta-wrapper"
            keyExtractor={(cat) => cat.id.toString()}
            searchable={true}
            searchPlaceholder="Buscar categorías de cuenta..."
            emptyStateTitle="No hay categorías de cuenta"
            emptyStateDescription="Crea categorías para organizar tus cuentas"
          />
        </FormCard>
      </div>
    </div>
  );
}
