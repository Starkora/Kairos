import React from 'react';
import API_BASE from '../utils/apiBase';
import { getToken } from '../utils/auth';
import Swal from 'sweetalert2';
import {
  ActionButtons,
  DataTable,
  FormCard,
  FormInput,
  FormSelect,
  FormButton,
  FormGrid,
  StatsCard,
  StatsGrid,
  Badge,
  Modal,
  type ColumnConfig
} from './shared';
import { FaBell, FaClock, FaEnvelope, FaSms, FaWhatsapp, FaCalendarAlt } from 'react-icons/fa';

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = React.useState<{ 
    id?: string | number; 
    frecuencia: string; 
    medio: string; 
    horaInicio: string; 
    intervaloHoras: string; 
    dia: string 
  }>({ 
    id: undefined, 
    frecuencia: 'diaria', 
    medio: 'correo', 
    horaInicio: '', 
    intervaloHoras: '', 
    dia: '' 
  });
  const [notificacionesList, setNotificacionesList] = React.useState([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Función para obtener icono según medio
  const getMedioIcon = (medio: string) => {
    switch(medio.toLowerCase()) {
      case 'correo': return React.createElement(FaEnvelope as any);
      case 'sms': return React.createElement(FaSms as any);
      case 'whatsapp': return React.createElement(FaWhatsapp as any);
      default: return React.createElement(FaBell as any);
    }
  };


  // Función para obtener color según medio
  const getMedioColor = (medio: string): 'primary' | 'success' | 'info' | 'warning' => {
    switch(medio.toLowerCase()) {
      case 'correo': return 'primary';
      case 'sms': return 'info';
      case 'whatsapp': return 'success';
      default: return 'warning';
    }
  };

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
    setLoading(true);
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
        console.log('Notificaciones recibidas del backend:', data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error al obtener notificaciones:', err);
        setNotificacionesList([]);
        setLoading(false);
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
          setIsEditing(false);
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

  // Estadísticas
  const stats = React.useMemo(() => {
    const total = notificacionesList.length;
    const porMedio = notificacionesList.reduce((acc: any, notif: any) => {
      acc[notif.medio] = (acc[notif.medio] || 0) + 1;
      return acc;
    }, {});
    const porFrecuencia = notificacionesList.reduce((acc: any, notif: any) => {
      acc[notif.frecuencia] = (acc[notif.frecuencia] || 0) + 1;
      return acc;
    }, {});

    return { total, porMedio, porFrecuencia };
  }, [notificacionesList]);

  // Configuración de columnas para DataTable
  const columns: ColumnConfig<any>[] = [
    { 
      header: 'Frecuencia', 
      accessor: (notif) => (
        <Badge 
          variant={notif.frecuencia === 'diaria' ? 'success' : 'info'}
        >
          {notif.frecuencia.charAt(0).toUpperCase() + notif.frecuencia.slice(1)}
        </Badge>
      ),
      align: 'left' 
    },
    { 
      header: 'Medio', 
      accessor: (notif) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {getMedioIcon(notif.medio)}
          <span>{notif.medio.charAt(0).toUpperCase() + notif.medio.slice(1)}</span>
        </div>
      ),
      align: 'left' 
    },
    { 
      header: 'Hora de Inicio', 
      accessor: 'hora_inicio', 
      align: 'center' 
    },
    { 
      header: 'Intervalo', 
      accessor: (notif) => `${notif.intervalo_horas}h`,
      align: 'center' 
    },
    { 
      header: 'Día', 
      accessor: (notif) => notif.dia ? notif.dia.charAt(0).toUpperCase() + notif.dia.slice(1) : 'N/A',
      align: 'center' 
    },
    { 
      header: 'Acciones', 
      accessor: (notif) => (
        <ActionButtons 
          onEdit={() => handleEdit(notif.id)} 
          onDelete={() => handleDelete(notif.id)}
        />
      ),
      align: 'center' 
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h1 style={{ 
          margin: 0, 
          fontWeight: 700, 
          fontSize: 28, 
          color: 'var(--text-primary, #222)' 
        }}>
          Notificaciones
        </h1>
      </div>

      {/* Estadísticas */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total"
          value={stats.total}
          icon={React.createElement(FaBell as any)}
          color="primary"
          subtitle={`Máximo ${2} notificaciones`}
        />
        <StatsCard
          title="Correo"
          value={stats.porMedio['correo'] || 0}
          icon={React.createElement(FaEnvelope as any)}
          color="info"
          subtitle="Notificaciones por email"
        />
        <StatsCard
          title="SMS"
          value={stats.porMedio['sms'] || 0}
          icon={React.createElement(FaSms as any)}
          color="warning"
          subtitle="Notificaciones por SMS"
        />
        <StatsCard
          title="WhatsApp"
          value={stats.porMedio['whatsapp'] || 0}
          icon={React.createElement(FaWhatsapp as any)}
          color="success"
          subtitle="Notificaciones por WhatsApp"
        />
      </StatsGrid>

      {/* Botón Agregar */}
      <div style={{ marginBottom: 24 }}>
        <FormButton
          onClick={() => {
            setNotificaciones({ 
              frecuencia: 'diaria', 
              medio: 'correo', 
              horaInicio: '', 
              intervaloHoras: '', 
              dia: '' 
            });
            setIsEditing(false);
            if (Array.isArray(notificacionesList) && notificacionesList.length >= 2) {
              Swal.fire({ 
                icon: 'info', 
                title: 'Límite alcanzado', 
                text: 'Solo puedes tener hasta 2 notificaciones configuradas.' 
              });
              return;
            }
            setIsAdding(true);
          }}
          disabled={Array.isArray(notificacionesList) && notificacionesList.length >= 2}
        >
          {React.createElement(FaBell as any, { style: { marginRight: 8 } })}
          Agregar Notificación
        </FormButton>
      </div>

      {/* Tabla de Notificaciones */}
      <FormCard>
        <h2 style={{ 
          marginBottom: 16, 
          fontSize: 20, 
          fontWeight: 600,
          color: 'var(--text-primary, #222)'
        }}>
          Notificaciones Configuradas
        </h2>
        <DataTable
          data={notificacionesList}
          columns={columns}
          loading={loading}
          keyExtractor={(notif) => notif.id.toString()}
          searchable={false}
          emptyStateTitle="No hay notificaciones configuradas"
          emptyStateDescription="Agrega tu primera notificación para recibir recordatorios"
        />
      </FormCard>
      {/* Modal Agregar */}
      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Agregar Notificación"
      >
        <FormCard style={{ background: 'transparent', padding: 0, marginBottom: 0 }}>
          <FormGrid columns={1}>
            <FormSelect
              name="frecuencia"
              value={notificaciones.frecuencia}
              onChange={handleNotificacionesChange}
              options={[
                { value: 'diaria', label: 'Diaria' },
                { value: 'semanal', label: 'Semanal' }
              ]}
            />
            
            {notificaciones.frecuencia === 'semanal' && (
              <FormSelect
                name="dia"
                value={notificaciones.dia}
                onChange={handleNotificacionesChange}
                options={[
                  { value: '', label: 'Seleccione un día' },
                  { value: 'lunes', label: 'Lunes' },
                  { value: 'martes', label: 'Martes' },
                  { value: 'miercoles', label: 'Miércoles' },
                  { value: 'jueves', label: 'Jueves' },
                  { value: 'viernes', label: 'Viernes' },
                  { value: 'sabado', label: 'Sábado' },
                  { value: 'domingo', label: 'Domingo' }
                ]}
              />
            )}
            
            <FormInput
              type="time"
              name="horaInicio"
              placeholder="Hora de inicio"
              value={notificaciones.horaInicio}
              onChange={handleNotificacionesChange}
            />
            
            <FormInput
              type="number"
              name="intervaloHoras"
              placeholder="Intervalo de horas"
              value={notificaciones.intervaloHoras}
              onChange={handleNotificacionesChange}
            />
            
            <FormSelect
              name="medio"
              value={notificaciones.medio}
              onChange={handleNotificacionesChange}
              options={[
                { value: 'correo', label: 'Correo' },
                { value: 'sms', label: 'SMS' },
                { value: 'whatsapp', label: 'WhatsApp' }
              ]}
            />
          </FormGrid>
          
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <FormButton 
              onClick={() => { 
                guardarConfiguracion(); 
                setIsAdding(false); 
              }}
            >
              Guardar Configuración
            </FormButton>
            <FormButton 
              variant="danger"
              onClick={() => setIsAdding(false)}
            >
              Cancelar
            </FormButton>
          </div>
        </FormCard>
      </Modal>

      {/* Modal Editar */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Editar Notificación"
      >
        <FormCard style={{ background: 'transparent', padding: 0, marginBottom: 0 }}>
          <FormGrid columns={1}>
            <FormSelect
              name="frecuencia"
              value={notificaciones.frecuencia}
              onChange={handleNotificacionesChange}
              options={[
                { value: 'diaria', label: 'Diaria' },
                { value: 'semanal', label: 'Semanal' }
              ]}
            />
            
            {notificaciones.frecuencia === 'semanal' && (
              <FormSelect
                name="dia"
                value={notificaciones.dia}
                onChange={handleNotificacionesChange}
                options={[
                  { value: '', label: 'Seleccione un día' },
                  { value: 'lunes', label: 'Lunes' },
                  { value: 'martes', label: 'Martes' },
                  { value: 'miercoles', label: 'Miércoles' },
                  { value: 'jueves', label: 'Jueves' },
                  { value: 'viernes', label: 'Viernes' },
                  { value: 'sabado', label: 'Sábado' },
                  { value: 'domingo', label: 'Domingo' }
                ]}
              />
            )}
            
            <FormInput
              type="time"
              name="horaInicio"
              placeholder="Hora de inicio"
              value={notificaciones.horaInicio}
              onChange={handleNotificacionesChange}
            />
            
            <FormInput
              type="number"
              name="intervaloHoras"
              placeholder="Intervalo de horas"
              value={notificaciones.intervaloHoras}
              onChange={handleNotificacionesChange}
            />
            
            <FormSelect
              name="medio"
              value={notificaciones.medio}
              onChange={handleNotificacionesChange}
              options={[
                { value: 'correo', label: 'Correo' },
                { value: 'sms', label: 'SMS' },
                { value: 'whatsapp', label: 'WhatsApp' }
              ]}
            />
          </FormGrid>
          
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <FormButton onClick={handleEditSubmit}>
              Guardar Cambios
            </FormButton>
            <FormButton 
              variant="danger"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </FormButton>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}
