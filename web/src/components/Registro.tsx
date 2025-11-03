import React from 'react';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';
import { FaBolt, FaRedo, FaFileDownload, FaFileUpload, FaWallet, FaExclamationTriangle, FaClipboardList, FaLightbulb, FaMoneyBillWave, FaUniversity, FaAppleAlt, FaCar, FaCreditCard, FaBolt as FaLightning, FaGift, FaShoppingCart, FaHospital, FaExchangeAlt } from 'react-icons/fa';


export default function Registro() {

  const [cuentas, setCuentas] = React.useState<any[]>([]);
  const [categorias, setCategorias] = React.useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [transaccionesRecientes, setTransaccionesRecientes] = React.useState<any[]>([]);
  const [plantillas, setPlantillas] = React.useState<any[]>([]);

  const [form, setForm] = React.useState({
    tipo: 'ingreso',
    monto: '',
    categoria: '',
    fecha: '',
    descripcion: '',
    cuenta: '', // origen
    cuentaDestino: '', // solo para transferencia
    icon: 'FaMoneyBillWave',
    color: '#c62828'
  });
  const [repetir, setRepetir] = React.useState(false);
  const [repeticion, setRepeticion] = React.useState({
    frecuencia: 'mensual', // mensual, semanal, diaria
    inicio: '',
    fin: '',
    indefinido: true
  });
  // Helper para obtener la fecha local (YYYY-MM-DD) sin desfase de zona horaria
  const getToday = React.useCallback(() => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
  }, []);

  // Setear fecha por defecto al entrar a la pantalla
  React.useEffect(() => {
    setForm((prev) => ({ ...prev, fecha: getToday() }));
  }, [getToday]);

  const hasTwoAccounts = cuentas.length >= 2;


  // Cargar cuentas desde la API al montar
  React.useEffect(() => {
  fetch(`${API_BASE}/api/cuentas?plataforma=web`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setCuentas(data);
        if (data.length > 0) setForm(f => ({ ...f, cuenta: data[0].id, cuentaDestino: data[1]?.id || data[0].id }));
      })
      .catch(() => setCuentas([]));
  }, []);

  // Cargar transacciones recientes (últimas 5)
  React.useEffect(() => {
    fetch(`${API_BASE}/api/transacciones?plataforma=web`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          setTransaccionesRecientes(sorted.slice(0, 5));
          // Generar plantillas basadas en los movimientos más frecuentes
          generarPlantillas(data);
        }
      })
      .catch(() => setTransaccionesRecientes([]));
  }, []);

  // Generar plantillas rápidas basadas en historial
  const generarPlantillas = (movimientos: any[]) => {
    const frecuencia: Record<string, any> = {};
    movimientos.forEach(mov => {
      if (mov.tipo === 'transferencia') return;
      const key = `${mov.categoria_id}-${mov.descripcion}`;
      if (!frecuencia[key]) {
        frecuencia[key] = { 
          count: 0, 
          categoria_id: mov.categoria_id, 
          descripcion: mov.descripcion,
          icon: mov.icon || 'FaMoneyBillWave',
          color: mov.color || '#c62828',
          tipo: mov.tipo,
          montos: []
        };
      }
      frecuencia[key].count++;
      frecuencia[key].montos.push(parseFloat(mov.monto));
    });
    
    const topPlantillas = Object.values(frecuencia)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 4)
      .map((item: any) => ({
        ...item,
        montoPromedio: (item.montos.reduce((a: number, b: number) => a + b, 0) / item.montos.length).toFixed(2)
      }));
    
    setPlantillas(topPlantillas);
  };

  // Helper para renderizar iconos
  const renderIcon = (iconName: string, style?: any) => {
    const iconMap: Record<string, any> = {
      'FaMoneyBillWave': FaMoneyBillWave,
      'FaWallet': FaWallet,
      'FaUniversity': FaUniversity,
      'FaAppleAlt': FaAppleAlt,
      'FaCar': FaCar,
      'FaCreditCard': FaCreditCard,
      'FaLightning': FaLightning,
      'FaGift': FaGift,
      'FaShoppingCart': FaShoppingCart,
      'FaHospital': FaHospital,
      'FaExchangeAlt': FaExchangeAlt,
      '💸': FaMoneyBillWave,
      '💰': FaWallet,
      '🏦': FaUniversity,
      '🍎': FaAppleAlt,
      '🚗': FaCar,
      '💳': FaCreditCard,
      '🔌': FaLightning,
      '🎁': FaGift,
      '🛒': FaShoppingCart,
      '🏥': FaHospital,
      '🔁': FaExchangeAlt
    };
    const IconComponent = iconMap[iconName] || FaMoneyBillWave;
    return React.createElement(IconComponent as any, { style });
  };

  // Cargar categorías desde la API según el tipo
  React.useEffect(() => {
    if (form.tipo === 'transferencia') { setCategorias([]); return; }
    fetch(`${API_BASE}/api/categorias/${form.tipo}?plataforma=web`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setCategorias(data))
      .catch(() => setCategorias([]));
  }, [form.tipo]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'monto') {
      // Aceptar coma o punto y guardar con punto para evitar NaN
      const normalized = String(value).replace(',', '.');
      
      // Evaluar si es una expresión matemática simple
      if (/^[\d\s+\-*/().]+$/.test(normalized)) {
        try {
          // Intentar evaluar la expresión
          const resultado = Function('"use strict"; return (' + normalized + ')')();
          if (!isNaN(resultado) && isFinite(resultado) && resultado >= 0) {
            // Si es válido, guardar el resultado
            setForm((prev) => ({ ...prev, [name]: resultado.toString() }));
            return;
          }
        } catch (e) {
          // Si falla la evaluación, guardar el valor como está
        }
      }
      
      setForm((prev) => ({ ...prev, [name]: normalized }));
      return;
    }
    
    // Sugerencia inteligente de categoría basada en descripción
    if (name === 'descripcion' && value && form.tipo !== 'transferencia') {
      sugerirCategoria(value);
    }
    
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Sugerir categoría basada en palabras clave y historial
  const sugerirCategoria = (descripcion: string) => {
    if (!descripcion || descripcion.length < 3) return;
    
    const texto = descripcion.toLowerCase();
    
    // Buscar en historial patrones similares
    const movimientosSimilares = transaccionesRecientes.filter(tr => 
      tr.descripcion && 
      tr.descripcion.toLowerCase().includes(texto.substring(0, 5)) &&
      tr.categoria_id
    );
    
    if (movimientosSimilares.length > 0) {
      // Usar la categoría más frecuente de movimientos similares
      const frecuencia: Record<string, number> = {};
      movimientosSimilares.forEach(mov => {
        frecuencia[mov.categoria_id] = (frecuencia[mov.categoria_id] || 0) + 1;
      });
      
      const categoriaFrecuente = Object.entries(frecuencia)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0];
      
      if (categoriaFrecuente && !form.categoria) {
        setForm(prev => ({ ...prev, categoria: categoriaFrecuente }));
      }
    }
  };

  // Calcular saldo proyectado
  const calcularSaldoProyectado = React.useMemo(() => {
    const cuentaSeleccionada = cuentas.find(c => c.id === parseInt(form.cuenta));
    if (!cuentaSeleccionada || !form.monto || isNaN(Number(form.monto))) {
      return null;
    }
    
    const saldoActual = parseFloat(cuentaSeleccionada.saldo || 0);
    const monto = parseFloat(form.monto);
    let nuevoSaldo = saldoActual;

    if (form.tipo === 'ingreso') {
      nuevoSaldo = saldoActual + monto;
    } else if (form.tipo === 'egreso' || form.tipo === 'ahorro') {
      nuevoSaldo = saldoActual - monto;
    } else if (form.tipo === 'transferencia') {
      nuevoSaldo = saldoActual - monto;
    }

    return {
      saldoActual,
      nuevoSaldo,
      diferencia: nuevoSaldo - saldoActual,
      quedaNegativo: nuevoSaldo < 0
    };
  }, [cuentas, form.cuenta, form.monto, form.tipo]);

  const aplicarPlantilla = (plantilla) => {
    setForm(prev => ({
      ...prev,
      tipo: plantilla.tipo,
      categoria: plantilla.categoria_id,
      descripcion: plantilla.descripcion,
      icon: plantilla.icon,
      color: plantilla.color,
      monto: plantilla.montoPromedio
    }));
    // Scroll suave al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const duplicarUltimaTransaccion = () => {
    if (transaccionesRecientes.length === 0) return;
    
    const ultima = transaccionesRecientes[0];
    setForm(prev => ({
      ...prev,
      tipo: ultima.tipo,
      categoria: ultima.categoria_id || '',
      descripcion: ultima.descripcion || '',
      icon: ultima.icon || 'FaMoneyBillWave',
      color: ultima.color || '#c62828',
      monto: parseFloat(ultima.monto).toFixed(2),
      cuenta: ultima.cuenta_id || prev.cuenta,
      fecha: getToday() // Usar fecha de hoy
    }));
    
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    Swal.fire({
      icon: 'success',
      title: 'Transacción duplicada',
      text: 'Se han copiado los datos de la última transacción',
      showConfirmButton: false,
      timer: 1500,
      toast: true,
      position: 'top-end'
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/transacciones/plantilla`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'No se pudo descargar', text: data.error || 'Error al generar la plantilla.' });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_movimientos.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo descargar la plantilla.' });
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/transacciones/importar`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getToken() },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        Swal.fire({ icon: 'error', title: 'Importación fallida', text: data.error || 'No se pudo importar el archivo.' });
      } else {
        const errores = Array.isArray(data.errores) ? data.errores : [];
        const html = `
          <div style="text-align:left">
            <p><strong>Insertados:</strong> ${data.insertados || 0}</p>
            ${errores.length ? `<p><strong>Errores (${errores.length}):</strong></p><ul style="max-height:160px;overflow:auto">${errores.slice(0, 50).map(e => `<li>Fila ${e.fila}: ${e.error}</li>`).join('')}</ul>` : '<p>Sin errores</p>'}
          </div>
        `;
        Swal.fire({ icon: 'info', title: 'Resultado de importación', html });
        // Opcional: refrescar cuentas y categorías por si cambian saldos
        fetch(`${API_BASE}/api/cuentas`, { headers: { 'Authorization': 'Bearer ' + getToken() } })
          .then(res => res.ok ? res.json() : [])
          .then(data => setCuentas(data))
          .catch(() => {});
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar el archivo.' });
    }
    setUploadLoading(false);
    // limpiar input para poder volver a seleccionar el mismo archivo si se desea
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validaciones
    if (!form.cuenta) {
      Swal.fire({ icon: 'warning', title: 'Cuenta requerida', text: 'Selecciona una cuenta.' });
      return;
    }
    if (form.tipo !== 'transferencia') {
      if (!form.categoria) {
        Swal.fire({ icon: 'warning', title: 'Categoría requerida', text: 'Selecciona una categoría.' });
        return;
      }
    }
  if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      Swal.fire({ icon: 'error', title: 'Monto inválido', text: 'El monto debe ser mayor a 0.' });
      return;
    }
    if (!form.fecha) {
      Swal.fire({ icon: 'warning', title: 'Fecha requerida', text: 'Debes seleccionar una fecha.' });
      return;
    }
    if (form.tipo === 'transferencia') {
      if (!hasTwoAccounts) { Swal.fire({ icon: 'info', title: 'Se requiere otra cuenta', text: 'Necesitas al menos dos cuentas para realizar una transferencia.' }); return; }
      if (!form.cuentaDestino) { Swal.fire({ icon: 'warning', title: 'Cuenta destino requerida', text: 'Selecciona la cuenta destino.' }); return; }
      if (String(form.cuenta) === String(form.cuentaDestino)) { Swal.fire({ icon: 'warning', title: 'Cuentas inválidas', text: 'La cuenta origen y destino deben ser diferentes.' }); return; }
    }
    const result = await Swal.fire({
      title: form.tipo === 'transferencia' ? '¿Confirmar transferencia?' : '¿Seguro que quieres agregar este movimiento?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c4fa1',
    });
    if (result.isConfirmed) {
      try {
        const apiFetch = (await import('../utils/apiFetch')).default;
        let res;
        if (form.tipo === 'transferencia') {
          // Transferencia atómica
          res = await apiFetch(`${API_BASE}/api/transacciones/transferir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origen_id: form.cuenta,
              destino_id: form.cuentaDestino,
              monto: Number(form.monto),
              fecha: form.fecha,
              descripcion: form.descripcion
            })
          });
        } else if (repetir) {
          // Guardar como movimiento recurrente
          res = await apiFetch(`${API_BASE}/api/movimientos-recurrentes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cuenta_id: form.cuenta,
              tipo: form.tipo,
              monto: Number(form.monto),
              descripcion: form.descripcion,
              categoria_id: form.categoria,
              icon: form.icon,
              color: form.color,
              frecuencia: repeticion.frecuencia,
              inicio: repeticion.inicio || form.fecha,
              fin: repeticion.indefinido ? null : repeticion.fin,
              indefinido: repeticion.indefinido
            })
          });
        } else {
          // Guardar como movimiento normal
          const movimiento = {
            cuenta_id: form.cuenta,
            tipo: form.tipo,
            monto: Number(form.monto),
            descripcion: form.descripcion,
            fecha: form.fecha,
            categoria_id: form.categoria,
            icon: form.icon,
            color: form.color,
            repetir: repetir,
            repeticion: repetir ? repeticion : null
          };
          res = await apiFetch(`${API_BASE}/api/transacciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movimiento)
          });
        }
        if (res && res.ok) {
          Swal.fire({ icon: 'success', title: form.tipo === 'transferencia' ? 'Transferencia registrada' : 'Movimiento registrado', showConfirmButton: false, timer: 1200 });
          setForm({ tipo: 'ingreso', monto: '', categoria: '', fecha: getToday(), descripcion: '', cuenta: cuentas[0]?.id || '', cuentaDestino: cuentas[1]?.id || cuentas[0]?.id || '', icon: 'FaMoneyBillWave', color: '#c62828' });
          setRepetir(false);
          setRepeticion({ frecuencia: 'mensual', inicio: '', fin: '', indefinido: true });
          // Refrescar cuentas para mostrar el saldo actualizado (asegurar plataforma=web)
          (await import('../utils/apiFetch')).default(`${API_BASE}/api/cuentas?plataforma=web`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setCuentas(Array.isArray(data) ? data : []))
            .catch(() => setCuentas([]));
          // Refrescar transacciones recientes
          (await import('../utils/apiFetch')).default(`${API_BASE}/api/transacciones?plataforma=web`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              if (Array.isArray(data)) {
                const sorted = data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                setTransaccionesRecientes(sorted.slice(0, 5));
                generarPlantillas(data);
              }
            })
            .catch(() => {});
          // Emitir evento para que otros componentes (ej. Cuentas, Calendario) puedan refrescarse
          try {
            window.dispatchEvent(new Event('cuentas:refresh'));
            window.dispatchEvent(new Event('movimientos:refresh'));
          } catch (e) {
            // no crítico
          }
        } else {
          const data = await res.json();
          Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo registrar el movimiento.' });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo conectar con el servidor.' });
      }
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      {/* Plantillas Rápidas */}
      {plantillas.length > 0 && (
        <div style={{ 
          background: 'var(--color-card)', 
          borderRadius: 12, 
          boxShadow: '0 2px 8px var(--card-shadow)', 
          padding: 24, 
          marginBottom: 24 
        }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            {React.createElement(FaBolt as any, { style: { fontSize: 20, color: '#f59e0b' } })}
            Plantillas Rápidas
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: 12 
          }}>
            {plantillas.map((plantilla, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => aplicarPlantilla(plantilla)}
                style={{
                  background: `linear-gradient(135deg, ${plantilla.color}15, ${plantilla.color}30)`,
                  border: `2px solid ${plantilla.color}50`,
                  borderRadius: 10,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{renderIcon(plantilla.icon, { fontSize: 28 })}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                  {plantilla.descripcion}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  ~S/ {plantilla.montoPromedio}
                </div>
                <div style={{ 
                  fontSize: 10, 
                  color: 'var(--color-text-secondary)', 
                  marginTop: 6,
                  opacity: 0.7 
                }}>
                  {plantilla.count} {plantilla.count === 1 ? 'vez' : 'veces'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulario Principal */}
      <div style={{ background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 2px 8px var(--card-shadow)', padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Registro de Movimientos</h1>
          {transaccionesRecientes.length > 0 && (
            <button
              type="button"
              onClick={duplicarUltimaTransaccion}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {React.createElement(FaRedo as any, { style: { fontSize: 14 } })}
              Duplicar última
            </button>
          )}
        </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={handleDownloadTemplate} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {React.createElement(FaFileDownload as any)}
          Descargar plantilla
        </button>
        <button type="button" onClick={handleImportClick} disabled={uploadLoading} style={{ background: uploadLoading ? 'rgba(108,79,161,0.7)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {React.createElement(FaFileUpload as any)}
          {uploadLoading ? 'Importando…' : 'Importar movimientos'}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFileSelected} style={{ display: 'none' }} />
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label>Tipo:&nbsp;</label>
          <select name="tipo" value={form.tipo} onChange={handleChange} style={{ padding: 6, borderRadius: 6 }}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
            <option value="ahorro">Ahorro</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>
        <div>
          <label>{form.tipo === 'transferencia' ? 'Cuenta origen:' : 'Cuenta:'}&nbsp;</label>
          <select name="cuenta" value={form.cuenta} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }} required>
            {cuentas.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>
            ))}
          </select>
        </div>
        {form.tipo === 'transferencia' && (
          <div>
            <label>Cuenta destino:&nbsp;</label>
            <select name="cuentaDestino" value={form.cuentaDestino} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }} required disabled={!hasTwoAccounts}>
              {!hasTwoAccounts && <option value="">— Necesitas otra cuenta —</option>}
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>
              ))}
            </select>
          </div>
        )}
        {form.tipo === 'transferencia' && !hasTwoAccounts && (
          <div style={{
            marginTop: 8,
            background: '#fff3cd',
            color: '#8a6d3b',
            border: '1px solid #ffeeba',
            borderRadius: 8,
            padding: '8px 12px'
          }}>
            Necesitas al menos dos cuentas para realizar transferencias.
          </div>
        )}
        <div>
          <label>Monto:&nbsp;</label>
          <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <span style={{ marginRight: 4, fontWeight: 600 }}>S/</span>
              <input
                type="text"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                placeholder="Ej: 50+20+30"
                style={{ padding: 6, borderRadius: 6, width: '100%' }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', alignSelf: 'flex-start', paddingLeft: 26, display: 'flex', alignItems: 'center', gap: 4 }}>
              {React.createElement(FaLightbulb as any, { style: { fontSize: 12 } })}
              Puedes escribir operaciones: 50+20, 100-15, 25*4
            </div>
          </div>
        </div>
        {form.tipo !== 'transferencia' && (
          <div>
            <label>Categoría:&nbsp;</label>
            <select name="categoria" value={form.categoria} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }}>
              <option value="">Seleccione una categoría</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>
        )}
        {/* Vista Previa del Saldo */}
        {calcularSaldoProyectado && (
          <div style={{
            background: calcularSaldoProyectado.quedaNegativo ? '#ffebee' : '#e8f5e9',
            border: `2px solid ${calcularSaldoProyectado.quedaNegativo ? '#ef5350' : '#66bb6a'}`,
            borderRadius: 10,
            padding: 16,
            marginTop: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {calcularSaldoProyectado.quedaNegativo 
                ? React.createElement(FaExclamationTriangle as any, { style: { fontSize: 18, color: '#c62828' } })
                : React.createElement(FaWallet as any, { style: { fontSize: 18, color: '#2e7d32' } })
              }
              <span style={{ fontWeight: 600, fontSize: 14, color: calcularSaldoProyectado.quedaNegativo ? '#c62828' : '#2e7d32' }}>
                Vista Previa del Saldo
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#424242', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Saldo actual:</span>
                <span style={{ fontWeight: 600 }}>S/ {calcularSaldoProyectado.saldoActual.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Movimiento:</span>
                <span style={{ fontWeight: 600, color: calcularSaldoProyectado.diferencia < 0 ? '#d32f2f' : '#388e3c' }}>
                  {calcularSaldoProyectado.diferencia > 0 ? '+' : ''}S/ {calcularSaldoProyectado.diferencia.toFixed(2)}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: 8, 
                borderTop: '1px solid #00000020',
                fontWeight: 700,
                fontSize: 15
              }}>
                <span>Nuevo saldo:</span>
                <span style={{ color: calcularSaldoProyectado.quedaNegativo ? '#c62828' : '#2e7d32' }}>
                  S/ {calcularSaldoProyectado.nuevoSaldo.toFixed(2)}
                </span>
              </div>
            </div>
            {calcularSaldoProyectado.quedaNegativo && (
              <div style={{ 
                marginTop: 12, 
                fontSize: 12, 
                color: '#c62828',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                {React.createElement(FaExclamationTriangle as any)}
                Advertencia: Tu saldo quedará en negativo
              </div>
            )}
          </div>
        )}
        {form.tipo !== 'transferencia' ? (
          <div>
            <label>Icono:&nbsp;</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select name="icon" value={form.icon} onChange={handleChange} style={{ padding: 6, borderRadius: 6 }}>
                <option value="FaMoneyBillWave">💸 Dinero</option>
                <option value="FaWallet">💰 Billetera</option>
                <option value="FaUniversity">🏦 Banco</option>
                <option value="FaAppleAlt">🍎 Comida</option>
                <option value="FaCar">🚗 Transporte</option>
                <option value="FaCreditCard">💳 Tarjeta</option>
                <option value="FaLightning">🔌 Servicios</option>
                <option value="FaGift">🎁 Regalo</option>
                <option value="FaShoppingCart">🛒 Compras</option>
                <option value="FaHospital">🏥 Salud</option>
              </select>
              <input type="color" name="color" value={form.color} onChange={handleChange} style={{ width: 48, height: 36, padding: 0, border: 'none', background: 'transparent' }} />
            </div>
          </div>
        ) : (
          <div>
            <label>Icono:&nbsp;</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {renderIcon('FaExchangeAlt', { fontSize: 24 })}
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>(se asigna automáticamente)</span>
            </div>
          </div>
        )}
        <div>
          <label>Fecha:&nbsp;</label>
          <input type="date" name="fecha" value={form.fecha} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }} />
        </div>
        <div>
          <label>Descripción:&nbsp;</label>
          <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }} />
        </div>
        {form.tipo !== 'transferencia' && (
          <div>
            <label>
              <input type="checkbox" checked={repetir} onChange={e => setRepetir(e.target.checked)} /> ¿Repetir este movimiento?
            </label>
          </div>
        )}
        {form.tipo !== 'transferencia' && repetir && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <label>Frecuencia:&nbsp;
              <select value={repeticion.frecuencia} onChange={e => setRepeticion(r => ({ ...r, frecuencia: e.target.value }))} style={{ padding: 6, borderRadius: 6 }}>
                <option value="mensual">Mensual</option>
                <option value="semanal">Semanal</option>
                <option value="diaria">Diaria</option>
              </select>
            </label>
            <label>Fecha de inicio:&nbsp;
              <input type="date" value={repeticion.inicio} onChange={e => setRepeticion(r => ({ ...r, inicio: e.target.value }))} style={{ padding: 6, borderRadius: 6 }} />
            </label>
            <label>
              <input type="checkbox" checked={repeticion.indefinido} onChange={e => setRepeticion(r => ({ ...r, indefinido: e.target.checked, fin: '' }))} /> Repetir indefinidamente
            </label>
            {!repeticion.indefinido && (
              <label>Fecha de fin:&nbsp;
                <input type="date" value={repeticion.fin} onChange={e => setRepeticion(r => ({ ...r, fin: e.target.value }))} style={{ padding: 6, borderRadius: 6 }} />
              </label>
            )}
          </div>
        )}
        <button type="submit" disabled={form.tipo === 'transferencia' && !hasTwoAccounts} style={{ background: (form.tipo === 'transferencia' && !hasTwoAccounts) ? 'rgba(108,79,161,0.5)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, marginTop: 8, cursor: (form.tipo === 'transferencia' && !hasTwoAccounts) ? 'not-allowed' : 'pointer' }}>
          {form.tipo === 'transferencia' ? 'Guardar Transferencia' : 'Guardar Movimiento'}
        </button>
      </form>
      </div>

      {/* Transacciones Recientes */}
      {transaccionesRecientes.length > 0 && (
        <div style={{ 
          background: 'var(--color-card)', 
          borderRadius: 12, 
          boxShadow: '0 2px 8px var(--card-shadow)', 
          padding: 24, 
          marginTop: 24 
        }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            {React.createElement(FaClipboardList as any, { style: { fontSize: 20, color: '#6c4fa1' } })}
            Transacciones Recientes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {transaccionesRecientes.map((tr) => {
              const esEgreso = tr.tipo === 'egreso' || tr.tipo === 'ahorro';
              const esTransferencia = tr.tipo === 'transferencia';
              return (
                <div
                  key={tr.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    background: 'var(--color-bg)',
                    borderRadius: 10,
                    border: '1px solid var(--color-border)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: tr.color ? `${tr.color}20` : '#6c4fa120',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        border: `2px solid ${tr.color || '#6c4fa1'}40`
                      }}
                    >
                      {renderIcon(tr.icon || 'FaMoneyBillWave', { fontSize: 22, color: tr.color || '#6c4fa1' })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: 14, 
                        color: 'var(--color-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {tr.descripcion || 'Sin descripción'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {new Date(tr.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {esTransferencia && ' • Transferencia'}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: esEgreso ? '#d32f2f' : esTransferencia ? '#1976d2' : '#388e3c',
                      whiteSpace: 'nowrap',
                      marginLeft: 12
                    }}
                  >
                    {esEgreso ? '-' : esTransferencia ? '' : '+'}S/ {parseFloat(tr.monto).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
