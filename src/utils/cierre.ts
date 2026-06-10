import type { AccountBalance } from '../store/useStore';

/**
 * Motor de CIERRE CONTABLE — replica el método de hoja de trabajo de la
 * Licda. Shirley Mazariegos (Universidad Mesoamericana, Quetzaltenango).
 *
 * Estructura del Estado de Resultados:
 *   Ventas − Devoluciones s/ventas      = Ventas netas
 *   Compras − Devoluciones s/compras     = Compras netas (costo)
 *   Ventas netas − Costo                 = Utilidad Bruta
 *   − Gastos de operación / no operativos = Utilidad antes de ISR
 *   − ISR (25%)                          = Utilidad después de impuestos
 *   − Reserva Legal (5%)                 = Ganancia del Ejercicio
 *
 * ISR y Reserva Legal son reclasificaciones analíticas del resultado:
 * el ISR pasa al pasivo (ISR por pagar) y la Reserva + Ganancia al
 * patrimonio. No alteran el total, por lo que la ecuación contable
 * (Activo = Pasivo + Patrimonio) sigue cuadrando exactamente.
 */

/* ============================ Tasas legales ============================ */

export interface CierreRates {
  isr: number;              // Impuesto Sobre la Renta (régimen utilidades GT) — 25%
  reservaLegal: number;     // Reserva legal (Código de Comercio art. 36) — 5%
  incobrables: number;      // Estimación cuentas incobrables — 3% de clientes
  edificioPct: number;      // Porción de "Inmuebles" que es edificio (depreciable) — 70%
  deprEdificio: number;     // 5%  (20 años)
  deprMobiliario: number;   // 20% (5 años)
  deprComputo: number;      // 33.33% (3 años)
  deprVehiculos: number;    // 20% (5 años)
  deprMaquinaria: number;   // 20% (5 años)
  deprHerramientas: number; // 25% (4 años)
  amortizacion: number;     // 20% (5 años) — gastos org., marcas, derecho de llave
}

export const DEFAULT_CIERRE_RATES: CierreRates = {
  isr: 0.25,
  reservaLegal: 0.05,
  incobrables: 0.03,
  edificioPct: 0.7,
  deprEdificio: 0.05,
  deprMobiliario: 0.2,
  deprComputo: 0.3333,
  deprVehiculos: 0.2,
  deprMaquinaria: 0.2,
  deprHerramientas: 0.25,
  amortizacion: 0.2,
};

/* ===================== Mapeo de cuentas (catálogo) ===================== */

export const CODES = {
  ventas: ['4.1.01', '4.1.02'],          // Ventas, Prestación de servicios
  devolucionesVentas: ['5.1.04'],        // Devoluciones y Rebajas sobre Ventas (contra-ingreso)
  compras: ['5.1.01', '5.1.02'],         // Compras, Gastos sobre compras
  costoDirecto: ['5.1.03'],              // Costo de Ventas (si se usa directo)
  devolucionesCompras: ['4.1.03', '4.1.04'], // Devoluciones/Descuentos sobre Compras (contra-costo)
  otrosIngresos: '4.2',                  // Ingresos no operativos
  gastosOperacion: '5.2',                // Gastos de operación (admón y ventas)
  gastosNoOperativos: '5.3',             // Gastos no operativos
  isrGasto: '5.3.05',                    // Impuesto Sobre la Renta (Gasto) — se muestra aparte
  clientes: '1.1.05',
  reservaIncobrables: '1.3.08',
  gastoIncobrables: '5.2.25',
} as const;

/** Activos fijos depreciables: cuenta de activo, % por defecto, cuentas de gasto y acumulada. */
export interface DepreciableSpec {
  key: keyof CierreRates;
  cuentaActivo: string;
  nombre: string;
  cuentaGasto: string;
  cuentaAcumulada: string;
  esInmueble?: boolean; // aplica regla 70/30 edificio/terreno
}

export const DEPRECIABLES: DepreciableSpec[] = [
  { key: 'deprEdificio', cuentaActivo: '1.2.03', nombre: 'Edificios', cuentaGasto: '5.2.20', cuentaAcumulada: '1.3.01' },
  { key: 'deprEdificio', cuentaActivo: '1.2.01', nombre: 'Inmuebles (70% edificio)', cuentaGasto: '5.2.20', cuentaAcumulada: '1.3.01', esInmueble: true },
  { key: 'deprMobiliario', cuentaActivo: '1.2.04', nombre: 'Mobiliario y Equipo', cuentaGasto: '5.2.21', cuentaAcumulada: '1.3.02' },
  { key: 'deprComputo', cuentaActivo: '1.2.05', nombre: 'Equipo de Computación', cuentaGasto: '5.2.22', cuentaAcumulada: '1.3.03' },
  { key: 'deprVehiculos', cuentaActivo: '1.2.06', nombre: 'Vehículos', cuentaGasto: '5.2.23', cuentaAcumulada: '1.3.04' },
  { key: 'deprMaquinaria', cuentaActivo: '1.2.07', nombre: 'Maquinaria', cuentaGasto: '5.2.26', cuentaAcumulada: '1.3.05' },
  { key: 'deprHerramientas', cuentaActivo: '1.2.08', nombre: 'Herramientas', cuentaGasto: '5.2.27', cuentaAcumulada: '1.3.09' },
];

export const AMORTIZABLES: DepreciableSpec[] = [
  { key: 'amortizacion', cuentaActivo: '1.2.12', nombre: 'Gastos de Organización', cuentaGasto: '5.2.24', cuentaAcumulada: '1.3.06' },
  { key: 'amortizacion', cuentaActivo: '1.2.10', nombre: 'Marcas y Patentes', cuentaGasto: '5.2.24', cuentaAcumulada: '1.3.07' },
  { key: 'amortizacion', cuentaActivo: '1.2.11', nombre: 'Derecho de Llave', cuentaGasto: '5.2.24', cuentaAcumulada: '1.3.10' },
];

/* ============================ Utilidades ============================ */

/** Valor neto debe−haber de una cuenta (positivo = saldo deudor). */
const net = (b: AccountBalance | undefined): number => (b ? b.debe - b.haber : 0);

const sumNetCodes = (balances: Record<string, AccountBalance>, codes: readonly string[]): number =>
  codes.reduce((s, c) => s + net(balances[c]), 0);

export interface LineItem {
  codigo: string;
  nombre: string;
  monto: number;
}

const collectPrefix = (
  balances: Record<string, AccountBalance>,
  prefix: string,
  exclude: string[] = []
): LineItem[] => {
  const items: LineItem[] = [];
  for (const k in balances) {
    if (!k.startsWith(prefix)) continue;
    if (exclude.includes(k)) continue;
    const monto = net(balances[k]);
    if (Math.abs(monto) < 0.005) continue;
    items.push({ codigo: k, nombre: balances[k].nombre, monto });
  }
  return items.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
};

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/* ====================== Estado de Resultados ====================== */

export interface EstadoResultadosCierre {
  ventas: number;
  devolucionesVentas: number;
  ventasNetas: number;
  compras: number;
  devolucionesCompras: number;
  comprasNetas: number;
  costoVentas: number;
  utilidadBruta: number;
  otrosIngresos: LineItem[];
  totalOtrosIngresos: number;
  gastosOperacion: LineItem[];
  totalGastosOperacion: number;
  gastosNoOperativos: LineItem[];
  totalGastosNoOperativos: number;
  utilidadAntesISR: number;
  isr: number;
  utilidadDespuesISR: number;
  reservaLegal: number;
  gananciaEjercicio: number;
}

export const computeEstadoResultados = (
  balances: Record<string, AccountBalance>,
  rates: CierreRates = DEFAULT_CIERRE_RATES
): EstadoResultadosCierre => {
  const ventas = sumNetCodes(balances, CODES.ventas);                          // saldo acreedor → net negativo
  const devolucionesVentas = sumNetCodes(balances, CODES.devolucionesVentas);  // saldo deudor → net positivo
  const ventasNetas = -ventas - devolucionesVentas;                            // ventas (positivo) − devoluciones

  const compras = sumNetCodes(balances, CODES.compras);                        // deudor → positivo
  const costoDirecto = sumNetCodes(balances, CODES.costoDirecto);
  const devolucionesCompras = sumNetCodes(balances, CODES.devolucionesCompras); // acreedor → negativo
  const comprasNetas = compras + costoDirecto + devolucionesCompras;           // compras − devoluciones
  const costoVentas = comprasNetas;

  const utilidadBruta = ventasNetas - costoVentas;

  const otrosIngresos = collectPrefix(balances, CODES.otrosIngresos).map(i => ({ ...i, monto: -i.monto }));
  const totalOtrosIngresos = otrosIngresos.reduce((s, i) => s + i.monto, 0);

  const gastosOperacion = collectPrefix(balances, CODES.gastosOperacion);
  const totalGastosOperacion = gastosOperacion.reduce((s, i) => s + i.monto, 0);

  // Gastos no operativos EXCEPTO el ISR (5.3.05), que se presenta como línea propia.
  const gastosNoOperativos = collectPrefix(balances, CODES.gastosNoOperativos, [CODES.isrGasto]);
  const totalGastosNoOperativos = gastosNoOperativos.reduce((s, i) => s + i.monto, 0);

  const utilidadAntesISR =
    utilidadBruta + totalOtrosIngresos - totalGastosOperacion - totalGastosNoOperativos;

  // ISR sólo si hay utilidad positiva. Se mantiene precisión completa (sin
  // redondear intermedios) para reproducir exactamente la hoja de trabajo:
  // el redondeo se aplica sólo al mostrar (formatCurrency).
  const isr = utilidadAntesISR > 0 ? utilidadAntesISR * rates.isr : 0;
  const utilidadDespuesISR = utilidadAntesISR - isr;
  const reservaLegal = utilidadDespuesISR > 0 ? utilidadDespuesISR * rates.reservaLegal : 0;
  const gananciaEjercicio = utilidadDespuesISR - reservaLegal;

  return {
    ventas: -ventas,
    devolucionesVentas,
    ventasNetas,
    compras: compras + costoDirecto,
    devolucionesCompras: -devolucionesCompras,
    comprasNetas,
    costoVentas,
    utilidadBruta,
    otrosIngresos,
    totalOtrosIngresos,
    gastosOperacion,
    totalGastosOperacion,
    gastosNoOperativos,
    totalGastosNoOperativos,
    utilidadAntesISR,
    isr,
    utilidadDespuesISR,
    reservaLegal,
    gananciaEjercicio,
  };
};

/* ====================== Depreciaciones / Amortizaciones ====================== */

export interface DepRow {
  cuentaActivo: string;
  nombre: string;
  valorHistorico: number;
  baseDepreciable: number;
  tasa: number;
  montoAnual: number;
  cuentaGasto: string;
  cuentaAcumulada: string;
  noDepreciable?: number; // p.ej. terreno
}

export interface DepreciacionResult {
  depreciaciones: DepRow[];
  amortizaciones: DepRow[];
  totalDepreciacion: number;
  totalAmortizacion: number;
}

const buildRow = (
  spec: DepreciableSpec,
  balances: Record<string, AccountBalance>,
  rates: CierreRates
): DepRow | null => {
  const valor = net(balances[spec.cuentaActivo]);
  if (Math.abs(valor) < 0.005) return null;
  const tasa = rates[spec.key];
  const baseDepreciable = spec.esInmueble ? round2(valor * rates.edificioPct) : valor;
  const noDepreciable = spec.esInmueble ? round2(valor * (1 - rates.edificioPct)) : undefined;
  return {
    cuentaActivo: spec.cuentaActivo,
    nombre: spec.nombre,
    valorHistorico: valor,
    baseDepreciable,
    tasa,
    montoAnual: round2(baseDepreciable * tasa),
    cuentaGasto: spec.cuentaGasto,
    cuentaAcumulada: spec.cuentaAcumulada,
    noDepreciable,
  };
};

export const computeDepreciaciones = (
  balances: Record<string, AccountBalance>,
  rates: CierreRates = DEFAULT_CIERRE_RATES
): DepreciacionResult => {
  const depreciaciones = DEPRECIABLES
    .map(s => buildRow(s, balances, rates))
    .filter((r): r is DepRow => r !== null);
  const amortizaciones = AMORTIZABLES
    .map(s => buildRow(s, balances, rates))
    .filter((r): r is DepRow => r !== null);
  return {
    depreciaciones,
    amortizaciones,
    totalDepreciacion: round2(depreciaciones.reduce((s, r) => s + r.montoAnual, 0)),
    totalAmortizacion: round2(amortizaciones.reduce((s, r) => s + r.montoAnual, 0)),
  };
};

/* ====================== Cuentas incobrables ====================== */

export interface IncobrablesResult {
  clientes: number;
  tasa: number;
  monto: number;
  cuentaGasto: string;
  cuentaReserva: string;
}

export const computeIncobrables = (
  balances: Record<string, AccountBalance>,
  rates: CierreRates = DEFAULT_CIERRE_RATES
): IncobrablesResult => {
  const clientes = net(balances[CODES.clientes]);
  return {
    clientes,
    tasa: rates.incobrables,
    monto: round2(clientes * rates.incobrables),
    cuentaGasto: CODES.gastoIncobrables,
    cuentaReserva: CODES.reservaIncobrables,
  };
};

/* ====================== Balance General estructurado ====================== */

/** Clasificación de cuentas de activo corriente por subgrupo. */
const DISPONIBLE = ['1.1.01', '1.1.02', '1.1.03', '1.1.04'];
const REALIZABLE = ['1.1.13', '1.1.14', '1.1.15', '1.1.16', '1.1.17', '1.1.18', '1.1.19'];
const DIFERIDO = ['1.1.20', '1.1.21', '1.1.22'];

const subgrupoActivoCorriente = (code: string): 'disponible' | 'realizable' | 'diferido' | 'exigible' => {
  if (DISPONIBLE.includes(code)) return 'disponible';
  if (REALIZABLE.includes(code)) return 'realizable';
  if (DIFERIDO.includes(code)) return 'diferido';
  return 'exigible';
};

export interface BalanceGeneralCierre {
  disponible: LineItem[];
  exigible: LineItem[];
  realizable: LineItem[];
  diferido: LineItem[];
  totalCorriente: number;
  noCorriente: LineItem[]; // incluye contra-cuentas (deprec. acum.) en negativo
  totalNoCorriente: number;
  totalActivo: number;
  pasivoCorriente: LineItem[];
  isrPorPagar: number;
  totalPasivoCorriente: number;
  pasivoNoCorriente: LineItem[];
  totalPasivoNoCorriente: number;
  totalPasivo: number;
  capital: LineItem[];
  reservaLegal: number;
  gananciaEjercicio: number;
  totalPatrimonio: number;
  totalPasivoPatrimonio: number;
  diferencia: number;
  cuadrado: boolean;
}

export const computeBalanceGeneral = (
  balances: Record<string, AccountBalance>,
  rates: CierreRates = DEFAULT_CIERRE_RATES
): BalanceGeneralCierre => {
  const er = computeEstadoResultados(balances, rates);

  const disponible: LineItem[] = [];
  const exigible: LineItem[] = [];
  const realizable: LineItem[] = [];
  const diferido: LineItem[] = [];
  const noCorriente: LineItem[] = [];
  const pasivoCorriente: LineItem[] = [];
  const pasivoNoCorriente: LineItem[] = [];
  const capital: LineItem[] = [];

  for (const code in balances) {
    const b = balances[code];
    const monto = net(b); // debe−haber: contra-cuentas (acreedor en activo) salen negativas
    if (Math.abs(monto) < 0.005) continue;
    const item: LineItem = { codigo: code, nombre: b.nombre, monto };

    if (code === CODES.reservaIncobrables) {
      // Reserva para cuentas incobrables: contra-cuenta del exigible (corriente).
      exigible.push(item);
    } else if (code.startsWith('1.1')) {
      const g = subgrupoActivoCorriente(code);
      (g === 'disponible' ? disponible : g === 'realizable' ? realizable : g === 'diferido' ? diferido : exigible).push(item);
    } else if (code.startsWith('1.2') || code.startsWith('1.3')) {
      // Activo no corriente + contra-cuentas (depreciación/amortización acumulada) en negativo.
      noCorriente.push(item);
    } else if (code.startsWith('1')) {
      exigible.push(item);
    } else if (code.startsWith('2.1')) {
      pasivoCorriente.push({ ...item, monto: -monto }); // pasivo: haber−debe positivo
    } else if (code.startsWith('2.2')) {
      pasivoNoCorriente.push({ ...item, monto: -monto });
    } else if (code.startsWith('3')) {
      capital.push({ ...item, monto: -monto });
    }
    // 4/5/6 (resultado) se reflejan vía la Ganancia del Ejercicio, no como cuentas sueltas.
  }

  const sortItems = (arr: LineItem[]) =>
    arr.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  [disponible, exigible, realizable, diferido, noCorriente, pasivoCorriente, pasivoNoCorriente, capital].forEach(sortItems);

  // Precisión completa en los totales (sin redondear subtotales) para que el
  // chequeo de cuadre sea exacto; el redondeo se aplica sólo al mostrar.
  const sum = (arr: LineItem[]) => arr.reduce((s, i) => s + i.monto, 0);
  const totalCorriente = sum(disponible) + sum(exigible) + sum(realizable) + sum(diferido);
  const totalNoCorriente = sum(noCorriente);
  const totalActivo = totalCorriente + totalNoCorriente;

  // ISR por pagar (analítico) entra al pasivo corriente. Si el usuario ya
  // contabilizó el ISR manualmente (5.3.05 contra 2.1.06), esa porción ya está
  // dentro de pasivoCorriente: aquí solo se agrega el remanente, para no
  // duplicar el ISR en el pasivo y mantener la ecuación cuadrada.
  const isrContabilizado = Math.max(0, -net(balances['2.1.06']));
  const isrPorPagar = Math.max(0, er.isr - isrContabilizado);
  const totalPasivoCorriente = sum(pasivoCorriente) + isrPorPagar;
  const totalPasivoNoCorriente = sum(pasivoNoCorriente);
  const totalPasivo = totalPasivoCorriente + totalPasivoNoCorriente;

  // Patrimonio: capital del balance + reserva legal + ganancia del ejercicio (analíticos).
  const reservaLegal = er.reservaLegal;
  const gananciaEjercicio = er.gananciaEjercicio;
  const totalPatrimonio = sum(capital) + reservaLegal + gananciaEjercicio;

  const totalPasivoPatrimonio = totalPasivo + totalPatrimonio;
  const diferencia = totalActivo - totalPasivoPatrimonio;

  return {
    disponible, exigible, realizable, diferido, totalCorriente,
    noCorriente, totalNoCorriente, totalActivo,
    pasivoCorriente, isrPorPagar, totalPasivoCorriente,
    pasivoNoCorriente, totalPasivoNoCorriente, totalPasivo,
    capital, reservaLegal, gananciaEjercicio, totalPatrimonio,
    totalPasivoPatrimonio, diferencia,
    cuadrado: Math.abs(diferencia) < 0.01,
  };
};
