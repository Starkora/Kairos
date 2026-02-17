const db = require('../../config/database');

// Cache en memoria por usuario y parámetro includeFuture para acelerar respuestas repetidas
// TTL corto para mantener datos frescos y no bloquear UX (p. ej., 30s)
const CACHE_TTL_MS = Number(process.env.INSIGHTS_CACHE_TTL_MS || 30_000);
const CACHE_TTL_DETAILS_MS = Number(process.env.INSIGHTS_CACHE_TTL_DETAILS_MS || 120_000);
const DETAIL_TIME_BUDGET_MS = Number(process.env.INSIGHTS_DETAIL_BUDGET_MS || 8000);
const QUICK_TIME_BUDGET_MS = Number(process.env.INSIGHTS_QUICK_BUDGET_MS || 3000);
const insightsCache = new Map(); // key -> { expires: number, payload }

// includeVariant puede ser boolean (true/false) o una cadena diferenciadora como '1:fast'/'1'
function cacheKey(userId, includeVariant, ym) {
  // ym debe ser 'YYYY-MM' del mes consultado
  return `u:${userId}|v:${String(includeVariant)}|m:${String(ym)}`;
}

function getCached(userId, includeVariant, ym) {
  const key = cacheKey(userId, includeVariant, ym);
  const rec = insightsCache.get(key);
  if (!rec) return null;
  if (Date.now() > rec.expires) { insightsCache.delete(key); return null; }
  return rec.payload;
}

function setCached(userId, includeVariant, ym, payload, ttlMs) {
  const key = cacheKey(userId, includeVariant, ym);
  const ttl = Number(ttlMs || CACHE_TTL_MS);
  insightsCache.set(key, { expires: Date.now() + ttl, payload });
}

function invalidateUser(userId) {
  const prefix = `u:${userId}|`;
  for (const k of Array.from(insightsCache.keys())) {
    if (k.startsWith(prefix)) insightsCache.delete(k);
  }
}

function monthBounds(year, month) {
  const y = Number(year);
  const m = Number(month);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDate = new Date(y, m, 0);
  const last = lastDate.toISOString().slice(0, 10);
  return { first, last, daysInMonth: lastDate.getDate() };
}

function todayInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return { year, month, day };
}

// Utilidades de fechas (ignorando TZ en lo posible)
function toISODate(d) { return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function parseISODate(s) { const [y,m,d] = String(s).slice(0,10).split('-').map(Number); return new Date(y, m-1, d); }
function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate()+n); return x; }
function daysDiff(a, b) { const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()); const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()); return Math.round((B-A)/(24*60*60*1000)); }
function clampDate(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

// GET /api/insights
// Respuesta: { kpis: {...}, insights: [{ id, severity, title, body, cta: { label, href } }] }
exports.list = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth() + 1;
    const nowD = now.getDate();
    let year = Number(req.query?.year || nowY);
    let month = Number(req.query?.month || nowM);
    // Saneamiento simple
    if (!Number.isFinite(year) || year < 2000 || year > 2100) year = nowY;
    if (!Number.isFinite(month) || month < 1 || month > 12) month = nowM;
    const { first, last, daysInMonth } = monthBounds(year, month);
    // Para meses distintos al actual, usar el total del mes para run-rate
    const isCurrentMonth = (year === nowY && month === nowM);
    const day = isCurrentMonth ? nowD : daysInMonth;
    const includeFuture = String((req.query && req.query.includeFuture) ?? '1') !== '0';
  const fastMode = String((req.query && req.query.fast) || '0') === '1';
  const quickMode = String((req.query && req.query.quick) || '0') === '1';
    const startedAt = Date.now();
    const timeLeft = () => Math.max(0, DETAIL_TIME_BUDGET_MS - (Date.now() - startedAt));
  const timeLeftQuick = () => Math.max(0, QUICK_TIME_BUDGET_MS - (Date.now() - startedAt));

    const timedQuery = async (sql, params, ms) => {
      const t = Number(ms);
      // Si no queda presupuesto de tiempo, abortar inmediatamente para no colgar la request
      if (!Number.isFinite(t) || t <= 0) {
        return Promise.reject(new Error('budget_exhausted'));
      }
      const timeout = t;
      return Promise.race([
        db.query(sql, params),
        new Promise((_, rej) => setTimeout(() => rej(new Error('q_timeout')), timeout))
      ]);
    };

    // Parámetros opcionales para recortar trabajo en free tier
    // details: csv con 'budgets','recurrent','fees','forecast' (si no viene, en fast=0 se asume todo; en fast=1 se asume mínimo)
  const detailsParam = String(req.query?.details || '').trim();
    const hasDetails = detailsParam.length > 0 ? new Set(detailsParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) : null;
    const doBudgets = hasDetails ? hasDetails.has('budgets') : !fastMode; // por defecto solo en detallado
    const doRecurrent = hasDetails ? hasDetails.has('recurrent') : !fastMode;
    const doFees = hasDetails ? hasDetails.has('fees') : !fastMode;
    const doForecast = hasDetails ? hasDetails.has('forecast') : !fastMode; // forecast pesado
    // horizons: lista de 30/60/90
    let horizonsParam = String(req.query?.horizons || '').trim();
    let requestedHorizons = horizonsParam ? horizonsParam.split(',').map(s=>Number(s)).filter(n=>[30,60,90].includes(n)) : null;

    // Cache rápido para aliviar carga cuando la pantalla hace refresh o varios widgets llaman lo mismo
    const ymKey = `${year}-${String(month).padStart(2,'0')}`;
    const variant = (includeFuture ? '1' : '0')
      + (fastMode ? ':fast' : '')
      + (quickMode ? ':quick' : '')
      + (detailsParam ? `:d:${detailsParam}` : '')
      + (requestedHorizons && requestedHorizons.length ? `:h:${requestedHorizons.join('-')}` : '');
    const cached = getCached(usuario_id, variant, ymKey);
    if (cached) {
      return res.json(cached);
    }

    // Preferencias del usuario (umbrales presupuesto)
    let thresholdWarn = 80;
    let thresholdDanger = 100;
    try {
  const [prefRows] = await timedQuery('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [usuario_id], Math.min(1500, quickMode ? timeLeftQuick() : timeLeft()));
      const pdata = (Array.isArray(prefRows) && prefRows[0] && prefRows[0].data) || {};
      if (pdata && pdata.budgets) {
        if (typeof pdata.budgets.thresholdWarn === 'number') thresholdWarn = pdata.budgets.thresholdWarn;
        if (typeof pdata.budgets.thresholdDanger === 'number') thresholdDanger = pdata.budgets.thresholdDanger;
      }
    } catch (_) {}

    // TOTALES del mes (applied=1)
    let incRow = { total: 0 };
    try {
      const [[row]] = await timedQuery(
      `SELECT COALESCE(SUM(monto),0) AS total FROM movimientos
       WHERE usuario_id = ? AND applied = 1 AND tipo IN ('ingreso','ahorro') AND DATE(fecha) BETWEEN ? AND ?`,
      [usuario_id, first, last],
  Math.min(3000, quickMode ? timeLeftQuick() : timeLeft())
    );
      incRow = row || incRow;
    } catch (_) { /* fallback 0 */ }
    let expRow = { total: 0 };
    try {
      const [[row]] = await timedQuery(
      `SELECT COALESCE(SUM(monto),0) AS total FROM movimientos
       WHERE usuario_id = ? AND applied = 1 AND tipo = 'egreso' AND DATE(fecha) BETWEEN ? AND ?`,
      [usuario_id, first, last],
  Math.min(3000, quickMode ? timeLeftQuick() : timeLeft())
    );
      expRow = row || expRow;
    } catch (_) { /* fallback 0 */ }
    const ingresos = Number((incRow && incRow.total) || 0);
    const egresos = Number((expRow && expRow.total) || 0);

    // Promedio diario de egresos y proyección
    const daysElapsed = Math.max(1, Math.min(day, daysInMonth));
    const dailyAvgEgreso = egresos / daysElapsed;
    const projectedEgresos = dailyAvgEgreso * daysInMonth;

    // KPI Tasa de ahorro
    const ahorroNeto = Math.max(0, ingresos - egresos);
    const ahorroRate = ingresos > 0 ? (ahorroNeto / ingresos) : null;

    const kpis = {
      ingresosMes: ingresos,
      egresosMes: egresos,
      ahorroNeto,
      ahorroRate, // 0..1 o null si ingresos=0
      runRate: {
        dailyAvgEgreso,
        projectedEgresos,
        daysElapsed,
        daysInMonth
      }
    };

  const insights = [];

    // Regla 1: Run-rate en riesgo (proyección > ingresos)
    if (ingresos > 0) {
      const ratio = projectedEgresos / ingresos; // >1 = gasta más de lo que ingresa
      if (ratio >= 1.1) {
        insights.push({
          id: 'runrate-danger',
          severity: 'danger',
          title: 'Ritmo de gasto supera tus ingresos',
          body: `A este ritmo proyectas egresos de S/ ${projectedEgresos.toFixed(2)} frente a ingresos de S/ ${ingresos.toFixed(2)}.`,
          cta: { label: 'Revisar gastos', href: '/presupuestos' }
        });
      } else if (ratio >= 0.9) {
        insights.push({
          id: 'runrate-warn',
          severity: 'warning',
          title: 'Atención al ritmo de gasto',
          body: `Tu proyección de egresos es S/ ${projectedEgresos.toFixed(2)} (≈${(ratio*100).toFixed(0)}% de tus ingresos).` ,
          cta: { label: 'Ver categorías', href: '/categorias' }
        });
      }
    }

    // Presupuestos del mes (con timeout corto)
    let budgets = [];
    try {
      const [rowsB] = await timedQuery(
        'SELECT p.categoria_id, p.monto, c.nombre AS categoria FROM presupuestos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.usuario_id = ? AND p.anio = ? AND p.mes = ?',[usuario_id, year, month], Math.min(2000, quickMode ? timeLeftQuick() : timeLeft())
      );
      budgets = rowsB || [];
    } catch (_) { budgets = []; }
    let inDanger = [], inWarn = [];
    // Para la regla "no-budgets" necesitaremos saber si hay presupuestos > 0
    const budgetsCount = (budgets || []).filter(b => Number(b.monto || 0) > 0).length;
    // Cálculo detallado de gasto por categoría solo en modo no-rápido
    if (doBudgets && (quickMode ? timeLeftQuick() : timeLeft()) > 300) {
      let spentRows = [];
      try {
        const [srows] = await timedQuery(
        `SELECT categoria_id, SUM(monto) AS gastado
         FROM movimientos
         WHERE usuario_id = ? AND tipo = 'egreso' AND applied = 1 AND DATE(fecha) BETWEEN ? AND ?
         GROUP BY categoria_id`,
        [usuario_id, first, last], Math.min(1800, quickMode ? timeLeftQuick() : timeLeft())
        );
        spentRows = srows || [];
      } catch(_) { spentRows = []; }
      const spentMap = new Map((spentRows || []).map(r => [Number(r.categoria_id)||0, Number(r.gastado)||0]));
      const enriched = (budgets || []).map(b => ({
        categoria_id: Number(b.categoria_id),
        categoria: b.categoria || String(b.categoria_id),
        monto: Number(b.monto || 0),
        gastado: spentMap.get(Number(b.categoria_id)||0) || 0
      })).filter(b => b.monto > 0);
    // Si estamos en detallado y ya casi no queda tiempo, devolver KPIs mínimos
    if (!fastMode && timeLeft() < 600) {
      const result = { kpis, insights, meta: { month: `${year}-${String(month).padStart(2,'0')}`, thresholds: { warn: thresholdWarn, danger: thresholdDanger }, forecast: [], includeFuture, fast: fastMode, degraded: true, detailsUsed: { budgets: false, recurrent: false, fees: false, forecast: false }, horizonsUsed: [] } };
      setCached(usuario_id, (includeFuture ? '1' : '0') + (fastMode ? ':fast' : ''), ymKey, result, CACHE_TTL_MS);
      return res.json(result);
    }
      const atRisk = enriched
        .map(b => ({ ...b, pct: b.monto > 0 ? (b.gastado / b.monto) * 100 : 0 }))
        .sort((a,b) => b.pct - a.pct);
      inDanger = atRisk.filter(b => b.pct >= thresholdDanger).slice(0, 3);
      inWarn = atRisk.filter(b => b.pct >= thresholdWarn && b.pct < thresholdDanger).slice(0, 3);
      if (inDanger.length > 0) {
        insights.push({ id: 'budgets-danger', severity: 'danger', title: 'Presupuestos excedidos', body: inDanger.map(b => `• ${b.categoria}: ${b.pct.toFixed(0)}% (S/ ${b.gastado.toFixed(2)} de S/ ${b.monto.toFixed(2)})`).join('\n'), cta: { label: 'Abrir Presupuestos', href: '/presupuestos' } });
      }
      if (inWarn.length > 0) {
        insights.push({ id: 'budgets-warn', severity: 'warning', title: 'Presupuestos en alerta', body: inWarn.map(b => `• ${b.categoria}: ${b.pct.toFixed(0)}% (S/ ${b.gastado.toFixed(2)} de S/ ${b.monto.toFixed(2)})`).join('\n'), cta: { label: 'Optimizar gastos', href: '/presupuestos' } });
      }
    }

    // Regla 2: Tasa de ahorro negativa o muy baja
    if (ingresos > 0) {
      if (ahorroRate !== null && ahorroRate < 0) {
        insights.push({ id: 'saving-negative', severity: 'danger', title: 'Estás gastando más de lo que ingresas', body: 'Revisa tus egresos más altos y ajusta tu presupuesto.', cta: { label: 'Ver Dashboard', href: '/' } });
      } else if (ahorroRate !== null && ahorroRate < 0.05) {
        insights.push({ id: 'saving-low', severity: 'warning', title: 'Tu tasa de ahorro es baja', body: 'Considera fijar metas y mover sobrantes a ahorro automáticamente.', cta: { label: 'Crear Meta', href: '/deudas-metas' } });
      }
    }

    // Regla 3: Presión por egresos recurrentes
  if (doRecurrent && timeLeft() > 400) try {
      const [recRows] = await db.query(
        `SELECT tipo, monto, frecuencia, inicio, fin, indefinido
         FROM movimientos_recurrentes
         WHERE usuario_id = ? AND LOWER(tipo) = 'egreso'`,
        [usuario_id]
      );
      let monthlyRecurrent = 0;
      const endOfMonth = last;
      const startOfMonth = first;
      for (const r of (recRows || [])) {
        // Activo en el mes: inicio <= finDeMes AND (indefinido OR fin >= inicioDeMes)
        const inicio = r.inicio ? String(r.inicio).slice(0,10) : null;
        const fin = r.fin ? String(r.fin).slice(0,10) : null;
        const indef = !!r.indefinido;
        const active = (!inicio || inicio <= endOfMonth) && (indef || (fin && fin >= startOfMonth));
        if (!active) continue;
        const freq = String(r.frecuencia || '').toLowerCase();
        const monto = Number(r.monto || 0);
        const factor = (freq === 'mensual') ? 1 : (freq === 'semanal') ? 4.33 : (freq === 'diaria') ? 30 : 0;
        monthlyRecurrent += monto * factor;
      }
      if (ingresos > 0 && monthlyRecurrent > 0) {
        const rr = monthlyRecurrent / ingresos;
        if (rr >= 0.7) {
          insights.push({ id: 'recurrent-pressure-danger', severity: 'danger', title: 'Egresos fijos altos', body: `Tus egresos recurrentes estimados son S/ ${monthlyRecurrent.toFixed(2)} (≈${(rr*100).toFixed(0)}% de tus ingresos).`, cta: { label: 'Revisar recurrentes', href: '/movimientos-recurrentes' } });
        } else if (rr >= 0.4) {
          insights.push({ id: 'recurrent-pressure-warn', severity: 'warning', title: 'Atención a egresos recurrentes', body: `Comprometen ≈${(rr*100).toFixed(0)}% de tus ingresos. Evalúa optimizarlos.`, cta: { label: 'Ver recurrentes', href: '/movimientos-recurrentes' } });
        }
      }
  } catch (_) { /* opcional */ }

    // Regla 4: Metas inactivas (sin ahorro tras 60 días)
    try {
      const [[rowCount]] = await timedQuery(
        `SELECT COUNT(*) AS cnt
         FROM metas
         WHERE usuario_id = ? AND (cumplida = 0 OR cumplida IS NULL)
           AND COALESCE(monto_ahorrado,0) = 0
           AND fecha_inicio IS NOT NULL
           AND fecha_inicio <= DATE_SUB(CURDATE(), INTERVAL 60 DAY)`,
        [usuario_id],
        Math.min(1000, quickMode ? timeLeftQuick() : timeLeft())
      );
      const cnt = Number((rowCount && rowCount.cnt) || 0);
      if (cnt > 0) {
        insights.push({ id: 'goals-inactive', severity: 'warning', title: 'Metas sin avances', body: `Tienes ${cnt} meta(s) sin aportes en 60 días. Retoma o ajusta tus objetivos.`, cta: { label: 'Ver metas', href: '/deudas-metas' } });
      }
    } catch (_) { /* opcional */ }

      // Regla 6: Comisiones/cargos bancarios elevados
  if (doFees && timeLeft() > 400) try {
        const [[feesRow]] = await db.query(
          `SELECT COALESCE(SUM(monto),0) AS total
           FROM movimientos
           WHERE usuario_id = ? AND applied = 1 AND tipo = 'egreso' AND DATE(fecha) BETWEEN ? AND ?
             AND (
               LOWER(descripcion) LIKE '%comision%' OR
               LOWER(descripcion) LIKE '%comisión%' OR
               LOWER(descripcion) LIKE '%mantenimiento%' OR
               LOWER(descripcion) LIKE '%cargo%' AND LOWER(descripcion) LIKE '%banc%' OR
               LOWER(descripcion) LIKE '%servicio%' AND LOWER(descripcion) LIKE '%banc%' OR
               LOWER(descripcion) LIKE '%fee%'
             )`,
          [usuario_id, first, last]
        );
        const fees = Number((feesRow && feesRow.total) || 0);
        if (ingresos > 0 && fees > 0) {
          const fr = fees / ingresos;
          if (fr >= 0.05) {
            insights.push({ id: 'bank-fees-danger', severity: 'danger', title: 'Comisiones bancarias elevadas', body: `Pagaste S/ ${fees.toFixed(2)} en comisiones (≈${(fr*100).toFixed(1)}% de tus ingresos).`, cta: { label: 'Revisar gastos', href: '/categorias' } });
          } else if (fr >= 0.02) {
            insights.push({ id: 'bank-fees-warn', severity: 'warning', title: 'Alerta por comisiones bancarias', body: `Comisiones del mes: S/ ${fees.toFixed(2)} (≈${(fr*100).toFixed(1)}% de tus ingresos).`, cta: { label: 'Ver categorías', href: '/categorias' } });
          }
        }
  } catch (_) { /* opcional */ }

    // Regla 5: Sin presupuestos configurados
    if (budgetsCount === 0) {
      insights.push({ id: 'no-budgets', severity: 'info', title: 'Aún no configuras presupuestos', body: 'Define montos por categoría para controlar tu gasto mensual.', cta: { label: 'Configurar presupuestos', href: '/presupuestos' } });
    }

    // Forecast de cashflow 30/60/90 días (exacto por ocurrencias + movimientos futuros)
    let forecast = [];
    let horizonsUsed = [];
    let forecastWarnings = []; // almacenar avisos cuando falten datos
    if (quickMode) {
      try {
        // Quick forecast 30 días: aproximado, sin excepciones de recurrentes (ultra-rápido)
        const tl = timeLeftQuick();
        if (tl <= 200) throw new Error('budget_exhausted');
        const H = 30; horizonsUsed = [30];
        const [[saldoRow]] = await timedQuery('SELECT COALESCE(SUM(saldo_actual),0) AS saldo FROM cuentas WHERE usuario_id = ?', [usuario_id], Math.min(800, timeLeftQuick()));
        const saldoActual = Number((saldoRow && saldoRow.saldo) || 0);
        
        // Validar si hay cuentas configuradas
        const [[cuentasCount]] = await timedQuery('SELECT COUNT(*) AS cnt FROM cuentas WHERE usuario_id = ?', [usuario_id], Math.min(500, timeLeftQuick()));
        if (Number(cuentasCount?.cnt || 0) === 0) {
          forecastWarnings.push('No tienes cuentas configuradas. El saldo inicial es 0. Ve a "Cuentas" para agregar tu información bancaria.');
        }
        // Recurrentes: estimación mensual por frecuencia
        const [recRowsQ] = await timedQuery(
          `SELECT id, descripcion, tipo, monto, frecuencia, inicio, fin, indefinido
           FROM movimientos_recurrentes
           WHERE usuario_id = ?`,
          [usuario_id],
          Math.min(800, timeLeftQuick())
        );
        let recIn = 0, recOut = 0;
        const nowISO = toISODate(new Date());
        let activeRecCount = 0;
        const ingresosDetail = [], egresosDetail = [];
        for (const r of (recRowsQ || [])) {
          // activo hoy o sin fin
          const inicio = r.inicio ? String(r.inicio).slice(0,10) : null;
          const fin = r.fin ? String(r.fin).slice(0,10) : null;
          const indef = !!r.indefinido;
          const active = (!inicio || inicio <= nowISO) && (indef || (fin && fin >= nowISO));
          if (!active) continue;
          activeRecCount++;
          const freq = String(r.frecuencia||'').toLowerCase();
          const factor = (freq === 'mensual') ? 1 : (freq === 'semanal') ? 4.33 : (freq === 'diaria') ? 30 : 0;
          const amount = Number(r.monto||0) * factor;
          const tipo = String(r.tipo||'').toLowerCase();
          const detail = { 
            descripcion: r.descripcion || 'Sin descripción', 
            monto: amount, 
            tipo: 'recurrente', 
            frecuencia: r.frecuencia, 
            fecha: inicio || 'Sin fecha'
          };
          if (tipo === 'ingreso' || tipo === 'ahorro') { 
            recIn += amount; 
            ingresosDetail.push(detail); 
          } else if (tipo === 'egreso') { 
            recOut += amount; 
            egresosDetail.push(detail); 
          }
        }
        if (activeRecCount === 0) {
          forecastWarnings.push('No tienes movimientos recurrentes activos. La proyección solo incluirá movimientos futuros pendientes y deudas. Ve a "Movimientos recurrentes" para agregar ingresos/gastos que se repiten.');
        }
        // Movimientos futuros agregados (applied=0) a 30 días
        let futIn = 0, futOut = 0;
        if (includeFuture) {
          const [futRows] = await timedQuery(
            `SELECT descripcion, monto, tipo, fecha
             FROM movimientos
             WHERE usuario_id = ? AND applied = 0 AND DATE(fecha) >= CURDATE() AND DATE(fecha) <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)`,
            [usuario_id],
            Math.min(800, timeLeftQuick())
          );
          for (const f of (futRows || [])) {
            const monto = Number(f.monto || 0);
            const tipo = String(f.tipo || '').toLowerCase();
            const detail = { 
              descripcion: f.descripcion || 'Sin descripción', 
              monto, 
              tipo: 'futuro', 
              fecha: f.fecha ? String(f.fecha).slice(0,10) : 'Sin fecha'
            };
            if (tipo === 'ingreso' || tipo === 'ahorro') { 
              futIn += monto; 
              ingresosDetail.push(detail); 
            } else if (tipo === 'egreso') { 
              futOut += monto; 
              egresosDetail.push(detail); 
            }
          }
          if (futIn === 0 && futOut === 0) {
            forecastWarnings.push('No tienes movimientos futuros pendientes (applied=0) en los próximos 30 días. Si esperas ingresos o gastos que aún no han ocurrido, regístralos en "Registro de movimientos" con fecha futura.');
          }
        } else {
          forecastWarnings.push('La opción "Incluir movimientos futuros" está desactivada. La proyección no incluye movimientos pendientes ni recurrentes. Actívala para un cálculo más completo.');
        }
        // Deudas a 30 días
        let due = 0;
        try {
          const [dueRows] = await timedQuery(
            `SELECT descripcion, monto_total, COALESCE(monto_pagado,0) AS pagado, fecha_vencimiento
             FROM deudas
             WHERE usuario_id = ? AND (pagada = 0 OR pagada IS NULL)
               AND fecha_vencimiento IS NOT NULL
               AND fecha_vencimiento > CURDATE() AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)`,
            [usuario_id],
            Math.min(800, timeLeftQuick())
          );
          for (const d of (dueRows || [])) {
            const pendiente = Number(d.monto_total || 0) - Number(d.pagado || 0);
            if (pendiente > 0) {
              due += pendiente;
              egresosDetail.push({ 
                descripcion: d.descripcion || 'Deuda sin descripción', 
                monto: pendiente, 
                tipo: 'deuda', 
                fecha: d.fecha_vencimiento ? String(d.fecha_vencimiento).slice(0,10) : 'Sin fecha'
              });
            }
          }
        } catch (_) {}
        const projIn = recIn + futIn;
        const projOut = recOut + futOut + due;
        const net = projIn - projOut;
        const endBalance = saldoActual + net;
        forecast = [{ 
          days: 30, 
          projectedIngresos: projIn, 
          projectedEgresos: projOut, 
          net, 
          startingBalance: saldoActual, 
          projectedBalanceEnd: endBalance,
          ingresosDetail,
          egresosDetail
        }];
        if (endBalance < 0) {
          insights.push({ id: 'forecast-30-neg', severity: 'danger', title: 'Riesgo de saldo negativo en 30 días', body: `Proyección de saldo: S/ ${endBalance.toFixed(2)}.`, cta: { label: 'Ajustar recurrentes', href: '/movimientos-recurrentes' } });
        }
      } catch (err) { 
        
        forecastWarnings.push('No se pudo calcular el forecast rápido debido a un error temporal. Intenta nuevamente o contacta soporte si persiste.');
      }
    } else if (doForecast && timeLeft() > 800) try {
      // Para evitar timeouts en free-tier, usamos el método simplificado (estimado por frecuencia) también para 60/90
      // Solo el modo ULTRA-detallado (cuando requestedHorizons incluye explícitamente y hay tiempo) usa excepciones
      const tl = timeLeft();
      const horizons = Array.isArray(requestedHorizons) && requestedHorizons.length>0 ? Array.from(new Set(requestedHorizons)).sort((a,b)=>a-b) : [30,60,90];
      
      // Saldo actual
      const [[saldoRow]] = await timedQuery('SELECT COALESCE(SUM(saldo_actual),0) AS saldo FROM cuentas WHERE usuario_id = ?', [usuario_id], Math.min(1500, timeLeft()));
      const saldoActual = Number((saldoRow && saldoRow.saldo) || 0);
      
      // Recurrentes activos (método simplificado)
      const [recRowsAll] = await timedQuery(
        `SELECT id, descripcion, tipo, monto, frecuencia, inicio, fin, indefinido
         FROM movimientos_recurrentes
         WHERE usuario_id = ?`,
        [usuario_id],
        Math.min(1500, timeLeft())
      );
      const nowISO = toISODate(new Date());
      
      horizonsUsed = horizons;
      for (const H of horizons) {
        if (timeLeft() < 300) break; // salir si casi no queda tiempo
        
        let recIn = 0, recOut = 0;
        const ingresosDetail = [], egresosDetail = [];
        for (const r of (recRowsAll || [])) {
          const inicio = r.inicio ? String(r.inicio).slice(0,10) : null;
          const fin = r.fin ? String(r.fin).slice(0,10) : null;
          const indef = !!r.indefinido;
          const active = (!inicio || inicio <= nowISO) && (indef || (fin && fin >= nowISO));
          if (!active) continue;
          const freq = String(r.frecuencia||'').toLowerCase();
          const days = H;
          // Factor aproximado según frecuencia para este horizonte
          const factor = (freq === 'mensual') ? (days/30) : (freq === 'semanal') ? (days/7) : (freq === 'diaria') ? days : 0;
          const amount = Number(r.monto||0) * factor;
          const tipo = String(r.tipo||'').toLowerCase();
          const detail = { 
            descripcion: r.descripcion || 'Sin descripción', 
            monto: amount, 
            tipo: 'recurrente', 
            frecuencia: r.frecuencia, 
            fecha: inicio || 'Sin fecha'
          };
          if (tipo === 'ingreso' || tipo === 'ahorro') { 
            recIn += amount; 
            ingresosDetail.push(detail); 
          } else if (tipo === 'egreso') { 
            recOut += amount; 
            egresosDetail.push(detail); 
          }
        }
        
        // Movimientos futuros a H días
        let futIn = 0, futOut = 0;
        if (includeFuture) {
          const [futRows] = await timedQuery(
            `SELECT descripcion, monto, tipo, fecha
             FROM movimientos
             WHERE usuario_id = ? AND applied = 0 AND DATE(fecha) >= CURDATE() AND DATE(fecha) <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
            [usuario_id, H],
            Math.min(1200, timeLeft())
          );
          for (const f of (futRows || [])) {
            const monto = Number(f.monto || 0);
            const tipo = String(f.tipo || '').toLowerCase();
            const detail = { 
              descripcion: f.descripcion || 'Sin descripción', 
              monto, 
              tipo: 'futuro', 
              fecha: f.fecha ? String(f.fecha).slice(0,10) : 'Sin fecha'
            };
            if (tipo === 'ingreso' || tipo === 'ahorro') { 
              futIn += monto; 
              ingresosDetail.push(detail); 
            } else if (tipo === 'egreso') { 
              futOut += monto; 
              egresosDetail.push(detail); 
            }
          }
        }
        
        // Deudas a H días
        let due = 0;
        try {
          const [dueRows] = await timedQuery(
            `SELECT descripcion, monto_total, COALESCE(monto_pagado,0) AS pagado, fecha_vencimiento
             FROM deudas
             WHERE usuario_id = ? AND (pagada = 0 OR pagada IS NULL)
               AND fecha_vencimiento IS NOT NULL
               AND fecha_vencimiento > CURDATE() AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
            [usuario_id, H],
            Math.min(1200, timeLeft())
          );
          for (const d of (dueRows || [])) {
            const pendiente = Number(d.monto_total || 0) - Number(d.pagado || 0);
            if (pendiente > 0) {
              due += pendiente;
              egresosDetail.push({ 
                descripcion: d.descripcion || 'Deuda sin descripción', 
                monto: pendiente, 
                tipo: 'deuda', 
                fecha: d.fecha_vencimiento ? String(d.fecha_vencimiento).slice(0,10) : 'Sin fecha'
              });
            }
          }
        } catch (_) {}
        
        const projIn = recIn + futIn;
        const projOut = recOut + futOut + due;
        const net = projIn - projOut;
        const endBalance = saldoActual + net;
        forecast.push({ 
          days: H, 
          projectedIngresos: projIn, 
          projectedEgresos: projOut, 
          net, 
          startingBalance: saldoActual, 
          projectedBalanceEnd: endBalance,
          ingresosDetail,
          egresosDetail
        });
      }
      
      // Alertas por forecast
      const f30 = forecast.find(f => f.days === 30);
      const f60 = forecast.find(f => f.days === 60);
      if (f30 && f30.projectedBalanceEnd < 0) {
        insights.push({ id: 'forecast-30-neg', severity: 'danger', title: 'Riesgo de saldo negativo en 30 días', body: `Proyección de saldo: S/ ${f30.projectedBalanceEnd.toFixed(2)}. Reduce egresos o aumenta ingresos.`, cta: { label: 'Ajustar recurrentes', href: '/movimientos-recurrentes' } });
      } else if (f60 && f60.projectedBalanceEnd < 0) {
        insights.push({ id: 'forecast-60-neg', severity: 'warning', title: 'Posible saldo negativo en 60 días', body: `Proyección de saldo: S/ ${f60.projectedBalanceEnd.toFixed(2)}. Considera optimizar gastos.`, cta: { label: 'Ver Presupuestos', href: '/presupuestos' } });
      }
  } catch (err) { 
    
    forecastWarnings.push('El forecast detallado falló. Esto puede deberse a datos inconsistentes en recurrentes o excepciones. Prueba con el cálculo rápido o revisa tus movimientos recurrentes.');
  }

    // Filtrar por insights ocultados (dismiss) en preferencias
    try {
      const [prefRows2] = await timedQuery('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [usuario_id], Math.min(1200, timeLeft()));
      const pdata2 = (Array.isArray(prefRows2) && prefRows2[0] && prefRows2[0].data) || {};
      const dismissed = (pdata2 && pdata2.insightsDismissed) || {};
      const now = Date.now();
      const filtered = insights.filter(it => {
        const until = dismissed[it.id];
        return !(typeof until === 'number' && until > now);
      });
      // Limpieza opcional de expirados
      let changed = false;
      for (const k of Object.keys(dismissed)) {
        const until = dismissed[k];
        if (typeof until === 'number' && until <= now) { delete dismissed[k]; changed = true; }
      }
      if (changed && timeLeft() > 300) {
        const [rows] = await timedQuery('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [usuario_id], Math.min(800, timeLeft()));
        const current = (Array.isArray(rows) && rows[0] && rows[0].data) ? rows[0].data : {};
        current.insightsDismissed = dismissed;
        try {
          await timedQuery('UPDATE usuarios_preferencias SET data = ? WHERE usuario_id = ?', [JSON.stringify(current), usuario_id], Math.min(800, timeLeft()));
        } catch (_) { /* si no se puede limpiar ahora, se hará luego */ }
      }
      const result = { kpis, insights: filtered, meta: { month: `${year}-${String(month).padStart(2,'0')}`, thresholds: { warn: thresholdWarn, danger: thresholdDanger }, forecast, forecastWarnings, includeFuture, fast: fastMode, quick: !!quickMode, degraded: quickMode ? (timeLeftQuick() <= 0) : (!fastMode && timeLeft() <= 0), detailsUsed: { budgets: !!doBudgets, recurrent: !!doRecurrent, fees: !!doFees, forecast: quickMode ? true : !!doForecast }, horizonsUsed } };
      setCached(usuario_id, variant, ymKey, result, fastMode ? CACHE_TTL_MS : CACHE_TTL_DETAILS_MS);
      return res.json(result);
    } catch (_) {
      // Si falla filtrado, devolver lista original
      const result = { kpis, insights, meta: { month: `${year}-${String(month).padStart(2,'0')}`, thresholds: { warn: thresholdWarn, danger: thresholdDanger }, forecast, forecastWarnings, includeFuture, fast: fastMode, quick: !!quickMode, degraded: quickMode ? (timeLeftQuick() <= 0) : (!fastMode && timeLeft() <= 0), detailsUsed: { budgets: !!doBudgets, recurrent: !!doRecurrent, fees: !!doFees, forecast: quickMode ? true : !!doForecast }, horizonsUsed } };
      setCached(usuario_id, variant, ymKey, result, fastMode ? CACHE_TTL_MS : CACHE_TTL_DETAILS_MS);
      return res.json(result);
    }
  } catch (err) {
    
    return res.status(500).json({ error: 'No se pudieron calcular insights' });
  }
};

// POST /api/insights/dismiss { id: string, days?: number }
exports.dismiss = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const id = String((req.body && req.body.id) || '').trim();
    const days = Number((req.body && req.body.days) || 30);
    if (!id) return res.status(400).json({ error: 'Falta id' });
    const until = Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000;
    const [rows] = await db.query('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [usuario_id]);
    const current = (Array.isArray(rows) && rows[0] && rows[0].data) ? rows[0].data : {};
    const dismissed = (current.insightsDismissed && typeof current.insightsDismissed === 'object' && !Array.isArray(current.insightsDismissed)) ? current.insightsDismissed : {};
    dismissed[id] = until;
    current.insightsDismissed = dismissed;
    if (Array.isArray(rows) && rows.length > 0) {
      await db.query('UPDATE usuarios_preferencias SET data = ? WHERE usuario_id = ?', [JSON.stringify(current), usuario_id]);
    } else {
      await db.query('INSERT INTO usuarios_preferencias (usuario_id, data) VALUES (?, ?)', [usuario_id, JSON.stringify(current)]);
    }
    // Invalidar cache de insights para este usuario (cambió el estado de dismiss)
    try { invalidateUser(usuario_id); } catch (_) {}
    return res.json({ success: true, id, until });
  } catch (err) {
    
    return res.status(500).json({ error: 'No se pudo registrar dismiss' });
  }
};
