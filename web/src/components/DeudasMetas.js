import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';

export default function DeudasMetas() {
  const [pago, setPago] = useState([]);
  const [tab, setTab] = useState('deudas');
  const [deudas, setDeudas] = useState([]);
  const [metas, setMetas] = useState([]);
  const [nueva, setNueva] = useState({ descripcion: '', monto: '', tipo: 'deuda', fecha_inicio: '', fecha_vencimiento: '' });
  // Eliminamos mensaje y error, usaremos SweetAlert

  // Cargar deudas y metas al iniciar
  useEffect(() => {
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
      console.log('Datos enviados a handlePago:', { id, tipo, monto }); // Log para depuración
  const url = tipo === 'deuda' ? `${API_BASE}/api/deudas/pago` : `${API_BASE}/api/metas/aporte`;
      const fecha = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
      console.log('Datos enviados a handlePago:', { deuda_id: id, monto, fecha, plataforma: 'web' }); // Log adicional para depuración
      const response = await fetch(url, {
        method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), 'ngrok-skip-browser-warning': 'true' },
  credentials: 'include',
        body: JSON.stringify({
          meta_id: id, // Cambiado de `deuda_id` a `meta_id`
          monto,
          fecha,
          fecha_inicio: nueva.fecha_inicio || null,
          fecha_objetivo: nueva.fecha_objetivo || null,
          plataforma: 'web'
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Swal.fire({ icon: 'success', title: '¡Éxito!', text: data.message || 'Pago registrado correctamente' });
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

      const { value: formValues } = await Swal.fire({
        title: `Editar ${tipo === 'deuda' ? 'Deuda' : 'Meta'}`,
        html:
          `<input id="swal-descripcion" class="swal2-input" placeholder="Descripción" value="${item.descripcion}" />` +
          `<input id="swal-monto" type="number" class="swal2-input" placeholder="Monto" value="${tipo === 'deuda' ? item.monto_total : item.monto_objetivo}" />` +
          `<input id="swal-fecha-inicio" type="date" class="swal2-input" value="${item.fecha_inicio || ''}" />` +
          `<input id="swal-fecha-vencimiento" type="date" class="swal2-input" value="${tipo === 'deuda' ? item.fecha_vencimiento || '' : item.fecha_objetivo || ''}" />`,
        focusConfirm: false,
        preConfirm: () => {
          return {
            descripcion: document.getElementById('swal-descripcion').value,
            monto: document.getElementById('swal-monto').value,
            fecha_inicio: document.getElementById('swal-fecha-inicio').value,
            fecha_vencimiento: document.getElementById('swal-fecha-vencimiento').value,
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
    <div style={{ maxWidth: 900, margin: '32px auto', background: '#fff', borderRadius: 18, boxShadow: '0 2px 12px #0002', padding: 32 }}>
      <h1 style={{ fontWeight: 800, fontSize: 28, marginBottom: 24 }}>Deudas y Metas</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button onClick={() => setTab('deudas')} style={{ background: tab === 'deudas' ? '#6c4fa1' : '#eee', color: tab === 'deudas' ? '#fff' : '#222', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600 }}>Deudas</button>
        <button onClick={() => setTab('metas')} style={{ background: tab === 'metas' ? '#6c4fa1' : '#eee', color: tab === 'metas' ? '#fff' : '#222', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600 }}>Metas</button>
      </div>
      <div style={{ marginBottom: 24 }}>
        {/* Ajustar el ancho del contenedor blanco para alinear los inputs y labels */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px', width: '100%' }}>
          <input type="text" placeholder="Descripción" value={nueva.descripcion} onChange={e => setNueva({ ...nueva, descripcion: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '150px' }} />
          <input type="number" placeholder="Monto" value={nueva.monto} onChange={e => setNueva({ ...nueva, monto: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '120px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '120px', marginTop: '-24px' }}>
            <label htmlFor="fecha_inicio" style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>Fecha inicio</label>
            <input id="fecha_inicio" type="date" value={nueva.fecha_inicio} onChange={e => setNueva({ ...nueva, fecha_inicio: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
          </div>
          {nueva.tipo === 'meta' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '120px', marginTop: '-24px' }}>
              <label htmlFor="fecha_objetivo" style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>Fecha objetivo</label>
              <input id="fecha_objetivo" type="date" value={nueva.fecha_vencimiento} onChange={e => setNueva({ ...nueva, fecha_vencimiento: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
            </div>
          )}
          {nueva.tipo === 'deuda' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '120px', marginTop: '-24px' }}>
              <label htmlFor="fecha_vencimiento" style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>Fecha vencimiento</label>
              <input id="fecha_vencimiento" type="date" value={nueva.fecha_vencimiento} onChange={e => setNueva({ ...nueva, fecha_vencimiento: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }} />
            </div>
          )}
          <select value={nueva.tipo} onChange={e => setNueva({ ...nueva, tipo: e.target.value })} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '120px', backgroundColor: '#f9f9f9' }}>
            <option value="deuda">Deuda</option>
            <option value="meta">Meta</option>
          </select>
        </div>
      </div>
      {/* Separar el botón Agregar */}
      <div style={{ marginTop: '10px' }}>
        <button onClick={handleAdd} style={{ backgroundColor: 'green', color: 'white', padding: '10px', borderRadius: '5px' }}>Agregar</button>
      </div>
      {tab === 'deudas' ? (
        <div>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Mis Deudas</h2>
          {deudas.length === 0 && <div style={{ color: '#888' }}>No tienes deudas registradas.</div>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {deudas.map(d => (
              <li key={d.id} style={{ background: '#fff3e0', marginBottom: 14, borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px #0001' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.descripcion}</div>
                  <div style={{ fontSize: 15, color: '#888' }}>
                    Monto: S/ {Number(d.monto ?? d.monto_total ?? 0).toFixed(2)} | Pagado: S/ {Number(d.pagado ?? d.monto_pagado ?? 0).toFixed(2)}<br />
                    {d.fecha_inicio && <span>Inicio: {new Date(d.fecha_inicio).toLocaleDateString()} </span>}
                    {d.fecha_vencimiento && <span>Vence: {new Date(d.fecha_vencimiento).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" min={1} max={(d.monto ?? d.monto_total ?? 0) - (d.pagado ?? d.monto_pagado ?? 0)} placeholder="Pago" style={{ width: 80, marginRight: 8, borderRadius: 6, border: '1px solid #ccc', padding: 4 }} id={`pago-deuda-${d.id}`} disabled={(parseFloat(d.pagado ?? d.monto_pagado ?? 0) >= parseFloat(d.monto ?? d.monto_total ?? 0))} />
                  <button
                    onClick={() => {
                      const val = document.getElementById(`pago-deuda-${d.id}`).value;
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
                    style={{ background: '#ffa726', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Editar">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                      <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(d.id, 'deuda')}
                    className="icon-btn"
                    style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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
              <li key={m.id} style={{ background: '#e3f2fd', marginBottom: 14, borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px #0001' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{m.descripcion}</div>
                  <div style={{ fontSize: 15, color: '#888' }}>
                    Meta: S/ {(m.monto_objetivo || 0).toLocaleString()} | Ahorrado: S/ {(m.monto_ahorrado || 0).toLocaleString()}<br />
                    {m.fecha_inicio && <span>Inicio: {new Date(m.fecha_inicio).toLocaleDateString()} </span>}
                    {m.fecha_objetivo && <span>Objetivo: {new Date(m.fecha_objetivo).toLocaleDateString()} </span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" min={1} max={(m.monto_objetivo || 0) - (m.monto_ahorrado || 0)} placeholder="Aportar" style={{ width: 80, marginRight: 8, borderRadius: 6, border: '1px solid #ccc', padding: 4 }} id={`pago-meta-${m.id}`} disabled={(parseFloat(m.pagado ?? m.monto_ahorrado ?? 0) >= parseFloat(m.monto_objetivo ?? 0))} />
                  <button
                    onClick={() => {
                      const val = document.getElementById(`pago-meta-${m.id}`).value;
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
                    style={{ background: '#ffa726', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Editar">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path>
                      <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(m.id, 'meta')}
                    className="icon-btn"
                    style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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
