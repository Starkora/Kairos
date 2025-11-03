const Transaccion = require('../../models/transaccion');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

exports.getAll = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const plataforma = req.query.plataforma || req.body.plataforma;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!plataforma) return res.status(400).json({ error: 'Falta campo plataforma en la consulta' });
  try {
    const rows = await Transaccion.getAllByUsuario(usuario_id, plataforma);
    res.json(rows);
  } catch (err) {
    console.error('[transacciones.create] Error al crear movimiento:', err && err.message, err && err.code);
    // Detectar errores por valor no permitido (ENUM/truncation) y sugerir migración
    if (err && (err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || /truncated|incorrect value for column|Illegal mix of collations/i.test(err.message || ''))) {
      return res.status(400).json({ code: 'INVALID_TYPE', message: 'El tipo proporcionado no es válido en la base de datos. Aplica la migración add_ahorro_to_categorias.sql para permitir el tipo "ahorro" en categorías y movimientos.' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  let { cuenta_id, tipo, monto, descripcion, fecha, categoria_id, icon, color } = req.body;
  // Normalizar tipo a minúsculas para aceptar 'Ahorro', 'AHORRO', etc.
  tipo = (tipo === undefined || tipo === null) ? tipo : String(tipo).toLowerCase();

  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  // Validación detallada de campos requeridos + logging para depurar
  const missing = [];
  if (!cuenta_id) missing.push('cuenta_id');
  if (!tipo) missing.push('tipo');
  if (!monto) missing.push('monto');
  if (!fecha) missing.push('fecha');
  if (missing.length) {
    console.warn('[transacciones.create] Faltan campos requeridos:', missing, 'Payload recibido:', req.body);
    return res.status(400).json({ error: 'Faltan campos requeridos', missing, receivedKeys: Object.keys(req.body || {}) });
  }

  const db = require('../../config/database');
  try {
    // Obtener la plataforma del usuario
    const [usuarios] = await db.query('SELECT plataforma FROM usuarios WHERE id = ?', [usuario_id]);
    if (!usuarios || usuarios.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const plataforma = usuarios[0].plataforma;

    // Validar que la cuenta pertenezca al usuario
    const [cuentas] = await db.query('SELECT * FROM cuentas WHERE id = ? AND usuario_id = ?', [cuenta_id, usuario_id]);
    if (!cuentas || cuentas.length === 0) return res.status(403).json({ error: 'Cuenta no pertenece al usuario' });
    // Si hay categoría, validar que pertenezca al usuario
    if (categoria_id) {
      const [cats] = await db.query('SELECT * FROM categorias WHERE id = ? AND usuario_id = ?', [categoria_id, usuario_id]);
      if (!cats || cats.length === 0) return res.status(403).json({ error: 'Categoría no pertenece al usuario' });
    }
    console.log('[transacciones.create] Payload recibido:', { usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color });
    const result = await Transaccion.create({ usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color });
    console.log('[transacciones.create] Resultado create.insertId:', result && result.insertId);
    res.status(201).json({ message: 'Movimiento creado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Transferencia entre cuentas (atómica)
exports.transferir = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  let { origen_id, destino_id, monto, fecha, descripcion } = req.body || {};
  monto = Number(monto);
  if (!origen_id || !destino_id || !monto || isNaN(monto) || monto <= 0 || !fecha) {
    return res.status(400).json({ error: 'Campos requeridos: origen_id, destino_id, monto>0, fecha' });
  }
  if (Number(origen_id) === Number(destino_id)) {
    return res.status(400).json({ error: 'La cuenta origen y destino deben ser diferentes' });
  }
  const db = require('../../config/database');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Obtener plataforma del usuario
    const [usuarios] = await conn.query('SELECT plataforma FROM usuarios WHERE id = ?', [usuario_id]);
    if (!usuarios || usuarios.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Usuario no encontrado' }); }
    const plataforma = usuarios[0].plataforma;
    // Validar cuentas y obtener nombres
    const [[cuentaO]] = await conn.query('SELECT id, nombre, saldo_actual FROM cuentas WHERE id = ? AND usuario_id = ?', [origen_id, usuario_id]);
    const [[cuentaD]] = await conn.query('SELECT id, nombre, saldo_actual FROM cuentas WHERE id = ? AND usuario_id = ?', [destino_id, usuario_id]);
    if (!cuentaO || !cuentaD) { await conn.rollback(); return res.status(403).json({ error: 'Las cuentas deben pertenecer al usuario' }); }

    // Decidir si aplica inmediatamente
    const todayStr = new Date().toISOString().slice(0,10);
    const fechaStr = String(fecha).slice(0,10);
    const applied = fechaStr <= todayStr ? 1 : 0;
    // Validar saldo suficiente si aplica de inmediato
    if (applied && Number(cuentaO.saldo_actual) < monto) {
      await conn.rollback();
      return res.status(409).json({ code: 'INSUFFICIENT_FUNDS', error: 'Saldo insuficiente en la cuenta origen' });
    }

    const icon = '🔁';
    const color = '#1976d2';
    const code = 'T' + Date.now();

    // Insert egreso en origen
    const descEgreso = `Transferencia a ${cuentaD.nombre}${descripcion ? ' - ' + descripcion : ''} [TRANSFER#${code}]`;
    const [resEgreso] = await conn.query(
      'INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color, applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usuario_id, origen_id, 'egreso', monto, descEgreso, fechaStr, null, plataforma || 'web', icon, color, applied]
    );
    if (applied) {
      await conn.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [monto, origen_id]);
    }

    // Insert ingreso en destino
    const descIngreso = `Transferencia desde ${cuentaO.nombre}${descripcion ? ' - ' + descripcion : ''} [TRANSFER#${code}]`;
    const [resIngreso] = await conn.query(
      'INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color, applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usuario_id, destino_id, 'ingreso', monto, descIngreso, fechaStr, null, plataforma || 'web', icon, color, applied]
    );
    if (applied) {
      await conn.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, destino_id]);
    }

    await conn.commit();
    return res.status(201).json({ success: true, egresoId: resEgreso.insertId, ingresoId: resIngreso.insertId, code });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// Eliminar movimiento
exports.deleteById = async (req, res) => {
  const id = req.params.id;
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const db = require('../../config/database');
  try {
    // Obtener info del movimiento para poder revertir pagos/aportes de deudas/metas si corresponde
    const [rows] = await db.query('SELECT id, usuario_id, descripcion, monto FROM movimientos WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Movimiento no encontrado' });
    const mov = rows[0];
    if (mov.usuario_id !== usuario_id) return res.status(403).json({ error: 'No autorizado' });

    const Transaccion = require('../../../models/transaccion');
    await Transaccion.deleteById(id);

    // Detectar marcadores ocultos en la descripción para revertir progreso de deuda/meta
    try {
      const desc = String(mov.descripcion || '');
      const monto = Number(mov.monto || 0);
      const mDeuda = desc.match(/\[DEUDA#(\d+)\]/i);
      const mMeta = desc.match(/\[META#(\d+)\]/i);
      if (mDeuda) {
        const deudaId = Number(mDeuda[1]);
        // Restar el pago y, si corresponde, marcar como no pagada
        await db.query(
          'UPDATE deudas SET monto_pagado = GREATEST(monto_pagado - ?, 0), pagada = CASE WHEN GREATEST(monto_pagado - ?, 0) >= monto_total THEN 1 ELSE 0 END WHERE id = ? AND usuario_id = ?',
          [monto, monto, deudaId, usuario_id]
        );
      } else if (mMeta) {
        const metaId = Number(mMeta[1]);
        await db.query(
          'UPDATE metas SET monto_ahorrado = GREATEST(monto_ahorrado - ?, 0), cumplida = CASE WHEN GREATEST(monto_ahorrado - ?, 0) >= monto_objetivo THEN 1 ELSE 0 END WHERE id = ? AND usuario_id = ?',
          [monto, monto, metaId, usuario_id]
        );
      }
    } catch (e) {
      // No bloquear la eliminación si falla la reversión; solo loguear
      console.warn('[transacciones.deleteById] No se pudo revertir deuda/meta:', e && e.message);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar movimiento
exports.update = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const id = req.params.id;
  let { cuenta_id, tipo, monto, descripcion, fecha, categoria_id, icon, color } = req.body;
  // Normalizar tipo a minúsculas
  tipo = (tipo === undefined || tipo === null) ? tipo : String(tipo).toLowerCase();
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!cuenta_id || !tipo || !monto || !fecha) return res.status(400).json({ error: 'Faltan campos requeridos' });
  try {
    const Transaccion = require('../../../models/transaccion');
    await Transaccion.update({ id, usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, icon, color });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generar y descargar plantilla Excel con listas desplegables (100 filas)
exports.descargarPlantilla = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  try {
    const db = require('../../config/database');
    // Obtener listas del usuario
    const [cuentas] = await db.query('SELECT id, nombre FROM cuentas WHERE usuario_id = ? ORDER BY nombre ASC', [usuario_id]);
    const [categorias] = await db.query('SELECT id, nombre FROM categorias WHERE usuario_id = ? ORDER BY nombre ASC', [usuario_id]);

  const tipos = ['ingreso', 'egreso', 'ahorro', 'transferencia'];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Plantilla');
  const wsInfo = wb.addWorksheet('Instrucciones');
  const wsList = wb.addWorksheet('Listas');
    wsList.state = 'veryHidden';
    // Hoja de instrucciones
    wsInfo.addRow(['Cómo usar esta plantilla']).font = { bold: true, size: 14 };
  wsInfo.addRow(['- Rellena las filas desde la 2 hasta la 101.']).font = { italic: true };
    wsInfo.addRow(['- En cuenta y categoría puedes escoger de la lista desplegable o escribir el ID.']);
  wsInfo.addRow(['- Tipo debe ser uno de: ingreso, egreso, ahorro, transferencia.']);
    wsInfo.addRow(['- Fecha en formato YYYY-MM-DD (ej. 2025-10-04).']);
  wsInfo.addRow(['- Icono y Color: opcionales. Puedes seleccionarlos del desplegable.']);
  wsInfo.addRow(['  Si los dejas vacíos, en la importación se aplicarán colores por defecto según el tipo.']);
  wsInfo.addRow(['  Colores por defecto: ingreso=verde (#2e7d32), egreso=rojo (#c62828), ahorro=naranja (#ff9800), transferencia=azul (#1976d2).']);
  wsInfo.addRow(['  Icono en transferencias se fija a 🔁 automáticamente.']);
  wsInfo.addRow(['Iconos disponibles: 💸  💰  🏦  🍎  🚗  💳  🔌  🎁  🛒  🏥']);
    wsInfo.addRow(['Ejemplo usando nombres:']);
    wsInfo.addRow(['cuenta', 'tipo', 'monto', 'descripcion', 'fecha', 'categoria']);
    wsInfo.addRow(['Cuenta 1', 'ingreso', '100.00', 'Texto opcional', todayISO(), 'Categoría 1']);
    wsInfo.addRow([]);
    wsInfo.addRow(['Ejemplo usando IDs:']);
    wsInfo.addRow(['cuenta_id', 'tipo', 'monto', 'descripcion', 'fecha', 'categoria_id']);
    wsInfo.addRow(['1', 'egreso', '50.00', 'Compra', todayISO(), '2']);
    wsInfo.columns = [
      { width: 24 }, { width: 18 }, { width: 14 }, { width: 32 }, { width: 18 }, { width: 24 }
    ];


  // Encabezados visibles más amigables; importación sigue aceptando *_id y también por nombre
  // Para transferencias usar también 'cuenta_destino' (o 'cuenta_destino_id').
  // Icono y color son opcionales; en la importación el color será asignado por defecto según el tipo.
  const headers = ['cuenta', 'tipo', 'monto', 'descripcion', 'fecha', 'categoria', 'cuenta_destino', 'icon', 'color'];
    ws.addRow(headers);

    // Hoja de listas: columnas A, B, C
  wsList.getCell('A1').value = 'Cuentas';
  wsList.getCell('B1').value = 'Categorias';
  wsList.getCell('C1').value = 'Tipos';
  wsList.getCell('D1').value = 'Iconos';
  wsList.getCell('E1').value = 'Colores';

  const cuentasVals = (cuentas && cuentas.length) ? cuentas.map(c => c.nombre) : ['-'];
  const categoriasVals = (categorias && categorias.length) ? categorias.map(c => c.nombre) : ['-'];
  const tiposVals = tipos;
  const iconosVals = ['💸','💰','🏦','🍎','🚗','💳','🔌','🎁','🛒','🏥'];
  const coloresVals = ['#2e7d32','#c62828','#ff9800','#1976d2','#6c4fa1','#607d8b'];

    cuentasVals.forEach((n, i) => wsList.getCell(2 + i, 1).value = n);
    categoriasVals.forEach((n, i) => wsList.getCell(2 + i, 2).value = n);
  tiposVals.forEach((n, i) => wsList.getCell(2 + i, 3).value = n);
  iconosVals.forEach((n, i) => wsList.getCell(2 + i, 4).value = n);
  coloresVals.forEach((n, i) => wsList.getCell(2 + i, 5).value = n);

    // Definir rangos con nombre
  // Datos comienzan en la fila 2, por tanto fin = 1 + length
  const cuentasEnd = 1 + cuentasVals.length;
  const categoriasEnd = 1 + categoriasVals.length;
  const tiposEnd = 1 + tiposVals.length;
  const cuentasRange = "'Listas'!$A$2:$A$" + cuentasEnd;
  const categoriasRange = "'Listas'!$B$2:$B$" + categoriasEnd;
  const tiposRange = "'Listas'!$C$2:$C$" + tiposEnd;
  const iconosRange = "'Listas'!$D$2:$D$" + (1 + iconosVals.length);
  const coloresRange = "'Listas'!$E$2:$E$" + (1 + coloresVals.length);

    // Estilos básicos encabezados
    ws.getRow(1).font = { bold: true };
    ws.columns = [
      { header: headers[0], key: 'cuenta', width: 25 },
      { header: headers[1], key: 'tipo', width: 18 },
      { header: headers[2], key: 'monto', width: 14 },
      { header: headers[3], key: 'descripcion', width: 32 },
      { header: headers[4], key: 'fecha', width: 16 },
      { header: headers[5], key: 'categoria', width: 25 },
      { header: headers[6], key: 'cuenta_destino', width: 25 },
      { header: headers[7], key: 'icon', width: 12 },
      { header: headers[8], key: 'color', width: 14 },
    ];

    // Notas en encabezados (ayuda)
    try {
      ws.getCell('A1').note = 'Cuenta: selecciona por nombre (lista desplegable) o ingresa el ID de la cuenta.';
      ws.getCell('B1').note = 'Tipo: valores permitidos ingreso, egreso, ahorro, transferencia.';
      ws.getCell('C1').note = 'Monto: usa punto decimal. Ej: 123.45';
      ws.getCell('E1').note = 'Fecha: formato YYYY-MM-DD. Ej: 2025-10-04';
      ws.getCell('F1').note = 'Categoría: selecciona por nombre (lista) o ingresa el ID. Opcional.';
      ws.getCell('G1').note = 'Cuenta destino: solo requerido cuando tipo=transferencia (por nombre o ID).';
      ws.getCell('H1').note = 'Icono: opcional, por ejemplo 💸, 💰, 🏦. Si se omite, se dejará vacío (transferencia usa 🔁).';
      ws.getCell('I1').note = 'Color: opcional. Durante la importación se asignará por defecto según el tipo (ingreso=verde, egreso=rojo, ahorro=naranja, transferencia=azul).';
    } catch (e) { /* notas opcionales según soporte de Excel */ }

    // 100 filas de validaciones (desde la fila 2 a la 101)
    for (let r = 2; r <= 101; r++) {
      // Cuenta y Categoría por nombre (aunque el encabezado diga *_id)
      ws.getCell(r, 1).dataValidation = {
        type: 'list', allowBlank: true, formulae: ['=' + cuentasRange],
        showInputMessage: true, promptTitle: 'Cuenta',
        prompt: 'Selecciona de la lista o escribe el ID de la cuenta.',
        showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Valor fuera de lista',
        error: 'El valor no está en la lista. Si es un ID numérico válido, será aceptado por el importador.'
      };
      ws.getCell(r, 6).dataValidation = {
        type: 'list', allowBlank: true, formulae: ['=' + categoriasRange],
        showInputMessage: true, promptTitle: 'Categoría',
        prompt: 'Selecciona de la lista o escribe el ID de la categoría (opcional).',
        showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Valor fuera de lista',
        error: 'El valor no está en la lista. Si es un ID numérico válido, será aceptado por el importador.'
      };
      // Tipo
      ws.getCell(r, 2).dataValidation = {
        type: 'list', allowBlank: false, formulae: ['=' + tiposRange],
        showInputMessage: true, promptTitle: 'Tipo',
        prompt: 'Valores: ingreso, egreso, ahorro, transferencia.'
      };
      // Cuenta destino (solo si aplica; se deja validación para ayudar)
      ws.getCell(r, 7).dataValidation = {
        type: 'list', allowBlank: true, formulae: ['=' + cuentasRange],
        showInputMessage: true, promptTitle: 'Cuenta destino',
        prompt: 'Requerido cuando el tipo es transferencia. Puedes escribir el ID también.'
      };
      // Fecha formato
      ws.getCell(r, 5).value = null;
      ws.getCell(r, 5).numFmt = 'yyyy-mm-dd';
      // Icono
      ws.getCell(r, 8).dataValidation = {
        type: 'list', allowBlank: true, formulae: ['=' + iconosRange],
        showInputMessage: true, promptTitle: 'Icono',
        prompt: 'Opcional: selecciona un icono. En transferencias se usa 🔁.'
      };
      // Color (se aplicará color por defecto al importar si se deja vacío)
      ws.getCell(r, 9).dataValidation = {
        type: 'list', allowBlank: true, formulae: ['=' + coloresRange],
        showInputMessage: true, promptTitle: 'Color',
        prompt: 'Opcional: selecciona un color (hex). La importación asignará colores por defecto según el tipo.'
      };
    }

    // Fila de ejemplo en la fila 2
  ws.getCell(2, 2).value = 'ingreso';
  ws.getCell(2, 3).value = 100.00;
  ws.getCell(2, 4).value = 'Texto opcional';
  ws.getCell(2, 5).value = todayISO();
  // Ejemplo adicional de transferencia en fila 3
  ws.getCell(3, 2).value = 'transferencia';
  ws.getCell(3, 3).value = 50.00;
  ws.getCell(3, 5).value = todayISO();

    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_movimientos.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const buf = await wb.xlsx.writeBuffer();
    return res.status(200).send(Buffer.from(buf));
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo generar la plantilla' });
  }
};

// Importar movimientos desde Excel
exports.importarExcel = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!req.file) return res.status(400).json({ error: 'Falta archivo (field name: file)' });
  try {
    // Leer Excel; permitimos fechas como números o como objetos Date según cómo venga el archivo
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
  // defval: '' para que columnas vacías no sean undefined. No usamos raw:false para mantener control propio sobre fechas.
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'La hoja está vacía' });
    }

    // Obtener la plataforma del usuario una vez
    const db = require('../../config/database');
    const [usuarios] = await db.query('SELECT plataforma FROM usuarios WHERE id = ?', [usuario_id]);
    if (!usuarios || usuarios.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const plataforma = usuarios[0].plataforma;

    // Precargar mapas de cuentas y categorías por nombre (case-insensitive)
    const [cuentas] = await db.query('SELECT id, nombre FROM cuentas WHERE usuario_id = ?', [usuario_id]);
    const [categorias] = await db.query('SELECT id, nombre FROM categorias WHERE usuario_id = ?', [usuario_id]);
    const mapCuentaByName = new Map();
    const mapCategoriaByName = new Map();
    (cuentas || []).forEach(c => mapCuentaByName.set(String(c.nombre).trim().toLowerCase(), c.id));
    (categorias || []).forEach(c => mapCategoriaByName.set(String(c.nombre).trim().toLowerCase(), c.id));

    const errores = [];
    let insertados = 0;
    const defaultColorByTipo = {
      ingreso: '#2e7d32',
      egreso: '#c62828',
      ahorro: '#ff9800',
      transferencia: '#1976d2',
    };
    const defaultIconByTipo = {
      transferencia: '🔁',
    };
    // Utilidad: normalizar fecha desde Excel (serial, Date o string) a YYYY-MM-DD
    const toISODate = (val) => {
      if (!val && val !== 0) return '';
      // Si ya es Date
      if (val instanceof Date && !isNaN(val)) {
        const d = val;
        const tz = d.getTimezoneOffset() * 60000;
        return new Date(d - tz).toISOString().slice(0, 10);
      }
      // Si es número tipo serial Excel (días desde 1899-12-30)
      if (typeof val === 'number' && isFinite(val)) {
        const epoch = Date.UTC(1899, 11, 30); // 1899-12-30
        const ms = epoch + Math.round(val) * 86400000;
        const d = new Date(ms);
        if (!isNaN(d)) {
          const tz = d.getTimezoneOffset() * 60000;
          return new Date(d - tz).toISOString().slice(0, 10);
        }
      }
      // Si es string, aceptar formatos comunes
      const s = String(val).trim();
      if (!s) return '';
      // YYYY-MM-DD o YYYY/MM/DD
      let m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      if (m) {
        const [_, y, mo, da] = m;
        const yy = y.padStart(4, '0');
        const mm = String(mo).padStart(2, '0');
        const dd = String(da).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
      }
      // DD/MM/YYYY o DD-MM-YYYY
      m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
      if (m) {
        const [_, da, mo, y] = m;
        const yy = y.padStart(4, '0');
        const mm = String(mo).padStart(2, '0');
        const dd = String(da).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
      }
      // Fallback: si ya luce como YYYY-MM-DD al inicio
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Cuenta puede venir como ID o como nombre en cuenta_id o en columna 'cuenta'
      let cuenta_id = null;
      if (r.cuenta_id !== undefined && r.cuenta_id !== '') {
        const raw = r.cuenta_id;
        if (/^\d+$/.test(String(raw))) {
          cuenta_id = Number(raw);
        } else {
          const found = mapCuentaByName.get(String(raw).trim().toLowerCase());
          if (found) cuenta_id = found;
        }
      } else if (r.cuenta !== undefined && r.cuenta !== '') {
        const found = mapCuentaByName.get(String(r.cuenta).trim().toLowerCase());
        if (found) cuenta_id = found;
      }

    const tipo = String(r.tipo || '').toLowerCase();
    const monto = parseFloat(r.monto);
    const descripcion = String(r.descripcion || '').slice(0, 200);
    const fecha = toISODate(r.fecha);
      // Categoría puede venir como ID o como nombre (en categoria_id o 'categoria')
      let categoria_id = null;
      if (r.categoria_id !== undefined && r.categoria_id !== '') {
        const rawc = r.categoria_id;
        if (/^\d+$/.test(String(rawc))) {
          categoria_id = Number(rawc);
        } else {
          const foundc = mapCategoriaByName.get(String(rawc).trim().toLowerCase());
          if (foundc) categoria_id = foundc;
        }
      } else if (r.categoria !== undefined && r.categoria !== '') {
        const foundc = mapCategoriaByName.get(String(r.categoria).trim().toLowerCase());
        if (foundc) categoria_id = foundc;
      }

      // Resolver cuenta destino si es transferencia (por ID o nombre)
      let cuenta_destino_id = null;
      if (tipo === 'transferencia') {
        if (r.cuenta_destino_id !== undefined && r.cuenta_destino_id !== '') {
          const rawd = r.cuenta_destino_id;
          if (/^\d+$/.test(String(rawd))) {
            cuenta_destino_id = Number(r.cuenta_destino_id);
          } else {
            const foundd = mapCuentaByName.get(String(r.cuenta_destino_id).trim().toLowerCase());
            if (foundd) cuenta_destino_id = foundd;
          }
        } else if (r.cuenta_destino !== undefined && r.cuenta_destino !== '') {
          const foundd = mapCuentaByName.get(String(r.cuenta_destino).trim().toLowerCase());
          if (foundd) cuenta_destino_id = foundd;
        }
      }

      // Validaciones básicas
      const tipoValido = ['ingreso','egreso','ahorro','transferencia'].includes(tipo);
      const missing = [];
      if (!cuenta_id) missing.push('cuenta');
      if (!tipoValido) missing.push('tipo');
      if (!monto || isNaN(monto)) missing.push('monto');
      if (!fecha) missing.push('fecha');
      if (missing.length) {
        errores.push({ fila: i + 2, error: 'Campos requeridos inválidos', missing });
        continue;
      }
      // Validar cuenta y categoría pertenecen al usuario (usando mapas precargados o consulta simple)
      const cuentaExiste = (cuentas || []).some(c => c.id === cuenta_id);
      if (!cuentaExiste) { errores.push({ fila: i + 2, error: 'Cuenta no pertenece al usuario' }); continue; }
      if (categoria_id) {
        const catExiste = (categorias || []).some(c => c.id === categoria_id);
        if (!catExiste) { errores.push({ fila: i + 2, error: 'Categoría no pertenece al usuario' }); continue; }
      }
      try {
        if (tipo === 'transferencia') {
          // Validar cuenta destino
          if (!cuenta_destino_id) { errores.push({ fila: i + 2, error: 'Transferencia: falta cuenta destino' }); continue; }
          if (Number(cuenta_destino_id) === Number(cuenta_id)) { errores.push({ fila: i + 2, error: 'Transferencia: cuenta origen y destino no pueden ser iguales' }); continue; }
          const cuentaODef = (cuentas || []).find(c => c.id === cuenta_id);
          const cuentaDDef = (cuentas || []).find(c => c.id === cuenta_destino_id);
          if (!cuentaODef || !cuentaDDef) { errores.push({ fila: i + 2, error: 'Transferencia: cuentas no pertenecen al usuario' }); continue; }
          // Decidir si aplica inmediatamente
          const todayStr = new Date().toISOString().slice(0,10);
          const fechaStr = String(fecha).slice(0,10);
          const applied = fechaStr <= todayStr ? 1 : 0;
          // Validar saldo suficiente si aplica de inmediato
          if (applied) {
            const [saldoRows] = await db.query('SELECT saldo_actual FROM cuentas WHERE id = ?', [cuenta_id]);
            const saldoAct = saldoRows && saldoRows[0] ? Number(saldoRows[0].saldo_actual) : 0;
            if (saldoAct < monto) { errores.push({ fila: i + 2, error: 'Transferencia: saldo insuficiente en cuenta origen' }); continue; }
          }
          const icon = defaultIconByTipo.transferencia;
          const color = defaultColorByTipo.transferencia;
          const code = 'T' + Date.now() + '_' + i;
          const descEgreso = `Transferencia a ${cuentaDDef.nombre}${descripcion ? ' - ' + descripcion : ''} [TRANSFER#${code}]`;
          const descIngreso = `Transferencia desde ${cuentaODef.nombre}${descripcion ? ' - ' + descripcion : ''} [TRANSFER#${code}]`;
          // Usar transacción por fila
          const conn = await db.getConnection();
          try {
            await conn.beginTransaction();
            await conn.query(
              'INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color, applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [usuario_id, cuenta_id, 'egreso', monto, descEgreso, fechaStr, null, plataforma || 'web', icon, color, applied]
            );
            if (applied) {
              await conn.query('UPDATE cuentas SET saldo_actual = saldo_actual - ? WHERE id = ?', [monto, cuenta_id]);
            }
            await conn.query(
              'INSERT INTO movimientos (usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color, applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [usuario_id, cuenta_destino_id, 'ingreso', monto, descIngreso, fechaStr, null, plataforma || 'web', icon, color, applied]
            );
            if (applied) {
              await conn.query('UPDATE cuentas SET saldo_actual = saldo_actual + ? WHERE id = ?', [monto, cuenta_destino_id]);
            }
            await conn.commit();
            insertados++;
          } catch (e2) {
            try { await conn.rollback(); } catch {}
            errores.push({ fila: i + 2, error: e2.message || 'Error al registrar transferencia' });
          } finally { conn.release(); }
        } else {
          // Asignar color por defecto según tipo; icono opcional de archivo
          const color = defaultColorByTipo[tipo] || null;
          const icon = r.icon || null;
          await Transaccion.create({ usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma, icon, color });
          insertados++;
        }
      } catch (e) {
        errores.push({ fila: i + 2, error: e.message });
      }
    }

    return res.status(200).json({ message: 'Importación finalizada', insertados, errores });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo procesar el Excel' });
  }
};

// Exportar movimientos a Excel por rango de fechas
exports.exportarExcel = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'Parámetros start y end requeridos (YYYY-MM-DD)' });
  try {
    const db = require('../../config/database');
    // Obtener plataforma del usuario
    const [usuarios] = await db.query('SELECT plataforma FROM usuarios WHERE id = ?', [usuario_id]);
    if (!usuarios || usuarios.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const plataforma = usuarios[0].plataforma;
    // Consultar movimientos dentro del rango
    const sql = `
      SELECT m.id, m.tipo, m.monto, m.descripcion,
             DATE_FORMAT(m.fecha, '%Y-%m-%d') AS fecha,
             c.nombre AS cuenta, cat.nombre AS categoria
      FROM movimientos m
      JOIN cuentas c ON m.cuenta_id = c.id
      LEFT JOIN categorias cat ON m.categoria_id = cat.id
      WHERE m.usuario_id = ? AND m.plataforma = ? AND DATE(m.fecha) BETWEEN ? AND ?
      ORDER BY m.fecha ASC, m.id ASC
    `;
    const [rows] = await db.query(sql, [usuario_id, plataforma, start, end]);
    const data = [
      ['id', 'tipo', 'monto', 'descripcion', 'fecha', 'cuenta', 'categoria'],
      ...rows.map(r => [r.id, r.tipo, r.monto, r.descripcion || '', r.fecha, r.cuenta, r.categoria || ''])
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="movimientos_${start}_a_${end}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.status(200).send(buf);
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo generar la exportación' });
  }
};
