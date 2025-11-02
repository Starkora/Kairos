import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getToken } from '../utils/auth';
import API_BASE from '../utils/apiBase';
import Swal from 'sweetalert2';
import { loadPreferences, savePreferences } from '../utils/preferences';

type Value = Date | [Date, Date];


// NOTE: icons and colors now come from stored movimiento fields (icon, color).


export default function Calendario() {
  // Fecha de hoy a medianoche local
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [value, setValue] = React.useState<Value>(today);
  const [movimientos, setMovimientos] = React.useState([]);
  const [movimientosRecurrentes, setMovimientosRecurrentes] = React.useState([]);
  const [exportMode, setExportMode] = React.useState(false);
  // Filtros y búsqueda
  const defaultFilters = React.useMemo(() => ({ ingreso: true, egreso: true, ahorro: true, transferencia: true }), []);
  const [filters, setFilters] = React.useState<{ ingreso: boolean; egreso: boolean; ahorro: boolean; transferencia: boolean }>(defaultFilters);
  const [search, setSearch] = React.useState('');
  const [savedPresets, setSavedPresets] = React.useState<Array<{ name: string; filters: { ingreso: boolean; egreso: boolean; ahorro: boolean; transferencia: boolean } }>>([]);
  const [selectedPreset, setSelectedPreset] = React.useState<string>('');
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showQuickMenu, setShowQuickMenu] = React.useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = React.useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement|null>(null);
  const quickMenuRef = React.useRef<HTMLDivElement|null>(null);
  const presetsMenuRef = React.useRef<HTMLDivElement|null>(null);

  // Cerrar menús al hacer click fuera o al presionar Escape
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        (exportMenuRef.current && exportMenuRef.current.contains(t)) ||
        (quickMenuRef.current && quickMenuRef.current.contains(t)) ||
        (presetsMenuRef.current && presetsMenuRef.current.contains(t))
      ) return;
      setShowExportMenu(false); setShowQuickMenu(false); setShowPresetsMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowExportMenu(false); setShowQuickMenu(false); setShowPresetsMenu(false); }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Persistencia de filtros y búsqueda (local) y presets (también backend)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('kairos-calendar-filters');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setFilters({ ...defaultFilters, ...parsed });
        }
      }
    } catch {}
    try {
      const s = localStorage.getItem('kairos-calendar-search');
      if (s !== null) setSearch(s);
    } catch {}
    try {
      const p = localStorage.getItem('kairos-calendar-filter-presets');
      if (p) {
        const list = JSON.parse(p);
        if (Array.isArray(list)) setSavedPresets(list.filter(x => x && x.name && x.filters));
      }
    } catch {}
    // Cargar presets y últimos filtros/búsqueda desde backend si existen
    (async () => {
      try {
        const prefs = await loadPreferences();
        const serverPresets = prefs?.calendar?.filterPresets;
        const lastFilters = prefs?.calendar?.lastFilters;
        const lastSearch = prefs?.calendar?.lastSearch;
        if (Array.isArray(serverPresets) && serverPresets.length > 0) {
          setSavedPresets(serverPresets.filter((x: any) => x && x.name && x.filters));
        }
        if (lastFilters && typeof lastFilters === 'object') {
          setFilters({ ...defaultFilters, ...lastFilters });
        }
        if (typeof lastSearch === 'string') {
          setSearch(lastSearch);
        }
      } catch {}
    })();
  // eslint-disable-next-line
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('kairos-calendar-filters', JSON.stringify(filters));
    } catch {}
    // Persistir últimos filtros en backend
    savePreferences({ calendar: { lastFilters: filters } }).catch(() => {});
  }, [filters]);
  React.useEffect(() => {
    try {
      localStorage.setItem('kairos-calendar-search', search);
    } catch {}
    // Persistir última búsqueda en backend
    savePreferences({ calendar: { lastSearch: search } }).catch(() => {});
  }, [search]);

  const persistPresets = (list) => {
    setSavedPresets(list);
    try { localStorage.setItem('kairos-calendar-filter-presets', JSON.stringify(list)); } catch {}
    // Persistir también en backend (no bloquear)
    savePreferences({ calendar: { filterPresets: list } }).catch(() => {});
  };

  // Función para cargar movimientos y asignar iconos/colores
  const refreshMovimientos = React.useCallback(async () => {
    try {
      const apiFetch = (await import('../utils/apiFetch')).default;
      // Movimientos normales
      const res = await apiFetch(`${API_BASE}/api/transacciones?plataforma=web`);
      const data = res.ok ? await res.json() : [];
      setMovimientos(Array.isArray(data) ? data : []);
      // Movimientos recurrentes (instancias)
      const resRec = await apiFetch(`${API_BASE}/api/movimientos-recurrentes/instancias`);
      const dataRec = resRec.ok ? await resRec.json() : [];
      setMovimientosRecurrentes(Array.isArray(dataRec) ? dataRec : []);
    } catch (err) {
      setMovimientos([]);
      setMovimientosRecurrentes([]);
    }
  }, []);

  React.useEffect(() => {
    refreshMovimientos();
    // Escuchar evento para refrescar desde Registro
    const handler = () => refreshMovimientos();
    window.addEventListener('movimientos:refresh', handler);
    return () => window.removeEventListener('movimientos:refresh', handler);
  }, [refreshMovimientos]);

  // Determinar el día mostrado a la derecha (si hay rango, usar el primer día)
  const selectedDate = React.useMemo(() => {
    if (value instanceof Date) return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return today;
  }, [value, today]);

  const fechaSeleccionada = selectedDate.toISOString().slice(0, 10);
  // Unir movimientos normales y recurrentes
  const todosMovimientos = React.useMemo(() => {
    // Evitar duplicados por id y fecha
    const clave = m => `${m.id || ''}_${m.fecha || ''}`;
    const mapa = new Map();
    [...movimientos, ...movimientosRecurrentes].forEach(m => {
      mapa.set(clave(m), m);
    });
    return Array.from(mapa.values());
  }, [movimientos, movimientosRecurrentes]);

  const movimientosDelDia = todosMovimientos.filter(m => {
    const fechaMov = m.fecha ? m.fecha.slice(0, 10) : '';
    return fechaMov === fechaSeleccionada;
  });

  // Agrupar transferencias por token [TRANSFER#code] y generar un ítem único Origen -> Destino
  const movimientosDelDiaAgrupados = React.useMemo(() => {
    const regex = /\[TRANSFER#([^\]]+)\]/i;
    const transfers = new Map();
    const otros = [];
    for (const m of movimientosDelDia) {
      const desc = String(m.descripcion || '');
      const match = desc.match(regex);
      if (match) {
        const code = match[1];
        if (!transfers.has(code)) transfers.set(code, []);
        transfers.get(code).push(m);
      } else {
        otros.push(m);
      }
    }
    const agrupados = [];
    transfers.forEach((arr, code) => {
      if (arr.length < 2) {
        // si no están ambas caras, mostrarlas tal cual
        agrupados.push(...arr);
        return;
      }
      const egreso = arr.find(a => (a.tipo || '').toLowerCase() === 'egreso');
      const ingreso = arr.find(a => (a.tipo || '').toLowerCase() === 'ingreso');
      const monto = (egreso || ingreso)?.monto || arr[0].monto;
      const origenCuenta = egreso?.cuenta || arr[0]?.cuenta || 'Origen';
      const destinoCuenta = ingreso?.cuenta || arr[1]?.cuenta || 'Destino';
      agrupados.push({
        id: `transfer-${code}`,
        tipo: 'transferencia',
        monto,
        descripcion: `Transferencia: ${origenCuenta} → ${destinoCuenta}`,
        icon: '🔁',
        color: '#1976d2',
        cuenta: `${origenCuenta} → ${destinoCuenta}`,
        _transfer: { code, origenId: egreso?.id, destinoId: ingreso?.id }
      });
    });
    return [...otros, ...agrupados];
  }, [movimientosDelDia]);
  const hayTransferenciasAgrupadas = React.useMemo(() => movimientosDelDiaAgrupados.some(m => (m.tipo || '').toLowerCase() === 'transferencia'), [movimientosDelDiaAgrupados]);

  // Aplicar filtros y búsqueda sobre los movimientos del día
  const movimientosFiltrados = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return movimientosDelDiaAgrupados.filter(m => {
      const tipo = String(m.tipo || '').toLowerCase();
      if (!filters[tipo as keyof typeof filters]) return false;
      if (!q) return true;
      const txt = `${m.descripcion || ''} ${m.cuenta || ''}`.toLowerCase();
      return txt.includes(q);
    });
  }, [movimientosDelDiaAgrupados, filters, search]);

  const handleEditMovimiento = async (mov) => {
    // Si es instancia de movimiento recurrente, redirigir/derivar a edición de serie
    if (mov && (mov._recurrente || mov.frecuencia)) {
      const result = await Swal.fire({
        title: 'Movimiento recurrente',
        html: '<div style="font-size:1rem">Esta es una ocurrencia de una serie recurrente. Puedes editar toda la serie desde la pantalla de Movimientos Recurrentes.</div>',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ir a Recurrentes',
        cancelButtonText: 'Cancelar'
      });
      if (result.isConfirmed) {
        // Navegar a la página de gestión de recurrentes
        window.location.href = '/movimientos-recurrentes';
      }
      return;
    }
    try {
      // Cargar cuentas y categorias
      const apiFetch = (await import('../utils/apiFetch')).default;
      const [resCuentas, resCategorias] = await Promise.all([
        apiFetch(`${API_BASE}/api/cuentas?plataforma=web`),
        apiFetch(`${API_BASE}/api/categorias/${mov.tipo}?plataforma=web`)
      ]);
      const cuentasList = resCuentas.ok ? await resCuentas.json() : [];
      const categoriasList = resCategorias.ok ? await resCategorias.json() : [];

      const cuentasOptions = (cuentasList || []).map(c => `<option value="${c.id}" ${c.id === mov.cuenta_id ? 'selected' : ''}>${c.nombre}</option>`).join('');
      const categoriasOptions = (categoriasList || []).map(c => `<option value="${c.id}" ${c.id === mov.categoria_id ? 'selected' : ''}>${c.nombre}</option>`).join('');

      const defaultIcon = mov.icon || (((mov.tipo || '').toLowerCase() === 'egreso') ? '💸' : ((mov.tipo || '').toLowerCase() === 'ahorro' ? '💰' : '🏦'));
      const defaultColor = mov.color || '';
      const { value: formValues } = await Swal.fire({
        title: 'Editar movimiento',
        html:
          `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:720px">` +
          // Preview en vivo
          `<div id=\"swal-preview\" style=\"grid-column:1/3; display:flex; align-items:center; gap:14px; padding:14px; border-radius:12px; background:${defaultColor || ((mov.tipo||'').toLowerCase()==='ingreso' || (mov.tipo||'').toLowerCase()==='ahorro' ? 'linear-gradient(90deg,#1de9b6 0%, #43a047 100%)' : 'linear-gradient(90deg,#ff7043 0%, #c62828 100%)')}; color:#fff; box-shadow:0 2px 8px #0002; margin-bottom:6px;\">`+
          `<span id=\"swal-prev-icon\" style=\"font-size:28px\">${defaultIcon}</span>`+
          `<div style=\"display:flex; flex-direction:column; gap:4px\">`+
          `<div id=\"swal-prev-desc\" style=\"font-weight:700\">${mov.descripcion || ''}</div>`+
          `<div id=\"swal-prev-amount\" style=\"font-weight:800\">${((mov.tipo||'').toLowerCase()==='ingreso' || (mov.tipo||'').toLowerCase()==='ahorro'?'+':'-')}S/ ${Number(mov.monto||0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>`+
          `<div style=\"display:flex; align-items:center; gap:8px\">`+
          `<span id=\"swal-prev-badge\" style=\"font-size:12px; padding:4px 8px; border-radius:12px; font-weight:800; text-transform:capitalize\">${mov.tipo}</span>`+
          `<span id=\"swal-prev-cuenta\" style=\"font-size:12px; opacity:0.9\">${mov.cuenta || ''}</span>`+
          `</div>`+
          `</div>`+
          `</div>`+
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Cuenta</label><select id="swal-cuenta" class="swal2-select">${cuentasOptions}</select></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Tipo</label><input id="swal-tipo" class="swal2-input" value="${mov.tipo}" disabled></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Monto</label><input id="swal-monto" class="swal2-input" placeholder="Monto" value="${mov.monto}" type="number" step="0.01"></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Fecha</label><input id="swal-fecha" class="swal2-input" placeholder="Fecha" value="${(mov.fecha || '').slice(0, 10)}" type="date"></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Icono</label><input id="swal-icon" class="swal2-input" placeholder="Ej: 💵, 💸, 🏦" value="${defaultIcon}"></div>` +
          `<div style="display:flex;flex-direction:column"><label style="font-weight:700;margin-bottom:6px">Color</label><input id="swal-color" class="swal2-input" type="color" value="${defaultColor || '#6c4fa1'}"></div>` +
          `<div style="display:flex;flex-direction:column;grid-column:1/3"><label style="font-weight:700;margin-bottom:6px">Descripción</label><input id="swal-descripcion" class="swal2-input" placeholder="Descripción" value="${mov.descripcion || ''}"></div>` +
          `<div style="display:flex;flex-direction:column;grid-column:1/3"><label style="font-weight:700;margin-bottom:6px">Categoría (opcional)</label><select id="swal-categoria" class="swal2-select"><option value="">- Ninguna -</option>${categoriasOptions}</select></div>` +
          `</div>`,
        width: 760,
        focusConfirm: false,
        showCancelButton: true,
        didOpen: () => {
          const $ = (sel) => document.querySelector(sel);
          const prev = $('#swal-preview') as HTMLElement;
          const $icon = $('#swal-icon') as HTMLInputElement;
          const $color = $('#swal-color') as HTMLInputElement;
          const $monto = $('#swal-monto') as HTMLInputElement;
          const $desc = $('#swal-descripcion') as HTMLInputElement;
          const $cuenta = $('#swal-cuenta') as HTMLSelectElement;
          const tipoNorm = (mov.tipo || '').toLowerCase();
          const fallbackBg = (tipoNorm === 'ingreso' || tipoNorm === 'ahorro') ? 'linear-gradient(90deg,#1de9b6 0%, #43a047 100%)' : 'linear-gradient(90deg,#ff7043 0%, #c62828 100%)';
          const render = () => {
            const ic = ($icon && $icon.value) || defaultIcon;
            const col = ($color && $color.value) || '';
            const monto = parseFloat(($monto && $monto.value) || String(mov.monto||0));
            const desc = ($desc && $desc.value) || '';
            const cuentaText = $cuenta && $cuenta.options && $cuenta.selectedIndex >= 0 ? $cuenta.options[$cuenta.selectedIndex].text : (mov.cuenta || '');
            const sign = (tipoNorm === 'ingreso' || tipoNorm === 'ahorro') ? '+' : '-';
            const iconEl = $('#swal-prev-icon') as HTMLElement;
            const amtEl = $('#swal-prev-amount') as HTMLElement;
            const descEl = $('#swal-prev-desc') as HTMLElement;
            const cuentaEl = $('#swal-prev-cuenta') as HTMLElement;
            const badgeEl = $('#swal-prev-badge') as HTMLElement;
            if (iconEl) iconEl.textContent = ic;
            if (amtEl) amtEl.textContent = `${sign}S/ ${Number(monto||0).toLocaleString(undefined,{minimumFractionDigits:2})}`;
            if (descEl) descEl.textContent = desc;
            if (cuentaEl) cuentaEl.textContent = cuentaText;
            if (badgeEl) {
              badgeEl.textContent = mov.tipo;
              const bg = tipoNorm === 'ingreso' ? '#1de9b6' : (tipoNorm === 'ahorro' ? '#4fc3f7' : '#ff8a80');
              const fg = tipoNorm === 'ingreso' || tipoNorm === 'ahorro' ? '#222' : '#222';
              (badgeEl as HTMLElement).style.background = bg;
              (badgeEl as HTMLElement).style.color = fg;
            }
            if (prev) prev.style.background = col ? col : fallbackBg;
          };
          ['input','change'].forEach(ev => {
            $icon && $icon.addEventListener(ev, render);
            $color && $color.addEventListener(ev, render);
            $monto && $monto.addEventListener(ev, render);
            $desc && $desc.addEventListener(ev, render);
            $cuenta && $cuenta.addEventListener(ev, render);
          });
          render();
        },
        preConfirm: () => {
          const cuenta_id = (document.getElementById('swal-cuenta') as HTMLSelectElement).value;
          const monto = parseFloat((document.getElementById('swal-monto') as HTMLInputElement).value || '0');
          const descripcion = (document.getElementById('swal-descripcion') as HTMLInputElement).value || '';
          const fecha = (document.getElementById('swal-fecha') as HTMLInputElement).value || '';
          const icon = (document.getElementById('swal-icon') as HTMLInputElement).value || '';
          const color = (document.getElementById('swal-color') as HTMLInputElement).value || '';
          const categoria_id = (document.getElementById('swal-categoria') as HTMLSelectElement).value || null;
          if (!cuenta_id) { Swal.showValidationMessage('Cuenta requerida'); return false; }
          if (!monto || isNaN(monto) || monto <= 0) { Swal.showValidationMessage('Monto inválido'); return false; }
          if (!fecha) { Swal.showValidationMessage('Fecha requerida'); return false; }
          return { cuenta_id: Number(cuenta_id), monto, descripcion, fecha, categoria_id: categoria_id ? Number(categoria_id) : null, icon, color };
        }
      });
      if (!formValues) return;
      const body = { cuenta_id: formValues.cuenta_id, tipo: mov.tipo, monto: formValues.monto, descripcion: formValues.descripcion, fecha: formValues.fecha, categoria_id: formValues.categoria_id, icon: formValues.icon, color: formValues.color };
      const res = await apiFetch(`${API_BASE}/api/transacciones/${mov.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Movimiento actualizado', timer: 1200, showConfirmButton: false });
        await refreshMovimientos();
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo actualizar el movimiento.' });
      }
    } catch (e) {
      // apiFetch/forceLogout maneja 401
    }
  };

  // Acciones rápidas para recurrentes
  const aplicarRecurrenteHoy = async (mov) => {
    try {
      const apiFetch = (await import('../utils/apiFetch')).default;
      const res = await apiFetch(`${API_BASE}/api/movimientos-recurrentes/${mov.id}/aplicar`, { method: 'POST' });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Aplicado hoy', timer: 1000, showConfirmButton: false });
        await refreshMovimientos();
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo aplicar.' });
      }
    } catch {}
  };

  const saltarRecurrenteHoy = async (mov) => {
    try {
      const apiFetch = (await import('../utils/apiFetch')).default;
      const res = await apiFetch(`${API_BASE}/api/movimientos-recurrentes/${mov.id}/saltar`, { method: 'POST' });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Saltado hoy', timer: 1000, showConfirmButton: false });
        await refreshMovimientos();
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo registrar el salto.' });
      }
    } catch {}
  };

  const posponerRecurrente = async (mov, dias) => {
    try {
      const apiFetch = (await import('../utils/apiFetch')).default;
      const res = await apiFetch(`${API_BASE}/api/movimientos-recurrentes/${mov.id}/posponer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dias }) });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'success', title: 'Pospuesto', text: data.nuevaFecha ? `Nueva fecha: ${data.nuevaFecha}` : '', timer: 1300, showConfirmButton: false });
        await refreshMovimientos();
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo posponer.' });
      }
    } catch {}
  };

  // Manejar eliminación de movimiento
  const handleDeleteMovimiento = async (mov) => {
    // Eliminar serie si es instancia recurrente
    if (mov && (mov._recurrente || mov.frecuencia)) {
      const confirmed = await Swal.fire({
        title: '¿Eliminar serie recurrente?',
        text: 'Se eliminará la serie completa y dejará de generarse en el calendario.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirmed.isConfirmed) return;
      try {
        const apiFetch = (await import('../utils/apiFetch')).default;
        const res = await apiFetch(`${API_BASE}/api/movimientos-recurrentes/${mov.id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire({ icon: 'success', title: 'Serie eliminada', timer: 1000, showConfirmButton: false });
          await refreshMovimientos();
        } else {
          const data = await res.json().catch(() => ({}));
          Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo eliminar la serie.' });
        }
      } catch (e) {
        // apiFetch maneja 401
      }
      return;
    }
    // Caso especial: transferencia agrupada
    if ((mov?.tipo || '').toLowerCase() === 'transferencia' && mov?._transfer) {
      // Preparar snapshot para deshacer (recrear transferencia)
      let undoPayload: any = null;
      try {
        const code = mov._transfer.code;
        const matchBoth = todosMovimientos.filter((m: any) => String(m.descripcion || '').includes(`[TRANSFER#${code}]`));
        const eg = matchBoth.find((x: any) => (String(x.tipo || '').toLowerCase()) === 'egreso');
        const ing = matchBoth.find((x: any) => (String(x.tipo || '').toLowerCase()) === 'ingreso');
        if (eg && ing) {
          undoPayload = {
            origen_id: eg.cuenta_id,
            destino_id: ing.cuenta_id,
            monto: Number(eg.monto || 0),
            fecha: String(eg.fecha || '').slice(0, 10),
            descripcion: ''
          };
        }
      } catch {}
      const { origenId, destinoId } = mov._transfer;
      const confirmed = await Swal.fire({
        title: '¿Eliminar transferencia?',
        text: 'Se eliminarán ambos movimientos (egreso e ingreso) asociados a esta transferencia y se revertirán los saldos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirmed.isConfirmed) return;
      try {
        const apiFetch = (await import('../utils/apiFetch')).default;
        // Borrar ambos lados; si alguno falla, reportar
        const results = await Promise.allSettled([
          origenId ? apiFetch(`${API_BASE}/api/transacciones/${origenId}`, { method: 'DELETE' }) : Promise.resolve({ ok: true }),
          destinoId ? apiFetch(`${API_BASE}/api/transacciones/${destinoId}`, { method: 'DELETE' }) : Promise.resolve({ ok: true })
        ]);
        const anyRejected = results.some(r => r.status === 'rejected');
        const anyNotOk = results.some(r => r.status === 'fulfilled' && r.value && r.value.ok === false);
        if (!anyRejected && !anyNotOk) {
          // Ofrecer deshacer
          const undo = await Swal.fire({ icon: 'success', title: 'Transferencia eliminada', text: 'Puedes deshacer esta acción.', showCancelButton: true, confirmButtonText: 'Deshacer', cancelButtonText: 'Cerrar', timer: 5000, timerProgressBar: true });
          if (undo.isConfirmed && undoPayload) {
            try {
              const apiFetch2 = (await import('../utils/apiFetch')).default;
              const resUndo = await apiFetch2(`${API_BASE}/api/transacciones/transferir`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(undoPayload) });
              if (resUndo.ok) {
                Swal.fire({ icon: 'success', title: 'Transferencia restaurada', timer: 1200, showConfirmButton: false });
              } else {
                const data = await resUndo.json().catch(() => ({}));
                Swal.fire({ icon: 'error', title: 'No se pudo deshacer', text: data.error || 'Intenta manualmente recrear la transferencia.' });
              }
            } catch {}
          }
          await refreshMovimientos();
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar completamente la transferencia.' });
        }
      } catch (e) {
        // apiFetch maneja 401
      }
      return;
    }
    const desc = String(mov?.descripcion || '');
    const isPagoDeuda = /pago\s*deuda/i.test(desc);
    const isAporteMeta = /aporte\s*(a\s*)?meta/i.test(desc);
    let title = '¿Eliminar movimiento?';
    let text = 'Esta acción no se puede deshacer. Se revertirá el saldo correspondiente.';
    if (isPagoDeuda) {
      title = '¿Eliminar pago de deuda?';
      // intentar extraer nombre después de ':' si existe
      const detalle = desc.includes(':') ? desc.split(':').slice(1).join(':').trim() : desc;
      text = `Estás eliminando el pago de la deuda ${detalle ? '"' + detalle + '"' : ''}. Se revertirá el saldo de tu cuenta y también se eliminará el pago en Deudas.`;
    } else if (isAporteMeta) {
      title = '¿Eliminar aporte de meta?';
      const detalle = desc.includes(':') ? desc.split(':').slice(1).join(':').trim() : desc;
      text = `Estás eliminando el aporte de la meta ${detalle ? '"' + detalle + '"' : ''}. Se revertirá el saldo de tu cuenta y también se eliminará el aporte en Metas.`;
    }
    const confirmed = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmed.isConfirmed) return;
    try {
      // Preparar snapshot para deshacer (recrear movimiento)
      const undoPayload: any = {
        cuenta_id: mov.cuenta_id,
        tipo: mov.tipo,
        monto: mov.monto,
        descripcion: mov.descripcion,
        fecha: String(mov.fecha || '').slice(0, 10),
        categoria_id: mov.categoria_id || null,
        icon: mov.icon || null,
        color: mov.color || null
      };
      const apiFetch = (await import('../utils/apiFetch')).default;
      const res = await apiFetch(`${API_BASE}/api/transacciones/${mov.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Ofrecer deshacer
        const undo = await Swal.fire({ icon: 'success', title: 'Movimiento eliminado', text: 'Puedes deshacer esta acción.', showCancelButton: true, confirmButtonText: 'Deshacer', cancelButtonText: 'Cerrar', timer: 5000, timerProgressBar: true });
        if (undo.isConfirmed) {
          try {
            const apiFetch2 = (await import('../utils/apiFetch')).default;
            const resUndo = await apiFetch2(`${API_BASE}/api/transacciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(undoPayload) });
            if (resUndo.ok) {
              Swal.fire({ icon: 'success', title: 'Movimiento restaurado', timer: 1200, showConfirmButton: false });
            } else {
              const data = await resUndo.json().catch(() => ({}));
              Swal.fire({ icon: 'error', title: 'No se pudo deshacer', text: data.error || 'Intenta recrearlo manualmente.' });
            }
          } catch {}
        }
        await refreshMovimientos();
      } else {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error', text: data.error || 'No se pudo eliminar el movimiento.' });
      }
    } catch (e) {
      // apiFetch maneja 401
    }
  };

  // Marcar días con movimientos
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const fecha = date.toISOString().slice(0, 10);
      const hayMov = todosMovimientos.some(m => (m.fecha ? m.fecha.slice(0, 10) : '') === fecha);
      if (hayMov) return <span style={{ color: '#6c4fa1', fontWeight: 700, fontSize: 18 }}>•</span>;
    }
    return null;
  };

  const handleExport = async () => {
    // Si no está en modo exportación, activarlo para permitir selección de rango
    if (!exportMode) {
      setExportMode(true);
      Swal.fire({ icon: 'info', title: 'Modo exportación activado', text: 'Selecciona un día o arrastra para elegir un rango y vuelve a presionar Exportar.' });
      return;
    }
    // Exportar con la selección actual
    let start, end;
    if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
      start = value[0].toISOString().slice(0, 10);
      end = value[1].toISOString().slice(0, 10);
    } else if (value instanceof Date) {
      start = value.toISOString().slice(0, 10);
      end = start;
    } else {
      Swal.fire({ icon: 'info', title: 'Selecciona una fecha o rango', text: 'Haz clic en un día o arrastra para seleccionar un rango.' });
      return;
    }
    try {
      const url = `${API_BASE}/api/transacciones/export?start=${start}&end=${end}`;
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + getToken() } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'No se pudo exportar', text: data.error || 'Error al generar el Excel.' });
        return;
      }
      const blob = await res.blob();
      const aUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = aUrl;
      a.download = `movimientos_${start}_a_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(aUrl);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo descargar el Excel.' });
    } finally {
      // Salir de modo exportación y volver a selección de un solo día
      setExportMode(false);
      if (Array.isArray(value) && value[0] instanceof Date) {
        setValue(value[0]);
      }
    }
  };

  // Exportación local (CSV y XLSX) usando el rango seleccionado y respetando filtros/búsqueda actuales
  const getRangoSeleccionado = (): { start: string; end: string } | null => {
    if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
      const start = value[0].toISOString().slice(0, 10);
      const end = value[1].toISOString().slice(0, 10);
      return { start, end };
    } else if (value instanceof Date) {
      const d = value.toISOString().slice(0, 10);
      return { start: d, end: d };
    }
    return null;
  };

  const filtrarPorRangoYControles = (start: string, end: string) => {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T23:59:59');
    const q = (search || '').trim().toLowerCase();
    return todosMovimientos.filter((m: any) => {
      const fstr = (m.fecha || '').slice(0, 10);
      if (!fstr) return false;
      const f = new Date(fstr + 'T12:00:00');
      if (f < s || f > e) return false;
      const tipo = String(m.tipo || '').toLowerCase();
      if (!filters[tipo as keyof typeof filters]) return false;
      if (!q) return true;
      const txt = `${m.descripcion || ''} ${m.cuenta || ''}`.toLowerCase();
      return txt.includes(q);
    });
  };

  const exportLocalCSV = () => {
    const rango = getRangoSeleccionado();
    if (!rango) {
      Swal.fire({ icon: 'info', title: 'Selecciona una fecha o rango', text: 'Haz clic en un día o arrastra para seleccionar un rango.' });
      return;
    }
    const rows = filtrarPorRangoYControles(rango.start, rango.end).map((m: any) => ({
      Fecha: (m.fecha || '').slice(0, 10),
      Tipo: m.tipo || '',
      Cuenta: m.cuenta || '',
      Categoria: m.categoria || m.categoria_nombre || '',
      Monto: Number(m.monto || 0).toFixed(2),
      Descripcion: m.descripcion || '',
      Icono: m.icon || '',
      Color: m.color || ''
    }));
    const header = ['Fecha','Tipo','Cuenta','Categoria','Monto','Descripcion','Icono','Color'];
    const esc = (v: any) => {
      const s = String(v ?? '');
      if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = [header.join(','), ...rows.map(r => header.map(h => esc((r as any)[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${rango.start}_a_${rango.end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportLocalXLSX = async () => {
    const rango = getRangoSeleccionado();
    if (!rango) {
      Swal.fire({ icon: 'info', title: 'Selecciona una fecha o rango', text: 'Haz clic en un día o arrastra para seleccionar un rango.' });
      return;
    }
    const rows = filtrarPorRangoYControles(rango.start, rango.end).map((m: any) => ({
      Fecha: (m.fecha || '').slice(0, 10),
      Tipo: m.tipo || '',
      Cuenta: m.cuenta || '',
      Categoria: m.categoria || m.categoria_nombre || '',
      Monto: Number(m.monto || 0),
      Descripcion: m.descripcion || '',
      Icono: m.icon || '',
      Color: m.color || ''
    }));
    try {
      // import dinámico para no cargar el bundle si no se usa
      const XLSX: any = await import(/* webpackChunkName: "xlsx" */'xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
      XLSX.writeFile(wb, `movimientos_${rango.start}_a_${rango.end}.xlsx`);
    } catch (e) {
      // Fallback a CSV si falla
      exportLocalCSV();
      Swal.fire({ icon: 'info', title: 'XLSX no disponible', text: 'Se exportó en CSV como alternativa.' });
    }
  };

  return (
    <div className="card calendar-card" style={{ color: 'var(--color-text)' }}>
      <h1 className="calendar-title ">Calendario de Movimientos</h1>
      <div className="calendar-actions toolbar" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
        <div ref={exportMenuRef} style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <button type="button" className="btn btn-primary"
            onClick={handleExport}
            title={exportMode ? 'Exportar por servidor usando la selección actual' : 'Entrar en modo de selección y exportar por servidor'}
          >
            {exportMode ? 'Exportar (servidor)' : 'Exportar'}
          </button>
          <button type="button" className="btn btn-ghost" aria-label="Más opciones de exportación" onClick={() => { setShowExportMenu(v => !v); setShowQuickMenu(false); setShowPresetsMenu(false); }}>
            ▾
          </button>
          {showExportMenu && (
            <div className="menu-popover" style={{ minWidth: 220 }}>
              <div className="menu-item" onClick={() => { exportLocalCSV(); setShowExportMenu(false); }}><span>📄</span><span>Exportar CSV (local)</span></div>
              <div className="menu-item" onClick={async () => { await exportLocalXLSX(); setShowExportMenu(false); }}><span>📊</span><span>Exportar XLSX (local)</span></div>
              {!exportMode && <div className="menu-sep" />}
              {!exportMode && <div className="menu-item" onClick={() => { setExportMode(true); setShowExportMenu(false); }}><span>📅</span><span>Seleccionar rango…</span></div>}
              {exportMode && <div className="menu-item danger" onClick={() => { setExportMode(false); if (Array.isArray(value) && value[0] instanceof Date) setValue(value[0]); setShowExportMenu(false); }}><span>✖</span><span>Cancelar selección</span></div>}
            </div>
          )}
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        {/* Vistas rápidas (reemplaza botones sueltos) */}
        <div ref={quickMenuRef} style={{ position: 'relative' }}>
          <button type="button" className="btn" onClick={() => { setShowQuickMenu(v => !v); setShowExportMenu(false); setShowPresetsMenu(false); }}>Vistas rápidas ▾</button>
          {showQuickMenu && (
            <div className="menu-popover" style={{ minWidth: 220 }}>
              <div className="menu-item" onClick={() => { setFilters({ ingreso: true, egreso: true, ahorro: true, transferencia: true }); setShowQuickMenu(false); }}><span>👀</span><span>Todos</span></div>
              <div className="menu-item" onClick={() => { setFilters({ ingreso: false, egreso: true, ahorro: false, transferencia: false }); setShowQuickMenu(false); }}><span>💸</span><span>Solo egresos</span></div>
              <div className="menu-item" onClick={() => { setFilters({ ingreso: true, egreso: false, ahorro: true, transferencia: false }); setShowQuickMenu(false); }}><span>💰</span><span>Ingresos/Ahorros</span></div>
              <div className="menu-item" onClick={() => { setFilters({ ingreso: true, egreso: true, ahorro: true, transferencia: false }); setShowQuickMenu(false); }}><span>🚫</span><span>Sin transferencias</span></div>
              <div className="menu-item" onClick={() => { setFilters({ ingreso: false, egreso: false, ahorro: false, transferencia: true }); setShowQuickMenu(false); }}><span>🔁</span><span>Solo transferencias</span></div>
            </div>
          )}
        </div>
        {/* Presets guardados en un popover compacto */}
        <div ref={presetsMenuRef} style={{ position: 'relative' }}>
          <button type="button" className="btn" onClick={() => { setShowPresetsMenu(v => !v); setShowExportMenu(false); setShowQuickMenu(false); }}>Presets ▾</button>
          {showPresetsMenu && (
            <div className="menu-popover" style={{ minWidth: 280 }}>
              <div className="menu-group" style={{ padding: '4px 8px' }}>
                <select value={selectedPreset} onChange={e => setSelectedPreset(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-input-border)', background: 'var(--color-card)', color: 'var(--color-text)' }}>
                  <option value="">Presets guardados…</option>
                  {savedPresets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="menu-sep" />
              <div className={`menu-item ${!selectedPreset ? 'disabled' : ''}`} onClick={() => { const p = savedPresets.find(x => x.name === selectedPreset); if (p) { setFilters(p.filters); setShowPresetsMenu(false); } }}><span>▶</span><span>Aplicar seleccionado</span></div>
              <div className="menu-item" onClick={async () => {
                const result = await Swal.fire({ title: 'Guardar preset', input: 'text', inputLabel: 'Nombre del preset', inputPlaceholder: 'Ej: Solo egresos', showCancelButton: true });
                if (!result.isConfirmed) return; const name = (result.value || '').trim(); if (!name) return;
                const existingIdx = savedPresets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
                if (existingIdx >= 0) { const next = [...savedPresets]; next[existingIdx] = { name, filters }; persistPresets(next); setSelectedPreset(name); }
                else { const next = [...savedPresets, { name, filters }]; persistPresets(next); setSelectedPreset(name); }
                setShowPresetsMenu(false);
                Swal.fire({ icon: 'success', title: 'Preset guardado', timer: 900, showConfirmButton: false });
              }}><span>💾</span><span>Guardar actual…</span></div>
              <div className={`menu-item danger ${!selectedPreset ? 'disabled' : ''}`} onClick={async () => {
                if (!selectedPreset) return; const c = await Swal.fire({ title: 'Eliminar preset', text: `¿Eliminar "${selectedPreset}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar' });
                if (!c.isConfirmed) return; const next = savedPresets.filter(p => p.name !== selectedPreset); persistPresets(next); setSelectedPreset(''); setShowPresetsMenu(false);
              }}><span>🗑</span><span>Eliminar seleccionado</span></div>
            </div>
          )}
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="input" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-input-border)', minWidth: 200 }} />
          <button className="btn" onClick={() => { setFilters(defaultFilters); setSearch(''); }}>Limpiar</button>
        </div>
      </div>
      {exportMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: '#fff8e1',
          color: '#5d4037',
          border: '1px solid #ffe082',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 16
        }}>
          <div style={{ fontWeight: 700 }}>
            Modo exportación activado
          </div>
          <div style={{ fontSize: 14 }}>
            Selecciona un día o arrastra para elegir un rango y luego presiona Exportar.
          </div>
        </div>
      )}
      <div className="calendar-layout">
        <div className="calendar-left">
          <Calendar
            onChange={setValue}
            value={value}
            tileContent={tileContent}
            locale="es-ES"
            calendarType="iso8601"
            selectRange={exportMode}
            className={`big-light-calendar ${exportMode ? 'export-mode' : ''}`}
          />
        </div>
        <div className="calendar-right">
          <h2 style={{ fontSize: 22, marginBottom: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            Movimientos del {fechaSeleccionada.split('-').reverse().join('/')}
          </h2>
          {/* Controles de filtro (segmentado) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            {(['ingreso','egreso','ahorro','transferencia'] as const).map(t => (
              <button key={t}
                onClick={() => setFilters(f => ({ ...f, [t]: !f[t] }))}
                style={{
                  padding: '6px 10px', borderRadius: 999, border: '1px solid var(--color-input-border)',
                  background: filters[t] ? 'var(--color-primary)' : 'var(--color-card)',
                  color: filters[t] ? '#fff' : 'var(--color-text)', fontWeight: 700
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--color-muted)', fontWeight: 700 }}>
                {movimientosFiltrados.length} resultado{movimientosFiltrados.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {(hayTransferenciasAgrupadas && filters.transferencia) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#e3f2fd',
              color: '#0d47a1',
              border: '1px solid #90caf9',
              borderRadius: 10,
              padding: '8px 12px',
              marginBottom: 12
            }}>
              <span style={{ fontSize: 18 }}>ℹ️</span>
              <div style={{ fontSize: 14 }}>
                Las transferencias se agrupan como un solo elemento y no se pueden editar aquí. Puedes eliminarlas y se borrarán ambos lados.
              </div>
            </div>
          )}
          {movimientosFiltrados.length === 0 ? (
            <div style={{ color: 'var(--color-muted)', fontSize: 18 }}>No hay movimientos para este día.</div>
          ) : (
            <div style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {movimientosFiltrados.map(mov => (
                  <li key={mov.id} style={{
                    marginBottom: 18,
                    padding: 22,
                    borderRadius: 18,
                    // Normalizar tipo y tratar 'ahorro' como ingreso para la UI; 'transferencia' usa su color propio
                    background: mov.color ? mov.color : (((mov.tipo || '').toLowerCase() === 'ingreso' || (mov.tipo || '').toLowerCase() === 'ahorro') ? 'linear-gradient(90deg, #1de9b6 0%, #43a047 100%)' : ((mov.tipo || '').toLowerCase() === 'transferencia' ? '#1976d2' : 'linear-gradient(90deg, #ff7043 0%, #c62828 100%)')),
                    color: (mov.color || (mov.tipo || '').toLowerCase() === 'transferencia') ? '#fff' : (((mov.tipo || '').toLowerCase() === 'ingreso' || (mov.tipo || '').toLowerCase() === 'ahorro') ? '#fff' : '#222'),
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: '0 2px 12px #0002',
                    position: 'relative',
                  }}>
                    <span style={{ fontSize: 36, marginRight: 18 }}>{mov.icon || (((mov.tipo || '').toLowerCase() === 'egreso') ? '💸' : ((mov.tipo || '').toLowerCase() === 'transferencia' ? '🔁' : '💰'))}</span>
                    <div className="movimiento-main" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-text)' }}>{mov.descripcion}</div>
                        {/* Badge que muestra el tipo: Ahorro / Ingreso / Egreso */}
                        <div style={{ fontSize: 12, padding: '4px 8px', borderRadius: 12, background: mov.tipo === 'ingreso' ? '#1de9b6' : (mov.tipo === 'ahorro' ? '#4fc3f7' : (mov.tipo === 'transferencia' ? '#90caf9' : '#ff8a80')), color: mov.tipo === 'transferencia' ? '#0d47a1' : '#222', fontWeight: 800, textTransform: 'capitalize' }}>{mov.tipo}</div>
                      </div>
                      <div style={{ fontSize: 15, color: 'var(--color-muted)', marginBottom: 2 }}>{mov.cuenta}</div>
                    </div>
                    <div className="movimiento-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="movimiento-amount" style={{ fontWeight: 800, fontSize: 22, color: ((mov.tipo || '').toLowerCase() === 'ingreso' || (mov.tipo || '').toLowerCase() === 'ahorro' || (mov.tipo || '').toLowerCase() === 'transferencia') ? '#fff' : '#222', minWidth: 160, textAlign: 'right' }}>
                        {((mov.tipo || '').toLowerCase() === 'ingreso' || (mov.tipo || '').toLowerCase() === 'ahorro') ? '+' : ((mov.tipo || '').toLowerCase() === 'transferencia' ? '' : '-')}S/ {Number(mov.monto).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="movimiento-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        {((mov.tipo || '').toLowerCase() !== 'transferencia') && (
                          <button onClick={() => handleEditMovimiento(mov)} style={{ background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
                            {mov && (mov._recurrente || mov.frecuencia) ? 'Editar serie' : 'Editar'}
                          </button>
                        )}
                        {mov && (mov._recurrente || mov.frecuencia) && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button onClick={() => aplicarRecurrenteHoy(mov)} style={{ background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Aplicar hoy</button>
                            <button onClick={() => saltarRecurrenteHoy(mov)} style={{ background: 'rgba(0,0,0,0.18)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Saltar hoy</button>
                            <button onClick={() => posponerRecurrente(mov, 7)} style={{ background: 'rgba(0,0,0,0.18)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>+1 semana</button>
                            <button onClick={() => posponerRecurrente(mov, 30)} style={{ background: 'rgba(0,0,0,0.18)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>+1 mes</button>
                          </div>
                        )}
                        <button onClick={() => handleDeleteMovimiento(mov)} style={{ background: 'rgba(0,0,0,0.08)', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
                          {mov && (mov._recurrente || mov.frecuencia) ? 'Eliminar serie' : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .toolbar .btn { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--color-input-border); background: var(--color-card); color: var(--color-text); font-weight: 700; cursor: pointer; }
        .toolbar .btn:hover { filter: brightness(1.02); }
        .toolbar .btn-primary { background: var(--color-primary); color: #fff; border: none; }
        .toolbar .btn-ghost { background: transparent; border: 1px solid var(--color-input-border); }
        .menu-popover { position: absolute; top: 100%; left: 0; margin-top: 6px; padding: 6px 0; background: var(--color-card); color: var(--color-text); border: 1px solid var(--color-input-border); border-radius: 10px; box-shadow: 0 12px 30px var(--card-shadow); z-index: 20; }
  .menu-item { padding: 8px 12px; white-space: nowrap; cursor: pointer; display:flex; align-items:center; gap: 8px; }
        .menu-item:hover { background: rgba(0,0,0,0.06); }
        .menu-item.disabled { opacity: 0.5; pointer-events: none; }
        .menu-item.danger { color: #b91c1c; }
        .menu-sep { height: 1px; background: var(--color-input-border); margin: 4px 0; }
        .big-light-calendar {
          background: #fff !important;
          border-radius: 18px;
          color: #222 !important;
          font-size: 1.3rem;
          box-shadow: 0 2px 12px #0002;
          border: none;
          width: 100%;
        }
        .big-light-calendar.export-mode {
          box-shadow: 0 0 0 3px #f9a825 inset, 0 2px 12px #0002;
        }
        .big-light-calendar .react-calendar__tile--active {
          background: #6c4fa1 !important;
          color: #fff !important;
        }
        .big-light-calendar .react-calendar__tile--now {
          background: #b39ddb !important;
          color: #222 !important;
        }
        .big-light-calendar .react-calendar__tile {
          min-height: 60px;
        }
          .big-light-calendar {
            background: var(--color-card) !important;
            border-radius: 18px;
            color: var(--color-text) !important;
            font-size: 1.3rem;
            box-shadow: 0 2px 12px var(--card-shadow);
            border: none;
            width: 100%;
          }
          .big-light-calendar.export-mode {
            box-shadow: 0 0 0 3px #f9a825 inset, 0 2px 12px var(--card-shadow);
          }
          .big-light-calendar .react-calendar__tile--active {
            background: var(--color-primary) !important;
            color: #fff !important;
          }
          .big-light-calendar .react-calendar__tile--now {
            background: #b39ddb !important;
            color: var(--color-text) !important;
          }
          .big-light-calendar .react-calendar__tile {
            min-height: 60px;
          }
          .calendar-layout { display: flex; gap: 20px; align-items: flex-start; justify-content: flex-start; flex-wrap: nowrap; }
          /* Columna izquierda adaptativa: hasta 360px o 40% del espacio disponible */
          .calendar-left { width: min(360px, 40%); max-width: 360px; flex: 0 0 auto; }
          .calendar-left .big-light-calendar { margin: 0 auto; }
          /* Columna derecha: ocupa el resto pero no se encoja demasiado. Añadimos padding y overflow para evitar recortes */
          .calendar-right { flex: 1 1 auto; min-width: 280px; padding-left: 8px; overflow: visible; }
          .calendar-right ul { padding-right: 8px; }
          .movimiento-amount { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

          /* Apilar para anchos hasta 1024px (incluido) */
          @media (max-width: 1024px) {
            .calendar-title {
              text-align: center;
              width: 100%;
              margin-bottom: 18px;
            }
            .calendar-layout { flex-direction: column; }
            /* Centrar la columna del calendario */
            .calendar-left {
              width: 100%;
              max-width: 360px;
              margin-left: auto;
              margin-right: auto;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding-top: 8px;
              box-sizing: border-box;
            }
            .calendar-actions {
              justify-content: center;
              width: 100%;
            }
            .calendar-right { width: 100%; }
            .big-light-calendar {
              font-size: 1rem;
              max-width: 360px;
              width: 100%;
              margin-left: auto;
              margin-right: auto;
              align-self: center;
              box-sizing: border-box;
            }
            .calendar-right h2 { font-size: 18px; }
            .calendar-right li { padding: 14px; border-radius: 12px; }
            .movimiento-amount { font-size: 18px !important; min-width: 120px !important; text-align: left !important; width: auto; white-space: normal; }
            .movimiento-right { display: block; width: 100%; margin-top: 8px; }
            .movimiento-right .movimiento-amount { margin-bottom: 8px; }
            .movimiento-actions { display: flex !important; flex-direction: row !important; justify-content: flex-start !important; gap: 8px !important; }
            .movimiento-actions button { width: auto !important; padding: 8px 10px !important; }
            .big-light-calendar .react-calendar__tile { min-height: 48px; }
            .big-light-calendar { width: 100% !important; }
            /* Hacer que el contenido principal ocupe todo el ancho del bloque rojo */
            .calendar-right li { display: flex; flex-direction: column; }
            .calendar-right li > .movimiento-main { width: 100%; }
            .calendar-right li > .movimiento-right { width: 100%; display: block; }
            /* Permitir que el listado tenga scroll si el contenedor es estrecho */
            .calendar-right ul { max-height: calc(100vh - 360px); overflow: auto; }
            .calendar-right li > .movimiento-right { margin-top: 12px; }
          }
          .big-light-calendar .react-calendar__month-view__weekdays__weekday,
          .big-light-calendar .react-calendar__month-view__weekdays {
            color: var(--color-text) !important;
            font-weight: 700;
          }
          .big-light-calendar .react-calendar__navigation__label,
          .big-light-calendar .react-calendar__navigation__arrow {
            color: var(--color-text) !important;
          }
          .big-light-calendar button { color: var(--color-text) !important; }
          .big-light-calendar abbr { color: var(--color-text) !important; }
      `}</style>
    </div>
  );
}
