const Transaccion = require('../models/transaccion');
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
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  const { cuenta_id, tipo, monto, descripcion, fecha, categoria_id } = req.body;

  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!cuenta_id || !tipo || !monto || !fecha) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const db = require('../db');
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
    const result = await Transaccion.create({ usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma });
    res.status(201).json({ message: 'Movimiento creado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generar y descargar plantilla Excel con listas desplegables (100 filas)
exports.descargarPlantilla = async (req, res) => {
  const usuario_id = req.user && req.user.id;
  if (!usuario_id) return res.status(401).json({ error: 'Usuario no autenticado' });
  try {
    const db = require('../db');
    // Obtener listas del usuario
    const [cuentas] = await db.query('SELECT id, nombre FROM cuentas WHERE usuario_id = ? ORDER BY nombre ASC', [usuario_id]);
    const [categorias] = await db.query('SELECT id, nombre FROM categorias WHERE usuario_id = ? ORDER BY nombre ASC', [usuario_id]);

    const tipos = ['ingreso', 'egreso', 'ahorro'];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Plantilla');
  const wsInfo = wb.addWorksheet('Instrucciones');
  const wsList = wb.addWorksheet('Listas');
    wsList.state = 'veryHidden';
    // Hoja de instrucciones
    wsInfo.addRow(['Cómo usar esta plantilla']).font = { bold: true, size: 14 };
    wsInfo.addRow(['- Rellena las filas desde la 2 hasta la 101.']).font = { italic: true };
    wsInfo.addRow(['- En cuenta y categoría puedes escoger de la lista desplegable o escribir el ID.']);
    wsInfo.addRow(['- Tipo debe ser uno de: ingreso, egreso, ahorro.']);
    wsInfo.addRow(['- Fecha en formato YYYY-MM-DD (ej. 2025-10-04).']);
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


  // Encabezados visibles más amigables; importación sigue aceptando cuenta_id/categoria_id y también cuenta/categoria
  const headers = ['cuenta', 'tipo', 'monto', 'descripcion', 'fecha', 'categoria'];
    ws.addRow(headers);

    // Hoja de listas: columnas A, B, C
    wsList.getCell('A1').value = 'Cuentas';
    wsList.getCell('B1').value = 'Categorias';
    wsList.getCell('C1').value = 'Tipos';

    const cuentasVals = (cuentas && cuentas.length) ? cuentas.map(c => c.nombre) : ['-'];
    const categoriasVals = (categorias && categorias.length) ? categorias.map(c => c.nombre) : ['-'];
    const tiposVals = tipos;

    cuentasVals.forEach((n, i) => wsList.getCell(2 + i, 1).value = n);
    categoriasVals.forEach((n, i) => wsList.getCell(2 + i, 2).value = n);
    tiposVals.forEach((n, i) => wsList.getCell(2 + i, 3).value = n);

    // Definir rangos con nombre
  // Datos comienzan en la fila 2, por tanto fin = 1 + length
  const cuentasEnd = 1 + cuentasVals.length;
  const categoriasEnd = 1 + categoriasVals.length;
  const tiposEnd = 1 + tiposVals.length;
  const cuentasRange = "'Listas'!$A$2:$A$" + cuentasEnd;
  const categoriasRange = "'Listas'!$B$2:$B$" + categoriasEnd;
  const tiposRange = "'Listas'!$C$2:$C$" + tiposEnd;

    // Estilos básicos encabezados
    ws.getRow(1).font = { bold: true };
    ws.columns = [
      { header: headers[0], key: 'cuenta', width: 25 },
      { header: headers[1], key: 'tipo', width: 18 },
      { header: headers[2], key: 'monto', width: 14 },
      { header: headers[3], key: 'descripcion', width: 32 },
      { header: headers[4], key: 'fecha', width: 16 },
      { header: headers[5], key: 'categoria', width: 25 },
    ];

    // Notas en encabezados (ayuda)
    try {
      ws.getCell('A1').note = 'Cuenta: selecciona por nombre (lista desplegable) o ingresa el ID de la cuenta.';
      ws.getCell('B1').note = 'Tipo: valores permitidos ingreso, egreso, ahorro.';
      ws.getCell('C1').note = 'Monto: usa punto decimal. Ej: 123.45';
      ws.getCell('E1').note = 'Fecha: formato YYYY-MM-DD. Ej: 2025-10-04';
      ws.getCell('F1').note = 'Categoría: selecciona por nombre (lista) o ingresa el ID. Opcional.';
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
        prompt: 'Valores: ingreso, egreso, ahorro.'
      };
      // Fecha formato
      ws.getCell(r, 5).value = null;
      ws.getCell(r, 5).numFmt = 'yyyy-mm-dd';
    }

    // Fila de ejemplo en la fila 2
    ws.getCell(2, 2).value = 'ingreso';
    ws.getCell(2, 3).value = 100.00;
    ws.getCell(2, 4).value = 'Texto opcional';
    ws.getCell(2, 5).value = todayISO();

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
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'La hoja está vacía' });
    }

    // Obtener la plataforma del usuario una vez
    const db = require('../db');
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
      const fecha = String(r.fecha || '').slice(0, 10);
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

      // Validaciones básicas
      if (!cuenta_id || !['ingreso','egreso','ahorro'].includes(tipo) || !monto || isNaN(monto) || !fecha) {
        errores.push({ fila: i + 2, error: 'Campos requeridos inválidos' });
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
        await Transaccion.create({ usuario_id, cuenta_id, tipo, monto, descripcion, fecha, categoria_id, plataforma });
        insertados++;
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
    const db = require('../db');
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
