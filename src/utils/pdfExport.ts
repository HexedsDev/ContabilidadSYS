import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { JournalEntry, Account } from '../types';
import { formatCurrency } from './helpers';

const createDocument = (title: string) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString();

  doc.setFontSize(18);
  doc.text('Proyecto Contabilidad', 14, 20);

  doc.setFontSize(14);
  doc.text(title, 14, 30);

  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${date}`, 14, 38);

  return doc;
};

export const exportLibroDiarioPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Libro Diario');

  const validEntries = entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').sort((a, b) => a.numero - b.numero);

  const tableData: any[] = [];

  validEntries.forEach(entry => {
    // Header for the entry
    tableData.push([
      `P${entry.numero}`,
      entry.fecha,
      entry.concepto,
      '',
      ''
    ]);

    // Lines
    entry.lineas.forEach(line => {
      const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
      tableData.push([
        '',
        line.cuenta_codigo,
        acc ? acc.nombre : 'Cuenta Desconocida',
        line.debe > 0 ? formatCurrency(line.debe) : '',
        line.haber > 0 ? formatCurrency(line.haber) : ''
      ]);
    });

    // Empty line to separate entries
    tableData.push(['', '', '', '', '']);
  });

  autoTable(doc, {
    startY: 45,
    head: [['Partida', 'Fecha/Código', 'Concepto/Cuenta', 'Debe', 'Haber']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [63, 81, 181] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' }
    },
    didParseCell: function (data) {
      const rawData = data.row.raw as any[];
      if (data.row.index > -1 && rawData[0] !== '' && rawData[0].toString().startsWith('P')) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  doc.save('Libro_Diario.pdf');
};

export const exportLibroMayorPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Libro Mayor');

  const accountLedgers: Record<string, { fecha: string, concepto: string, debe: number, haber: number, saldo: number }[]> = {};

  // Initialize
  accounts.forEach(acc => {
    accountLedgers[acc.codigo] = [];
  });

  const validEntries = entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  validEntries.forEach(entry => {
    entry.lineas.forEach(line => {
      if (!accountLedgers[line.cuenta_codigo]) {
        accountLedgers[line.cuenta_codigo] = [];
      }
      accountLedgers[line.cuenta_codigo].push({
        fecha: entry.fecha,
        concepto: entry.concepto,
        debe: line.debe || 0,
        haber: line.haber || 0,
        saldo: 0 // Will be calculated next
      });
    });
  });

  let currentY = 45;

  Object.entries(accountLedgers).forEach(([codigo, lines]) => {
    if (lines.length === 0) return;

    const acc = accounts.find(a => a.codigo === codigo);
    if (!acc) return;

    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Cuenta: ${codigo} - ${acc.nombre}`, 14, currentY);
    currentY += 5;

    let saldo = 0;
    const tableData = lines.map(line => {
      if (acc.naturaleza === 'Deudor') {
        saldo += (line.debe - line.haber);
      } else {
        saldo += (line.haber - line.debe);
      }
      return [
        line.fecha,
        line.concepto,
        line.debe > 0 ? formatCurrency(line.debe) : '',
        line.haber > 0 ? formatCurrency(line.haber) : '',
        formatCurrency(saldo)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Concepto', 'Debe', 'Haber', 'Saldo']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [100, 100, 100] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      margin: { bottom: 20 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  });

  doc.save('Libro_Mayor.pdf');
};

export const exportBalanceSaldosPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Balance de Saldos');

  const data: Record<string, { codigo: string, nombre: string, debe: number, haber: number }> = {};

  entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').forEach(entry => {
    entry.lineas.forEach(line => {
      if (!data[line.cuenta_codigo]) {
        const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
        if (!acc) return;
        data[line.cuenta_codigo] = {
          codigo: acc.codigo,
          nombre: acc.nombre,
          debe: 0,
          haber: 0,
        };
      }
      data[line.cuenta_codigo].debe += line.debe || 0;
      data[line.cuenta_codigo].haber += line.haber || 0;
    });
  });

  let totalDeudor = 0;
  let totalAcreedor = 0;

  const tableData = Object.values(data).map(item => {
    const acc = accounts.find(a => a.codigo === item.codigo);
    let saldoDeudor = 0;
    let saldoAcreedor = 0;

    if (acc?.naturaleza === 'Deudor') {
      const saldo = item.debe - item.haber;
      if (saldo >= 0) saldoDeudor = saldo;
      else saldoAcreedor = Math.abs(saldo);
    } else {
      const saldo = item.haber - item.debe;
      if (saldo >= 0) saldoAcreedor = saldo;
      else saldoDeudor = Math.abs(saldo);
    }

    totalDeudor += saldoDeudor;
    totalAcreedor += saldoAcreedor;

    return [
      item.codigo,
      item.nombre,
      saldoDeudor > 0 ? formatCurrency(saldoDeudor) : '',
      saldoAcreedor > 0 ? formatCurrency(saldoAcreedor) : ''
    ];
  }).sort((a, b) => (a[0] as string).localeCompare(b[0] as string));

  // Add totals row
  tableData.push([
    '',
    'SUMAS IGUALES',
    formatCurrency(totalDeudor),
    formatCurrency(totalAcreedor)
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Código', 'Cuenta', 'Deudor', 'Acreedor']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [46, 125, 50] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    didParseCell: function (data) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 255, 240];
      }
    }
  });

  doc.save('Balance_Saldos.pdf');
};

export const exportEstadoResultadosPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Estado de Resultados');

  // Compute balances
  const balances: Record<string, number> = {};
  entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').forEach(entry => {
    entry.lineas.forEach(line => {
      const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
      if (!acc) return;
      if (!balances[acc.codigo]) balances[acc.codigo] = 0;

      if (acc.naturaleza === 'Deudor') {
        balances[acc.codigo] += (line.debe - line.haber);
      } else {
        balances[acc.codigo] += (line.haber - line.debe);
      }
    });
  });

  let totalIngresos = 0;
  let totalCostos = 0;
  let totalGastos = 0;

  const tableData: any[] = [];

  // Ingresos (Type 'Ingreso', typically code starting with 4)
  tableData.push(['INGRESOS', '']);
  accounts.filter(a => a.codigo.startsWith('4') && balances[a.codigo]).forEach(acc => {
    tableData.push([`  ${acc.nombre}`, formatCurrency(balances[acc.codigo])]);
    totalIngresos += balances[acc.codigo];
  });
  tableData.push(['Total Ingresos', formatCurrency(totalIngresos)]);
  tableData.push(['', '']);

  // Costos (Type 'Costo', typically code starting with 5.1 or just 5 and naturally Deudor)
  tableData.push(['COSTOS', '']);
  accounts.filter(a => a.codigo.startsWith('5.1') && balances[a.codigo]).forEach(acc => {
    tableData.push([`  ${acc.nombre}`, formatCurrency(balances[acc.codigo])]);
    totalCostos += balances[acc.codigo];
  });
  tableData.push(['Total Costos', formatCurrency(totalCostos)]);

  const utilidadBruta = totalIngresos - totalCostos;
  tableData.push(['Utilidad Bruta', formatCurrency(utilidadBruta)]);
  tableData.push(['', '']);

  // Gastos (Type 'Gasto', typically code starting with 5.2 or 6)
  tableData.push(['GASTOS', '']);
  accounts.filter(a => a.codigo.startsWith('5.2') && balances[a.codigo]).forEach(acc => {
    tableData.push([`  ${acc.nombre}`, formatCurrency(balances[acc.codigo])]);
    totalGastos += balances[acc.codigo];
  });
  tableData.push(['Total Gastos', formatCurrency(totalGastos)]);
  tableData.push(['', '']);

  const utilidadNeta = utilidadBruta - totalGastos;
  tableData.push(['UTILIDAD/PÉRDIDA DEL EJERCICIO', formatCurrency(utilidadNeta)]);

  autoTable(doc, {
    startY: 45,
    head: [['Concepto', 'Monto']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [40, 53, 147] },
    columnStyles: {
      1: { halign: 'right' }
    },
    didParseCell: function (data) {
      const rawData = data.row.raw as any[];
      const text = rawData[0].toString();
      if (text === 'INGRESOS' || text === 'COSTOS' || text === 'GASTOS' || text.startsWith('UTILIDAD')) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (text.startsWith('Total ') || text === 'Utilidad Bruta') {
        data.cell.styles.fontStyle = 'italic';
      }
    }
  });

  doc.save('Estado_Resultados.pdf');
};

export const exportBalanceGeneralPDF = (entries: JournalEntry[], accounts: Account[]) => {
  const doc = createDocument('Balance General');

  // Compute balances
  const balances: Record<string, number> = {};
  entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').forEach(entry => {
    entry.lineas.forEach(line => {
      const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
      if (!acc) return;
      if (!balances[acc.codigo]) balances[acc.codigo] = 0;

      if (acc.naturaleza === 'Deudor') {
        balances[acc.codigo] += (line.debe - line.haber);
      } else {
        balances[acc.codigo] += (line.haber - line.debe);
      }
    });
  });

  // Calculate Utilidad/Pérdida for Patrimonio
  let totalIngresos = 0;
  let totalCostosGastos = 0;
  Object.keys(balances).forEach(codigo => {
    if (codigo.startsWith('4')) totalIngresos += balances[codigo];
    if (codigo.startsWith('5') || codigo.startsWith('6')) totalCostosGastos += balances[codigo];
  });
  const resultadoEjercicio = totalIngresos - totalCostosGastos;

  let totalActivo = 0;
  let totalPasivo = 0;
  let totalPatrimonio = 0;

  const tableData: any[] = [];

  // Activos (1)
  tableData.push(['ACTIVO', '']);
  accounts.filter(a => a.codigo.startsWith('1') && balances[a.codigo]).forEach(acc => {
    tableData.push([`  ${acc.nombre}`, formatCurrency(balances[acc.codigo])]);
    totalActivo += balances[acc.codigo];
  });
  tableData.push(['Total Activo', formatCurrency(totalActivo)]);
  tableData.push(['', '']);

  // Pasivos (2)
  tableData.push(['PASIVO', '']);
  accounts.filter(a => a.codigo.startsWith('2') && balances[a.codigo]).forEach(acc => {
    tableData.push([`  ${acc.nombre}`, formatCurrency(balances[acc.codigo])]);
    totalPasivo += balances[acc.codigo];
  });
  tableData.push(['Total Pasivo', formatCurrency(totalPasivo)]);
  tableData.push(['', '']);

  // Patrimonio (3)
  tableData.push(['PATRIMONIO', '']);
  accounts.filter(a => a.codigo.startsWith('3') && balances[a.codigo]).forEach(acc => {
    tableData.push([`  ${acc.nombre}`, formatCurrency(balances[acc.codigo])]);
    totalPatrimonio += balances[acc.codigo];
  });
  tableData.push(['  Resultado del Ejercicio', formatCurrency(resultadoEjercicio)]);
  totalPatrimonio += resultadoEjercicio;

  tableData.push(['Total Patrimonio', formatCurrency(totalPatrimonio)]);
  tableData.push(['', '']);

  tableData.push(['TOTAL PASIVO + PATRIMONIO', formatCurrency(totalPasivo + totalPatrimonio)]);

  autoTable(doc, {
    startY: 45,
    head: [['Concepto', 'Monto']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [40, 53, 147] },
    columnStyles: {
      1: { halign: 'right' }
    },
    didParseCell: function (data) {
      const rawData = data.row.raw as any[];
      const text = rawData[0].toString();
      if (text === 'ACTIVO' || text === 'PASIVO' || text === 'PATRIMONIO' || text.startsWith('TOTAL')) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (text.startsWith('Total ')) {
        data.cell.styles.fontStyle = 'italic';
      }
    }
  });

  doc.save('Balance_General.pdf');
};
