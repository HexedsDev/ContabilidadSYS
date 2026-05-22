import type { AccountBalance } from '../store/useStore';

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

export const computeRatios = (
  balances: Record<string, AccountBalance>
): FinancialRatios => {
  const activoCorr = sumPrefix(balances, '1.1');
  const inventario = sumPrefix(balances, '1.1.13') + sumPrefix(balances, '1.1.14');
  const pasivoCorr = sumPrefix(balances, '2.1');
  const activoTotal = sumPrefix(balances, '1');
  const pasivoTotal = sumPrefix(balances, '2');
  const patrimonio = sumPrefix(balances, '3');
  const ingresos = sumPrefix(balances, '4');
  const costos = sumPrefix(balances, '5.1');
  const gastos = sumPrefix(balances, '5.2') + sumPrefix(balances, '6');
  const utilBruta = ingresos - costos;
  const utilNeta = utilBruta - gastos;
  const patrimonioTotal = patrimonio + utilNeta;

  const safe = (n: number, d: number) => (d === 0 ? 0 : n / d);

  return {
    liquidezCorriente: safe(activoCorr, pasivoCorr),
    pruebaAcida: safe(activoCorr - inventario, pasivoCorr),
    endeudamiento: safe(pasivoTotal, activoTotal) * 100,
    autonomia: safe(patrimonioTotal, activoTotal) * 100,
    margenBruto: safe(utilBruta, ingresos) * 100,
    margenNeto: safe(utilNeta, ingresos) * 100,
    roa: safe(utilNeta, activoTotal) * 100,
    roe: safe(utilNeta, patrimonioTotal) * 100,
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
