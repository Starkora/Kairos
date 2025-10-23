import React, { useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TipoSelect, FrecuenciaSelect, ColorInput } from '../components/SharedInputs';
import apiFetch from '../utils/apiFetch';
// Importación asegurada de react-icons
import { FaEdit, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { ActionButton } from '../components/ActionButton';


interface Movimiento {
    id: number;
    tipo: string;
    cuenta_id: number;
    monto: number;
    frecuencia: string;
    inicio: string;
    fin?: string;
    indefinido: boolean;
    categoria_id?: number;
    icon?: string;
    color?: string;
}

const MovimientosRecurrentes = () => {
    const [movimientos, setMovimientos] = useState([] as Movimiento[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categorias, setCategorias] = useState<{id:number, nombre:string}[]>([]);
    const [cuentasMap, setCuentasMap] = useState<Record<number,string>>({});
    const [categoriasMap, setCategoriasMap] = useState<Record<number,string>>({});

    useEffect(() => {
        cargarMovimientos();
    }, []);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
      .swal-wide { max-width: 920px !important; width: 100% !important; }
      .swal2-html-container > div[style*='display:grid'] { width: 100% !important; max-width: 720px !important; box-sizing: border-box; }
      .swal2-html-container input.swal2-input { width: 100% !important; box-sizing: border-box; }
      html.dark .swal2-popup { background: #18181b !important; color: #f3f4f6 !important; }
      html.dark .swal2-title, html.dark .swal2-html-container { color: #f3f4f6 !important; }
      html.dark .swal2-actions button { color-scheme: dark; }
    `;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    const cargarMovimientos = async () => {
        try {
            const res = await apiFetch('/api/movimientos-recurrentes');
            const data = await res.json();
            console.log('Movimientos recurrentes recibidos:', data); // <-- Log de depuración
            setMovimientos(Array.isArray(data) ? data : []);
            // cargar cuentas y categorias para nombres
            try {
                const cuentasRes = await apiFetch('/api/cuentas?plataforma=web');
                const cuentasData = await cuentasRes.json();
                if (Array.isArray(cuentasData)) {
                    const map: Record<number,string> = {};
                    cuentasData.forEach((c:any) => { map[c.id] = c.nombre; });
                    setCuentasMap(map);
                }
            } catch (e) {}
            try {
                const categoriasRes = await apiFetch('/api/categorias?plataforma=web');
                const categoriasData = await categoriasRes.json();
                if (Array.isArray(categoriasData)) {
                    const map: Record<number,string> = {};
                    categoriasData.forEach((c:any) => { map[c.id] = c.nombre; });
                    setCategoriasMap(map);
                }
            } catch (e) {}
        } catch (err) {
            setError('No se pudieron cargar los movimientos recurrentes');
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            html: `<div style="font-size:1.15rem;font-weight:500;color:#a21caf;">¿Eliminar este movimiento recurrente?</div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<span style="font-weight:700;font-size:1.1rem;">Sí, eliminar</span>',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'swal-wide kr-modal-popup',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-cancel'
            },
            reverseButtons: true,
            focusCancel: true
        });
        if (!result.isConfirmed) return;
        try {
            await apiFetch(`/api/movimientos-recurrentes/${id}`, { method: 'DELETE' });
            cargarMovimientos();
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El movimiento recurrente fue eliminado.', timer: 1200, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.' });
        }
    };

    const handleEditar = async (mov: Movimiento) => {
        // Modal SweetAlert2 con diseño moderno y estilizado
        let tipoValue = mov.tipo;
        let frecuenciaValue = mov.frecuencia;
        let colorValue = mov.color || '#c62828';
        let categoriaValue = mov.categoria_id || '';
        let indefinidoValue = mov.indefinido;

        const { value: formValues, isDismissed } = await Swal.fire({
            title: '<span style="color:#06b6d4;font-weight:800;font-size:1.6rem;">Editar movimiento recurrente</span>',
            html:
                `<div class="kr-modal-grid">
                    <div class="kr-modal-field">
                        <label>Tipo</label>
                        <span id="swal-tipo-container"></span>
                    </div>
                    <div class="kr-modal-field">
                        <label>Monto</label>
                        <input id="swal-monto" class="kr-modal-input" type="number" value="${mov.monto}" />
                    </div>
                    <div class="kr-modal-field">
                        <label>Frecuencia</label>
                        <span id="swal-frecuencia-container"></span>
                    </div>
                    <div class="kr-modal-field">
                        <label>Inicio</label>
                        <input id="swal-inicio" class="kr-modal-input" type="date" value="${mov.inicio}" />
                    </div>
                    <div class="kr-modal-field">
                        <label>Fin</label>
                        <input id="swal-fin" class="kr-modal-input" type="date" value="${mov.fin || ''}" />
                    </div>
                    <div class="kr-modal-field">
                        <label>Icono</label>
                        <input id="swal-icon" class="kr-modal-input" value="${mov.icon || ''}" />
                    </div>
                    <div class="kr-modal-field kr-modal-field-full">
                        <label>Categoría</label>
                        <span id="swal-categoria-container"></span>
                    </div>
                    <div class="kr-modal-field kr-modal-field-full">
                        <label>Color</label>
                        <span id="swal-color-container"></span>
                    </div>
                    <div class="kr-modal-field kr-modal-field-full flex flex-col items-center mt-2">
                        <label for="swal-indefinido" style="font-weight:700;">Indefinido</label>
                        <input id="swal-indefinido" type="checkbox" ${mov.indefinido ? 'checked' : ''} style="width:20px;height:20px;accent-color:#06b6d4;margin-top:8px;" />
                    </div>
                </div>`,
            customClass: { popup: 'swal-wide kr-modal-popup' },
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '<span style="font-weight:700;font-size:1.1rem;">Guardar</span>',
            cancelButtonText: 'Cancelar',
            didOpen: async () => {
                // Cargar categorías al abrir
                const res = await apiFetch(`/api/categorias/${mov.tipo}?plataforma=web`);
                const data = await res.json();
                setCategorias(Array.isArray(data) ? data : []);
                // Tipo
                const tipoContainer = document.getElementById('swal-tipo-container');
                if (tipoContainer) {
                    const tipoSelect = document.createElement('select');
                    tipoSelect.id = 'swal-tipo';
                    tipoSelect.className = 'kr-modal-input';
                    tipoSelect.innerHTML = `
                        <option value="ingreso" ${mov.tipo === 'ingreso' ? 'selected' : ''}>Ingreso</option>
                        <option value="egreso" ${mov.tipo === 'egreso' ? 'selected' : ''}>Egreso</option>
                        <option value="ahorro" ${mov.tipo === 'ahorro' ? 'selected' : ''}>Ahorro</option>
                    `;
                    tipoSelect.onchange = async (e) => {
                        tipoValue = (e.target as HTMLSelectElement).value;
                        const res = await apiFetch(`/api/categorias/${tipoValue}?plataforma=web`);
                        const data = await res.json();
                        setCategorias(Array.isArray(data) ? data : []);
                        // Actualizar categorías
                        const catContainer = document.getElementById('swal-categoria-container');
                        if (catContainer) {
                            const select = document.createElement('select');
                            select.id = 'swal-categoria';
                            select.className = 'kr-modal-input';
                            select.innerHTML = data.map((cat:any) => `<option value="${cat.id}">${cat.nombre}</option>`).join('');
                            catContainer.innerHTML = '';
                            catContainer.appendChild(select);
                        }
                    };
                    tipoContainer.innerHTML = '';
                    tipoContainer.appendChild(tipoSelect);
                }
                // Frecuencia
                const frecuenciaContainer = document.getElementById('swal-frecuencia-container');
                if (frecuenciaContainer) {
                    const frecuenciaSelect = document.createElement('select');
                    frecuenciaSelect.id = 'swal-frecuencia';
                    frecuenciaSelect.className = 'kr-modal-input';
                    frecuenciaSelect.innerHTML = `
                        <option value="mensual" ${mov.frecuencia === 'mensual' ? 'selected' : ''}>Mensual</option>
                        <option value="semanal" ${mov.frecuencia === 'semanal' ? 'selected' : ''}>Semanal</option>
                        <option value="diaria" ${mov.frecuencia === 'diaria' ? 'selected' : ''}>Diaria</option>
                    `;
                    frecuenciaSelect.onchange = (e) => {
                        frecuenciaValue = (e.target as HTMLSelectElement).value;
                    };
                    frecuenciaContainer.innerHTML = '';
                    frecuenciaContainer.appendChild(frecuenciaSelect);
                }
                // Categoría
                const catContainer = document.getElementById('swal-categoria-container');
                if (catContainer) {
                    const select = document.createElement('select');
                    select.id = 'swal-categoria';
                    select.className = 'kr-modal-input';
                    select.innerHTML = data.map((cat:any) => `<option value="${cat.id}" ${cat.id === mov.categoria_id ? 'selected' : ''}>${cat.nombre}</option>`).join('');
                    catContainer.innerHTML = '';
                    catContainer.appendChild(select);
                }
                // Color
                const colorContainer = document.getElementById('swal-color-container');
                if (colorContainer) {
                    const colorInput = document.createElement('input');
                    colorInput.type = 'color';
                    colorInput.id = 'swal-color';
                    colorInput.className = 'kr-modal-input';
                    colorInput.value = mov.color || '#c62828';
                    colorInput.oninput = (e) => {
                        colorValue = (e.target as HTMLInputElement).value;
                        colorPreview.textContent = colorValue;
                        colorPreview.style.background = colorValue;
                    };
                    const colorPreview = document.createElement('span');
                    colorPreview.textContent = colorValue;
                    colorPreview.className = 'kr-modal-color-preview';
                    colorPreview.style.background = colorValue;
                    colorContainer.innerHTML = '';
                    colorContainer.appendChild(colorInput);
                    colorContainer.appendChild(colorPreview);
                }
            },
            preConfirm: () => {
                return {
                    tipo: (document.getElementById('swal-tipo') as HTMLSelectElement).value,
                    monto: (document.getElementById('swal-monto') as HTMLInputElement).value,
                    frecuencia: (document.getElementById('swal-frecuencia') as HTMLSelectElement).value,
                    inicio: (document.getElementById('swal-inicio') as HTMLInputElement).value,
                    fin: (document.getElementById('swal-fin') as HTMLInputElement).value,
                    indefinido: (document.getElementById('swal-indefinido') as HTMLInputElement).checked,
                    categoria_id: (document.getElementById('swal-categoria') as HTMLSelectElement).value,
                    icon: (document.getElementById('swal-icon') as HTMLInputElement).value,
                    color: (document.getElementById('swal-color') as HTMLInputElement).value,
                };
            }
        });

        if (!formValues || isDismissed) {
            return;
        }

        try {
            const payload = {
                ...mov,
                ...formValues,
                monto: formValues.monto !== undefined ? parseFloat(formValues.monto) : mov.monto,
                categoria_id: formValues.categoria_id !== undefined && formValues.categoria_id !== '' ? parseInt(formValues.categoria_id) : null,
                cuenta_id: mov.cuenta_id !== undefined ? Number(mov.cuenta_id) : undefined,
                indefinido: Boolean(formValues.indefinido),
                fin: formValues.fin === '' ? null : formValues.fin
            };
            await apiFetch(`/api/movimientos-recurrentes/${mov.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            cargarMovimientos();
            Swal.fire({ icon: 'success', title: 'Movimiento actualizado', timer: 1200, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la edición.' });
        }
    };

    if (loading) return <div>Cargando movimientos recurrentes...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="card">
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, color: '#0891b2', letterSpacing: 0.5 }}>Movimientos Recurrentes</h2>
            <div className="kr-table-bg" style={{ width: '100%', overflowX: 'auto', borderRadius: 18, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)' }}>
                <table style={{ minWidth: 800, width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: 18, overflow: 'hidden' }}>
                    <thead>
                        <tr style={{ background: '#0891b2' }}>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Tipo</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Cuenta</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Monto</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Frecuencia</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Inicio</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Fin</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Indefinido</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Categoría</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Icono</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Color</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontWeight: 900, color: '#fff', fontSize: 17, whiteSpace: 'nowrap' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movimientos.length === 0 ? (
                            <tr>
                                <td colSpan={12} style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 16 }}>No hay movimientos recurrentes registrados.</td>
                            </tr>
                        ) : (
                            movimientos.map((mov, idx) => {
                                function getTextColor(bg: string) {
                                    if (!bg) return '#222';
                                    if (bg[0] === '#') {
                                        const hex = bg.replace('#', '');
                                        const r = parseInt(hex.substring(0,2),16);
                                        const g = parseInt(hex.substring(2,4),16);
                                        const b = parseInt(hex.substring(4,6),16);
                                        const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
                                        return luminance > 0.6 ? '#222' : '#fff';
                                    }
                                    return '#fff';
                                }
                                return (
                                    <tr
                                        key={mov.id}
                                        style={{
                                            background: idx % 2 === 0 ? '#2d3748' : '#23232b',
                                            borderBottom: '1.5px solid #0891b2',
                                            transition: 'background 0.2s',
                                            cursor: 'pointer',
                                        }}
                                        onMouseOver={e => (e.currentTarget.style.background = '#164e63')}
                                        onMouseOut={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#2d3748' : '#23232b')}
                                    >
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#e0f2fe', fontWeight: 600 }}>{mov.tipo}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#bae6fd' }}>{cuentasMap[mov.cuenta_id] ?? mov.cuenta_id}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#67e8f9', fontWeight: 700 }}>S/. {mov.monto}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#e0f2fe' }}>{mov.frecuencia}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#e0f2fe' }}>{mov.inicio}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#e0f2fe' }}>{mov.fin || '-'}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#e0f2fe' }}>{mov.indefinido ? 'Sí' : 'No'}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#fbbf24' }}>{mov.categoria_id ? (categoriasMap[mov.categoria_id] ?? mov.categoria_id) : '-'}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', color: '#fbbf24' }}>{mov.icon || '-'}</td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px' }}>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    borderRadius: 8,
                                                    padding: '4px 12px',
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    border: '1.5px solid #0891b2',
                                                    background: mov.color || '#eee',
                                                    color: getTextColor(mov.color || '#eee'),
                                                    boxShadow: '0 1px 4px 0 rgba(0,0,0,0.10)'
                                                }}
                                            >
                                                {mov.color || '-'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                                <ActionButton
                                                    icon={FaEdit}
                                                    color="text-cyan-300 hover:text-cyan-100"
                                                    title="Editar"
                                                    onClick={() => handleEditar(mov)}
                                                />
                                                <ActionButton
                                                    icon={FaTrash}
                                                    color="text-red-400 hover:text-red-200"
                                                    title="Eliminar"
                                                    onClick={() => handleEliminar(mov.id)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MovimientosRecurrentes;
