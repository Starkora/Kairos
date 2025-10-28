import React from 'react';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { getToken } from '../utils/auth';


export default function Registro() {

  const [cuentas, setCuentas] = React.useState([]);
  const [categorias, setCategorias] = React.useState([]);
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const [form, setForm] = React.useState({
    tipo: 'ingreso',
    monto: '',
    categoria: '',
    fecha: '',
    descripcion: '',
    cuenta: '', // origen
    cuentaDestino: '', // solo para transferencia
    icon: '💸',
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
      setForm((prev) => ({ ...prev, [name]: normalized }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
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
          setForm({ tipo: 'ingreso', monto: '', categoria: '', fecha: getToday(), descripcion: '', cuenta: cuentas[0]?.id || '', cuentaDestino: cuentas[1]?.id || cuentas[0]?.id || '', icon: '💸', color: '#c62828' });
          setRepetir(false);
          setRepeticion({ frecuencia: 'mensual', inicio: '', fin: '', indefinido: true });
          // Refrescar cuentas para mostrar el saldo actualizado (asegurar plataforma=web)
          (await import('../utils/apiFetch')).default(`${API_BASE}/api/cuentas?plataforma=web`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setCuentas(Array.isArray(data) ? data : []))
            .catch(() => setCuentas([]));
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
    <div style={{ maxWidth: 420, margin: '32px auto', background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 2px 8px var(--card-shadow)', padding: 32 }}>
      <h1 style={{ marginBottom: 16 }}>Registro de Movimientos</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={handleDownloadTemplate} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>
          Descargar plantilla
        </button>
        <button type="button" onClick={handleImportClick} disabled={uploadLoading} style={{ background: uploadLoading ? 'rgba(108,79,161,0.7)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 4, fontWeight: 600 }}>S/</span>
            <input
              type="number"
              name="monto"
              value={form.monto}
              onChange={handleChange}
              min="0"
              step="0.01"
              inputMode="decimal"
              pattern="[0-9]+([\.,][0-9]+)?"
              style={{ padding: 6, borderRadius: 6, width: '100%' }}
            />
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
        {form.tipo !== 'transferencia' ? (
          <div>
            <label>Icono:&nbsp;</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select name="icon" value={form.icon} onChange={handleChange} style={{ padding: 6, borderRadius: 6 }}>
                {['💸','💰','🏦','🍎','🚗','💳','🔌','🎁','🛒','🏥'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <input type="color" name="color" value={form.color} onChange={handleChange} style={{ width: 48, height: 36, padding: 0, border: 'none', background: 'transparent' }} />
            </div>
          </div>
        ) : (
          <div>
            <label>Icono:&nbsp;</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>🔁</span>
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
  );
}
