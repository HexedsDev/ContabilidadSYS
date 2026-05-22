import { useRef } from 'react';
import { Card } from '../components/ui/Card';
import {
  FileText,
  Download,
  FileJson,
  BookText,
  BookOpen,
  Scale,
  PieChart,
  TrendingUp,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import {
  exportLibroDiarioPDF,
  exportLibroMayorPDF,
  exportBalanceSaldosPDF,
  exportEstadoResultadosPDF,
  exportBalanceGeneralPDF,
} from '../utils/pdfExport';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/toast-context';
import { formatNumber, formatCurrency } from '../utils/helpers';
import { computeBalances } from '../store/useStore';
import { computeIVA } from '../utils/financial';
import { validateBackup, MAX_IMPORT_BYTES } from '../utils/validation';
import { Panel, PanelStat } from '../components/ui/Panel';

export function Reportes() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const data = { entries, accounts, exportedAt: new Date().toISOString(), version: '2' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_contable_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Respaldo generado', `${entries.length} partidas exportadas`);
  };

  const handleExportCSV = () => {
    const rows: string[][] = [['Partida', 'Fecha', 'Concepto', 'Estado', 'Cuenta', 'Nombre', 'Debe', 'Haber']];
    const accMap = new Map(accounts.map(a => [a.codigo, a.nombre]));
    for (const e of entries) {
      for (const l of e.lineas) {
        rows.push([
          String(e.numero),
          e.fecha,
          e.concepto.replace(/"/g, '""'),
          e.estado,
          l.cuenta_codigo,
          (accMap.get(l.cuenta_codigo) ?? '').replace(/"/g, '""'),
          String(l.debe || 0),
          String(l.haber || 0),
        ]);
      }
    }
    const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partidas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV generado', `${entries.length} partidas (${rows.length - 1} líneas)`);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security: reject oversized files before reading into memory (DoS protection)
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error('Archivo demasiado grande', `Máximo ${MAX_IMPORT_BYTES / 1024 / 1024} MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        // Security: strict schema validation + prototype-pollution-safe parse
        const { entries, accounts } = validateBackup(text);
        useStore.setState({ entries, accounts });
        toast.success('Respaldo importado', `${entries.length} partidas restauradas`);
      } catch (err) {
        toast.error('Error al importar', err instanceof Error ? err.message : 'Archivo inválido');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      toast.error('Error al leer archivo');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const safeExport = (fn: () => void, name: string) => {
    try {
      fn();
      toast.success(`${name} exportado`);
    } catch (err) {
      toast.error('Error al exportar', err instanceof Error ? err.message : 'Falló el PDF');
    }
  };

  const balances = computeBalances(entries, accounts);
  const totalActivo = Object.values(balances).filter(b => b.codigo.startsWith('1')).reduce((s, b) => s + b.saldo, 0);
  const totalDebe = entries.reduce((s, e) => s + e.lineas.reduce((ls, l) => ls + (l.debe || 0), 0), 0);
  const iva = computeIVA(balances);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <PageHeader
        title="Reportes financieros"
        description="Genera y exporta información contable en PDF, CSV o JSON"
        icon={FileText}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat label="Partidas" value={formatNumber(entries.length).replace(/[,.]00$/, '')} />
        <QuickStat label="Cuentas" value={formatNumber(accounts.length).replace(/[,.]00$/, '')} />
        <QuickStat label="Movimientos" value={formatCurrency(totalDebe)} />
        <QuickStat label="Total activos" value={formatCurrency(totalActivo)} />
      </div>

      {/* Resumen IVA */}
      {(iva.credito > 0 || iva.debito > 0) && (
        <Panel tone={iva.neto >= 0 ? 'primary' : 'success'} padding="md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Resumen IVA</p>
              <p className="mt-1 text-sm text-white/80">IVA 12% — Guatemala</p>
            </div>
            <PanelStat label="IVA por cobrar (crédito)" value={formatCurrency(iva.credito)} divider />
            <PanelStat label="IVA por pagar (débito)" value={formatCurrency(iva.debito)} divider />
            <PanelStat label={iva.neto >= 0 ? 'A pagar SAT' : 'A favor'} value={formatCurrency(Math.abs(iva.neto))} divider />
          </div>
        </Panel>
      )}

      <div>
        <h2 className="text-sm font-semibold text-text-main uppercase tracking-wider mb-3">Libros principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReportCard
            icon={BookText}
            title="Libro Diario"
            description="Registro cronológico de todas las transacciones"
            tone="primary"
            onExport={() => safeExport(() => exportLibroDiarioPDF(entries, accounts), 'Libro Diario')}
          />
          <ReportCard
            icon={BookOpen}
            title="Libro Mayor"
            description="Movimientos y saldos detallados por cuenta"
            tone="primary"
            onExport={() => safeExport(() => exportLibroMayorPDF(entries, accounts), 'Libro Mayor')}
          />
          <ReportCard
            icon={Scale}
            title="Balance de Saldos"
            description="Saldos deudores y acreedores para verificación"
            tone="primary"
            onExport={() => safeExport(() => exportBalanceSaldosPDF(entries, accounts), 'Balance de Saldos')}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-main uppercase tracking-wider mb-3">Estados financieros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReportCard
            icon={TrendingUp}
            title="Estado de Resultados"
            description="Ingresos, costos y gastos del periodo"
            tone="secondary"
            onExport={() => safeExport(() => exportEstadoResultadosPDF(entries, accounts), 'Estado de Resultados')}
          />
          <ReportCard
            icon={PieChart}
            title="Balance General"
            description="Activos, pasivos y patrimonio a la fecha"
            tone="secondary"
            onExport={() => safeExport(() => exportBalanceGeneralPDF(entries, accounts), 'Balance General')}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-main uppercase tracking-wider mb-3">Respaldo e intercambio</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ReportCard
            icon={FileJson}
            title="Respaldo JSON"
            description="Exporta toda la base contable local"
            tone="success"
            buttonLabel="Exportar JSON"
            onExport={handleExportJSON}
          />
          <ReportCard
            icon={FileSpreadsheet}
            title="Partidas en CSV"
            description="Hoja de cálculo compatible con Excel"
            tone="success"
            buttonLabel="Exportar CSV"
            onExport={handleExportCSV}
          />
          <Card className="p-5 flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-sm bg-warning-soft text-warning flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-text-main">Importar JSON</h3>
                <p className="text-xs text-text-muted mt-0.5">Restaura un respaldo previo</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <Button
              variant="outline"
              fullWidth
              className="mt-auto"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar archivo
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-border-soft rounded-sm p-4">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-text-subtle">{label}</p>
      <p className="text-lg font-bold text-text-main tabular-nums mt-1 truncate">{value}</p>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  title,
  description,
  tone,
  onExport,
  buttonLabel = 'Exportar PDF',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  tone: 'primary' | 'secondary' | 'success';
  onExport: () => void;
  buttonLabel?: string;
}) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600 dark:text-primary-300',
    secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-100/10 dark:text-secondary-300',
    success: 'bg-success-soft text-success',
  };
  return (
    <Card hoverable className="p-5 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-text-main">{title}</h3>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <Button variant="outline" fullWidth className="mt-auto" leftIcon={<Download className="w-4 h-4" />} onClick={onExport}>
        {buttonLabel}
      </Button>
    </Card>
  );
}
