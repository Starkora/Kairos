import React from 'react';
import API_BASE from '../../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../../utils/auth';
import { 
  FaWallet, FaUniversity, FaPiggyBank, FaCreditCard, FaMoneyBillWave,
  FaChartLine, FaTrophy, FaSearch, FaFilter, FaSortAmountDown,
  FaEye, FaPlus, FaEdit, FaTrash, FaExclamationTriangle,
  FaArrowUp, FaArrowDown, FaClock, FaTh, FaList, FaCheckCircle,
  FaTimesCircle, FaDollarSign
} from 'react-icons/fa';

export default function Cuentas() {
  const [cuentas, setCuentas] = React.useState([]);
  const [form, setForm] = React.useState({ nombre: '', saldo: '', tipo: '' });
  const [tiposCuenta, setTiposCuenta] = React.useState([{ value: '', label: 'Tipo de cuenta' }]);
  const [editing, setEditing] = React.useState(null); // {id, nombre, tipo}
  const [editData, setEditData] = React.useState({ nombre: '', tipo: '' });
  
  // Nuevos estados para mejoras
  const [busqueda, setBusqueda] = React.useState('');
  const [filtroTipo, setFiltroTipo] = React.useState('todos');
  const [ordenamiento, setOrdenamiento] = React.useState('nombre'); // 'nombre' | 'saldo' | 'tipo'
  const [vistaActual, setVistaActual] = React.useState('tabla'); // 'tabla' | 'tarjetas'
  const [erroresValidacion, setErroresValidacion] = React.useState<{[key: string]: string}>({});
  const [movimientosPorCuenta, setMovimientosPorCuenta] = React.useState<{[key: number]: any}>({});

  // Función para renderizar iconos según tipo de cuenta
  const renderIconoCuenta = (tipo: string, style?: any) => {
    const iconMap: {[key: string]: any} = {
      'Cuenta Sueldo': FaUniversity,
      'Ahorro': FaPiggyBank,
      'Tarjeta': FaCreditCard,
      'Billetera': FaWallet,
      'Efectivo': FaMoneyBillWave,
      'Inversión': FaChartLine,
    };
    const Icon = iconMap[tipo] || FaWallet;
    return React.createElement(Icon as any, { style });
  };

  // Función para obtener color según tipo de cuenta
  const getColorTipo = (tipo: string): string => {
    const colorMap: {[key: string]: string} = {
      'Cuenta Sueldo': '#1976d2',
      'Ahorro': '#388e3c',
      'Tarjeta': '#f57c00',
      'Billetera': '#6c4fa1',
      'Efectivo': '#d32f2f',
      'Inversión': '#0097a7',
    };
    return colorMap[tipo] || '#6c4fa1';
  };

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

  // Listener para refrescar cuentas desde otros componentes
  React.useEffect(() => {
    const handler = () => {
      (async () => {
        try {
          const apiFetch = (await import('../../utils/apiFetch')).default;
          const res = await apiFetch(`${API_BASE}/api/cuentas?plataforma=web`);
          const data = res.ok ? await res.json() : [];
          setCuentas(Array.isArray(data) ? data : []);
        } catch (e) {
          // si hubo 401 o error, ya será manejado por apiFetch/forceLogout
        }
      })();
    };
    window.addEventListener('cuentas:refresh', handler);
    return () => window.removeEventListener('cuentas:refresh', handler);
  }, []);

  // Calcular estadísticas
  const estadisticas = React.useMemo(() => {
    const total = cuentas.reduce((sum, c) => sum + (Number(c.saldo_actual) || 0), 0);
    const cuentaMayorSaldo = cuentas.length > 0 
      ? cuentas.reduce((max, c) => (Number(c.saldo_actual) || 0) > (Number(max.saldo_actual) || 0) ? c : max, cuentas[0])
      : null;
    
    const distribucion = cuentas.reduce((acc: {[key: string]: number}, c) => {
      const tipo = c.tipo || 'Sin tipo';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCuentas: cuentas.length,
      balanceTotal: total,
      mayorSaldo: cuentaMayorSaldo,
      distribucion
    };
  }, [cuentas]);

  // Filtrar y ordenar cuentas
  const cuentasFiltradas = React.useMemo(() => {
    let resultado = [...cuentas];

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      resultado = resultado.filter(c => 
        c.nombre.toLowerCase().includes(term) || 
        (c.tipo && c.tipo.toLowerCase().includes(term))
      );
    }

    // Filtrar por tipo
    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(c => c.tipo === filtroTipo);
    }

    // Ordenar
    resultado.sort((a, b) => {
      switch (ordenamiento) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'saldo':
          return (Number(b.saldo_actual) || 0) - (Number(a.saldo_actual) || 0);
        case 'tipo':
          return (a.tipo || '').localeCompare(b.tipo || '');
        default:
          return 0;
      }
    });

    return resultado;
  }, [cuentas, busqueda, filtroTipo, ordenamiento]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Validación en tiempo real
    const errores: {[key: string]: string} = {};
    
    if (name === 'nombre' && value.trim()) {
      if (cuentas.some(c => c.nombre.trim().toLowerCase() === value.trim().toLowerCase())) {
        errores.nombre = 'Ya existe una cuenta con este nombre';
      }
    }
    
    if (name === 'saldo' && value !== '') {
      const num = Number(value);
      if (isNaN(num)) {
        errores.saldo = 'Debe ser un número válido';
      } else if (num < 0) {
        errores.saldo = 'No puede ser negativo';
      } else if (num > 1000000) {
        errores.saldo = 'El monto es demasiado alto';
      }
    }
    
    setErroresValidacion(prev => ({...prev, ...errores, [name]: errores[name] || ''}));
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
              saldo_inicial: Number(form.saldo),
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
                saldo_inicial: Number(form.saldo),
                saldo_actual: Number(form.saldo),
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
          .then(async res => {
            console.log('Respuesta del servidor en DELETE /api/cuentas:', res.status); // Depuración
            const data = await res.json().catch(() => ({}));
            if (res.status === 409 && (data.code === 'ACCOUNT_HAS_MOVEMENTS' || data.count > 0)) {
              // Mostrar alerta para eliminar movimientos y la cuenta
              const confirmCascade = await Swal.fire({
                icon: 'warning',
                title: 'No se puede eliminar la cuenta',
                html: `La cuenta <b>${cuenta.nombre}</b> tiene <b>${data.count || 'algunos'}</b> movimientos registrados.<br/>¿Quieres eliminar <u>todos los movimientos</u> de esta cuenta para poder eliminarla?`,
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar todo',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#f44336'
              });
              if (confirmCascade.isConfirmed) {
                const cascadeRes = await fetch(`${API_BASE}/api/cuentas/${id}?cascade=true`, {
                  method: 'DELETE',
                  headers: { 'Authorization': 'Bearer ' + token }
                });
                const cascadeData = await cascadeRes.json().catch(() => ({}));
                if (cascadeRes.ok) {
                  setCuentas(prev => prev.filter(c => c.id !== id));
                  Swal.fire({ icon: 'success', title: 'Cuenta y movimientos eliminados', timer: 1400, showConfirmButton: false });
                  // Avisar a otras vistas que recarguen
                  try { window.dispatchEvent(new Event('movimientos:refresh')); } catch(e) {}
                } else {
                  Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: cascadeData.error || 'Error al eliminar en cascada.' });
                }
              }
              return;
            }
            if (!res.ok) {
              Swal.fire({ icon: 'error', title: 'Error al eliminar', text: data.error || `HTTP ${res.status}` });
              return;
            }
            // Eliminación normal
            setCuentas(prevCuentas => prevCuentas.filter(c => c.id !== id));
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
    <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700 }}>Cuentas</h1>

      {/* Tarjetas de Estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        {/* Total de Cuentas */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6c4fa1 0%, #8b6bb7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            {React.createElement(FaWallet as any, { style: { fontSize: 24 } })}
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Total de Cuentas
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)' }}>
              {estadisticas.totalCuentas}
            </div>
          </div>
        </div>

        {/* Balance Total */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #388e3c 0%, #4caf50 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            {React.createElement(FaDollarSign as any, { style: { fontSize: 24 } })}
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Balance Total
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#388e3c' }}>
              S/ {estadisticas.balanceTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Mayor Saldo */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f57c00 0%, #fb8c00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            {React.createElement(FaTrophy as any, { style: { fontSize: 24 } })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Mayor Saldo
            </div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              color: 'var(--color-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {estadisticas.mayorSaldo ? estadisticas.mayorSaldo.nombre : '-'}
            </div>
            <div style={{ fontSize: 13, color: '#f57c00', fontWeight: 600 }}>
              {estadisticas.mayorSaldo ? `S/ ${Number(estadisticas.mayorSaldo.saldo_actual).toFixed(2)}` : '-'}
            </div>
          </div>
        </div>

        {/* Distribución por Tipo */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            {React.createElement(FaChartLine as any, { style: { fontSize: 24 } })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Tipos de Cuenta
            </div>
            {Object.entries(estadisticas.distribucion).slice(0, 2).map(([tipo, cant]: [string, number]) => (
              <div key={tipo} style={{ 
                fontSize: 12, 
                color: 'var(--color-text)',
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 2
              }}>
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  marginRight: 8
                }}>{tipo}:</span>
                <span style={{ fontWeight: 600 }}>{cant}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulario de Nueva Cuenta */}
      <div className="card accounts-card" style={{ background: 'var(--color-card)', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px var(--card-shadow)' }}>
      <h2 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Agregar Nueva Cuenta</h2>
      <form onSubmit={handleSubmit} className="accounts-form" style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre de la cuenta"
              value={form.nombre}
              onChange={handleChange}
              required
              style={{ 
                width: '100%', 
                padding: '10px 36px 10px 12px', 
                borderRadius: 8, 
                border: `1px solid ${erroresValidacion.nombre ? '#d32f2f' : 'var(--color-border)'}`,
                outline: 'none',
                background: 'var(--color-bg)',
                color: 'var(--color-text)'
              }}
            />
            {form.nombre && !erroresValidacion.nombre && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#388e3c' }}>
                {React.createElement(FaCheckCircle as any, { style: { fontSize: 16 } })}
              </div>
            )}
            {erroresValidacion.nombre && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#d32f2f' }}>
                {React.createElement(FaTimesCircle as any, { style: { fontSize: 16 } })}
              </div>
            )}
            {erroresValidacion.nombre && (
              <div style={{ fontSize: 12, color: '#d32f2f', marginTop: 4 }}>
                {erroresValidacion.nombre}
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              name="saldo"
              placeholder="Saldo inicial"
              value={form.saldo}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              inputMode="decimal"
              pattern="[0-9]+([\.,][0-9]+)?"
              style={{ 
                width: '100%', 
                padding: '10px 36px 10px 12px', 
                borderRadius: 8, 
                border: `1px solid ${erroresValidacion.saldo ? '#d32f2f' : 'var(--color-border)'}`,
                outline: 'none',
                background: 'var(--color-bg)',
                color: 'var(--color-text)'
              }}
            />
            {form.saldo && !erroresValidacion.saldo && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#388e3c' }}>
                {React.createElement(FaCheckCircle as any, { style: { fontSize: 16 } })}
              </div>
            )}
            {erroresValidacion.saldo && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#d32f2f' }}>
                {React.createElement(FaTimesCircle as any, { style: { fontSize: 16 } })}
              </div>
            )}
            {erroresValidacion.saldo && (
              <div style={{ fontSize: 12, color: '#d32f2f', marginTop: 4 }}>
                {erroresValidacion.saldo}
              </div>
            )}
            {/* Preview del saldo */}
            {form.saldo && !erroresValidacion.saldo && (
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Saldo inicial: S/ {Number(form.saldo).toFixed(2)}
              </div>
            )}
          </div>
          
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            required
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            {tiposCuenta.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
          
          <button 
            type="submit" 
            disabled={Object.values(erroresValidacion).some(e => e !== '')}
            style={{ 
              background: Object.values(erroresValidacion).some(e => e !== '') ? 'rgba(108,79,161,0.5)' : '#6c4fa1', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 0', 
              fontWeight: 600, 
              cursor: Object.values(erroresValidacion).some(e => e !== '') ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {React.createElement(FaPlus as any, { style: { fontSize: 14 } })}
            Agregar
          </button>
        </div>
      </form>
      </div>

      {/* Barra de Búsqueda, Filtros y Toggle de Vista */}
      <div style={{
        background: 'var(--color-card)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        boxShadow: '0 2px 8px var(--card-shadow)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Búsqueda */}
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
              pointerEvents: 'none'
            }}>
              {React.createElement(FaSearch as any, { style: { fontSize: 14 } })}
            </div>
            <input
              type="text"
              placeholder="Buscar cuenta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="search-input-cuentas"
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 14,
                outline: 'none'
              }}
            />
          </div>

          {/* Filtro por tipo */}
          <div style={{ position: 'relative', minWidth: 160 }}>
            <div style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
              pointerEvents: 'none'
            }}>
              {React.createElement(FaFilter as any, { style: { fontSize: 14 } })}
            </div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="select-cuentas"
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              <option value="todos">Todos los tipos</option>
              {tiposCuenta.filter(t => t.value !== '').map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <div style={{ position: 'relative', minWidth: 150 }}>
            <div style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
              pointerEvents: 'none'
            }}>
              {React.createElement(FaSortAmountDown as any, { style: { fontSize: 14 } })}
            </div>
            <select
              value={ordenamiento}
              onChange={(e) => setOrdenamiento(e.target.value)}
              className="select-cuentas"
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              <option value="nombre">Ordenar por nombre</option>
              <option value="saldo">Ordenar por saldo</option>
              <option value="tipo">Ordenar por tipo</option>
            </select>
          </div>

          {/* Toggle de Vista */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setVistaActual('tabla')}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: `1px solid ${vistaActual === 'tabla' ? '#6c4fa1' : 'var(--color-border)'}`,
                background: vistaActual === 'tabla' ? '#6c4fa1' : 'transparent',
                color: vistaActual === 'tabla' ? '#fff' : 'var(--color-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              title="Vista de tabla"
            >
              {React.createElement(FaList as any, { style: { fontSize: 14 } })}
            </button>
            <button
              onClick={() => setVistaActual('tarjetas')}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: `1px solid ${vistaActual === 'tarjetas' ? '#6c4fa1' : 'var(--color-border)'}`,
                background: vistaActual === 'tarjetas' ? '#6c4fa1' : 'transparent',
                color: vistaActual === 'tarjetas' ? '#fff' : 'var(--color-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              title="Vista de tarjetas"
            >
              {React.createElement(FaTh as any, { style: { fontSize: 14 } })}
            </button>
          </div>

          {/* Contador */}
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            {cuentasFiltradas.length} de {cuentas.length}
          </div>
        </div>
      </div>

      {/* Vista de Tabla */}
      {vistaActual === 'tabla' && (
  <div className="table-responsive" style={{ background: 'var(--color-card)', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px var(--card-shadow)' }}>
  <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ background: 'var(--color-table-header-bg)' }}>
           <th style={{ textAlign: 'left', padding: 8, width: '45%' }}>Cuenta</th>
            <th style={{ textAlign: 'left', padding: 8, width: '20%' }}>Tipo</th>
            <th style={{ textAlign: 'right', padding: 8, width: '25%' }}>Monto Actual</th>
            <th style={{ textAlign: 'center', padding: 8, width: '15%', whiteSpace: 'nowrap' }}>Funciones</th>
          </tr>
        </thead>
        <tbody>
          {cuentasFiltradas.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
                {React.createElement(FaSearch as any, { style: { fontSize: 32, marginBottom: 12, opacity: 0.3 } })}
                <div>No se encontraron cuentas</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Intenta con otros términos de búsqueda o filtros
                </div>
              </td>
            </tr>
          ) : (
            cuentasFiltradas.map((cuenta) => {
              const saldo = Number(cuenta.saldo_actual) || 0;
              const saldoBajo = saldo < 20 && saldo >= 0;
              const porcentajeTotal = estadisticas.balanceTotal > 0 ? (saldo / estadisticas.balanceTotal) * 100 : 0;
              const colorTipo = getColorTipo(cuenta.tipo || '');
              
              return (
                <tr key={cuenta.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="cuenta-icon" style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: `${colorTipo}20`,
                        border: `2px solid ${colorTipo}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colorTipo
                      }}>
                        {renderIconoCuenta(cuenta.tipo || '', { fontSize: 20 })}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                          {cuenta.nombre}
                          {saldoBajo && (
                            <span style={{ marginLeft: 8 }} title="Saldo bajo">
                              {React.createElement(FaExclamationTriangle as any, { 
                                style: { fontSize: 14, color: '#f57c00' } 
                              })}
                            </span>
                          )}
                        </div>
                        {/* Barra de progreso */}
                        <div style={{
                          width: 120,
                          height: 4,
                          background: 'var(--color-border)',
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(porcentajeTotal, 100)}%`,
                            height: '100%',
                            background: colorTipo,
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: `${colorTipo}15`,
                      color: colorTipo,
                      fontSize: 13,
                      fontWeight: 500
                    }}>
                      {cuenta.tipo || '-'}
                    </span>
                  </td>
                  <td style={{ 
                    color: saldo < 0 ? '#d32f2f' : '#388e3c', 
                    fontWeight: 700, 
                    textAlign: 'right', 
                    padding: 12,
                    fontSize: 16
                  }}>
                    S/ {saldo.toFixed(2)}
                    <div style={{ 
                      fontSize: 11, 
                      color: 'var(--color-text-secondary)', 
                      fontWeight: 400,
                      marginTop: 2
                    }}>
                      {porcentajeTotal.toFixed(1)}% del total
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: 12 }}>
                    <div className="cuenta-acciones" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {/* Botón Ver Movimientos */}
                      <button 
                        onClick={() => {
                          window.location.href = `/calendario?cuenta=${cuenta.id}`;
                          // Mostrar alerta después de la redirección
                          setTimeout(() => {
                            Swal.fire({
                              icon: 'info',
                              title: 'Movimientos de la cuenta',
                              text: `Aquí podrás ver todos los movimientos de tu cuenta "${cuenta.nombre}"`,
                              confirmButtonColor: '#6c4fa1',
                              timer: 3000,
                              timerProgressBar: true
                            });
                          }, 100);
                        }}
                        title="Ver movimientos"
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          padding: 6, 
                          cursor: 'pointer', 
                          color: '#1976d2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '44px',
                          minHeight: '44px'
                        }}
                      >
                        {React.createElement(FaEye as any, { style: { fontSize: 22 } })}
                      </button>
                      
                      {/* Botón Editar */}
                      <button 
                        onClick={() => openEdit(cuenta)}
                        className="edit-btn"
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          padding: 6, 
                          cursor: 'pointer', 
                          color: '#6c4fa1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '44px',
                          minHeight: '44px'
                        }}
                        aria-label="Editar" 
                        title="Editar"
                      >
                        {React.createElement(FaEdit as any, { style: { fontSize: 22 } })}
                      </button>
                      
                      {/* Botón Eliminar */}
                      <button 
                        onClick={() => handleDelete(cuenta.id)} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          padding: 6, 
                          cursor: 'pointer', 
                          color: '#d32f2f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '44px',
                          minHeight: '44px'
                        }} 
                        aria-label="Eliminar" 
                        title="Eliminar"
                      >
                        {React.createElement(FaTrash as any, { style: { fontSize: 22 } })}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
  </table>
  </div>
      )}

      {/* Vista de Tarjetas */}
      {vistaActual === 'tarjetas' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16
        }}>
          {cuentasFiltradas.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: 60,
              background: 'var(--color-card)',
              borderRadius: 12,
              boxShadow: '0 2px 8px var(--card-shadow)',
              color: 'var(--color-text-secondary)'
            }}>
              {React.createElement(FaSearch as any, { style: { fontSize: 48, marginBottom: 16, opacity: 0.3 } })}
              <div style={{ fontSize: 16, marginBottom: 8 }}>No se encontraron cuentas</div>
              <div style={{ fontSize: 13 }}>Intenta con otros términos de búsqueda o filtros</div>
            </div>
          ) : (
            cuentasFiltradas.map((cuenta) => {
              const saldo = Number(cuenta.saldo_actual) || 0;
              const saldoBajo = saldo < 20 && saldo >= 0;
              const porcentajeTotal = estadisticas.balanceTotal > 0 ? (saldo / estadisticas.balanceTotal) * 100 : 0;
              const colorTipo = getColorTipo(cuenta.tipo || '');
              
              return (
                <div
                  key={cuenta.id}
                  style={{
                    background: 'var(--color-card)',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 2px 8px var(--card-shadow)',
                    border: saldoBajo ? '2px solid #f57c00' : '1px solid var(--color-border)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px var(--card-shadow)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--card-shadow)';
                  }}
                >
                  {/* Indicador de saldo bajo */}
                  {saldoBajo && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: '#f57c00',
                      color: '#fff',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      {React.createElement(FaExclamationTriangle as any, { style: { fontSize: 10 } })}
                      Saldo Bajo
                    </div>
                  )}
                  
                  {/* Icono y nombre */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: `${colorTipo}20`,
                      border: `2px solid ${colorTipo}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colorTipo,
                      fontSize: 28
                    }}>
                      {renderIconoCuenta(cuenta.tipo || '', { fontSize: 28 })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: 'var(--color-text)',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {cuenta.nombre}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: `${colorTipo}15`,
                        color: colorTipo,
                        fontSize: 11,
                        fontWeight: 500
                      }}>
                        {cuenta.tipo || 'Sin tipo'}
                      </span>
                    </div>
                  </div>

                  {/* Saldo */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                      Saldo Actual
                    </div>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: saldo < 0 ? '#d32f2f' : '#388e3c'
                    }}>
                      S/ {saldo.toFixed(2)}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                      fontSize: 12,
                      color: 'var(--color-text-secondary)'
                    }}>
                      <span>Participación</span>
                      <span style={{ fontWeight: 600 }}>{porcentajeTotal.toFixed(1)}%</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 8,
                      background: 'var(--color-border)',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(porcentajeTotal, 100)}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${colorTipo}, ${colorTipo}dd)`,
                        transition: 'width 0.3s',
                        borderRadius: 4
                      }} />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 12
                  }}>
                    <button
                      onClick={() => {
                        window.location.href = `/calendario?cuenta=${cuenta.id}`;
                        // Mostrar alerta después de la redirección
                        setTimeout(() => {
                          Swal.fire({
                            icon: 'info',
                            title: 'Movimientos de la cuenta',
                            text: `Aquí podrás ver todos los movimientos de tu cuenta "${cuenta.nombre}"`,
                            confirmButtonColor: '#6c4fa1',
                            timer: 3000,
                            timerProgressBar: true
                          });
                        }, 100);
                      }}
                      style={{
                        flex: 1,
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1565c0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#1976d2'}
                      title="Ver movimientos"
                    >
                      {React.createElement(FaEye as any, { style: { fontSize: 12 } })}
                      Ver
                    </button>
                    <button
                      onClick={() => openEdit(cuenta)}
                      style={{
                        background: 'transparent',
                        color: '#6c4fa1',
                        border: '1px solid #6c4fa1',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#6c4fa1';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6c4fa1';
                      }}
                      title="Editar"
                    >
                      {React.createElement(FaEdit as any, { style: { fontSize: 12 } })}
                    </button>
                    <button
                      onClick={() => handleDelete(cuenta.id)}
                      style={{
                        background: 'transparent',
                        color: '#d32f2f',
                        border: '1px solid #d32f2f',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d32f2f';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#d32f2f';
                      }}
                      title="Eliminar"
                    >
                      {React.createElement(FaTrash as any, { style: { fontSize: 12 } })}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <style>{`
        /* Responsive helpers para tablas con scroll en Cuentas */
        .accounts-card .table-responsive { max-width: 100%; overflow-x: auto; max-height: 60vh; overflow-y: auto; }
        .accounts-card table { min-width: 640px; }
        .accounts-card thead th { position: sticky; top: 0; z-index: 1; background: var(--color-table-header-bg); box-shadow: 0 1px 0 var(--color-border); }
        @media (max-width: 480px) {
          .accounts-card table { min-width: 520px; }
          .accounts-card th, .accounts-card td { padding: 6px !important; }
        }
      `}</style>
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={closeEdit}>
          <div style={{ background:'var(--color-card)', borderRadius:12, padding:20, width: 420 }} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Editar cuenta</h3>
            <form onSubmit={saveEdit} style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
              <input type="text" placeholder="Nombre" value={editData.nombre} onChange={(e)=>setEditData(s=>({...s, nombre: e.target.value}))} style={{ padding:8, borderRadius:6 }} />
              <select value={editData.tipo} onChange={(e)=>setEditData(s=>({...s, tipo: e.target.value}))} style={{ padding:8, borderRadius:6 }}>
                {tiposCuenta.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
                <button type="button" onClick={closeEdit} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--color-border)', background:'var(--color-card)', color:'var(--color-text)' }}>Cancelar</button>
                <button type="submit" style={{ padding:'8px 12px', borderRadius:8, border:'none', background:'var(--color-primary)', color:'var(--color-on-primary)', fontWeight:600 }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
