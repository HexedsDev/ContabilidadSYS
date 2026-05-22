import { useMemo, useState } from 'react';
import { useStore, computeBalances, filterByDateRange } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { DateRangeFilter } from '../components/ui/DateRangeFilter';
import { formatCurrency } from '../utils/helpers';
import { Printer, TrendingUp, TrendingDown } from 'lucide-react';
import type { DateRange } from '../types';

interface Item {
  codigo: string;
  nombre: string;
  monto: number;
}

export function EstadoResultados() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const data = useMemo(() => {
    const filtered = filterByDateRange(entries, dateRange.from, dateRange.to);
    const balances = computeBalances(filtered, accounts);
    const ingresos: Item[] = [];
    const costos: Item[] = [];
    const gastos: Item[] = [];
    let totalIngresos = 0;
    let totalCostos = 0;
    let totalGastos = 0;

    for (const code in balances) {
      const b = balances[code];
      if (b.saldo === 0) continue;
      const item = { codigo: code, nombre: b.nombre, monto: b.saldo };
      if (code.startsWith('4')) {
        ingresos.push(item);
        totalIngresos += b.saldo;
      } else if (code.startsWith('5.1')) {
        costos.push(item);
        totalCostos += b.saldo;
      } else if (code.startsWith('5.2') || code.startsWith('6')) {
        gastos.push(item);
        totalGastos += b.saldo;
      }
    }

    const sortByCode = (arr: Item[]) =>
      arr.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

    return {
      ingresos: sortByCode(ingresos),
      costos: sortByCode(costos),
      gastos: sortByCode(gastos),
      totalIngresos,
      totalCostos,
      totalGastos,
    };
  }, [entries, accounts, dateRange]);

  const utilidadBruta = data.totalIngresos - data.totalCostos;
  const utilidadNeta = utilidadBruta - data.totalGastos;
  const margenBruto = data.totalIngresos > 0 ? (utilidadBruta / data.totalIngresos) * 100 : 0;
  const margenNeto = data.totalIngresos > 0 ? (utilidadNeta / data.totalIngresos) * 100 : 0;
  const hasData = data.ingresos.length + data.costos.length + data.gastos.length > 0;
  const isProfit = utilidadNeta >= 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Estado de Resultados"
        description="Ingresos, costos y gastos del periodo"
        icon={TrendingUp}
        actions={
          <>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            {hasData && (
              <Badge variant={isProfit ? 'success' : 'error'} dot>
                {isProfit ? 'Utilidad' : 'Pérdida'}: {formatCurrency(utilidadNeta)}
              </Badge>
            )}
            <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              Imprimir
            </Button>
          </>
        }
      />

      {!hasData ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={TrendingUp}
              title="Sin datos"
              description="Registra ingresos y gastos para generar el estado de resultados"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <Section
              title="Ingresos"
              tone="success"
              items={data.ingresos}
              total={data.totalIngresos}
              totalLabel="Total Ingresos"
            />

            <Section
              title="Costo de Ventas"
              tone="warning"
              items={data.costos}
              total={data.totalCostos}
              totalLabel="Total Costos"
              negative
            />

            <BigTotal label="Utilidad Bruta" value={utilidadBruta} tone="primary" />

            <Section
              title="Gastos Operativos"
              tone="error"
              items={data.gastos}
              total={data.totalGastos}
              totalLabel="Total Gastos"
              negative
            />

            <BigTotal label={isProfit ? 'Utilidad Neta del Ejercicio' : 'Pérdida Neta del Ejercicio'} value={utilidadNeta} tone={isProfit ? 'success' : 'error'} highlight />
          </Card>

          {/* Sidebar resumen */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-sm font-semibold text-text-main">Indicadores</h3>

                <KPIBar label="Margen Bruto" value={margenBruto} positive={margenBruto >= 0} />
                <KPIBar label="Margen Neto" value={margenNeto} positive={margenNeto >= 0} />

                <div className="pt-3 border-t border-border-soft space-y-3">
                  <Stat label="Ingresos" value={data.totalIngresos} tone="success" />
                  <Stat label="Costo Ventas" value={data.totalCostos} tone="warning" />
                  <Stat label="Gastos" value={data.totalGastos} tone="error" />
                </div>
              </CardContent>
            </Card>

            <Panel tone={isProfit ? 'success' : 'error'} padding="md">
              <div className="flex items-center gap-2">
                {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <p className="text-xs uppercase tracking-widest font-semibold text-white/80">
                  {isProfit ? 'Resultado positivo' : 'Resultado negativo'}
                </p>
              </div>
              <p className="text-3xl font-bold tabular-nums mt-2">{formatCurrency(utilidadNeta)}</p>
              <p className="text-xs text-white/80 mt-1">{margenNeto.toFixed(1)}% margen sobre ingresos</p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  items,
  total,
  totalLabel,
  negative,
}: {
  title: string;
  tone: 'success' | 'warning' | 'error';
  items: Item[];
  total: number;
  totalLabel: string;
  negative?: boolean;
}) {
  if (items.length === 0) return null;
  const toneColors = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  };
  return (
    <div>
      <div className="px-5 py-2.5 bg-surface-soft border-y border-border-soft flex items-center justify-between">
        <h3 className={`text-xs uppercase tracking-widest font-bold ${toneColors[tone]}`}>{title}</h3>
      </div>
      <div className="divide-y divide-border-soft">
        {items.map(item => (
          <div key={item.codigo} className="flex items-center justify-between px-5 py-2 hover:bg-surface-soft/40 transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] text-text-subtle w-14">{item.codigo}</span>
              <span className="text-sm text-text-main">{item.nombre}</span>
            </div>
            <span className="text-sm tabular-nums text-text-muted">
              {negative && '('}
              {formatCurrency(item.monto)}
              {negative && ')'}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-2.5 bg-surface-soft/60">
          <span className="text-xs uppercase tracking-wider font-semibold text-text-muted">{totalLabel}</span>
          <span className="text-sm font-bold tabular-nums text-text-main">
            {negative && '('}
            {formatCurrency(total)}
            {negative && ')'}
          </span>
        </div>
      </div>
    </div>
  );
}

function BigTotal({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  tone: 'primary' | 'success' | 'error';
  highlight?: boolean;
}) {
  const toneColors = {
    primary: 'text-primary-700 dark:text-primary-300',
    success: 'text-success',
    error: 'text-error',
  };
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 border-t-2 ${
        highlight
          ? 'border-primary-500/40 bg-primary-50 dark:bg-primary-100/10'
          : 'border-border-soft'
      }`}
    >
      <span className={`text-sm uppercase tracking-wider font-bold ${toneColors[tone]}`}>{label}</span>
      <span className={`text-lg font-bold tabular-nums ${toneColors[tone]}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'error' }) {
  const dotColors = { success: 'bg-success', warning: 'bg-warning', error: 'bg-error' };
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-text-muted">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[tone]}`} />
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}

function KPIBar({ label, value, positive }: { label: string; value: number; positive: boolean }) {
  const pct = Math.min(Math.abs(value), 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-text-muted">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${positive ? 'text-success' : 'text-error'}`}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 bg-surface-soft rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${positive ? 'bg-success' : 'bg-error'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
