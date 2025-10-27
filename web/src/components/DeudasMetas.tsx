import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';

export default function DeudasMetas() {
  const [pago, setPago] = useState([]);
  const [tab, setTab] = useState('deudas');
  const [deudas, setDeudas] = useState([]);
  const [metas, setMetas] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [nueva, setNueva] = useState({ descripcion: '', monto: '', tipo: 'deuda', fecha_inicio: '', fecha_vencimiento: '' });
  // Eliminamos mensaje y error, usaremos SweetAlert

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
          const descripcion = tipo === 'deuda' ? `Pago deuda #${id}` : `Aporte meta #${id}`;
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
        <h1 className="debts-title">Deudas y Metas</h1>
      <div className="debts-tabs" style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setTab('deudas')} style={{ background: tab === 'deudas' ? 'var(--color-primary)' : 'var(--color-secondary)', color: tab === 'deudas' ? '#fff' : 'var(--color-text)', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600 }}>Deudas</button>
          <button onClick={() => setTab('metas')} style={{ background: tab === 'metas' ? 'var(--color-primary)' : 'var(--color-secondary)', color: tab === 'metas' ? '#fff' : 'var(--color-text)', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600 }}>Metas</button>
      </div>
      <div className="debts-form">
          <input type="text" placeholder="Descripción" value={nueva.descripcion} onChange={e => setNueva({ ...nueva, descripcion: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-input-border)', width: '100%', minWidth: 0, background: 'var(--color-input-bg)', color: 'var(--color-text)' }} />
          <input type="number" placeholder="Monto" value={nueva.monto} onChange={e => setNueva({ ...nueva, monto: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-input-border)', width: '100%', minWidth: 0, background: 'var(--color-input-bg)', color: 'var(--color-text)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', minWidth: 0 }}>
          <label htmlFor="fecha_inicio" style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>Fecha inicio</label>
          <input id="fecha_inicio" type="date" value={nueva.fecha_inicio} onChange={e => setNueva({ ...nueva, fecha_inicio: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
        </div>
        {nueva.tipo === 'meta' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', minWidth: 0 }}>
            <label htmlFor="fecha_objetivo" style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>Fecha objetivo</label>
            <input id="fecha_objetivo" type="date" value={nueva.fecha_vencimiento} onChange={e => setNueva({ ...nueva, fecha_vencimiento: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
          </div>
        )}
        {nueva.tipo === 'deuda' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', minWidth: 0 }}>
            <label htmlFor="fecha_vencimiento" style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>Fecha vencimiento</label>
            <input id="fecha_vencimiento" type="date" value={nueva.fecha_vencimiento} onChange={e => setNueva({ ...nueva, fecha_vencimiento: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
          </div>
        )}
        <select value={nueva.tipo} onChange={e => setNueva({ ...nueva, tipo: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--color-input-border)', width: '100%', backgroundColor: 'var(--color-input-bg)', minWidth: 0, color: 'var(--color-text)' }}>
          <option value="deuda">Deuda</option>
          <option value="meta">Meta</option>
        </select>
        <button onClick={handleAdd} style={{ backgroundColor: 'var(--color-success)', color: 'white', padding: '10px', borderRadius: '5px', border: 'none' }}>Agregar</button>
      </div>
      {tab === 'deudas' ? (
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Mis Deudas</h2>
          {deudas.length === 0 && <div style={{ color: '#888' }}>No tienes deudas registradas.</div>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {deudas.map(d => (
              <li key={d.id} style={{ background: 'var(--color-card)', marginBottom: 14, borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px var(--card-shadow)', flexWrap: 'wrap', gap: 12, border: '1px solid var(--color-input-border)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.descripcion}</div>
                  <div style={{ fontSize: 15, color: 'var(--color-muted)' }}>
                    Monto: S/ {Number(d.monto ?? d.monto_total ?? 0).toFixed(2)} | Pagado: S/ {Number(d.pagado ?? d.monto_pagado ?? 0).toFixed(2)}<br />
                    {d.fecha_inicio && <span>Inicio: {new Date(d.fecha_inicio).toLocaleDateString()} </span>}
                    {d.fecha_vencimiento && <span>Vence: {new Date(d.fecha_vencimiento).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="number" step="0.01" min={0.01} max={(d.monto ?? d.monto_total ?? 0) - (d.pagado ?? d.monto_pagado ?? 0)} placeholder="Pago" style={{ width: 100, marginRight: 8, borderRadius: 6, border: '1px solid var(--color-input-border)', padding: 4, background: 'var(--color-input-bg)', color: 'var(--color-text)' }} id={`pago-deuda-${d.id}`} disabled={(parseFloat(d.pagado ?? d.monto_pagado ?? 0) >= parseFloat(d.monto ?? d.monto_total ?? 0))} />
                  <button
                    onClick={() => {
                      const val = (document.getElementById(`pago-deuda-${d.id}`) as HTMLInputElement).value;
                      const montoPago = Number(val);
                      const pagado = parseFloat(d.pagado ?? d.monto_pagado ?? 0);
                      const total = parseFloat(d.monto ?? d.monto_total ?? 0);
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
                    style={{ background: '#6c4fa1', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600 }}
                    disabled={(parseFloat(d.pagado ?? d.monto_pagado ?? 0) >= parseFloat(d.monto ?? d.monto_total ?? 0))}
                  >Pagar</button>
                    <button
                    onClick={() => handleEdit(d.id, 'deuda')}
                    title="Editar"
                    style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Editar">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                      <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(d.id, 'deuda')}
                    className="icon-btn"
                    style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Eliminar">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                    </svg>
                    <span className="tooltip">Eliminar</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Mis Metas</h2>
          {metas.length === 0 && <div style={{ color: '#888' }}>No tienes metas registradas.</div>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {metas.map(m => (
              <li key={m.id} style={{ background: 'var(--color-card)', marginBottom: 14, borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px var(--card-shadow)', flexWrap: 'wrap', gap: 12, border: '1px solid var(--color-input-border)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{m.descripcion}</div>
                  <div style={{ fontSize: 15, color: 'var(--color-muted)' }}>
                    Meta: S/ {(m.monto_objetivo || 0).toLocaleString()} | Ahorrado: S/ {(m.monto_ahorrado || 0).toLocaleString()}<br />
                    {m.fecha_inicio && <span>Inicio: {new Date(m.fecha_inicio).toLocaleDateString()} </span>}
                    {m.fecha_objetivo && <span>Objetivo: {new Date(m.fecha_objetivo).toLocaleDateString()} </span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="number" step="0.01" min={0.01} max={(m.monto_objetivo || 0) - (m.monto_ahorrado || 0)} placeholder="Aportar" style={{ width: 100, marginRight: 8, borderRadius: 6, border: '1px solid var(--color-input-border)', padding: 4, background: 'var(--color-input-bg)', color: 'var(--color-text)' }} id={`pago-meta-${m.id}`} disabled={(parseFloat(m.pagado ?? m.monto_ahorrado ?? 0) >= parseFloat(m.monto_objetivo ?? 0))} />
                  <button
                    onClick={() => {
                      const val = (document.getElementById(`pago-meta-${m.id}`) as HTMLInputElement).value;
                      const montoAporte = Number(val);
                      const ahorrado = parseFloat(m.pagado ?? m.monto_ahorrado ?? 0);
                      const objetivo = parseFloat(m.monto_objetivo ?? 0);
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
                    style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600 }}
                    disabled={(parseFloat(m.pagado ?? m.monto_ahorrado ?? 0) >= parseFloat(m.monto_objetivo ?? 0))}
                  >Aportar</button>
                  <button
                    onClick={() => handleEdit(m.id, 'meta')}
                    title="Editar"
                    style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Editar">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                      <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(m.id, 'meta')}
                    className="icon-btn"
                    style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Eliminar">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                    </svg>
                    <span className="tooltip">Eliminar</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <style>{`
        .icon-btn { position: relative; }
        .icon-btn .tooltip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); background: #222; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .12s ease, transform .12s ease; box-shadow: 0 2px 8px rgba(0,0,0,.18); }
        .icon-btn .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #222; }
        .icon-btn:hover .tooltip, .icon-btn:focus .tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
      `}</style>
    </div>
  );
}
