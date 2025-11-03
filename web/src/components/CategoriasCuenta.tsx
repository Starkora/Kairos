import React from 'react';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';
import { 
  ActionButtons, 
  DataTable, 
  FormCard, 
  FormInput, 
  FormButton, 
  FormGrid,
  StatsCard,
  StatsGrid,
  ExportGroup,
  useSortableData,
  type ColumnConfig
} from './shared';
import { MdFolder, MdAccessTime } from 'react-icons/md';

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

    // Validar duplicados
    const nombreExiste = categorias.some(
      cat => cat.nombre.toLowerCase() === form.nombre.toLowerCase()
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

  // Estadísticas
  const totalCategorias = categorias.length;

  // Ordenamiento
  const { sortedData: categoriasSorted } = useSortableData(categorias);

  // Configuración de columnas para la tabla
  const columns: ColumnConfig<any>[] = [
    { header: 'Nombre', accessor: 'nombre', align: 'left' },
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

  return (
    <div style={{ 
      maxWidth: 600, 
      margin: '32px auto', 
      background: 'var(--card-bg, #fff)', 
      borderRadius: 12, 
      boxShadow: 'var(--card-shadow, 0 2px 8px #eee)', 
      padding: 32 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #222)' }}>Categorías de Tipo de Cuenta</h1>
        {categorias.length > 0 && (
          <ExportGroup
            data={categorias}
            filename="categorias-cuenta"
            columns={[
              { header: 'Nombre', accessor: 'nombre' }
            ]}
          />
        )}
      </div>

      {/* Estadísticas */}
      <StatsGrid columns={2}>
        <StatsCard
          title="Total"
          value={totalCategorias}
          icon={React.createElement(MdFolder as any)}
          color="primary"
          subtitle="Tipos de cuenta"
        />
        <StatsCard
          title="Última actualización"
          value="Hoy"
          icon={React.createElement(MdAccessTime as any)}
          color="info"
          subtitle="Registros actualizados"
        />
      </StatsGrid>
      
      <FormCard>
        <FormGrid columns={2}>
          <FormInput
            type="text"
            name="nombre"
            placeholder="Nombre de la categoría de cuenta"
            value={form.nombre}
            onChange={handleChange}
            required
          />
          <FormButton type="button" onClick={handleSubmit}>
            Agregar
          </FormButton>
        </FormGrid>
      </FormCard>

      <DataTable
        data={categoriasSorted}
        columns={columns}
        loading={loading}
        keyExtractor={(cat) => cat.id.toString()}
        searchable={true}
        searchPlaceholder="Buscar categorías de cuenta..."
        emptyStateTitle="No hay categorías de cuenta"
        emptyStateDescription="Crea tu primera categoría para organizar tus cuentas"
      />
    </div>
  );
}
