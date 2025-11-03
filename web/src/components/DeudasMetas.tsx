import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';
import { 
  EstadisticasMiniCards, 
  ProgressBar, 
  CircularProgress 
} from './shared';
import { FaMoneyBillWave, FaBullseye, FaSearch, FaFilter, FaSortAmountDown } from 'react-icons/fa';

export default function DeudasMetas() {
  const [pago, setPago] = useState([]);
  const [tab, setTab] = useState('deudas');
  const [deudas, setDeudas] = useState([]);
  const [metas, setMetas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [nueva, setNueva] = useState({ descripcion: '', monto: '', tipo: 'deuda', fecha_inicio: '', fecha_vencimiento: '' });
  
  // Nuevos estados para filtros y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendientes' | 'completadas'>('todas');
  const [ordenamiento, setOrdenamiento] = useState<'fecha' | 'monto' | 'progreso'>('fecha');

  // Cargar deudas y metas al iniciar
  useEffect(() => {
    // Cargar cuentas para poder seleccionar desde qué cuenta pagar/aportar
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cuentas?plataforma=web`, { headers: { 'Authorization': 'Bearer ' + getToken() } });
        const data = await res.json();
        setCuentas(Array.isArray(data) ? data : []);
      } catch {}
    })();

    fetch(`${API_BASE}/api/deudas?plataforma=web`, { // Agregado parámetro en query string
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
      credentials: 'include'
    })
      .then(r => r.json())
      .then(data => setDeudas(Array.isArray(data) ? data : []));

    fetch(`${API_BASE}/api/metas?plataforma=web`, { // Agregado parámetro en query string
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
      credentials: 'include'
    })
      .then(r => r.json())
      .then(data => setMetas(Array.isArray(data) ? data : []));
  }, []);

  // Calcular estadísticas de deudas
  const estadisticasDeudas = useMemo(() => {
    const total = deudas.reduce((sum, d) => sum + Number(d.monto ?? d.monto_total ?? 0), 0);
    const pagado = deudas.reduce((sum, d) => sum + Number(d.pagado ?? d.monto_pagado ?? 0), 0);
    const pendiente = total - pagado;
    const completadas = deudas.filter(d => {
      const t = Number(d.monto ?? d.monto_total ?? 0);
      const p = Number(d.pagado ?? d.monto_pagado ?? 0);
      return (t - p) <= 0;
    }).length;
    
    return [
      { label: 'Total Deudas', valor: total, formato: 'moneda' as const, color: '#f44336', icono: '💳' },
      { label: 'Pagado', valor: pagado, formato: 'moneda' as const, color: '#4caf50', icono: '✅' },
      { label: 'Pendiente', valor: pendiente, formato: 'moneda' as const, color: '#ff9800', icono: '⏳' },
      { label: 'Completadas', valor: completadas, formato: 'numero' as const, color: '#2196f3', icono: '🎯' }
    ];
  }, [deudas]);

  // Calcular estadísticas de metas
  const estadisticasMetas = useMemo(() => {
    const objetivo = metas.reduce((sum, m) => sum + Number(m.monto_objetivo ?? 0), 0);
    const ahorrado = metas.reduce((sum, m) => sum + Number(m.monto_ahorrado ?? 0), 0);
    const falta = objetivo - ahorrado;
    const completadas = metas.filter(m => {
      const obj = Number(m.monto_objetivo ?? 0);
      const aho = Number(m.monto_ahorrado ?? 0);
      return (obj - aho) <= 0;
    }).length;
    
    return [
      { label: 'Objetivo Total', valor: objetivo, formato: 'moneda' as const, color: '#2196f3', icono: '🎯' },
      { label: 'Ahorrado', valor: ahorrado, formato: 'moneda' as const, color: '#4caf50', icono: '💰' },
      { label: 'Por Ahorrar', valor: falta, formato: 'moneda' as const, color: '#ff9800', icono: '📈' },
      { label: 'Completadas', valor: completadas, formato: 'numero' as const, color: '#8bc34a', icono: '✨' }
    ];
  }, [metas]);

  // Filtrar y ordenar deudas
  const deudasFiltradas = useMemo(() => {
    let resultado = [...deudas];
    
    // Aplicar búsqueda
    if (busqueda) {
      resultado = resultado.filter(d => 
        d.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    
    // Aplicar filtro de estado
    if (filtroEstado !== 'todas') {
      resultado = resultado.filter(d => {
        const total = Number(d.monto ?? d.monto_total ?? 0);
        const pagado = Number(d.pagado ?? d.monto_pagado ?? 0);
        const completada = (total - pagado) <= 0;
        return filtroEstado === 'completadas' ? completada : !completada;
      });
    }
    
    // Aplicar ordenamiento
    resultado.sort((a, b) => {
      if (ordenamiento === 'monto') {
        const montoA = Number(a.monto ?? a.monto_total ?? 0);
        const montoB = Number(b.monto ?? b.monto_total ?? 0);
        return montoB - montoA;
      } else if (ordenamiento === 'progreso') {
        const progA = Number(a.pagado ?? a.monto_pagado ?? 0) / Number(a.monto ?? a.monto_total ?? 1);
        const progB = Number(b.pagado ?? b.monto_pagado ?? 0) / Number(b.monto ?? b.monto_total ?? 1);
        return progB - progA;
      } else {
        const fechaA = new Date(a.fecha_vencimiento || a.fecha_inicio || 0).getTime();
        const fechaB = new Date(b.fecha_vencimiento || b.fecha_inicio || 0).getTime();
        return fechaB - fechaA;
      }
    });
    
    return resultado;
  }, [deudas, busqueda, filtroEstado, ordenamiento]);

  // Filtrar y ordenar metas
  const metasFiltradas = useMemo(() => {
    let resultado = [...metas];
    
    // Aplicar búsqueda
    if (busqueda) {
      resultado = resultado.filter(m => 
        m.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    
    // Aplicar filtro de estado
    if (filtroEstado !== 'todas') {
      resultado = resultado.filter(m => {
        const objetivo = Number(m.monto_objetivo ?? 0);
        const ahorrado = Number(m.monto_ahorrado ?? 0);
        const completada = (objetivo - ahorrado) <= 0;
        return filtroEstado === 'completadas' ? completada : !completada;
      });
    }
    
    // Aplicar ordenamiento
    resultado.sort((a, b) => {
      if (ordenamiento === 'monto') {
        const montoA = Number(a.monto_objetivo ?? 0);
        const montoB = Number(b.monto_objetivo ?? 0);
        return montoB - montoA;
      } else if (ordenamiento === 'progreso') {
        const progA = Number(a.monto_ahorrado ?? 0) / Number(a.monto_objetivo ?? 1);
        const progB = Number(b.monto_ahorrado ?? 0) / Number(b.monto_objetivo ?? 1);
        return progB - progA;
      } else {
        const fechaA = new Date(a.fecha_objetivo || a.fecha_inicio || 0).getTime();
        const fechaB = new Date(b.fecha_objetivo || b.fecha_inicio || 0).getTime();
        return fechaB - fechaA;
      }
    });
    
    return resultado;
  }, [metas, busqueda, filtroEstado, ordenamiento]);

  const handleAdd = async () => {
    if (!nueva.descripcion || !nueva.monto) return;
    try {
      if (nueva.tipo === 'deuda') {
        const respDeuda = await fetch(`${API_BASE}/api/deudas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
          credentials: 'include',
          body: JSON.stringify({
            descripcion: nueva.descripcion,
            monto_total: Number(nueva.monto),
            monto_pagado: 0,
            pagada: false,
            fecha_inicio: nueva.fecha_inicio || null,
            fecha_vencimiento: nueva.fecha_vencimiento || null,
            plataforma: 'web'
          })
        });
        const dataDeuda = await respDeuda.json();
        if (respDeuda.ok && dataDeuda.success) {
          Swal.fire({ icon: 'success', title: '¡Éxito!', text: dataDeuda.message || 'Deuda agregada correctamente' });
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: dataDeuda.error || 'Error al agregar deuda' });
        }
        // Recargar lista de deudas
        const respDeudas = await fetch(`${API_BASE}/api/deudas?plataforma=web`, { // Agregado parámetro en query string
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
          credentials: 'include'
        });
        const dataDeudas = await respDeudas.json();
        setDeudas(Array.isArray(dataDeudas) ? dataDeudas : []);
      } else {
        const respMeta = await fetch(`${API_BASE}/api/metas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
          credentials: 'include',
          body: JSON.stringify({
            descripcion: nueva.descripcion,
            monto_objetivo: Number(nueva.monto),
            monto_ahorrado: 0,
            cumplida: false,
            plataforma: 'web',
            fecha_inicio: nueva.fecha_inicio || null,
            fecha_objetivo: nueva.fecha_vencimiento || null,
          })
        });
        const dataMeta = await respMeta.json();
        if (respMeta.ok && dataMeta.success) {
          Swal.fire({ icon: 'success', title: '¡Éxito!', text: dataMeta.message || 'Meta agregada correctamente' });
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: dataMeta.error || 'Error al agregar meta' });
        }
        const respMetas = await fetch(`${API_BASE}/api/metas?plataforma=web`, { // Agregado parámetro en query string
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
          credentials: 'include'
        });
        const dataMetas = await respMetas.json();
        setMetas(Array.isArray(dataMetas) ? dataMetas : []);
      }
      setNueva({ descripcion: '', monto: '', tipo: 'deuda', fecha_inicio: '', fecha_vencimiento: '' });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error de red o servidor' });
    }
  };

  const handlePago = async (id, tipo, monto) => {
    try {
      // Elegir cuenta desde la cual descontar
      const cuentasOptions = (cuentas || []).map(c => `<option value="${c.id}">${c.nombre} (S/ ${(Number(c.saldo_actual)||0).toLocaleString()})</option>`).join('');
      const { value: seleccion } = await Swal.fire({
        title: 'Selecciona la cuenta',
        html: `<select id="swal-cuenta" class="swal2-select">${cuentasOptions}</select>`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
          const val = (document.getElementById('swal-cuenta') as HTMLSelectElement)?.value;
          if (!val) { Swal.showValidationMessage('Debes seleccionar una cuenta'); return false; }
          return { cuenta_id: Number(val) };
        }
      });
      if (!seleccion) return;

      // Confirmar monto a pagar/aportar antes de continuar (con detalle y restante)
      const cuentaSel = (cuentas || []).find((c:any) => Number(c.id) === Number(seleccion.cuenta_id));
      const cuentaNombre = cuentaSel?.nombre || 'cuenta seleccionada';
      const accion = tipo === 'deuda' ? 'pagar' : 'aportar';

      const item: any = (tipo === 'deuda')
        ? (deudas as any[]).find((d:any) => Number(d.id) === Number(id))
        : (metas as any[]).find((m:any) => Number(m.id) === Number(id));
      const fmt = (n:any) => `S/ ${Number(n || 0).toFixed(2)}`;
      let detalleHTML = '';
      if (tipo === 'deuda' && item) {
        const total = Number(item.monto ?? item.monto_total ?? 0);
        const pagado = Number(item.pagado ?? item.monto_pagado ?? 0);
        const restanteActual = Math.max(total - pagado, 0);
        const restanteDespues = Math.max(restanteActual - Number(monto || 0), 0);
        detalleHTML = `Descripción: <b>${item.descripcion || ''}</b><br/>
          Total: <b>${fmt(total)}</b> · Pagado: <b>${fmt(pagado)}</b><br/>
          Restante actual: <b>${fmt(restanteActual)}</b><br/>
          Restante después: <b>${fmt(restanteDespues)}</b>`;
      } else if (tipo === 'meta' && item) {
        const objetivo = Number(item.monto_objetivo ?? 0);
        const ahorrado = Number(item.monto_ahorrado ?? item.pagado ?? 0);
        const faltaActual = Math.max(objetivo - ahorrado, 0);
        const faltaDespues = Math.max(faltaActual - Number(monto || 0), 0);
        detalleHTML = `Descripción: <b>${item.descripcion || ''}</b><br/>
          Objetivo: <b>${fmt(objetivo)}</b> · Ahorrado: <b>${fmt(ahorrado)}</b><br/>
          Falta actualmente: <b>${fmt(faltaActual)}</b><br/>
          Faltará después: <b>${fmt(faltaDespues)}</b>`;
      }

      const confirm = await Swal.fire({
        title: `¿Confirmar ${accion}?`,
        html: `Vas a <b>${accion}</b> <b>${fmt(monto)}</b> desde <b>${cuentaNombre}</b>.<br/><br/>${detalleHTML}<br/><br/>¿Estás seguro que ese es el monto correspondiente?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, confirmar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirm.isConfirmed) return;

      console.log('Datos enviados a handlePago:', { id, tipo, monto }); // Log para depuración
      const url = tipo === 'deuda' ? `${API_BASE}/api/deudas/pago` : `${API_BASE}/api/metas/aporte`;
      const fecha = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
      // Construir body según tipo: deuda -> deuda_id, meta -> meta_id
      const body = {
        monto: Number(monto),
        fecha,
        plataforma: 'web'
      };
  if (tipo === 'deuda') (body as any).deuda_id = id;
  else (body as any).meta_id = id;

      console.log('Payload handlePago:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Registrar también un movimiento para restar el saldo de la cuenta
        try {
          const apiFetch = (await import('../utils/apiFetch')).default;
          const itemDesc = (item && (item as any).descripcion) ? String((item as any).descripcion) : '';
          const descripcion = tipo === 'deuda'
            ? `Pago deuda: ${itemDesc || '#' + id} [DEUDA#${id}]`
            : `Aporte a meta: ${itemDesc || '#' + id} [META#${id}]`;
          await apiFetch(`${API_BASE}/api/transacciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cuenta_id: seleccion.cuenta_id,
              tipo: 'egreso',
              monto: Number(monto),
              descripcion,
              fecha,
              categoria_id: null
            })
          });
        } catch (e) {
          // Si falla el movimiento, igual se registró el pago; informamos suavemente
          console.warn('No se pudo registrar el movimiento para el pago/aporte:', e);
        }

        Swal.fire({ icon: 'success', title: '¡Éxito!', text: data.message || (tipo === 'deuda' ? 'Pago registrado y descontado de la cuenta' : 'Aporte registrado y descontado de la cuenta') });
        // Recargar listas después del pago
        if (tipo === 'deuda') {
          const respDeudas = await fetch(`${API_BASE}/api/deudas?plataforma=web`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
            credentials: 'include',
          });
          const dataDeudas = await respDeudas.json();
          setDeudas(Array.isArray(dataDeudas) ? dataDeudas : []);
        } else {
          const respMetas = await fetch(`${API_BASE}/api/metas?plataforma=web`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
            credentials: 'include',
          });
          const dataMetas = await respMetas.json();
          setMetas(Array.isArray(dataMetas) ? dataMetas : []);
        }
        // Refrescar saldos de cuentas en otras vistas
        try { window.dispatchEvent(new Event('cuentas:refresh')); } catch {}
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'Error al registrar el pago' });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Error de red o servidor' });
    }
  };

  const handleEdit = async (id, tipo) => {
    try {
      const item = tipo === 'deuda' ? deudas.find(d => d.id === id) : metas.find(m => m.id === id);
      if (!item) {
        Swal.fire('Error', 'Elemento no encontrado', 'error');
        return;
      }

      const fmtDate = (v) => {
        if (!v) return '';
        try {
          const d = new Date(v);
          if (isNaN(d.getTime())) {
            // Si ya viene como YYYY-MM-DD o cadena similar, tomar primeros 10
            return String(v).slice(0, 10);
          }
          return d.toISOString().slice(0, 10);
        } catch {
          return '';
        }
      };
      const vDescripcion = item.descripcion || '';
      const vMonto = tipo === 'deuda' ? (item.monto_total ?? '') : (item.monto_objetivo ?? '');
      const vFechaInicio = fmtDate(item.fecha_inicio);
      const vFechaFin = tipo === 'deuda' ? fmtDate(item.fecha_vencimiento) : fmtDate(item.fecha_objetivo);

      const { value: formValues } = await Swal.fire({
        title: `Editar ${tipo === 'deuda' ? 'Deuda' : 'Meta'}`,
        html:
          `<input id="swal-descripcion" class="swal2-input" placeholder="Descripción" value="${vDescripcion}" />` +
          `<input id="swal-monto" type="number" step="0.01" class="swal2-input" placeholder="Monto" value="${vMonto}" />` +
          `<input id="swal-fecha-inicio" type="date" class="swal2-input" value="${vFechaInicio}" />` +
          `<input id="swal-fecha-vencimiento" type="date" class="swal2-input" value="${vFechaFin}" />`,
        focusConfirm: false,
        preConfirm: () => {
          return {
            descripcion: (document.getElementById('swal-descripcion') as HTMLInputElement).value,
            monto: (document.getElementById('swal-monto') as HTMLInputElement).value,
            fecha_inicio: (document.getElementById('swal-fecha-inicio') as HTMLInputElement).value,
            fecha_vencimiento: (document.getElementById('swal-fecha-vencimiento') as HTMLInputElement).value,
          };
        }
      });

      if (formValues) {
  const url = tipo === 'deuda' ? `${API_BASE}/api/deudas/${id}` : `${API_BASE}/api/metas/${id}`;
        const body = {
          descripcion: formValues.descripcion,
          monto_total: tipo === 'deuda' ? Number(formValues.monto) : undefined,
          monto_objetivo: tipo === 'meta' ? Number(formValues.monto) : undefined,
          fecha_inicio: formValues.fecha_inicio || null,
          fecha_vencimiento: tipo === 'deuda' ? formValues.fecha_vencimiento || null : undefined,
          fecha_objetivo: tipo === 'meta' ? formValues.fecha_vencimiento || null : undefined,
        };

        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          Swal.fire('Éxito', data.message || 'Elemento actualizado correctamente', 'success');
          // Recargar listas
          if (tipo === 'deuda') {
            const respDeudas = await fetch(`${API_BASE}/api/deudas?plataforma=web`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
              credentials: 'include',
            });
            const dataDeudas = await respDeudas.json();
            setDeudas(Array.isArray(dataDeudas) ? dataDeudas : []);
          } else {
            const respMetas = await fetch(`${API_BASE}/api/metas?plataforma=web`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
              credentials: 'include',
            });
            const dataMetas = await respMetas.json();
            setMetas(Array.isArray(dataMetas) ? dataMetas : []);
          }
        } else {
          Swal.fire('Error', data.error || 'Error al actualizar el elemento', 'error');
        }
      }
    } catch (e) {
      Swal.fire('Error', 'Error de red o servidor', 'error');
    }
  };

  const handleDelete = async (id, tipo) => {
    // Obtener descripción del elemento para mostrar en la confirmación
    let item;
    if (tipo === 'deuda') item = deudas.find(d => d.id === id);
    else item = metas.find(m => m.id === id);
    const nombreTipo = tipo === 'deuda' ? 'deuda' : 'meta';
    const titulo = item && item.descripcion ? `¿Deseas eliminar la ${nombreTipo} "${item.descripcion}"?` : `¿Deseas eliminar la ${nombreTipo}?`;
    const confirm = await Swal.fire({
      title: titulo,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e53935'
    });

    if (!confirm.isConfirmed) return;

    try {
      const url = tipo === 'deuda' ? `${API_BASE}/api/deudas/${id}` : `${API_BASE}/api/metas/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        Swal.fire('Éxito', data.message || 'Elemento eliminado correctamente', 'success');
        // Recargar listas
        if (tipo === 'deuda') {
          const respDeudas = await fetch(`${API_BASE}/api/deudas?plataforma=web`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
            credentials: 'include',
          });
          const dataDeudas = await respDeudas.json();
          setDeudas(Array.isArray(dataDeudas) ? dataDeudas : []);
        } else {
          const respMetas = await fetch(`${API_BASE}/api/metas?plataforma=web`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
            credentials: 'include',
          });
          const dataMetas = await respMetas.json();
          setMetas(Array.isArray(dataMetas) ? dataMetas : []);
        }
      } else {
        Swal.fire('Error', data.error || 'Error al eliminar el elemento', 'error');
      }
    } catch (e) {
      Swal.fire('Error', 'Error de red o servidor', 'error');
    }
  };

  return (
    <div className="card debts-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="debts-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {tab === 'deudas' ? <FaMoneyBillWave /> : <FaBullseye />}
          Deudas y Metas
        </h1>
        <div className="debts-tabs" style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => setTab('deudas')} 
            style={{ 
              background: tab === 'deudas' ? 'linear-gradient(135deg, #f44336 0%, #e53935 100%)' : 'var(--color-secondary)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 10, 
              padding: '10px 20px', 
              fontWeight: 700,
              boxShadow: tab === 'deudas' ? '0 4px 12px rgba(244, 67, 54, 0.3)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            💳 Deudas
          </button>
          <button 
            onClick={() => setTab('metas')} 
            style={{ 
              background: tab === 'metas' ? 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)' : 'var(--color-secondary)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 10, 
              padding: '10px 20px', 
              fontWeight: 700,
              boxShadow: tab === 'metas' ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            🎯 Metas
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <EstadisticasMiniCards 
        estadisticas={tab === 'deudas' ? estadisticasDeudas : estadisticasMetas} 
      />

      {/* Barra de herramientas: Búsqueda, Filtros y Ordenamiento */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginBottom: 20, 
        flexWrap: 'wrap',
        padding: '16px',
        background: 'var(--color-card)',
        borderRadius: 12,
        border: '1px solid var(--color-input-border)'
      }}>
        {/* Búsqueda */}
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <FaSearch style={{ 
            position: 'absolute', 
            left: 12, 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--color-muted)',
            fontSize: 14
          }} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ 
              width: '100%',
              padding: '10px 12px 10px 36px', 
              borderRadius: 8, 
              border: '1px solid var(--color-input-border)', 
              background: 'var(--color-input-bg)', 
              color: 'var(--color-text)',
              fontSize: 14
            }} 
          />
        </div>

        {/* Filtro de estado */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaFilter style={{ color: 'var(--color-muted)', fontSize: 14 }} />
          <select 
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value as any)}
            style={{ 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--color-input-border)', 
              background: 'var(--color-input-bg)', 
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            <option value="todas">Todas</option>
            <option value="pendientes">Pendientes</option>
            <option value="completadas">Completadas</option>
          </select>
        </div>

        {/* Ordenamiento */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaSortAmountDown style={{ color: 'var(--color-muted)', fontSize: 14 }} />
          <select 
            value={ordenamiento}
            onChange={e => setOrdenamiento(e.target.value as any)}
            style={{ 
              padding: '10px 12px', 
              borderRadius: 8, 
              border: '1px solid var(--color-input-border)', 
              background: 'var(--color-input-bg)', 
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            <option value="fecha">Por Fecha</option>
            <option value="monto">Por Monto</option>
            <option value="progreso">Por Progreso</option>
          </select>
        </div>
      </div>

      {/* Formulario de nueva deuda/meta */}
      <div className="debts-form" style={{
        marginBottom: 24,
        padding: 20,
        background: 'var(--color-card)',
        borderRadius: 12,
        border: '2px dashed var(--color-input-border)'
      }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
          ➕ Agregar Nueva {nueva.tipo === 'deuda' ? 'Deuda' : 'Meta'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <input type="text" placeholder="Descripción" value={nueva.descripcion} onChange={e => setNueva({ ...nueva, descripcion: e.target.value })} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14 }} />
          <input type="number" placeholder="Monto" value={nueva.monto} onChange={e => setNueva({ ...nueva, monto: e.target.value })} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14 }} />
        <div>
          <label htmlFor="fecha_inicio" style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4, display: 'block' }}>Fecha inicio</label>
          <input id="fecha_inicio" type="date" value={nueva.fecha_inicio} onChange={e => setNueva({ ...nueva, fecha_inicio: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14 }} />
        </div>
        {nueva.tipo === 'meta' && (
          <div>
            <label htmlFor="fecha_objetivo" style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4, display: 'block' }}>Fecha objetivo</label>
            <input id="fecha_objetivo" type="date" value={nueva.fecha_vencimiento} onChange={e => setNueva({ ...nueva, fecha_vencimiento: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14 }} />
          </div>
        )}
        {nueva.tipo === 'deuda' && (
          <div>
            <label htmlFor="fecha_vencimiento" style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4, display: 'block' }}>Fecha vencimiento</label>
            <input id="fecha_vencimiento" type="date" value={nueva.fecha_vencimiento} onChange={e => setNueva({ ...nueva, fecha_vencimiento: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14 }} />
          </div>
        )}
        <select value={nueva.tipo} onChange={e => setNueva({ ...nueva, tipo: e.target.value })} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-input-border)', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', fontWeight: 600, fontSize: 14 }}>
          <option value="deuda">💳 Deuda</option>
          <option value="meta">🎯 Meta</option>
        </select>
        <button onClick={handleAdd} style={{ backgroundColor: 'var(--color-success)', color: 'white', padding: '10px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'transform 0.2s ease', boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          ✨ Agregar
        </button>
        </div>
      </div>
      {tab === 'deudas' ? (
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
            💳 Mis Deudas
            <span style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              padding: '4px 12px', 
              borderRadius: 12, 
              background: 'rgba(244, 67, 54, 0.1)', 
              color: '#f44336' 
            }}>
              {deudasFiltradas.length}
            </span>
          </h2>
          {deudasFiltradas.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: 60, 
              color: 'var(--color-muted)',
              background: 'var(--color-card)',
              borderRadius: 12,
              border: '2px dashed var(--color-input-border)'
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {busqueda || filtroEstado !== 'todas' 
                  ? 'No se encontraron deudas con los filtros aplicados' 
                  : 'No tienes deudas registradas'}
              </div>
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 16 }}>
            {deudasFiltradas.map(d => {
              const total = Number(d.monto ?? d.monto_total ?? 0);
              const pagado = Number(d.pagado ?? d.monto_pagado ?? 0);
              const pendiente = Math.max(total - pagado, 0);
              const porcentaje = total > 0 ? (pagado / total) * 100 : 0;
              const completada = pendiente <= 0;

              return (
                <li key={d.id} style={{
                  background: completada 
                    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(56, 142, 60, 0.05) 100%)'
                    : 'var(--color-card)',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 2px 8px var(--card-shadow)',
                  border: completada 
                    ? '2px solid #4caf50' 
                    : '1px solid var(--color-input-border)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Badge de completada */}
                  {completada && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(76, 175, 80, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ✅ Completada
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ 
                      fontSize: 18, 
                      fontWeight: 700, 
                      marginBottom: 8, 
                      color: 'var(--color-text)',
                      paddingRight: completada ? 120 : 0
                    }}>
                      {d.descripcion}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      gap: 20, 
                      fontSize: 14, 
                      color: 'var(--color-muted)',
                      flexWrap: 'wrap'
                    }}>
                      <span><strong>Total:</strong> S/ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span style={{ color: '#4caf50' }}><strong>Pagado:</strong> S/ {pagado.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span style={{ color: '#f44336' }}><strong>Pendiente:</strong> S/ {pendiente.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {(d.fecha_inicio || d.fecha_vencimiento) && (
                      <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 6 }}>
                        {d.fecha_inicio && <span>📅 Inicio: {new Date(d.fecha_inicio).toLocaleDateString()} </span>}
                        {d.fecha_vencimiento && <span>⏰ Vence: {new Date(d.fecha_vencimiento).toLocaleDateString()}</span>}
                      </div>
                    )}
                  </div>

                  {/* Barra de progreso */}
                  <div style={{ marginBottom: 16 }}>
                    <ProgressBar
                      current={pagado}
                      total={total}
                      height={28}
                      showPercentage={true}
                      label="Progreso de pago"
                      showLabel={true}
                    />
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {!completada && (
                      <>
                        <input 
                          type="number" 
                          step="0.01" 
                          min={0.01} 
                          max={pendiente} 
                          placeholder="Monto a pagar" 
                          id={`pago-deuda-${d.id}`}
                          style={{ 
                            flex: '1 1 150px',
                            padding: '10px 12px', 
                            borderRadius: 8, 
                            border: '1px solid var(--color-input-border)', 
                            background: 'var(--color-input-bg)', 
                            color: 'var(--color-text)',
                            fontSize: 14
                          }} 
                        />
                        <button
                          onClick={() => {
                            const val = (document.getElementById(`pago-deuda-${d.id}`) as HTMLInputElement).value;
                            const montoPago = Number(val);
                            if (!val || isNaN(montoPago) || montoPago <= 0) {
                              Swal.fire('Error', 'Ingrese un monto válido', 'error');
                              return;
                            }
                            if (pagado + montoPago > total) {
                              Swal.fire('Advertencia', 'El pago excede el monto de la deuda', 'warning');
                              return;
                            }
                            handlePago(d.id, 'deuda', montoPago);
                          }}
                          style={{ 
                            background: 'linear-gradient(135deg, #6c4fa1, #8e6ec7)', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 8, 
                            padding: '10px 20px', 
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(108, 79, 161, 0.3)',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          💰 Pagar
                        </button>
                      </>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleEdit(d.id, 'deuda')}
                        title="Editar"
                        style={{ 
                          background: 'var(--color-accent)', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 8, 
                          padding: 10, 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                          <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(d.id, 'deuda')}
                        title="Eliminar"
                        style={{ 
                          background: 'var(--color-danger)', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 8, 
                          padding: 10, 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div>
          <h2 style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <FaBullseye style={{ color: '#4caf50' }} />
            Mis Metas
          </h2>
          
          {metasFiltradas.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              color: 'var(--color-muted)',
              background: 'var(--color-card)',
              borderRadius: 12,
              border: '2px dashed var(--color-input-border)'
            }}>
              <FaBullseye style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                {busqueda || filtroEstado !== 'todas' ? 'No se encontraron metas' : 'No tienes metas registradas'}
              </p>
              <p style={{ fontSize: 14 }}>
                {busqueda || filtroEstado !== 'todas' 
                  ? 'Intenta ajustar los filtros de búsqueda' 
                  : 'Agrega una meta para comenzar a ahorrar'}
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {metasFiltradas.map(m => {
                const objetivo = Number(m.monto_objetivo || 0);
                const ahorrado = Number(m.monto_ahorrado || 0);
                const falta = Math.max(objetivo - ahorrado, 0);
                const progreso = objetivo > 0 ? (ahorrado / objetivo) * 100 : 0;
                const completada = falta <= 0;

                return (
                  <li 
                    key={m.id} 
                    style={{ 
                      background: completada 
                        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.05) 100%)' 
                        : 'var(--color-card)',
                      marginBottom: 16, 
                      borderRadius: 12, 
                      padding: 20, 
                      boxShadow: '0 2px 8px var(--card-shadow)', 
                      border: completada 
                        ? '2px solid rgba(76, 175, 80, 0.3)' 
                        : '1px solid var(--color-input-border)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    {/* Header con título y badge */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FaBullseye style={{ color: '#4caf50', fontSize: 20 }} />
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{m.descripcion}</span>
                        {completada && (
                          <span style={{ 
                            background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                            color: '#fff', 
                            borderRadius: 12, 
                            padding: '4px 12px', 
                            fontSize: 12, 
                            fontWeight: 700,
                            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)'
                          }}>
                            ✓ Completada
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: 16 }}>
                      <ProgressBar 
                        current={ahorrado}
                        total={objetivo}
                        height={28}
                        showPercentage={true}
                        label="Progreso de ahorro"
                        showLabel={true}
                      />
                    </div>

                    {/* Detalles financieros */}
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 12,
                      marginBottom: 16,
                      fontSize: 14
                    }}>
                      <div>
                        <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: 12 }}>
                          Meta Total
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#4caf50' }}>
                          S/ {objetivo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: 12 }}>
                          Ahorrado
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#2196f3' }}>
                          S/ {ahorrado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-muted)', display: 'block', fontSize: 12 }}>
                          Por Ahorrar
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: completada ? '#4caf50' : '#ff9800' }}>
                          S/ {falta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Fechas */}
                    {(m.fecha_inicio || m.fecha_objetivo) && (
                      <div style={{ 
                        fontSize: 13, 
                        color: 'var(--color-muted)',
                        marginBottom: 16,
                        display: 'flex',
                        gap: 16,
                        flexWrap: 'wrap'
                      }}>
                        {m.fecha_inicio && (
                          <span>📅 Inicio: {new Date(m.fecha_inicio).toLocaleDateString()}</span>
                        )}
                        {m.fecha_objetivo && (
                          <span>🎯 Objetivo: {new Date(m.fecha_objetivo).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div style={{ 
                      display: 'flex', 
                      gap: 10, 
                      alignItems: 'center', 
                      flexWrap: 'wrap',
                      justifyContent: 'space-between'
                    }}>
                      {!completada && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input 
                            type="number" 
                            step="0.01" 
                            min={0.01} 
                            max={falta} 
                            placeholder="Monto a aportar" 
                            style={{ 
                              width: 140, 
                              borderRadius: 8, 
                              border: '1px solid var(--color-input-border)', 
                              padding: '8px 12px', 
                              background: 'var(--color-input-bg)', 
                              color: 'var(--color-text)',
                              fontSize: 14
                            }} 
                            id={`pago-meta-${m.id}`} 
                          />
                          <button
                            onClick={() => {
                              const val = (document.getElementById(`pago-meta-${m.id}`) as HTMLInputElement).value;
                              const montoAporte = Number(val);
                              if (!val || isNaN(montoAporte) || montoAporte <= 0) {
                                Swal.fire('Error', 'Ingrese un monto válido', 'error');
                                return;
                              }
                              if (ahorrado + montoAporte > objetivo) {
                                Swal.fire('Advertencia', 'El aporte excede el monto de la meta', 'warning');
                                return;
                              }
                              handlePago(m.id, 'meta', montoAporte);
                            }}
                            style={{ 
                              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: 8, 
                              padding: '8px 16px', 
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 14,
                              boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)',
                              transition: 'transform 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            💰 Aportar
                          </button>
                        </div>
                      )}
                      <div style={{ marginLeft: completada ? 0 : 'auto', display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleEdit(m.id, 'meta')}
                          title="Editar"
                          style={{ 
                            background: 'var(--color-accent)', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 8, 
                            padding: 10, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                            <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, 'meta')}
                          title="Eliminar"
                          style={{ 
                            background: 'var(--color-danger)', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 8, 
                            padding: 10, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
