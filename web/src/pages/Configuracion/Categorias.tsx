import React from 'react';
import API_BASE from '../../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../../utils/auth';
import { 
  ActionButtons, 
  DataTable, 
  FormCard, 
  FormInput, 
  FormSelect, 
  FormButton, 
  FormGrid,
  useToast,
  ExportGroup,
  useFormValidation,
  ValidationRules,
  ValidationError,
  StatsCard,
  StatsGrid,
  CategoryBadge,
  FilterGroup,
  FilterButton,
  useSortableData,
  SortableHeader,
  type ColumnConfig
} from '../../components/ui';
import { MdBarChart, MdTrendingUp, MdTrendingDown, MdAccountBalance, MdLightbulbOutline } from 'react-icons/md';
import './Categorias.css';

export default function Categorias() {
  // Categorías predefinidas
  const opcionesCategoriasIngreso = [
    'Sueldo', 'Freelance', 'Inversiones', 'Regalos', 'Ventas', 'Bonos', 'Otros ingresos'
  ];
  const opcionesCategoriasEgreso = [
    'Alimentación', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 
    'Ropa', 'Hogar', 'Tecnología', 'Viajes', 'Regalos', 'Mascotas', 'Otros gastos'
  ];
  const opcionesCategoriasAhorro = [
    'Emergencias', 'Vacaciones', 'Inversión', 'Retiro', 'Educación', 'Vivienda', 'Otros ahorros'
  ];
  const opcionesCategoriasCuenta = [
    'Banco', 'Efectivo', 'Tarjeta de crédito', 'Billetera digital', 'Inversión', 
    'Caja de ahorro', 'Cuenta corriente', 'Otros'
  ];

  // Categorías de ingreso/egreso
  const [categorias, setCategorias] = React.useState([]);
  const [form, setForm] = React.useState({ nombre: '', tipo: 'ingreso' });
  const [loading, setLoading] = React.useState(true);
  const [filtroTipo, setFiltroTipo] = React.useState<'all' | 'ingreso' | 'egreso' | 'ahorro'>('all');
  const [mostrarOpciones, setMostrarOpciones] = React.useState(false);
  
  // Categoría de cuenta
  const [formCuenta, setFormCuenta] = React.useState({ nombre: '' });
  const [loadingCuenta, setLoadingCuenta] = React.useState(false);
  const [categoriasCuenta, setCategoriasCuenta] = React.useState([]);
  const [loadingTablaCuenta, setLoadingTablaCuenta] = React.useState(true);
  const [mostrarOpcionesCuenta, setMostrarOpcionesCuenta] = React.useState(false);
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
        if (Array.isArray(data)) {
          setCategorias(data);
        } else {
          setCategorias([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setCategorias([]);
        setLoading(false);
      });
  }, []);

  // Cerrar dropdowns al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.categoria-dropdown')) {
        setMostrarOpciones(false);
        setMostrarOpcionesCuenta(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Validar campos vacíos
    if (!form.nombre || !form.tipo) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Campos requeridos', 
        text: 'Debes ingresar un nombre y seleccionar un tipo.' 
      });
      return;
    }

    // Validar duplicados
    const nombreExiste = categorias.some(
      cat => cat.nombre.toLowerCase() === form.nombre.toLowerCase()
    );
    
    if (nombreExiste) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Categoría duplicada', 
        text: 'Ya existe una categoría con ese nombre.' 
      });
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
    
    // Validar campo vacío
    if (!formCuenta.nombre) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Nombre requerido', 
        text: 'Debes ingresar un nombre de categoría de cuenta.' 
      });
      return;
    }

    // Validar duplicados
    const nombreExiste = categoriasCuenta.some(
      cat => cat.nombre.toLowerCase() === formCuenta.nombre.toLowerCase()
    );
    
    if (nombreExiste) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Categoría duplicada', 
        text: 'Ya existe una categoría de cuenta con ese nombre.' 
      });
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

  // Filtrar categorías
  const categoriasFiltradas = filtroTipo === 'all' 
    ? categorias 
    : categorias.filter(cat => cat.tipo === filtroTipo);

  // Estadísticas
  const totalCategorias = categorias.length;
  const totalIngresos = categorias.filter(c => c.tipo === 'ingreso').length;
  const totalEgresos = categorias.filter(c => c.tipo === 'egreso').length;
  const totalAhorros = categorias.filter(c => c.tipo === 'ahorro').length;

  // Ordenamiento
  const { sortedData: categoriasSorted, sortConfig, requestSort } = useSortableData(categoriasFiltradas);

  // Configuración de columnas para categorías con badges
  const categoriasColumns: ColumnConfig<any>[] = [
    { header: 'Nombre', accessor: 'nombre', align: 'left', width: '140px' },
    { 
      header: 'Tipo', 
      accessor: (cat) => <CategoryBadge tipo={cat.tipo} />, 
      align: 'left',
      width: '110px'
    },
    { 
      header: 'Acciones', 
      accessor: (cat) => (
        <ActionButtons 
          onEdit={() => handleEdit(cat.id)} 
          onDelete={() => handleDelete(cat.id)}
        />
      ),
      align: 'center',
      width: '110px'
    }
  ];

  // Configuración de columnas para categorías de cuenta
  const categoriasCuentaColumns: ColumnConfig<any>[] = [
    { header: 'Nombre', accessor: 'nombre', align: 'left' },
    { 
      header: 'Fecha de creación', 
      accessor: (cat) => cat.created_at ? cat.created_at.substring(0, 10) : '', 
      align: 'left',
      width: '120px'
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
      width: '110px'
    }
  ];

  return (
    <div className="card categories-card">
      {/* Bloque de Categorías ingreso/egreso */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 26, color: 'var(--color-text)' }}>
            Categorías
          </h2>
          {categorias.length > 0 && (
            <ExportGroup
              data={categorias}
              filename="categorias"
              columns={[
                { header: 'Nombre', accessor: 'nombre' },
                { header: 'Tipo', accessor: 'tipo' }
              ]}
            />
          )}
        </div>

        {/* Estadísticas */}
        <StatsGrid columns={4}>
          <StatsCard
            title="Total"
            value={totalCategorias}
            icon={React.createElement(MdBarChart as any)}
            color="primary"
            subtitle="Categorías registradas"
          />
          <StatsCard
            title="Ingresos"
            value={totalIngresos}
            icon={React.createElement(MdTrendingUp as any)}
            color="success"
            subtitle={`${totalCategorias > 0 ? Math.round((totalIngresos / totalCategorias) * 100) : 0}% del total`}
          />
          <StatsCard
            title="Egresos"
            value={totalEgresos}
            icon={React.createElement(MdTrendingDown as any)}
            color="danger"
            subtitle={`${totalCategorias > 0 ? Math.round((totalEgresos / totalCategorias) * 100) : 0}% del total`}
          />
          <StatsCard
            title="Ahorros"
            value={totalAhorros}
            icon={React.createElement(MdAccountBalance as any)}
            color="info"
            subtitle={`${totalCategorias > 0 ? Math.round((totalAhorros / totalCategorias) * 100) : 0}% del total`}
          />
        </StatsGrid>
        
        <FormCard>
          <FormGrid columns={3}>
            <div className="categoria-dropdown" style={{ position: 'relative' }}>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary, #666)',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {React.createElement(MdLightbulbOutline as any, { style: { fontSize: '14px' } })}
                <span>Haz clic en la flecha para ver opciones</span>
              </div>
              <FormInput
                type="text"
                name="nombre"
                placeholder="Nombre de la categoría"
                value={form.nombre}
                onChange={handleChange}
                onFocus={() => setMostrarOpciones(true)}
                required
                style={{ paddingRight: '36px' }}
              />
              <button
                type="button"
                onClick={() => setMostrarOpciones(!mostrarOpciones)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: 'var(--text-secondary, #666)',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s'
                }}
                title="Ver opciones predefinidas"
              >
                {mostrarOpciones ? '▲' : '▼'}
              </button>
              {mostrarOpciones && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border-color, #e0e0e0)',
                  borderRadius: 8,
                  marginTop: 4,
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    padding: '8px 12px', 
                    background: 'var(--table-header-bg, #f5f5f7)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--text-secondary, #666)',
                    borderBottom: '1px solid var(--border-color, #e0e0e0)'
                  }}>
                    Selecciona una opción o escribe tu propia categoría
                  </div>
                  {(form.tipo === 'ingreso' ? opcionesCategoriasIngreso :
                    form.tipo === 'egreso' ? opcionesCategoriasEgreso :
                    opcionesCategoriasAhorro).map(opcion => (
                    <div
                      key={opcion}
                      onClick={() => {
                        setForm(f => ({ ...f, nombre: opcion }));
                        setMostrarOpciones(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color, #e0e0e0)',
                        transition: 'background 0.2s',
                        fontSize: 14,
                        color: 'var(--text-primary, #222)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--table-row-hover, #f9f9fb)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {opcion}
                    </div>
                  ))}
                  <div
                    onClick={() => setMostrarOpciones(false)}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--primary-color, #6c4fa1)',
                      background: 'var(--table-header-bg, #f5f5f7)'
                    }}
                  >
                    Cerrar
                  </div>
                </div>
              )}
            </div>
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

        {/* Filtros */}
        <div style={{ marginBottom: 16 }}>
          <FilterGroup title="Filtrar por tipo">
            <FilterButton
              label="Todos"
              active={filtroTipo === 'all'}
              count={totalCategorias}
              onClick={() => setFiltroTipo('all')}
            />
            <FilterButton
              label="Ingresos"
              active={filtroTipo === 'ingreso'}
              count={totalIngresos}
              onClick={() => setFiltroTipo('ingreso')}
            />
            <FilterButton
              label="Egresos"
              active={filtroTipo === 'egreso'}
              count={totalEgresos}
              onClick={() => setFiltroTipo('egreso')}
            />
            <FilterButton
              label="Ahorros"
              active={filtroTipo === 'ahorro'}
              count={totalAhorros}
              onClick={() => setFiltroTipo('ahorro')}
            />
          </FilterGroup>
        </div>

        <FormCard>
          <DataTable
            data={categoriasSorted}
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 26, color: 'var(--color-text)' }}>
            Categoría de Cuenta
          </h2>
          {categoriasCuenta.length > 0 && (
            <ExportGroup
              data={categoriasCuenta}
              filename="categorias-cuenta"
              columns={[
                { header: 'Nombre', accessor: 'nombre' },
                { 
                  header: 'Fecha de creación', 
                  accessor: (cat) => cat.created_at ? cat.created_at.substring(0, 10) : '' 
                }
              ]}
            />
          )}
        </div>
        
        <FormCard>
          <FormGrid columns={2}>
            <div className="categoria-dropdown" style={{ position: 'relative' }}>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary, #666)',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {React.createElement(MdLightbulbOutline as any, { style: { fontSize: '14px' } })}
                <span>Haz clic en la flecha para ver opciones</span>
              </div>
              <FormInput
                type="text"
                name="nombre"
                placeholder="Nombre de la categoría de cuenta"
                value={formCuenta.nombre}
                onChange={handleChangeCuenta}
                onFocus={() => setMostrarOpcionesCuenta(true)}
                required
                style={{ paddingRight: '36px' }}
              />
              <button
                type="button"
                onClick={() => setMostrarOpcionesCuenta(!mostrarOpcionesCuenta)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: 'var(--text-secondary, #666)',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s'
                }}
                title="Ver opciones predefinidas"
              >
                {mostrarOpcionesCuenta ? '▲' : '▼'}
              </button>
              {mostrarOpcionesCuenta && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border-color, #e0e0e0)',
                  borderRadius: 8,
                  marginTop: 4,
                  maxHeight: 200,
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    padding: '8px 12px', 
                    background: 'var(--table-header-bg, #f5f5f7)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--text-secondary, #666)',
                    borderBottom: '1px solid var(--border-color, #e0e0e0)'
                  }}>
                    Selecciona una opción o escribe tu propia categoría
                  </div>
                  {opcionesCategoriasCuenta.map(opcion => (
                    <div
                      key={opcion}
                      onClick={() => {
                        setFormCuenta(f => ({ ...f, nombre: opcion }));
                        setMostrarOpcionesCuenta(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color, #e0e0e0)',
                        transition: 'background 0.2s',
                        fontSize: 14,
                        color: 'var(--text-primary, #222)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--table-row-hover, #f9f9fb)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {opcion}
                    </div>
                  ))}
                  <div
                    onClick={() => setMostrarOpcionesCuenta(false)}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--primary-color, #6c4fa1)',
                      background: 'var(--table-header-bg, #f5f5f7)'
                    }}
                  >
                    Cerrar
                  </div>
                </div>
              )}
            </div>
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

