import React from 'react';
import API_BASE from '../../utils/apiBase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { getToken } from '../../utils/auth';
import { FaWallet, FaArrowDown, FaArrowUp, FaUniversity, FaMoneyBillWave, FaPiggyBank, FaCalendarAlt, FaPlus, FaChartLine, FaBullseye, FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaMousePointer } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router-dom';


export default function Dashboard() {
  const navigate = useNavigate();
  
  // Parser robusto para montos: acepta "1.234,56", "1,234.56", "1234,56", "1234.56", números y null/undefined
  const parseMonto = (v) => {
    if (typeof v === 'number') return v;
    if (v === null || v === undefined) return 0;
    let s = String(v).trim();
    if (!s) return 0;
    // Detectar símbolo decimal por la última aparición de ',' o '.'
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    let decimalSym = '';
    if (lastDot === -1 && lastComma === -1) {
      // Sin separadores, parsear directo
      const n = Number(s.replace(/[^0-9\-]/g, ''));
      return isNaN(n) ? 0 : n;
    }
    if (lastDot > lastComma) {
      decimalSym = '.'; // formato tipo 1,234.56 o 1234.56
    } else {
      decimalSym = ','; // formato tipo 1.234,56 o 1234,56
    }
    const thousandsSym = decimalSym === '.' ? ',' : '.';
    // Eliminar miles y normalizar decimal a punto
    s = s.replace(new RegExp('\\' + thousandsSym, 'g'), '');
    if (decimalSym === ',') s = s.replace(/,/g, '.');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };
  const [movimientos, setMovimientos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [cuentas, setCuentas] = React.useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = React.useState<number | 'all'>('all');
  const [presupuestos, setPresupuestos] = React.useState([]);
  const [metas, setMetas] = React.useState([]);
  const [deudas, setDeudas] = React.useState([]);
  // Filtro de año y mes (para el dashboard general)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [year, setYear] = React.useState(currentYear);
  const [month, setMonth] = React.useState<number | 'all'>('all');
  // Estados para la comparación independiente (por defecto: Febrero vs Enero)
  const [comparisonCurrentMonth, setComparisonCurrentMonth] = React.useState<number>(1); // Febrero (índice 1)
  const [comparisonCurrentYear, setComparisonCurrentYear] = React.useState<number>(currentYear);
  const [comparisonPreviousMonth, setComparisonPreviousMonth] = React.useState<number>(0); // Enero (índice 0)
  const [comparisonPreviousYear, setComparisonPreviousYear] = React.useState<number>(currentYear);
  // Permitir selección múltiple de segmentos
  const [segmentos, setSegmentos] = React.useState({ Ahorro: true, Gasto: true, Ingreso: true });
  const [categoriaModal, setCategoriaModal] = React.useState<any>(null);
  const [modalDetalle, setModalDetalle] = React.useState<{ tipo: string; titulo: string; color: string } | null>(null);
  const [modalBusqueda, setModalBusqueda] = React.useState('');

  const handleSegmentoChange = (e) => {
    const { name, checked } = e.target;
    setSegmentos(prev => ({ ...prev, [name]: checked }));
  };

  React.useEffect(() => {
    fetch(`${API_BASE}/api/transacciones?plataforma=web`, {
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) ? setMovimientos(data) : setMovimientos([]))
      .catch(() => setMovimientos([]))
      .finally(() => setLoading(false));
  }, []);

  // Cargar cuentas para filtro
  React.useEffect(() => {
    fetch(`${API_BASE}/api/cuentas?plataforma=web`, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setCuentas(Array.isArray(data) ? data : []);
        // Por defecto: Todas
        setCuentaSeleccionada('all');
      })
      .catch(() => setCuentas([]));
  }, []);

  // Cargar presupuestos
  React.useEffect(() => {
    fetch(`${API_BASE}/api/categorias-cuenta?plataforma=web`, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setPresupuestos(Array.isArray(data) ? data : []))
      .catch(() => setPresupuestos([]));
  }, []);

  // Cargar metas
  React.useEffect(() => {
    fetch(`${API_BASE}/api/metas?plataforma=web`, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setMetas(Array.isArray(data) ? data : []))
      .catch(() => setMetas([]));
  }, []);

  // Cargar deudas
  React.useEffect(() => {
    fetch(`${API_BASE}/api/deudas?plataforma=web`, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setDeudas(Array.isArray(data) ? data : []))
      .catch(() => setDeudas([]));
  }, []);

  // Fecha actual para filtros (memo para evitar recrearla en cada render)
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filtrar movimientos: mostrar solo los del año seleccionado y ya aplicados o cuya fecha es <= hoy
  const visibleMovimientos = React.useMemo(() => {
    return movimientos.filter(m => {
      try {
        // Filtrar por año
        if (!m.fecha) return false;
        const movDate = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
        
        // Validar que la fecha es válida
        if (isNaN(movDate.getTime())) return false;
        
        if (movDate.getFullYear() !== year) return false;
        
        // Filtrar por mes si no es 'all'
        if (month !== 'all' && movDate.getMonth() !== month) return false;
        
        // Filtro por cuenta (si no es 'all')
        if (cuentaSeleccionada !== 'all') {
          const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
          if (!isNaN(cid) && cid !== Number(cuentaSeleccionada)) return false;
        }
        
        // Si el backend ya incluye el flag `applied`, úsalo
        if (typeof m.applied !== 'undefined' && m.applied !== null) {
          return Number(m.applied) === 1;
        }
        
        // Fallback: comparar solo la parte de fecha (sin hora)
        // Mostrar movimientos pasados y del día actual
        movDate.setHours(0, 0, 0, 0);
        return movDate <= today;
      } catch (e) {
        
        return false;
      }
    });
  }, [movimientos, year, month, cuentaSeleccionada, today]);
  
  // Función helper para identificar movimientos internos que NO deben contarse en indicadores de ingreso/egreso
  const esMovimientoInterno = React.useCallback((mov: any): boolean => {
    const desc = String(mov.descripcion || '').toLowerCase();
    // Transferencias, ahorros, deudas, metas: excluir ambos lados siempre
    if (
      /\[transfer#/i.test(desc) ||
      /\[ahorro#/i.test(desc) ||
      desc.includes('[deuda#') ||
      desc.includes('[meta#')
    ) return true;
    // Pago de tarjeta: excluir SOLO el lado destino ("pago desde ...") para no duplicar.
    // El lado origen ("pago de [tarjeta]...") pasa al filtro de cuenta:
    // si la cuenta origen tiene incluir_en_calculos=true → cuenta como gasto real.
    if (/\[pago_tarjeta#/i.test(desc)) {
      return desc.includes('pago desde '); // destino = siempre excluir
    }
    return false;
  }, []);

  // Set de IDs de cuentas que NO deben incluirse en cálculos (incluir_en_calculos === false o 0)
  const cuentasExcluidasCalculo = React.useMemo(() => {
    const ids = new Set<number>();
    cuentas.forEach(c => {
      if (c.incluir_en_calculos === false || c.incluir_en_calculos === 0) {
        ids.add(Number(c.id));
      }
    });
    return ids;
  }, [cuentas]);

  const filteredMovs = React.useMemo(() => {
    return visibleMovimientos.filter(m => {
      if (esMovimientoInterno(m)) return false;
      const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
      if (cuentasExcluidasCalculo.has(cid)) return false;
      return true;
    });
  }, [visibleMovimientos, esMovimientoInterno, cuentasExcluidasCalculo]);

  // Helper: un movimiento cuenta como "gasto" si es egreso normal,
  // O si es el lado ORIGEN de un pago de tarjeta (dinero real que sale de una cuenta incluida)
  const esGasto = React.useCallback((m: any): boolean => {
    if (m.tipo === 'egreso') return true;
    if (m.tipo === 'pago_tarjeta') {
      const desc = String(m.descripcion || '').toLowerCase();
      // Lado origen: "pago de [tarjeta]..." — NO contiene "pago desde"
      return !desc.includes('pago desde ');
    }
    return false;
  }, []);

  // Calcular totales
  const totalIngreso = filteredMovs.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0);
  const totalEgreso = filteredMovs.filter(m => esGasto(m)).reduce((acc, m) => acc + Number(m.monto), 0);
  // Ahorro: contar solo el lado del DESTINO (descripción contiene "ahorro desde") para no duplicar
  // Usar visibleMovimientos (no filteredMovs) porque los ahorros tienen marcador [AHORRO#] y se excluyen en filteredMovs
  // También excluir cuentas con incluir_en_calculos=false
  const totalAhorro = visibleMovimientos
    .filter(m => {
      if (!(m.tipo === 'ahorro' && String(m.descripcion || '').toLowerCase().includes('ahorro desde'))) return false;
      const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
      if (cuentasExcluidasCalculo.has(cid)) return false;
      return true;
    })
    .reduce((acc, m) => acc + Number(m.monto), 0);

  // Indicadores
  const saldoActual = React.useMemo(() => {
    try {
      if (!Array.isArray(cuentas) || cuentas.length === 0) return 0;
      if (cuentaSeleccionada === 'all') {
        return cuentas.reduce((acc, c) => acc + parseMonto(c.saldo_actual ?? c.saldo ?? 0), 0);
      }
      const cta = cuentas.find(c => Number(c.id) === Number(cuentaSeleccionada));
      return parseMonto(cta?.saldo_actual ?? cta?.saldo ?? 0);
    } catch {
      return 0;
    }
  }, [cuentas, cuentaSeleccionada]);
  const cuentaTipo = React.useMemo(() => {
    if (cuentaSeleccionada === 'all') return '';
    const cta = cuentas.find(c => Number(c.id) === Number(cuentaSeleccionada));
    return String(cta?.tipo || '').trim();
  }, [cuentas, cuentaSeleccionada]);
  const saldoNegativo = saldoActual < 0;
  const saldoInicial = React.useMemo(() => {
    if (cuentaSeleccionada === 'all') return null;
    const cta = cuentas.find(c => Number(c.id) === Number(cuentaSeleccionada));
    const si = parseMonto(cta?.saldo_inicial ?? 0);
    if (isNaN(si)) return 0;
    return si;
  }, [cuentas, cuentaSeleccionada]);
  const variacion = React.useMemo(() => {
    if (cuentaSeleccionada === 'all' || saldoInicial === null) return null;
    const delta = Number(saldoActual) - Number(saldoInicial);
    const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
    const abs = Math.abs(delta);
    const perc = Number(saldoInicial) !== 0 ? (delta / Number(saldoInicial)) * 100 : null;
    const color = delta > 0 ? '#2e7d32' : delta < 0 ? '#e53935' : 'var(--color-table-header-text)';
    const percText = perc === null ? '' : ` (${(perc).toFixed(1)}%)`;
    return {
      text: `Cambio: ${sign}S/ ${abs.toLocaleString(undefined, { minimumFractionDigits: 2 })}${percText}`,
      color
    };
  }, [cuentaSeleccionada, saldoActual, saldoInicial]);

  // NOTA: Las tendencias ahora se calculan más abajo usando comparisonMonth y previousComparisonMonth
  // para que sean coherentes con el mes seleccionado en el dropdown
  // El array indicadores se mueve después del cálculo de trend

  // Resumen para tarjetas
  const resumen = {
    egreso: totalEgreso,
    ingreso: totalIngreso,
    ahorro: totalAhorro,
  };

  // Top egresos por categoría
  const egresosPorCategoria = {};
  filteredMovs.filter(m => esGasto(m)).forEach(m => {
    const cat = m.categoria || 'Sin categoría';
    egresosPorCategoria[cat] = (egresosPorCategoria[cat] || 0) + Number(m.monto);
  });
  type TopEgreso = { categoria: string; monto: number; porcentaje?: number };
  const topEgresos: TopEgreso[] = Object.entries(egresosPorCategoria)
    .map(([categoria, monto]) => ({ categoria, monto: Number(monto) }))
    .sort((a, b) => Number(b.monto) - Number(a.monto))
    .slice(0, 3);
  const totalEgresosTop = topEgresos.reduce((acc, t) => acc + Number(t.monto), 0);
  topEgresos.forEach(t => t.porcentaje = totalEgresosTop ? Math.round((Number(t.monto) / totalEgresosTop) * 100) : 0);

  // Datos para el gráfico de distribución por categorías (Pie Chart)
  const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];
  const pieData = Object.entries(egresosPorCategoria)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 categorías

  // Los meses de comparación ya no se calculan automáticamente, se usan los estados comparisonCurrentMonth/Year y comparisonPreviousMonth/Year

  const getCurrentMonthData = () => {
    const allMovs = movimientos.filter(m => {
      if (!m.fecha) return false;
      const d = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      return d.getFullYear() === comparisonCurrentYear && d.getMonth() === comparisonCurrentMonth;
    });
    const movs = allMovs.filter(m => {
      if (esMovimientoInterno(m)) return false;
      const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
      if (cuentasExcluidasCalculo.has(cid)) return false;
      return true;
    });
    const ingreso = movs.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + parseMonto(m.monto), 0);
    const gasto = movs.filter(m => esGasto(m)).reduce((acc, m) => acc + parseMonto(m.monto), 0);
    const ahorro = allMovs.filter(m => {
      if (!(m.tipo === 'ahorro' && String(m.descripcion || '').toLowerCase().includes('ahorro desde'))) return false;
      const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
      if (cuentasExcluidasCalculo.has(cid)) return false;
      return true;
    }).reduce((acc, m) => acc + parseMonto(m.monto), 0);
    return { ingreso, gasto, ahorro };
  };

  const getPreviousMonthData = () => {
    const allMovs = movimientos.filter(m => {
      if (!m.fecha) return false;
      const d = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      return d.getFullYear() === comparisonPreviousYear && d.getMonth() === comparisonPreviousMonth;
    });
    const movs = allMovs.filter(m => {
      if (esMovimientoInterno(m)) return false;
      const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
      if (cuentasExcluidasCalculo.has(cid)) return false;
      return true;
    });
    const ingreso = movs.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + parseMonto(m.monto), 0);
    const gasto = movs.filter(m => esGasto(m)).reduce((acc, m) => acc + parseMonto(m.monto), 0);
    const ahorro = allMovs.filter(m => {
      if (!(m.tipo === 'ahorro' && String(m.descripcion || '').toLowerCase().includes('ahorro desde'))) return false;
      const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
      if (cuentasExcluidasCalculo.has(cid)) return false;
      return true;
    }).reduce((acc, m) => acc + parseMonto(m.monto), 0);
    return { ingreso, gasto, ahorro };
  };

  const currentMonthData = getCurrentMonthData();
  const previousMonthData = getPreviousMonthData();

  // Calcular tendencias para las tarjetas de indicadores
  const trend = React.useMemo(() => {
    const calc = (a, b) => {
      const delta = a - b;
      const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
      const abs = Math.abs(delta);
      const perc = b !== 0 ? (delta / b) * 100 : null;
      const color = delta > 0 ? '#2e7d32' : delta < 0 ? '#e53935' : '#888';
      const percText = perc === null ? '' : ` (${perc.toFixed(1)}%)`;
      return { text: `${sign}S/ ${abs.toLocaleString(undefined, { minimumFractionDigits: 2 })}${percText}`, color };
    };
    return { 
      ingreso: calc(currentMonthData.ingreso, previousMonthData.ingreso), 
      gasto: calc(currentMonthData.gasto, previousMonthData.gasto), 
      ahorro: calc(currentMonthData.ahorro, previousMonthData.ahorro) 
    };
  }, [currentMonthData, previousMonthData]);

  // Array de indicadores (después de calcular trend)
  const indicadores = [
    {
      IconComponent: FaWallet,
      color: saldoNegativo ? '#e53935' : '#7e57c2',
      titulo: cuentaSeleccionada === 'all' ? 'Saldo total' : 'Saldo actual',
      valor: `S/ ${saldoActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle: cuentaSeleccionada !== 'all' && cuentaTipo ? `Tipo: ${cuentaTipo}` : '',
      subtitle2: cuentaSeleccionada !== 'all' && saldoInicial !== null ? `Saldo inicial: S/ ${Number(saldoInicial).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '',
      subtitle3: variacion ? variacion.text : '',
      subtitle3Color: variacion ? variacion.color : undefined,
      isAmount: true,
      detalle: true,
    },
    {
      IconComponent: FaArrowDown,
      color: '#ff9800',
      titulo: 'Indicadores Egresos',
      valor: filteredMovs.filter(m => esGasto(m)).length,
      detalle: true,
    },
    {
      IconComponent: FaArrowUp,
      color: '#388e3c',
      titulo: 'Indicadores Ingresos',
      valor: filteredMovs.filter(m => m.tipo === 'ingreso').length,
      detalle: true,
    },
    {
      IconComponent: FaUniversity,
      color: '#ff7043',
      titulo: 'Ingreso',
      valor: `S/ ${totalIngreso.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle3: trend.ingreso.text,
      subtitle3Color: trend.ingreso.color,
      isAmount: true,
      detalle: true,
    },
    {
      IconComponent: FaMoneyBillWave,
      color: '#26c6da',
      titulo: 'Gastos',
      valor: `S/ ${totalEgreso.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle3: trend.gasto.text,
      subtitle3Color: trend.gasto.color,
      isAmount: true,
      detalle: true,
    },
    {
      IconComponent: FaPiggyBank,
      color: '#6c4fa1',
      titulo: 'Ahorro',
      valor: `S/ ${totalAhorro.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle3: trend.ahorro.text,
      subtitle3Color: trend.ahorro.color,
      isAmount: true,
      detalle: true,
    },
  ];

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isPositive: current >= 0, text: 'N/A' };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(change),
      isPositive: change >= 0,
      text: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
    };
  };

  const ingresoChange = calculateChange(currentMonthData.ingreso, previousMonthData.ingreso);
  const gastoChange = calculateChange(currentMonthData.gasto, previousMonthData.gasto);
  const ahorroChange = calculateChange(currentMonthData.ahorro, previousMonthData.ahorro);

  // Balance proyectado fin de mes (usar el mes del filtro principal si está seleccionado, sino el mes actual)
  const getBalanceProyectado = () => {
    const projMonth = month !== 'all' ? month : new Date().getMonth();
    const projYear = year;
    const endOfMonth = new Date(projYear, projMonth + 1, 0);
    const pendientes = movimientos.filter(m => {
      if (!m.fecha) return false;
      const d = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      if (d > endOfMonth) return false;
      if (typeof m.applied !== 'undefined' && m.applied !== null) {
        return Number(m.applied) === 0;
      }
      return d > new Date();
    });
    const ingresosPendientes = pendientes.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + parseMonto(m.monto), 0);
    const egresosPendientes = pendientes.filter(m => m.tipo === 'egreso').reduce((acc, m) => acc + parseMonto(m.monto), 0);
    return saldoActual + ingresosPendientes - egresosPendientes;
  };

  const balanceProyectado = getBalanceProyectado();

  // Alertas inteligentes
  const getAlertas = () => {
    const alertas: Array<{ tipo: 'warning' | 'success' | 'info' | 'danger', mensaje: string, icono: any }> = [];
    
    // Presupuestos cercanos al límite
    presupuestos.forEach(p => {
      if (p.limite && p.limite > 0) {
        const gastado = filteredMovs
          .filter(m => esGasto(m) && m.categoria === p.categoria)
          .reduce((acc, m) => acc + parseMonto(m.monto), 0);
        const porcentaje = (gastado / p.limite) * 100;
        if (porcentaje >= 85 && porcentaje < 100) {
          alertas.push({
            tipo: 'warning',
            mensaje: `Presupuesto "${p.categoria}" al ${porcentaje.toFixed(0)}%`,
            icono: FaExclamationTriangle
          });
        } else if (porcentaje >= 100) {
          alertas.push({
            tipo: 'danger',
            mensaje: `Presupuesto "${p.categoria}" excedido (${porcentaje.toFixed(0)}%)`,
            icono: FaExclamationTriangle
          });
        }
      }
    });

    // Metas cercanas a cumplirse
    metas.forEach(m => {
      if (m.monto_objetivo && m.monto_objetivo > 0) {
        const actual = parseMonto(m.monto_actual || 0);
        const porcentaje = (actual / m.monto_objetivo) * 100;
        if (porcentaje >= 70 && porcentaje < 100) {
          alertas.push({
            tipo: 'success',
            mensaje: `Meta "${m.nombre}" al ${porcentaje.toFixed(0)}% - ¡Ya casi!`,
            icono: FaBullseye
          });
        } else if (porcentaje >= 100) {
          alertas.push({
            tipo: 'success',
            mensaje: `¡Meta "${m.nombre}" cumplida!`,
            icono: FaCheckCircle
          });
        }
      }
    });

    // Deudas próximas a vencer
    deudas.forEach(d => {
      // Excluir deudas ya pagadas (verificar true, 1, o si monto_pagado >= monto_total)
      if (d.pagada === true || d.pagada === 1) return;
      if (d.monto_pagado && d.monto_total && parseFloat(d.monto_pagado) >= parseFloat(d.monto_total)) return;
      
      if (d.fecha_vencimiento) {
        const vencimiento = new Date(d.fecha_vencimiento);
        const hoy = new Date();
        const diffDays = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          alertas.push({
            tipo: 'danger',
            mensaje: `Deuda "${d.descripcion || 'Sin nombre'}" vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`,
            icono: FaExclamationTriangle
          });
        }
      }
    });

    // Movimientos pendientes
    const pendientesCount = movimientos.filter(m => {
      if (typeof m.applied !== 'undefined' && m.applied !== null) {
        return Number(m.applied) === 0;
      }
      if (!m.fecha) return false;
      const d = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      return d <= new Date() && d > today;
    }).length;

    if (pendientesCount > 0) {
      alertas.push({
        tipo: 'info',
        mensaje: `${pendientesCount} movimiento${pendientesCount !== 1 ? 's' : ''} pendiente${pendientesCount !== 1 ? 's' : ''} por aplicar`,
        icono: FaCalendarAlt
      });
    }

    return alertas.slice(0, 5); // Máximo 5 alertas
  };

  const alertas = getAlertas();

  // Resumen semanal
  const getResumenSemanal = () => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    const movsEstaSemana = movimientos.filter(m => {
      if (!m.fecha) return false;
      const d = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      return d >= inicioSemana && d <= finSemana;
    });

    const inicioSemanaAnterior = new Date(inicioSemana);
    inicioSemanaAnterior.setDate(inicioSemana.getDate() - 7);
    const finSemanaAnterior = new Date(inicioSemana);
    finSemanaAnterior.setDate(inicioSemana.getDate() - 1);

    const movsSemanaAnterior = movimientos.filter(m => {
      if (!m.fecha) return false;
      const d = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      return d >= inicioSemanaAnterior && d <= finSemanaAnterior;
    });

    const gastosEstaSemana = movsEstaSemana.filter(m => esGasto(m)).reduce((acc, m) => acc + parseMonto(m.monto), 0);
    const gastosSemanaAnterior = movsSemanaAnterior.filter(m => esGasto(m)).reduce((acc, m) => acc + parseMonto(m.monto), 0);
    const promedioDiario = gastosEstaSemana / 7;

    const cambioSemanal = gastosSemanaAnterior > 0 
      ? ((gastosEstaSemana - gastosSemanaAnterior) / gastosSemanaAnterior) * 100 
      : 0;

    return { gastosEstaSemana, cambioSemanal, promedioDiario };
  };

  const resumenSemanal = getResumenSemanal();

  // Datos para gráficos (totales por mes, siempre 12 meses)
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  // Normalizar fechas y asegurar que todos los meses estén presentes
  const data = meses.map((nombreMes, idx) => {
    // Filtrar movimientos de este mes (ingresos/gastos desde filteredMovs, ahorros desde visibleMovimientos)
    const movsMes = filteredMovs.filter(m => {
      if (!m.fecha) return false;
      const fecha = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      if (isNaN(fecha.getTime())) return idx === 0;
      return fecha.getMonth() === idx;
    });
    const Ingreso = movsMes.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + Number(m.monto), 0);
    const Gasto = movsMes.filter(m => esGasto(m)).reduce((acc, m) => acc + Number(m.monto), 0);
    // Ahorro: usar visibleMovimientos porque filteredMovs excluye los [AHORRO#]
    // Contar solo el lado destino ("ahorro desde") para no duplicar, igual que totalAhorro
    const Ahorro = visibleMovimientos.filter(m => {
      if (!(m.tipo === 'ahorro' && String(m.descripcion || '').toLowerCase().includes('ahorro desde'))) return false;
      const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
      if (cuentasExcluidasCalculo.has(cid)) return false;
      if (!m.fecha) return false;
      const fecha = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
      if (isNaN(fecha.getTime())) return idx === 0;
      return fecha.getMonth() === idx;
    }).reduce((acc, m) => acc + Number(m.monto), 0);
    return { mes: nombreMes, Ingreso, Gasto, Ahorro };
  });


  // Años disponibles en los movimientos (hook debe ir antes de cualquier return condicional)
  const yearsAvailable = React.useMemo(() => {
    const set = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Agregar años de los movimientos existentes
    movimientos.forEach(m => {
      if (m.fecha) {
        const d = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
        set.add(d.getFullYear());
      }
    });
    
    // Asegurar que el año actual esté disponible
    set.add(currentYear);
    
    // Agregar los próximos 5 años para planificación futura
    for (let i = 1; i <= 5; i++) {
      set.add(currentYear + i);
    }
    
    return Array.from(set).sort((a, b) => b - a);
  }, [movimientos]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Cargando datos del dashboard...</div>;
  }

  return (
    <div style={{ overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 8, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <div>
          <label htmlFor="dashboard-year" style={{ fontWeight: 600, marginRight: 6 }}>Año:</label>
          <select id="dashboard-year" value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: 4, borderRadius: 6, fontWeight: 600 }}>
            {yearsAvailable.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dashboard-month" style={{ fontWeight: 600, marginRight: 6 }}>Mes:</label>
          <select 
            id="dashboard-month" 
            value={month === 'all' ? 'all' : month} 
            onChange={e => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} 
            style={{ padding: 4, borderRadius: 6, fontWeight: 600 }}
          >
            <option value="all">Todos</option>
            <option value="0">Enero</option>
            <option value="1">Febrero</option>
            <option value="2">Marzo</option>
            <option value="3">Abril</option>
            <option value="4">Mayo</option>
            <option value="5">Junio</option>
            <option value="6">Julio</option>
            <option value="7">Agosto</option>
            <option value="8">Septiembre</option>
            <option value="9">Octubre</option>
            <option value="10">Noviembre</option>
            <option value="11">Diciembre</option>
          </select>
        </div>
        <div>
          <label htmlFor="dashboard-cuenta" style={{ fontWeight: 600, marginRight: 6 }}>Cuenta:</label>
          <select
            id="dashboard-cuenta"
            value={cuentaSeleccionada === 'all' ? 'all' : String(cuentaSeleccionada)}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') setCuentaSeleccionada('all');
              else setCuentaSeleccionada(Number(val));
            }}
            style={{ padding: 4, borderRadius: 6, fontWeight: 600 }}
          >
            <option value="all">Todas</option>
            {cuentas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Actions y Widgets superiores */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        {/* Quick Actions */}
        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          <h3 style={{ marginBottom: 16, color: 'var(--color-text)' }}>Acciones Rápidas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <button
              onClick={() => navigate('/Registro')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '16px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                fontSize: 14,
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {React.createElement(FaPlus as any, { size: 24 })}
              <span>Nueva Transacción</span>
            </button>

            <button
              onClick={() => navigate('/asesor')}
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '16px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                fontSize: 14,
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 87, 108, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {React.createElement(FaChartLine as any, { size: 24 })}
              <span>Asesor Financiero</span>
            </button>

            <button
              onClick={() => navigate('/presupuestos')}
              style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '16px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                fontSize: 14,
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 172, 254, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {React.createElement(FaMoneyBillWave as any, { size: 24 })}
              <span>Presupuestos</span>
            </button>

            <button
              onClick={() => navigate('/deudas-metas')}
              style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '16px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                fontSize: 14,
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(250, 112, 154, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {React.createElement(FaBullseye as any, { size: 24 })}
              <span>Mis Metas</span>
            </button>
          </div>
        </div>

        {/* Balance Proyectado y Resumen Semanal */}
        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Balance Proyectado */}
          <div className="card" style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-text)', fontSize: 15 }}>Balance Proyectado Fin de Mes</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {React.createElement(FaWallet as any, { size: 32, color: balanceProyectado >= 0 ? '#2e7d32' : '#e53935' })}
              <div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: balanceProyectado >= 0 ? '#2e7d32' : '#e53935' }}>
                  S/ {balanceProyectado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Saldo actual + movimientos pendientes
                </div>
              </div>
            </div>
          </div>

          {/* Resumen Semanal */}
          <div className="card" style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-text)', fontSize: 15 }}>Resumen Semanal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Gastos esta semana:</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 16 }}>
                  S/ {resumenSemanal.gastosEstaSemana.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>vs semana anterior:</span>
                <span style={{ 
                  color: resumenSemanal.cambioSemanal <= 0 ? '#2e7d32' : '#e53935', 
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  {resumenSemanal.cambioSemanal >= 0 ? '+' : ''}{resumenSemanal.cambioSemanal.toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Promedio diario:</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 14 }}>
                  S/ {resumenSemanal.promedioDiario.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Inteligentes */}
      {alertas.length > 0 && (
        <div className="card" style={{ marginBottom: 24, background: 'var(--color-card)' }}>
          <h3 style={{ marginBottom: 16, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {React.createElement(FaExclamationTriangle as any, { size: 20 })}
            Alertas y Notificaciones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alertas.map((alerta, idx) => {
              const bgColors = {
                warning: 'rgba(255, 152, 0, 0.1)',
                danger: 'rgba(244, 67, 54, 0.1)',
                success: 'rgba(76, 175, 80, 0.1)',
                info: 'rgba(33, 150, 243, 0.1)'
              };
              const borderColors = {
                warning: '#ff9800',
                danger: '#f44336',
                success: '#4caf50',
                info: '#2196f3'
              };
              return (
                <div
                  key={idx}
                  style={{
                    background: bgColors[alerta.tipo],
                    border: `2px solid ${borderColors[alerta.tipo]}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  {React.createElement(alerta.icono as any, { size: 20, color: borderColors[alerta.tipo] })}
                  <span style={{ color: 'var(--color-text)', fontWeight: 500, flex: 1 }}>
                    {alerta.mensaje}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fila de indicadores/resumen */}
      <div style={{ display: 'flex', gap: 24, margin: '24px 0 32px 0', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {indicadores.map((item, idx) => {
          const Icon = item.IconComponent as IconType;
          const esClickeable = (item as any).detalle === true;
          return (
            <div
              key={idx}
              className="card"
              style={{
                flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center',
                borderLeft: `4px solid ${item.color}`,
                cursor: esClickeable ? 'pointer' : 'default',
                transition: esClickeable ? 'box-shadow 0.18s, transform 0.15s' : undefined,
                position: 'relative',
              }}
              onClick={esClickeable ? () => {
                const mapTipo = (t: string) => {
                  if (t === 'Gastos') return 'egreso';
                  if (t === 'Ingreso') return 'ingreso';
                  if (t === 'Ahorro') return 'ahorro';
                  if (t === 'Indicadores Egresos') return 'indicador_egreso';
                  if (t === 'Indicadores Ingresos') return 'indicador_ingreso';
                  return 'saldo';
                };
                setModalDetalle({ tipo: mapTipo(item.titulo), titulo: item.titulo, color: item.color });
                setModalBusqueda('');
              } : undefined}
              onMouseEnter={esClickeable ? (e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${item.color}44`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; } : undefined}
              onMouseLeave={esClickeable ? (e) => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; } : undefined}
            >
              {esClickeable && (
                <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, color: item.color, fontWeight: 700, opacity: 0.7, letterSpacing: 0.5 }}>VER DETALLE ▸</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {React.createElement(Icon as any, { size: 28, color: item.color })}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{item.titulo}</div>
                  <div style={{ fontSize: item.isAmount ? 20 : 26, fontWeight: 'bold', color: 'var(--color-text)', marginTop: 4 }}>{item.valor}</div>
                  {item.subtitle && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-secondary)' }}>{item.subtitle}</div>}
                  {item.subtitle2 && <div style={{ fontSize: 11, marginTop: 2, color: 'var(--color-text-secondary)' }}>{item.subtitle2}</div>}
                  {item.subtitle3 && <div style={{ fontSize: 11, marginTop: 2, color: item.subtitle3Color || 'var(--color-text-secondary)', fontWeight: 600 }}>{item.subtitle3}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tarjetas de comparación mensual */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Comparación:</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select 
              value={comparisonCurrentYear} 
              onChange={(e) => setComparisonCurrentYear(Number(e.target.value))}
              style={{ padding: '6px 12px', fontSize: 14, borderRadius: 6, background: 'var(--color-input-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select 
              value={comparisonCurrentMonth} 
              onChange={(e) => setComparisonCurrentMonth(Number(e.target.value))}
              style={{ padding: '6px 12px', fontSize: 14, borderRadius: 6, background: 'var(--color-input-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>
          <span style={{ color: 'var(--color-text-secondary)' }}>vs</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select 
              value={comparisonPreviousYear} 
              onChange={(e) => setComparisonPreviousYear(Number(e.target.value))}
              style={{ padding: '6px 12px', fontSize: 14, borderRadius: 6, background: 'var(--color-input-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select 
              value={comparisonPreviousMonth} 
              onChange={(e) => setComparisonPreviousMonth(Number(e.target.value))}
              style={{ padding: '6px 12px', fontSize: 14, borderRadius: 6, background: 'var(--color-input-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Tarjeta Ingresos */}
          <div className="card" style={{ flex: 1, minWidth: 250, borderLeft: '4px solid #388e3c' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Ingresos</h4>
              <span style={{ fontSize: 24, color: ingresoChange.isPositive ? '#2e7d32' : '#e53935' }}>
                {ingresoChange.isPositive ? '↑' : '↓'}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--color-text)', marginBottom: 8 }}>
              S/ {currentMonthData.ingreso.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Mes anterior: S/ {previousMonthData.ingreso.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              marginTop: 8, 
              color: ingresoChange.isPositive ? '#2e7d32' : '#e53935' 
            }}>
              {ingresoChange.text}
            </div>
          </div>

          {/* Tarjeta Gastos */}
          <div className="card" style={{ flex: 1, minWidth: 250, borderLeft: '4px solid #fbc02d' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Gastos</h4>
              <span style={{ fontSize: 24, color: gastoChange.isPositive ? '#e53935' : '#2e7d32' }}>
                {gastoChange.isPositive ? '↑' : '↓'}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--color-text)', marginBottom: 8 }}>
              S/ {currentMonthData.gasto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Mes anterior: S/ {previousMonthData.gasto.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              marginTop: 8, 
              color: gastoChange.isPositive ? '#e53935' : '#2e7d32'
            }}>
              {gastoChange.text}
            </div>
          </div>

          {/* Tarjeta Ahorro */}
          <div className="card" style={{ flex: 1, minWidth: 250, borderLeft: '4px solid #6c4fa1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: 'var(--color-text)' }}>Ahorro</h4>
              <span style={{ fontSize: 24, color: ahorroChange.isPositive ? '#2e7d32' : '#e53935' }}>
                {ahorroChange.isPositive ? '↑' : '↓'}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--color-text)', marginBottom: 8 }}>
              S/ {currentMonthData.ahorro.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Mes anterior: S/ {previousMonthData.ahorro.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              marginTop: 8, 
              color: ahorroChange.isPositive ? '#2e7d32' : '#e53935'
            }}>
              {ahorroChange.text}
            </div>
          </div>
        </div>
      </div>

      {/* Segmentador y gráfica horizontal ocupando todo el ancho */}
      <div className="card" style={{ width: '100%', marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold' }}>Seleccionar Segmentos:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="Ahorro" checked={segmentos.Ahorro} onChange={handleSegmentoChange} />
            <span className="segment-label ahorro-label" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Ahorro</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="Gasto" checked={segmentos.Gasto} onChange={handleSegmentoChange} />
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Gastos</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="Ingreso" checked={segmentos.Ingreso} onChange={handleSegmentoChange} />
            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Ingresos</span>
          </label>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Transferencias y movimientos internos excluidos de totales y gráficos.</div>
  <ResponsiveContainer width="100%" height={600}>
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="mes" type="category" />
            <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
            <Legend />
            {segmentos.Ahorro && <Bar dataKey="Ahorro" fill="#6c4fa1" name="Ahorro" />}
            {segmentos.Gasto && <Bar dataKey="Gasto" fill="#fbc02d" name="Gastos" />}
            {segmentos.Ingreso && <Bar dataKey="Ingreso" fill="#388e3c" name="Ingresos" />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Debajo: resumen de totales (izquierda) y top egresos (derecha) */}
      <div className="flex-row" style={{ width: '100%', gap: 24, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Resumen de totales y gráfica de presupuesto en una sola tarjeta */}
        <div className="card" style={{ flex: 1.2, minWidth: 320, maxWidth: 500, display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 0, padding: 0 }}>
          {/* Leyenda a la izquierda */}
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--color-card)' }}>
              <h4 style={{ color: 'var(--color-table-header-text)', marginBottom: 16 }}>Resumen de Totales</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }}></span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>Egreso</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500, marginLeft: 8 }}>S/ {resumen.egreso.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }}></span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>Ingreso</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500, marginLeft: 8 }}>S/ {resumen.ingreso.toLocaleString()}</span>
              </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }}></span>
          <span className="resumen-ahorro" style={{ color: 'var(--color-table-header-text)', fontWeight: 'bold' }}>Ahorro</span>
          <span style={{ color: 'var(--color-amount)', fontWeight: 500, marginLeft: 8 }}>S/ {resumen.ahorro.toLocaleString()}</span>
        </div>
            </div>
          </div>
          {/* Gráfica de barras verticales a la derecha */}
            <div style={{ flex: 2, background: 'var(--color-card)', borderTopRightRadius: 12, borderBottomRightRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#888', fontWeight: 500, textAlign: 'right', marginBottom: 8 }}>Resultado de Presupuesto</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                { name: 'Egreso', value: resumen.egreso, fill: '#fbc02d' },
                { name: 'Ingreso', value: resumen.ingreso, fill: '#388e3c' },
                { name: 'Ahorro', value: resumen.ahorro, fill: '#6c4fa1' },
              ]}>
                <XAxis type="category" dataKey="name" tick={{ fontWeight: 'bold', fontSize: 14 }} />
                <YAxis type="number" domain={[0, 10000]} ticks={[0, 2000, 4000, 10000]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell key="egreso" fill="#fbc02d" />
                  <Cell key="ingreso" fill="#388e3c" />
                  <Cell key="ahorro" fill="#6c4fa1" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Top egresos */}
        <div className="card" style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4>3° Indicadores Mayores De Egreso</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {topEgresos.map((item, idx) => (
              <div key={item.categoria} style={{ background: '#ff9800', color: '#fff', borderRadius: 12, padding: 16, flex: 1, textAlign: 'center', minWidth: 100, maxWidth: 140 }}>
                <div style={{ fontWeight: 'bold', fontSize: 20 }}>{idx + 1}°</div>
                <div style={{ fontSize: 18 }}>{item.categoria}</div>
                <div style={{ fontSize: 22, fontWeight: 'bold', margin: '8px 0' }}>S/ {item.monto.toLocaleString()}</div>
                <div style={{ fontSize: 16 }}>{item.porcentaje}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de Distribución por Categorías */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8, color: 'var(--color-text)' }}>Distribución de Gastos por Categoría</h3>
          <div style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            {React.createElement(FaMousePointer as any, { size: 13 })}
            <span>Haz clic en una categoría para ver sus detalles</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Gráfico de Pie */}
          <div style={{ flex: 1, minWidth: 300, display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if (data && data.name) {
                      const gastosCategoria = filteredMovs
                        .filter(m => esGasto(m) && (m.categoria || 'Sin categoría') === data.name)
                        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                      
                      setCategoriaModal({
                        nombre: data.name,
                        monto: data.value,
                        color: data.fill,
                        gastos: gastosCategoria
                      });
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      style={{ 
                        transition: 'opacity 0.2s',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `S/ ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda simple */}
          <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pieData.map((entry, index) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: 4, 
                  background: COLORS[index % COLORS.length],
                  display: 'inline-block',
                  flexShrink: 0
                }}></span>
                <span style={{ color: 'var(--color-text)', fontWeight: 500, flex: 1 }}>{entry.name}</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                  S/ {Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Totales por mes (líneas) */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3>Totales Por Mes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value) => `S/ ${value.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="Ingreso" stroke="#388e3c" strokeWidth={2} />
            <Line type="monotone" dataKey="Gasto" stroke="#fbc02d" strokeWidth={2} />
            <Line type="monotone" dataKey="Ahorro" stroke="#6c4fa1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Movimientos programados / pendientes separados por tipo */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Movimientos Programados</h3>
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const pendientesTotal = movimientos.filter(m => {
              try {
                // Excluir movimientos internos
                if (esMovimientoInterno(m)) return false;
                if (cuentaSeleccionada !== 'all') {
                  const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
                  if (!isNaN(cid) && cid !== Number(cuentaSeleccionada)) return false;
                }
                if (typeof m.applied !== 'undefined' && m.applied !== null) {
                  return Number(m.applied) === 0;
                }
                if (!m.fecha) return false;
                const movDate = new Date((m.fecha || '').slice(0, 10) + 'T00:00:00');
                movDate.setHours(0, 0, 0, 0);
                return movDate.getTime() > today.getTime();
              } catch (e) {
                return false;
              }
            });
            return (
              <span style={{
                background: '#667eea',
                color: '#fff',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600
              }}>
                {pendientesTotal.length} pendiente{pendientesTotal.length !== 1 ? 's' : ''}
              </span>
            );
          })()}
        </div>
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const pendientes = movimientos.filter(m => {
            try {
              // Excluir movimientos internos
              if (esMovimientoInterno(m)) return false;
              // Filtro por cuenta seleccionada (si no es 'all')
              if (cuentaSeleccionada !== 'all') {
                const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
                if (!isNaN(cid) && cid !== Number(cuentaSeleccionada)) return false;
              }
              if (typeof m.applied !== 'undefined' && m.applied !== null) {
                return Number(m.applied) === 0;
              }
              if (!m.fecha) return false;
              // Obtener fecha actual en zona horaria Perú (UTC-5)
              const now = new Date();
              const peruOffset = -5 * 60; // minutos
              const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
              const peruDate = new Date(utc + peruOffset * 60000);
              peruDate.setHours(0, 0, 0, 0);
              // Fecha del movimiento (solo año, mes, día)
              const movDate = new Date((m.fecha || '').slice(0, 10) + 'T00:00:00');
              movDate.setHours(0, 0, 0, 0);
              return movDate.getTime() > peruDate.getTime();
            } catch (e) {
              return false;
            }
          });

          // Separar por tipo
          const tipos = ['ingreso', 'egreso', 'ahorro'];
          const pendientesPorTipo = tipos.map(tipo => ({
            tipo,
            lista: pendientes.filter(m => m.tipo === tipo),
            total: pendientes.filter(m => m.tipo === tipo).reduce((acc, m) => acc + Number(m.monto || 0), 0)
          }));

          const handleMarcarAplicado = async (movimiento: any) => {
            try {
              const response = await fetch(`${API_BASE}/api/transacciones/${movimiento.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({
                  ...movimiento,
                  applied: 1
                })
              });
              
              if (response.ok) {
                // Actualizar el estado local
                setMovimientos(prev => prev.map(m => 
                  m.id === movimiento.id ? { ...m, applied: 1 } : m
                ));
              }
            } catch (error) {
              
            }
          };

          return (
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {pendientesPorTipo.map(({ tipo, lista, total }) => {
                const colorConfig = {
                  ingreso: { bg: 'rgba(56, 142, 60, 0.1)', border: '#388e3c', text: 'Ingresos' },
                  egreso: { bg: 'rgba(251, 192, 45, 0.1)', border: '#fbc02d', text: 'Egresos' },
                  ahorro: { bg: 'rgba(108, 79, 161, 0.1)', border: '#6c4fa1', text: 'Ahorro' }
                };
                const config = colorConfig[tipo];
                
                return (
                  <div key={tipo} style={{ minWidth: 260, flex: 1 }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: 18, 
                      marginBottom: 12, 
                      padding: '8px 12px',
                      background: config.bg,
                      border: `2px solid ${config.border}`,
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{config.text}</span>
                      <span style={{
                        background: config.border,
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 600
                      }}>
                        {lista.length}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, marginBottom: 12, padding: '0 4px' }}>
                      Monto total: <b style={{ color: config.border }}>S/ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 2 }}>
                      {lista.length === 0 ? (
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 15, textAlign: 'center', padding: 12 }}>
                          No hay movimientos programados
                        </div>
                      ) : (
                        [...lista].sort((a, b) => {
                          const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
                          const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
                          return fa - fb;
                        }).map((p, idx) => (
                          <div key={p.id || idx} style={{ 
                            background: 'var(--color-card-alt)', 
                            padding: 12, 
                            borderRadius: 8, 
                            boxShadow: '0 2px 4px var(--card-shadow)',
                            border: `1px solid ${config.border}33`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                                <div style={{ color: '#60a5fa', display: 'flex', alignItems: 'center' }}>
                                  {React.createElement(FaCalendarAlt as any, { size: 20 })}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{p.categoria || 'Sin categoría'}</div>
                                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #999)' }}>{p.cuenta || p.cuenta_nombre || ''}</div>
                                  {p.descripcion && (
                                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #999)', marginTop: 2, fontStyle: 'italic' }}>{p.descripcion}</div>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 16 }}>S/ {Number(p.monto || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #999)' }}>{p.fecha ? new Date(p.fecha).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleMarcarAplicado(p)}
                              style={{
                                width: '100%',
                                background: config.border,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '8px 12px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              {React.createElement(FaCheckCircle as any, { size: 14, style: { marginRight: 6 } })}
                              Marcar como aplicado
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Modal de detalles de categoría */}
      {categoriaModal && (
        <div 
          onClick={() => setCategoriaModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-card)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              border: `3px solid ${categoriaModal.color}`
            }}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: `2px solid ${categoriaModal.color}`
            }}>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  marginBottom: 8,
                  color: 'var(--color-text)',
                  fontSize: 24
                }}>
                  {categoriaModal.nombre}
                </h2>
                <div style={{ 
                  fontSize: 28, 
                  fontWeight: 700, 
                  color: categoriaModal.color
                }}>
                  S/ {Number(categoriaModal.monto).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <button
                onClick={() => setCategoriaModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-card-alt)';
                  e.currentTarget.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                ×
              </button>
            </div>

            {/* Lista de gastos */}
            {categoriaModal.gastos.length > 0 ? (
              <>
                <div style={{ 
                  fontSize: 14, 
                  color: 'var(--color-text-secondary)', 
                  marginBottom: 16,
                  fontWeight: 600
                }}>
                  Movimientos ({categoriaModal.gastos.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {categoriaModal.gastos.map((gasto, idx) => (
                    <div key={gasto.id || idx} style={{
                      background: 'var(--color-card-alt)',
                      padding: 16,
                      borderRadius: 10,
                      borderLeft: `4px solid ${categoriaModal.color}`,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 600, 
                            color: 'var(--color-text)',
                            fontSize: 15,
                            marginBottom: 6
                          }}>
                            {gasto.descripcion || 'Sin descripción'}
                          </div>
                          <div style={{ 
                            fontSize: 13, 
                            color: 'var(--color-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            {React.createElement(FaCalendarAlt as any, { size: 12 })}
                            {gasto.fecha ? new Date(gasto.fecha).toLocaleDateString('es-PE', { 
                              day: '2-digit', 
                              month: 'long',
                              year: 'numeric'
                            }) : 'Sin fecha'}
                          </div>
                        </div>
                        <div style={{ 
                          fontWeight: 700, 
                          color: categoriaModal.color,
                          fontSize: 16,
                          whiteSpace: 'nowrap'
                        }}>
                          S/ {Number(gasto.monto || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--color-text-secondary)',
                fontSize: 14
              }}>
                No hay gastos en esta categoría
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalle: Saldo / Indicadores / Ingreso / Gastos / Ahorro */}
      {modalDetalle && (() => {
        const tipoKey = modalDetalle.tipo;
        const colorModal = modalDetalle.color;

        // ── Modal especial: Saldo total ───────────────────────────────────────
        if (tipoKey === 'saldo') {
          const cuentasOrdenadas = [...cuentas].sort((a, b) => {
            const sa = parseMonto(a.saldo_actual ?? a.saldo ?? 0);
            const sb = parseMonto(b.saldo_actual ?? b.saldo ?? 0);
            return sb - sa;
          });
          const q = modalBusqueda.trim().toLowerCase();
          const cuentasFiltradas = q ? cuentasOrdenadas.filter(c => String(c.nombre || '').toLowerCase().includes(q) || String(c.tipo || '').toLowerCase().includes(q)) : cuentasOrdenadas;
          const totalSaldo = cuentasFiltradas.reduce((acc, c) => acc + parseMonto(c.saldo_actual ?? c.saldo ?? 0), 0);
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
              onClick={() => setModalDetalle(null)}>
              <div style={{ background: 'var(--color-card)', borderRadius: 18, width: '100%', maxWidth: 700, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', borderTop: `4px solid ${colorModal}`, overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-input-border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorModal }} />
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--color-text)', fontSize: 18 }}>{modalDetalle.titulo}</h3>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {cuentasFiltradas.length} cuenta{cuentasFiltradas.length !== 1 ? 's' : ''} — Total: <strong style={{ color: colorModal }}>S/ {totalSaldo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setModalDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-secondary)', lineHeight: 1 }}>×</button>
                </div>
                {/* Buscador */}
                <div style={{ padding: '12px 24px', flexShrink: 0, borderBottom: '1px solid var(--color-input-border)' }}>
                  <input value={modalBusqueda} onChange={e => setModalBusqueda(e.target.value)} placeholder="Buscar cuenta..." autoFocus
                    style={{ width: '100%', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                {/* Tabla */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-input-bg)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Cuenta</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Tipo</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>En cálculos</th>
                        <th style={{ padding: '10px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Saldo actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentasFiltradas.map((c, i) => {
                        const saldo = parseMonto(c.saldo_actual ?? c.saldo ?? 0);
                        const incluida = c.incluir_en_calculos !== false && c.incluir_en_calculos !== 0;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--color-input-border)', transition: 'background 0.12s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                            <td style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{c.nombre || 'Sin nombre'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>
                              <span style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', borderRadius: 20, padding: '2px 10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{c.tipo || '—'}</span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12 }}>
                              {incluida
                                ? <span style={{ background: '#2e7d3222', color: '#2e7d32', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>✓ Sí</span>
                                : <span style={{ background: '#e5393522', color: '#e53935', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>✕ No</span>}
                            </td>
                            <td style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700, textAlign: 'right', color: saldo < 0 ? '#e53935' : colorModal, whiteSpace: 'nowrap' }}>S/ {saldo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--color-input-bg)', borderTop: `2px solid ${colorModal}` }}>
                        <td colSpan={3} style={{ padding: '10px 24px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Total ({cuentasFiltradas.length} cuentas)</td>
                        <td style={{ padding: '10px 24px', fontSize: 15, fontWeight: 800, color: totalSaldo < 0 ? '#e53935' : colorModal, textAlign: 'right' }}>S/ {totalSaldo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        // ── Movimientos (ingreso/egreso/ahorro/indicador_egreso/indicador_ingreso) ──
        const resolvedTipo = tipoKey === 'indicador_egreso' ? 'egreso' : tipoKey === 'indicador_ingreso' ? 'ingreso' : tipoKey;
        const movsDetalle = resolvedTipo === 'ahorro'
          ? visibleMovimientos.filter(m => {
              if (!(m.tipo === 'ahorro' && String(m.descripcion || '').toLowerCase().includes('ahorro desde'))) return false;
              const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
              if (cuentasExcluidasCalculo.has(cid)) return false;
              return true;
            })
          : filteredMovs.filter(m => resolvedTipo === 'egreso' ? esGasto(m) : m.tipo === resolvedTipo);
        const q = modalBusqueda.trim().toLowerCase();
        const movsFiltrados = q
          ? movsDetalle.filter(m =>
              String(m.descripcion || '').toLowerCase().includes(q) ||
              String(m.categoria || '').toLowerCase().includes(q) ||
              String(m.monto || '').includes(q)
            )
          : movsDetalle;
        const movsSorted = [...movsFiltrados].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        const totalModal = movsSorted.reduce((acc, m) => acc + Number(m.monto), 0);
        // Agrupar por categoría
        const porCategoria: Record<string, number> = {};
        movsSorted.forEach(m => { const c = m.categoria || 'Sin categoría'; porCategoria[c] = (porCategoria[c] || 0) + Number(m.monto); });
        const topCats = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setModalDetalle(null)}
          >
            <div
              style={{ background: 'var(--color-card)', borderRadius: 18, width: '100%', maxWidth: 940, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: `0 20px 60px rgba(0,0,0,0.4)`, borderTop: `4px solid ${colorModal}`, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-input-border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorModal, flexShrink: 0 }} />
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--color-text)', fontSize: 18 }}>{modalDetalle.titulo}</h3>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {movsSorted.length} movimiento{movsSorted.length !== 1 ? 's' : ''} — Total: <strong style={{ color: colorModal }}>S/ {totalModal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                </div>
                <button onClick={() => setModalDetalle(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-secondary)', lineHeight: 1 }}>✕</button>
              </div>

              {/* Top categorías */}
              {topCats.length > 0 && !q && (
                <div style={{ padding: '12px 24px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--color-input-border)', flexShrink: 0 }}>
                  {topCats.map(([cat, monto]) => (
                    <div key={cat} style={{ background: 'var(--color-input-bg)', borderRadius: 20, padding: '4px 12px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{cat}</span>
                      <span style={{ fontWeight: 700, color: colorModal }}>S/ {Number(monto).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Buscador */}
              <div style={{ padding: '12px 24px', flexShrink: 0, borderBottom: '1px solid var(--color-input-border)' }}>
                <input
                  value={modalBusqueda}
                  onChange={e => setModalBusqueda(e.target.value)}
                  placeholder="Buscar por descripción, categoría o monto..."
                  autoFocus
                  style={{ width: '100%', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              {/* Lista */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {movsSorted.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>No hay movimientos{q ? ' que coincidan con la búsqueda' : ''}.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-input-bg)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Fecha</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Descripción</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Categoría</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Cuenta</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movsSorted.map((m, i) => {
                        const fecha = new Date((m.fecha || '').slice(0, 10) + 'T12:00:00');
                        const fechaStr = isNaN(fecha.getTime()) ? m.fecha : fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
                        const desc = String(m.descripcion || 'Sin descripción').replace(/\[.*?\]/g, '').trim();
                        const cid = Number(m.cuenta_id || m.cuentaId || m.cuentaID);
                        const cuentaNombre = cuentas.find(c => Number(c.id) === cid)?.nombre || '—';
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--color-input-border)', transition: 'background 0.12s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-input-bg)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                          >
                            <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{fechaStr}</td>
                            <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={desc}>{desc || 'Sin descripción'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12 }}>
                              {m.categoria ? (
                                <span style={{ background: `${colorModal}22`, color: colorModal, borderRadius: 20, padding: '2px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.categoria}</span>
                              ) : <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                              <span style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text)', borderRadius: 20, padding: '2px 10px', fontWeight: 500 }}>{cuentaNombre}</span>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: colorModal, textAlign: 'right', whiteSpace: 'nowrap' }}>S/ {Number(m.monto).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--color-input-bg)', borderTop: `2px solid ${colorModal}` }}>
                        <td colSpan={4} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Total ({movsSorted.length} mov.)</td>
                        <td style={{ padding: '10px 16px', fontSize: 15, fontWeight: 800, color: colorModal, textAlign: 'right' }}>S/ {totalModal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
