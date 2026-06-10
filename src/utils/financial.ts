import type { AccountBalance } from '../store/useStore';
import {
  computeEstadoResultados,
  computeBalanceGeneral,
  DEFAULT_CIERRE_RATES,
  type CierreRates,
} from './cierre';

export interface FinancialRatios {
  liquidezCorriente: number;     // Activo Corriente / Pasivo Corriente
  pruebaAcida: number;           // (AC - Inventario) / Pasivo Corriente
  endeudamiento: number;         // Pasivo / Activo (%)
  autonomia: number;             // Patrimonio / Activo (%)
  margenBruto: number;           // Utilidad Bruta / Ventas (%)
  margenNeto: number;            // Utilidad Neta / Ventas (%)
  roa: number;                   // Utilidad Neta / Activo (%)
  roe: number;                   // Utilidad Neta / Patrimonio (%)
}

const sumPrefix = (balances: Record<string, AccountBalance>, prefix: string) => {
  let s = 0;
  for (const k in balances) if (k.startsWith(prefix)) s += balances[k].saldo;
  return s;
};

// Suma neta debe−haber: las contra-cuentas (p.ej. depreciación acumulada 1.3.x
// dentro del activo) restan correctamente, a diferencia del saldo firmado por
// naturaleza, que las sumaría e inflaría el total.
const netPrefix = (balances: Record<string, AccountBalance>, prefix: string) => {
  let s = 0;
  for (const k in balances) if (k.startsWith(prefix)) s += balances[k].debe - balances[k].haber;
  return s;
};

export const computeRatios = (
  balances: Record<string, AccountBalance>,
  rates: CierreRates = DEFAULT_CIERRE_RATES
): FinancialRatios => {
  // Misma cascada que los estados financieros (cierre.ts): la utilidad neta de
  // los ratios es la Ganancia del Ejercicio (después de ISR y Reserva Legal),
  // de modo que el Dashboard muestre UNA sola cifra de utilidad, no dos.
  const er = computeEstadoResultados(balances, rates);
  const bg = computeBalanceGeneral(balances, rates);
  const inventario = netPrefix(balances, '1.1.13') + netPrefix(balances, '1.1.14');
  const utilNeta = er.gananciaEjercicio;
  const ingresos = er.ventasNetas + er.totalOtrosIngresos;

  const safe = (n: number, d: number) => (d === 0 ? 0 : n / d);

  return {
    liquidezCorriente: safe(bg.totalCorriente, bg.totalPasivoCorriente),
    pruebaAcida: safe(bg.totalCorriente - inventario, bg.totalPasivoCorriente),
    endeudamiento: safe(bg.totalPasivo, bg.totalActivo) * 100,
    autonomia: safe(bg.totalPatrimonio, bg.totalActivo) * 100,
    margenBruto: safe(er.utilidadBruta, ingresos) * 100,
    margenNeto: safe(utilNeta, ingresos) * 100,
    roa: safe(utilNeta, bg.totalActivo) * 100,
    roe: safe(utilNeta, bg.totalPatrimonio) * 100,
  };
};

/** Sum IVA accounts. By default uses prefixes 1.1.10 (IVA crédito) and 2.1.05 (IVA débito). */
export const computeIVA = (
  balances: Record<string, AccountBalance>
): { credito: number; debito: number; neto: number } => {
  const credito = sumPrefix(balances, '1.1.10');
  const debito = sumPrefix(balances, '2.1.05');
  return { credito, debito, neto: debito - credito };
};
