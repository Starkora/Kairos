const db = require('../db');

// Cache en memoria por usuario y parámetro includeFuture para acelerar respuestas repetidas
// TTL corto para mantener datos frescos y no bloquear UX (p. ej., 30s)
const CACHE_TTL_MS = Number(process.env.INSIGHTS_CACHE_TTL_MS || 30_000);
const insightsCache = new Map(); // key -> { expires: number, payload }

// includeVariant puede ser boolean (true/false) o una cadena diferenciadora como '1:fast'/'1'
function cacheKey(userId, includeVariant) {
  // Cambia con el mes actual para evitar inconsistencias al cruzar de mes
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  return `u:${userId}|v:${String(includeVariant)}|m:${ym}`;
}

function getCached(userId, includeVariant) {
  const key = cacheKey(userId, includeVariant);
  const rec = insightsCache.get(key);
  if (!rec) return null;
  if (Date.now() > rec.expires) { insightsCache.delete(key); return null; }
  return rec.payload;
}

function setCached(userId, includeVariant, payload) {
  const key = cacheKey(userId, includeVariant);
  insightsCache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
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
    const { year, month, day } = todayInfo();
    const { first, last, daysInMonth } = monthBounds(year, month);
  const includeFuture = String((req.query && req.query.includeFuture) ?? '1') !== '0';
  const fastMode = String((req.query && req.query.fast) || '0') === '1';

    // Cache rápido para aliviar carga cuando la pantalla hace refresh o varios widgets llaman lo mismo
    const cached = getCached(usuario_id, (includeFuture ? '1' : '0') + (fastMode ? ':fast' : ''));
    if (cached) {
      return res.json(cached);
    }

    // Preferencias del usuario (umbrales presupuesto)
    let thresholdWarn = 80;
    let thresholdDanger = 100;
    try {
      const [prefRows] = await db.query('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [usuario_id]);
      const pdata = (Array.isArray(prefRows) && prefRows[0] && prefRows[0].data) || {};
      if (pdata && pdata.budgets) {
        if (typeof pdata.budgets.thresholdWarn === 'number') thresholdWarn = pdata.budgets.thresholdWarn;
        if (typeof pdata.budgets.thresholdDanger === 'number') thresholdDanger = pdata.budgets.thresholdDanger;
      }
    } catch (_) {}

    // TOTALES del mes (applied=1)
    const [[incRow]] = await db.query(
      `SELECT COALESCE(SUM(monto),0) AS total FROM movimientos
       WHERE usuario_id = ? AND applied = 1 AND tipo IN ('ingreso','ahorro') AND DATE(fecha) BETWEEN ? AND ?`,
      [usuario_id, first, last]
    );
    const [[expRow]] = await db.query(
      `SELECT COALESCE(SUM(monto),0) AS total FROM movimientos
       WHERE usuario_id = ? AND applied = 1 AND tipo = 'egreso' AND DATE(fecha) BETWEEN ? AND ?`,
      [usuario_id, first, last]
    );
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

    // Presupuestos del mes
    const [budgets] = await db.query(
      'SELECT p.categoria_id, p.monto, c.nombre AS categoria FROM presupuestos p LEFT JOIN categorias c ON c.id = p.categoria_id WHERE p.usuario_id = ? AND p.anio = ? AND p.mes = ?',
      [usuario_id, year, month]
    );
    let inDanger = [], inWarn = [];
    // Para la regla "no-budgets" necesitaremos saber si hay presupuestos > 0
    const budgetsCount = (budgets || []).filter(b => Number(b.monto || 0) > 0).length;
    // Cálculo detallado de gasto por categoría solo en modo no-rápido
    if (!fastMode) {
      const [spentRows] = await db.query(
        `SELECT categoria_id, SUM(monto) AS gastado
         FROM movimientos
         WHERE usuario_id = ? AND tipo = 'egreso' AND applied = 1 AND DATE(fecha) BETWEEN ? AND ?
         GROUP BY categoria_id`,
        [usuario_id, first, last]
      );
      const spentMap = new Map((spentRows || []).map(r => [Number(r.categoria_id)||0, Number(r.gastado)||0]));
      const enriched = (budgets || []).map(b => ({
        categoria_id: Number(b.categoria_id),
        categoria: b.categoria || String(b.categoria_id),
        monto: Number(b.monto || 0),
        gastado: spentMap.get(Number(b.categoria_id)||0) || 0
      })).filter(b => b.monto > 0);
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
    if (!fastMode) try {
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
      const [[rowCount]] = await db.query(
        `SELECT COUNT(*) AS cnt
         FROM metas
         WHERE usuario_id = ? AND (cumplida = 0 OR cumplida IS NULL)
           AND COALESCE(monto_ahorrado,0) = 0
           AND fecha_inicio IS NOT NULL
           AND fecha_inicio <= DATE_SUB(CURDATE(), INTERVAL 60 DAY)`,
        [usuario_id]
      );
      const cnt = Number((rowCount && rowCount.cnt) || 0);
      if (cnt > 0) {
        insights.push({ id: 'goals-inactive', severity: 'warning', title: 'Metas sin avances', body: `Tienes ${cnt} meta(s) sin aportes en 60 días. Retoma o ajusta tus objetivos.`, cta: { label: 'Ver metas', href: '/deudas-metas' } });
      }
    } catch (_) { /* opcional */ }

      // Regla 6: Comisiones/cargos bancarios elevados
      if (!fastMode) try {
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
    if (!fastMode) try {
      const horizons = [30, 60, 90];
      const today = clampDate(new Date());
      const todayISO = toISODate(today);
      const maxH = Math.max(...horizons);
      const endMax = addDays(today, maxH);

      // Saldo actual
      const [[saldoRow]] = await db.query('SELECT COALESCE(SUM(saldo_actual),0) AS saldo FROM cuentas WHERE usuario_id = ?', [usuario_id]);
      const saldoActual = Number((saldoRow && saldoRow.saldo) || 0);

      // Traer recurrentes del usuario
      const [recAll] = await db.query(
        `SELECT id, tipo, monto, frecuencia, inicio, fin, indefinido
         FROM movimientos_recurrentes
         WHERE usuario_id = ?`,
        [usuario_id]
      );
      const recIds = (recAll || []).map(r => r.id).filter(Boolean);
      // Excepciones relevantes dentro del rango
      let excByRec = new Map(); // id -> { byOriginal: Map(iso->exc), added: Set(iso) }
      if (recIds.length > 0) {
        const [excs] = await db.query(
          `SELECT movimiento_recurrente_id AS rid, fecha_original, fecha_nueva, accion
           FROM movimientos_recurrentes_excepciones
           WHERE movimiento_recurrente_id IN (${recIds.map(()=>'?').join(',')})
             AND ( (fecha_original IS NOT NULL AND fecha_original BETWEEN ? AND ?) OR (fecha_nueva IS NOT NULL AND fecha_nueva BETWEEN ? AND ?) )`,
          [...recIds, todayISO, toISODate(endMax), todayISO, toISODate(endMax)]
        );
        for (const e of (excs || [])) {
          if (!excByRec.has(e.rid)) excByRec.set(e.rid, { byOriginal: new Map(), added: new Set() });
          const pack = excByRec.get(e.rid);
          const fo = e.fecha_original ? String(e.fecha_original).slice(0,10) : null;
          const fn = e.fecha_nueva ? String(e.fecha_nueva).slice(0,10) : null;
          if (fo) pack.byOriginal.set(fo, { accion: e.accion, fecha_nueva: fn });
          if (fn) pack.added.add(fn);
        }
      }

      function* occurrencesFor(r, start, end) {
        const tipo = String(r.tipo||'').toLowerCase();
        const freq = String(r.frecuencia||'').toLowerCase();
        const inicio = r.inicio ? clampDate(parseISODate(String(r.inicio).slice(0,10))) : null;
        const fin = r.indefinido ? null : (r.fin ? clampDate(parseISODate(String(r.fin).slice(0,10))) : null);
        if (inicio && end < inicio) return; // antes de iniciar
        const effStart = inicio ? (start < inicio ? inicio : start) : start;
        const effEnd = fin ? (end > fin ? fin : end) : end;
        if (effEnd < effStart) return;

        const pack = excByRec.get(r.id) || { byOriginal: new Map(), added: new Set() };
        const addIfNotException = (d) => {
          const iso = toISODate(d);
          const exc = pack.byOriginal.get(iso);
          if (exc) {
            if (exc.accion === 'skip' || exc.accion === 'postpone') return; // omitimos original
            // si accion es 'move' y hay fecha_nueva, el nuevo será cubierto por added
          }
          // Emitir ocurrencia
          return iso;
        };

        if (freq === 'diaria') {
          let cur = effStart;
          while (cur <= effEnd) {
            const iso = addIfNotException(cur);
            if (iso) yield iso;
            cur = addDays(cur, 1);
          }
        } else if (freq === 'semanal') {
          // Alinear primera ocurrencia >= effStart en pasos de 7 desde inicio
          const base = inicio || effStart;
          let cur = clampDate(effStart);
          const offset = (7 + (daysDiff(base, cur) % 7)) % 7;
          cur = addDays(cur, offset);
          while (cur <= effEnd) {
            const iso = addIfNotException(cur);
            if (iso) yield iso;
            cur = addDays(cur, 7);
          }
        } else if (freq === 'mensual') {
          // Cada mes en el día del mes de inicio (ajustado al último día cuando no exista)
          const startDay = (inicio || effStart).getDate();
          let y = effStart.getFullYear();
          let m = effStart.getMonth();
          // Encontrar primera fecha >= effStart respetando el día de inicio
          while (true) {
            const lastDay = new Date(y, m+1, 0).getDate();
            const day = Math.min(startDay, lastDay);
            const cur = new Date(y, m, day);
            if (cur >= effStart) {
              // Iterar mensual
              let iter = cur;
              while (iter <= effEnd) {
                const iso = addIfNotException(iter);
                if (iso) yield iso;
                // next month
                const ny = iter.getFullYear();
                const nm = iter.getMonth()+1;
                const nlast = new Date(ny, nm+1, 0).getDate();
                const nday = Math.min(startDay, nlast);
                iter = new Date(ny, nm, nday);
              }
              break;
            }
            // avanzar mes hasta llegar >= effStart
            m += 1; if (m >= 12) { m = 0; y += 1; }
          }
        }
        // Agregar ocurrencias movidas con fecha_nueva en rango
        for (const iso of pack.added) {
          const d = clampDate(parseISODate(iso));
          if (d >= effStart && d <= effEnd) yield iso;
        }
      }

      // Precalcular ocurrencias por horizonte
      const start = today;
      const endByH = new Map(horizons.map(H => [H, addDays(start, H)]));

      // Movimientos futuros (applied=0) hasta el máximo horizonte
      let futs = [];
      if (includeFuture) {
        const [frows] = await db.query(
          `SELECT tipo, monto, fecha
           FROM movimientos
           WHERE usuario_id = ? AND applied = 0 AND DATE(fecha) >= CURDATE() AND DATE(fecha) <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
          [usuario_id, maxH]
        );
        futs = frows || [];
      }

      for (const H of horizons) {
        const endH = endByH.get(H);
        let recIn = 0, recOut = 0;
        for (const r of (recAll || [])) {
          const tipo = String(r.tipo||'').toLowerCase();
          const amount = Number(r.monto||0);
          if (!amount) continue;
          for (const iso of occurrencesFor(r, start, endH)) {
            if (tipo === 'ingreso' || tipo === 'ahorro') recIn += amount; else if (tipo === 'egreso') recOut += amount;
          }
        }
        let futIn = 0, futOut = 0;
        if (includeFuture) {
          for (const mv of (futs || [])) {
            const d = clampDate(parseISODate(String(mv.fecha).slice(0,10)));
            if (d > endH) continue;
            const t = String(mv.tipo||'').toLowerCase();
            const val = Number(mv.monto||0);
            if (t === 'ingreso' || t === 'ahorro') futIn += val; else if (t === 'egreso') futOut += val;
          }
        }
        const projIn = recIn + futIn;
        let projOut = recOut + futOut;
        // Deudas con vencimiento dentro del horizonte: sumar restante
        try {
          const [[dueRow]] = await db.query(
            `SELECT COALESCE(SUM(monto_total - COALESCE(monto_pagado,0)),0) AS due
             FROM deudas
             WHERE usuario_id = ?
               AND (pagada = 0 OR pagada IS NULL)
               AND fecha_vencimiento IS NOT NULL
               AND fecha_vencimiento > CURDATE()
               AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
            [usuario_id, H]
          );
          const due = Number((dueRow && dueRow.due) || 0);
          projOut += due;
        } catch (_) {}
        const net = projIn - projOut;
        const endBalance = saldoActual + net;
        forecast.push({ days: H, projectedIngresos: projIn, projectedEgresos: projOut, net, startingBalance: saldoActual, projectedBalanceEnd: endBalance });
      }
      // Alertas por forecast
      const f30 = forecast.find(f => f.days === 30);
      const f60 = forecast.find(f => f.days === 60);
      if (f30 && f30.projectedBalanceEnd < 0) {
        insights.push({ id: 'forecast-30-neg', severity: 'danger', title: 'Riesgo de saldo negativo en 30 días', body: `Proyección de saldo: S/ ${f30.projectedBalanceEnd.toFixed(2)}. Reduce egresos o aumenta ingresos.`, cta: { label: 'Ajustar recurrentes', href: '/movimientos-recurrentes' } });
      } else if (f60 && f60.projectedBalanceEnd < 0) {
        insights.push({ id: 'forecast-60-neg', severity: 'warning', title: 'Posible saldo negativo en 60 días', body: `Proyección de saldo: S/ ${f60.projectedBalanceEnd.toFixed(2)}. Considera optimizar gastos.`, cta: { label: 'Ver Presupuestos', href: '/presupuestos' } });
      }
  } catch (_) { /* opcional */ }

    // Filtrar por insights ocultados (dismiss) en preferencias
    try {
      const [prefRows2] = await db.query('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [usuario_id]);
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
      if (changed) {
        const [rows] = await db.query('SELECT data FROM usuarios_preferencias WHERE usuario_id = ?', [usuario_id]);
        const current = (Array.isArray(rows) && rows[0] && rows[0].data) ? rows[0].data : {};
        current.insightsDismissed = dismissed;
        await db.query('UPDATE usuarios_preferencias SET data = ? WHERE usuario_id = ?', [JSON.stringify(current), usuario_id]);
      }
      const result = { kpis, insights: filtered, meta: { month: `${year}-${String(month).padStart(2,'0')}`, thresholds: { warn: thresholdWarn, danger: thresholdDanger }, forecast, includeFuture, fast: fastMode } };
      setCached(usuario_id, (includeFuture ? '1' : '0') + (fastMode ? ':fast' : ''), result);
      return res.json(result);
    } catch (_) {
      // Si falla filtrado, devolver lista original
      const result = { kpis, insights, meta: { month: `${year}-${String(month).padStart(2,'0')}`, thresholds: { warn: thresholdWarn, danger: thresholdDanger }, forecast, includeFuture, fast: fastMode } };
      setCached(usuario_id, (includeFuture ? '1' : '0') + (fastMode ? ':fast' : ''), result);
      return res.json(result);
    }
  } catch (err) {
    console.error('[insights.list] error:', err);
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
    console.error('[insights.dismiss] error:', err);
    return res.status(500).json({ error: 'No se pudo registrar dismiss' });
  }
};
