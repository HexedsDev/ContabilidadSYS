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

// Suma neta debe−haber: las contra-cuentas (p.ej. depreciación acumulada 1.3.x
// dentro del activo) restan correctamente, a diferencia del saldo firmado por
// naturaleza, que las sumaría e inflaría el total.
const netPrefix = (balances: Record<string, AccountBalance>, prefix: string) => {
  let s = 0;
  for (const k in balances) if (k.startsWith(prefix)) s += balances[k].debe - balances[k].haber;
  return s;
};

export const computeRatios = (
  balances: Record<string, AccountBalance>
): FinancialRatios => {
  const activoCorr = netPrefix(balances, '1.1') + netPrefix(balances, '1.3.08'); // exigible neto de reserva incobrables
  const inventario = netPrefix(balances, '1.1.13') + netPrefix(balances, '1.1.14');
  const pasivoCorr = -netPrefix(balances, '2.1');
  const activoTotal = netPrefix(balances, '1'); // contra-cuentas (deprec. acum. 1.3.x) restan
  const pasivoTotal = -netPrefix(balances, '2');
  const patrimonio = -netPrefix(balances, '3');
  const ingresos = -netPrefix(balances, '4');
  const costos = netPrefix(balances, '5.1');
  // Gastos = todo el grupo 5 excepto el costo de ventas (5.1), más el grupo 6.
  const gastos = netPrefix(balances, '5') - costos + netPrefix(balances, '6');
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
