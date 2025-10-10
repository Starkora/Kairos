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
    cuenta: '',
    icon: '💸',
    color: '#c62828'
  });
  // Helper para obtener la fecha local (YYYY-MM-DD) sin desfase de zona horaria
  const getToday = React.useCallback(() => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }, []);

  // Setear fecha por defecto al entrar a la pantalla
  React.useEffect(() => {
    setForm((prev) => ({ ...prev, fecha: getToday() }));
  }, [getToday]);


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
        if (data.length > 0) setForm(f => ({ ...f, cuenta: data[0].id }));
      })
      .catch(() => setCuentas([]));
  }, []);

  // Cargar categorías desde la API según el tipo
  React.useEffect(() => {
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
    if (!form.categoria) {
      Swal.fire({ icon: 'warning', title: 'Categoría requerida', text: 'Selecciona una categoría.' });
      return;
    }
    if (!form.monto || isNaN(form.monto) || Number(form.monto) <= 0) {
      Swal.fire({ icon: 'error', title: 'Monto inválido', text: 'El monto debe ser mayor a 0.' });
      return;
    }
    if (!form.fecha) {
      Swal.fire({ icon: 'warning', title: 'Fecha requerida', text: 'Debes seleccionar una fecha.' });
      return;
    }
    const result = await Swal.fire({
      title: '¿Seguro que quieres agregar este movimiento?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c4fa1',
    });
    if (result.isConfirmed) {
      // Enviar a la API para guardar en la BD
      const movimiento = {
        cuenta_id: form.cuenta,
        tipo: form.tipo,
        monto: form.monto,
        descripcion: form.descripcion,
        fecha: form.fecha,
        categoria_id: form.categoria,
        icon: form.icon,
        color: form.color
      };
      try {
      const apiFetch = (await import('../utils/apiFetch')).default;
      const res = await apiFetch(`${API_BASE}/api/transacciones`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(movimiento)
            });
            if (res && res.ok) {
          Swal.fire({ icon: 'success', title: 'Movimiento registrado', showConfirmButton: false, timer: 1200 });
          setForm({ tipo: 'ingreso', monto: '', categoria: '', fecha: getToday(), descripcion: '', cuenta: cuentas[0]?.id || '', icon: '💸', color: '#c62828' });
          // Refrescar cuentas para mostrar el saldo actualizado (asegurar plataforma=web)
          (await import('../utils/apiFetch')).default(`${API_BASE}/api/cuentas?plataforma=web`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setCuentas(Array.isArray(data) ? data : []))
            .catch(() => setCuentas([]));
            // Emitir evento para que otros componentes (ej. Cuentas) puedan refrescarse
            try {
              window.dispatchEvent(new Event('cuentas:refresh'));
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
    <div style={{ maxWidth: 420, margin: '32px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #eee', padding: 32 }}>
      <h1 style={{ marginBottom: 16 }}>Registro de Movimientos</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={handleDownloadTemplate} style={{ background: '#6c4fa1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>
          Descargar plantilla
        </button>
        <button type="button" onClick={handleImportClick} disabled={uploadLoading} style={{ background: uploadLoading ? '#b3a7d1' : '#6c4fa1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>
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
          </select>
        </div>
        <div>
          <label>Cuenta:&nbsp;</label>
          <select name="cuenta" value={form.cuenta} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }} required>
            {cuentas.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Monto:&nbsp;</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 4, fontWeight: 600 }}>S/</span>
            <input type="number" name="monto" value={form.monto} onChange={handleChange} min="0" style={{ padding: 6, borderRadius: 6, width: '100%' }} />
          </div>
        </div>
        <div>
          <label>Categoría:&nbsp;</label>
          <select name="categoria" value={form.categoria} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }}>
            <option value="">Seleccione una categoría</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Icono:&nbsp;</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select name="icon" value={form.icon} onChange={handleChange} style={{ padding: 6, borderRadius: 6 }}>
              {['💸','💰','🏦','🍎','🚗','💳','🔌','🎁','🛒','🏥'].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <input type="color" name="color" value={form.color} onChange={handleChange} style={{ width: 48, height: 36, padding: 0, border: 'none', background: 'transparent' }} />
          </div>
        </div>
        <div>
          <label>Fecha:&nbsp;</label>
          <input type="date" name="fecha" value={form.fecha} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }} />
        </div>
        <div>
          <label>Descripción:&nbsp;</label>
          <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} style={{ padding: 6, borderRadius: 6, width: '100%' }} />
        </div>
        <button type="submit" style={{ background: '#6c4fa1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 16, marginTop: 8 }}>
          Guardar Movimiento
        </button>
      </form>
    </div>
  );
}
