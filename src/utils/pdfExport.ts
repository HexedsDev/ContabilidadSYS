import jsPDF from 'jspdf';
import autoTable, { type CellHookData, type RowInput } from 'jspdf-autotable';
import type { JournalEntry, Account, Empresa } from '../types';
import { formatCurrency, formatDate } from './helpers';
import { useStore, computeBalances } from '../store/useStore';
import { computeEstadoResultados, computeBalanceGeneral, type LineItem } from './cierre';

const getEmpresa = (): Empresa => useStore.getState().empresa;

const BRAND = {
  primary: [41, 66, 230] as [number, number, number], // primary-600
  secondary: [5, 150, 105] as [number, number, number], // secondary-600
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  zebra: [243, 244, 249] as [number, number, number],
  grouperBg: [232, 236, 248] as [number, number, number],
};

const createDocument = (title: string): jsPDF => {
  const doc = new jsPDF();
  const empresa = getEmpresa();
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });

  // Branded header band
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, 210, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.razon_social, 14, 9);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${empresa.nit}    ${empresa.direccion}`, 14, 14);
  doc.setFontSize(8);
  doc.text(empresa.ciclo, 196, 9, { align: 'right' });
  doc.text(`Período: ${formatDate(empresa.periodo_inicio)} – ${formatDate(empresa.periodo_fin)}`, 196, 14, { align: 'right' });

  doc.setTextColor(...BRAND.text);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.muted);
  doc.text(`Generado: ${dateStr}`, 14, 36);
  doc.text(`Hora: ${now.toLocaleTimeString('es-GT')}`, 196, 36, { align: 'right' });

  return doc;
};

const addFooter = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Página ${i} de ${pages}`, 196, 290, { align: 'right' });
    doc.text('Sistema Contable — Reporte oficial', 14, 290);
  }
};

interface AutoTableLike { lastAutoTable?: { finalY: number } }

export const exportLibroDiarioPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Libro Diario');
  const validEntries = entries
    .filter(e => e.estado === 'contabilizada' || e.estado === 'observada')
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.numero - b.numero);

  const tableData: RowInput[] = [];
  validEntries.forEach(entry => {
    tableData.push([
      { content: `P-${entry.numero}`, styles: { fontStyle: 'bold' } },
      { content: formatDate(entry.fecha), styles: { fontStyle: 'bold' } },
      { content: entry.concepto, styles: { fontStyle: 'bold' }, colSpan: 3 },
    ]);
    entry.lineas.forEach(line => {
      const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
      tableData.push([
        '',
        line.cuenta_codigo,
        acc?.nombre ?? 'Cuenta desconocida',
        line.debe > 0 ? formatCurrency(line.debe) : '',
        line.haber > 0 ? formatCurrency(line.haber) : '',
      ]);
    });
  });

  autoTable(doc, {
    startY: 40,
    head: [['Partida', 'Fecha', 'Concepto / Cuenta', 'Debe', 'Haber']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BRAND.zebra },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 25 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
    },
    didParseCell: (data: CellHookData) => {
      const raw = data.row.raw as RowInput;
      const first = Array.isArray(raw) ? raw[0] : undefined;
      const isHeader = typeof first === 'object' && first !== null && 'styles' in first;
      if (isHeader && data.section === 'body') {
        data.cell.styles.fillColor = BRAND.grouperBg;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addFooter(doc);
  doc.save('Libro_Diario.pdf');
};

export const exportLibroMayorPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Libro Mayor');
  const validEntries = entries
    .filter(e => e.estado === 'contabilizada' || e.estado === 'observada')
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.numero - b.numero);

  const movsByAccount: Record<string, { fecha: string; partida: number; concepto: string; debe: number; haber: number }[]> = {};
  validEntries.forEach(entry => {
    entry.lineas.forEach(line => {
      if (!movsByAccount[line.cuenta_codigo]) movsByAccount[line.cuenta_codigo] = [];
      movsByAccount[line.cuenta_codigo].push({
        fecha: entry.fecha,
        partida: entry.numero,
        concepto: entry.concepto,
        debe: line.debe || 0,
        haber: line.haber || 0,
      });
    });
  });

  let currentY = 42;
  const sortedAccounts = accounts
    .filter(a => movsByAccount[a.codigo]?.length)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

  sortedAccounts.forEach(acc => {
    const movs = movsByAccount[acc.codigo];
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.primary);
    doc.text(`${acc.codigo} — ${acc.nombre}`, 14, currentY);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(`Naturaleza: ${acc.naturaleza}`, 196, currentY, { align: 'right' });
    currentY += 4;

    let saldo = 0;
    let totalDebe = 0;
    let totalHaber = 0;
    const body: RowInput[] = movs.map(m => {
      const delta = acc.naturaleza === 'Deudor' ? m.debe - m.haber : m.haber - m.debe;
      saldo += delta;
      totalDebe += m.debe;
      totalHaber += m.haber;
      return [
        formatDate(m.fecha),
        `P-${m.partida}`,
        m.concepto.substring(0, 50),
        m.debe > 0 ? formatCurrency(m.debe) : '',
        m.haber > 0 ? formatCurrency(m.haber) : '',
        formatCurrency(saldo),
      ];
    });

    body.push([
      { content: 'TOTALES', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatCurrency(totalDebe), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatCurrency(totalHaber), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatCurrency(saldo), styles: { fontStyle: 'bold', halign: 'right', fillColor: BRAND.grouperBg } },
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Ref', 'Concepto', 'Debe', 'Haber', 'Saldo']],
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: BRAND.muted, textColor: 255, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 14, halign: 'center' },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 25 },
      },
      margin: { bottom: 20 },
    });

    currentY = (doc as unknown as AutoTableLike).lastAutoTable?.finalY ?? currentY;
    currentY += 8;
  });

  addFooter(doc);
  doc.save('Libro_Mayor.pdf');
};

export const exportBalanceSaldosPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Balance de Saldos');
  const data: Record<string, { codigo: string; nombre: string; debe: number; haber: number; naturaleza: string }> = {};

  entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').forEach(entry => {
    entry.lineas.forEach(line => {
      if (!data[line.cuenta_codigo]) {
        const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
        if (!acc) return;
        data[line.cuenta_codigo] = { codigo: acc.codigo, nombre: acc.nombre, debe: 0, haber: 0, naturaleza: acc.naturaleza };
      }
      data[line.cuenta_codigo].debe += line.debe || 0;
      data[line.cuenta_codigo].haber += line.haber || 0;
    });
  });

  let totalDeudor = 0;
  let totalAcreedor = 0;
  let totalDebe = 0;
  let totalHaber = 0;
  const rows: RowInput[] = Object.values(data)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    .map(item => {
      let sd = 0;
      let sa = 0;
      if (item.naturaleza === 'Deudor') {
        const s = item.debe - item.haber;
        if (s >= 0) sd = s;
        else sa = Math.abs(s);
      } else {
        const s = item.haber - item.debe;
        if (s >= 0) sa = s;
        else sd = Math.abs(s);
      }
      totalDeudor += sd;
      totalAcreedor += sa;
      totalDebe += item.debe;
      totalHaber += item.haber;
      return [
        item.codigo,
        item.nombre,
        item.debe > 0 ? formatCurrency(item.debe) : '',
        item.haber > 0 ? formatCurrency(item.haber) : '',
        sd > 0 ? formatCurrency(sd) : '',
        sa > 0 ? formatCurrency(sa) : '',
      ];
    });

  rows.push([
    { content: 'SUMAS IGUALES', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatCurrency(totalDebe), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatCurrency(totalHaber), styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatCurrency(totalDeudor), styles: { fontStyle: 'bold', halign: 'right', fillColor: BRAND.grouperBg } },
    { content: formatCurrency(totalAcreedor), styles: { fontStyle: 'bold', halign: 'right', fillColor: BRAND.grouperBg } },
  ] as RowInput);

  autoTable(doc, {
    startY: 40,
    head: [['Código', 'Cuenta', 'Mov. Debe', 'Mov. Haber', 'Saldo Deudor', 'Saldo Acreedor']],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND.secondary, textColor: 255 },
    alternateRowStyles: { fillColor: BRAND.zebra },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
    },
  });

  addFooter(doc);
  doc.save('Balance_Saldos.pdf');
};

export const exportEstadoResultadosPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Estado de Resultados');
  const rates = useStore.getState().cierreRates;
  const er = computeEstadoResultados(computeBalances(entries, accounts), rates);
  const pct = (r: number) => `${(r * 100).toFixed((r * 100) % 1 === 0 ? 0 : 2)}%`;
  const rows: RowInput[] = [];

  const line = (label: string, val: number, o: { bold?: boolean; fill?: boolean; sub?: boolean } = {}) =>
    rows.push([
      { content: label, styles: { fontStyle: o.bold ? 'bold' : 'normal', fillColor: o.fill ? BRAND.grouperBg : undefined } },
      {
        content: o.sub ? `(${formatCurrency(val)})` : formatCurrency(val),
        styles: { halign: 'right', fontStyle: o.bold ? 'bold' : 'normal', fillColor: o.fill ? BRAND.grouperBg : undefined },
      },
    ]);
  const head = (t: string) => rows.push([{ content: t, colSpan: 2, styles: { fontStyle: 'bold', fillColor: BRAND.grouperBg } }]);

  line('Ventas', er.ventas);
  if (er.devolucionesVentas) line('(−) Devoluciones y rebajas s/ventas', er.devolucionesVentas, { sub: true });
  line('(=) Ventas netas', er.ventasNetas, { bold: true });
  line('Compras', er.compras);
  if (er.devolucionesCompras) line('(−) Devoluciones y rebajas s/compras', er.devolucionesCompras, { sub: true });
  line('(=) Compras netas / Costo de ventas', er.comprasNetas, { bold: true, sub: true });
  rows.push([
    { content: 'UTILIDAD BRUTA', styles: { fontStyle: 'bold', fillColor: BRAND.grouperBg } },
    { content: formatCurrency(er.utilidadBruta), styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.grouperBg } },
  ]);
  if (er.otrosIngresos.length) {
    head('Otros ingresos');
    er.otrosIngresos.forEach(i => line(`  ${i.nombre}`, i.monto));
  }
  head('Gastos de operación');
  er.gastosOperacion.forEach(i => line(`  ${i.nombre}`, i.monto, { sub: true }));
  line('Total gastos de operación', er.totalGastosOperacion, { bold: true, sub: true });
  if (er.gastosNoOperativos.length) {
    head('Gastos no operativos');
    er.gastosNoOperativos.forEach(i => line(`  ${i.nombre}`, i.monto, { sub: true }));
    line('Total gastos no operativos', er.totalGastosNoOperativos, { bold: true, sub: true });
  }
  line('Utilidad antes de impuestos', er.utilidadAntesISR, { bold: true });
  line(`(−) ISR (${pct(rates.isr)})`, er.isr, { sub: true });
  line('(=) Utilidad después de impuestos', er.utilidadDespuesISR, { bold: true });
  line(`(−) Reserva Legal (${pct(rates.reservaLegal)})`, er.reservaLegal, { sub: true });
  rows.push([
    { content: er.gananciaEjercicio >= 0 ? 'GANANCIA DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO', styles: { fontStyle: 'bold', fillColor: BRAND.primary, textColor: 255 } },
    { content: formatCurrency(er.gananciaEjercicio), styles: { halign: 'right', fontStyle: 'bold', fillColor: BRAND.primary, textColor: 255 } },
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Concepto', 'Monto']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND.primary, textColor: 255 },
    columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
  });

  addFooter(doc);
  doc.save('Estado_Resultados.pdf');
};

export const exportBalanceGeneralPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Balance General');
  const rates = useStore.getState().cierreRates;
  const bg = computeBalanceGeneral(computeBalances(entries, accounts), rates);
  const rows: RowInput[] = [];

  const band = (t: string) => rows.push([{ content: t, colSpan: 2, styles: { fontStyle: 'bold', fillColor: BRAND.primary, textColor: 255 } }]);
  const sub = (t: string) => rows.push([{ content: t, colSpan: 2, styles: { fontStyle: 'bold', fillColor: BRAND.grouperBg } }]);
  const item = (it: LineItem) =>
    rows.push([
      { content: `  ${it.monto < 0 ? '(−) ' : ''}${it.nombre}` },
      {
        content: it.monto < 0 ? `(${formatCurrency(Math.abs(it.monto))})` : formatCurrency(it.monto),
        styles: { halign: 'right' },
      },
    ]);
  const total = (t: string, v: number, strong = false) =>
    rows.push([
      { content: t, styles: { fontStyle: 'bold', fillColor: strong ? BRAND.primary : undefined, textColor: strong ? 255 : undefined } },
      { content: formatCurrency(v), styles: { halign: 'right', fontStyle: 'bold', fillColor: strong ? BRAND.primary : undefined, textColor: strong ? 255 : undefined } },
    ]);

  band('ACTIVO');
  sub('Corriente');
  [...bg.disponible, ...bg.exigible, ...bg.realizable, ...bg.diferido].forEach(item);
  total('Total Activo Corriente', bg.totalCorriente);
  if (bg.noCorriente.length) {
    sub('No Corriente');
    bg.noCorriente.forEach(item);
    total('Total Activo No Corriente', bg.totalNoCorriente);
  }
  total('SUMA TOTAL DEL ACTIVO', bg.totalActivo, true);

  band('PASIVO');
  sub('Corriente');
  bg.pasivoCorriente.forEach(item);
  if (bg.isrPorPagar > 0) item({ codigo: '2.1.06', nombre: 'ISR por Pagar', monto: bg.isrPorPagar });
  total('Total Pasivo Corriente', bg.totalPasivoCorriente);
  if (bg.pasivoNoCorriente.length) {
    sub('No Corriente');
    bg.pasivoNoCorriente.forEach(item);
    total('Total Pasivo No Corriente', bg.totalPasivoNoCorriente);
  }
  total('TOTAL DEL PASIVO', bg.totalPasivo);

  band('PATRIMONIO');
  bg.capital.forEach(item);
  if (bg.reservaLegal) item({ codigo: '3.1.06', nombre: 'Reserva Legal', monto: bg.reservaLegal });
  if (bg.gananciaEjercicio) item({ codigo: '3.1.09', nombre: 'Ganancia del Ejercicio', monto: bg.gananciaEjercicio });
  total('Total del Patrimonio', bg.totalPatrimonio);
  total('SUMA IGUAL AL ACTIVO', bg.totalPasivoPatrimonio, true);

  autoTable(doc, {
    startY: 40,
    head: [['Concepto', 'Monto']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND.primary, textColor: 255 },
    columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
  });

  addFooter(doc);
  doc.save('Balance_General.pdf');
};
