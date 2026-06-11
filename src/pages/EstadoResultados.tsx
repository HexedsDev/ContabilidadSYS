import { useMemo, useState } from 'react';
import { useStore, computeBalances, filterByDateRange } from '../store/useStore';
import { computeEstadoResultados } from '../utils/cierre';
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

export function EstadoResultados() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const cierreRates = useStore(s => s.cierreRates);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const er = useMemo(() => {
    const filtered = filterByDateRange(entries, dateRange.from, dateRange.to);
    const balances = computeBalances(filtered, accounts);
    return computeEstadoResultados(balances, cierreRates);
  }, [entries, accounts, dateRange, cierreRates]);

  const hasData =
    er.ventas !== 0 || er.costoVentas !== 0 || er.totalGastosOperacion !== 0 || er.totalOtrosIngresos !== 0;
  const isProfit = er.gananciaEjercicio >= 0;
  const pct = (r: number) => `${(r * 100).toFixed(r * 100 % 1 === 0 ? 0 : 2)}%`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Estado de Resultados"
        description="Ventas netas, costo, utilidad bruta, ISR y reserva legal"
        icon={TrendingUp}
        actions={
          <>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            {hasData && (
              <Badge variant={isProfit ? 'success' : 'error'} dot>
                {isProfit ? 'Ganancia' : 'Pérdida'}: {formatCurrency(er.gananciaEjercicio)}
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
              title="Sin movimientos de resultados en el período"
              description="Registra ventas, compras o gastos en el Libro Diario para generar este estado"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 overflow-hidden">
            {/* Ventas netas */}
            <Group title="Ingresos por ventas" />
            <Line label="Ventas" value={er.ventas} />
            {er.devolucionesVentas !== 0 && (
              <Line label="(−) Devoluciones y rebajas s/ventas" value={er.devolucionesVentas} subtract muted />
            )}
            <Subtotal label="(=) Ventas netas" value={er.ventasNetas} />

            {/* Costo */}
            <Group title="Costo de ventas" />
            <Line label="Compras" value={er.compras} />
            {er.devolucionesCompras !== 0 && (
              <Line label="(−) Devoluciones y rebajas s/compras" value={er.devolucionesCompras} subtract muted />
            )}
            <Subtotal label="(=) Compras netas / Costo de ventas" value={er.comprasNetas} subtract />

            <BigTotal label="UTILIDAD BRUTA" value={er.utilidadBruta} tone="primary" />

            {/* Otros ingresos */}
            {er.otrosIngresos.length > 0 && (
              <>
                <Group title="Otros ingresos" />
                {er.otrosIngresos.map(i => (
                  <Line key={i.codigo} label={i.nombre} codigo={i.codigo} value={i.monto} />
                ))}
                <Subtotal label="Total otros ingresos" value={er.totalOtrosIngresos} />
              </>
            )}

            {/* Gastos de operación */}
            <Group title="Gastos de operación" />
            {er.gastosOperacion.map(i => (
              <Line key={i.codigo} label={i.nombre} codigo={i.codigo} value={i.monto} subtract muted />
            ))}
            <Subtotal label="Total gastos de operación" value={er.totalGastosOperacion} subtract />

            {/* Gastos no operativos */}
            {er.gastosNoOperativos.length > 0 && (
              <>
                <Group title="Gastos no operativos" />
                {er.gastosNoOperativos.map(i => (
                  <Line key={i.codigo} label={i.nombre} codigo={i.codigo} value={i.monto} subtract muted />
                ))}
                <Subtotal label="Total gastos no operativos" value={er.totalGastosNoOperativos} subtract />
              </>
            )}

            <BigTotal label="Utilidad antes de impuestos" value={er.utilidadAntesISR} tone="primary" />
            <Line label={`(−) ISR (${pct(cierreRates.isr)})`} value={er.isr} subtract muted />
            <Subtotal label="(=) Utilidad después de impuestos" value={er.utilidadDespuesISR} />
            <Line label={`(−) Reserva Legal (${pct(cierreRates.reservaLegal)})`} value={er.reservaLegal} subtract muted />

            <BigTotal
              label={isProfit ? 'GANANCIA DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO'}
              value={er.gananciaEjercicio}
              tone={isProfit ? 'success' : 'error'}
              highlight
            />
          </Card>

          {/* Sidebar resumen */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold text-text-main">Resumen</h3>
                <Mini label="Ventas netas" value={er.ventasNetas} tone="success" />
                <Mini label="Costo de ventas" value={er.comprasNetas} tone="warning" />
                <Mini label="Utilidad bruta" value={er.utilidadBruta} tone="primary" />
                <Mini label="Gastos de operación" value={er.totalGastosOperacion} tone="error" />
                <div className="pt-3 border-t border-border-soft space-y-3">
                  <Mini label={`ISR (${pct(cierreRates.isr)})`} value={er.isr} tone="error" />
                  <Mini label={`Reserva Legal (${pct(cierreRates.reservaLegal)})`} value={er.reservaLegal} tone="info" />
                </div>
              </CardContent>
            </Card>

            <Panel tone={isProfit ? 'success' : 'error'} padding="md">
              <div className="flex items-center gap-2">
                {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <p className="text-xs uppercase tracking-widest font-semibold text-white/80">
                  {isProfit ? 'Ganancia del ejercicio' : 'Pérdida del ejercicio'}
                </p>
              </div>
              <p className="text-3xl font-bold tabular-nums mt-2">{formatCurrency(er.gananciaEjercicio)}</p>
              {er.ventasNetas > 0 && (
                <p className="text-xs text-white/80 mt-1">
                  {((er.gananciaEjercicio / er.ventasNetas) * 100).toFixed(1)}% sobre ventas netas
                </p>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title }: { title: string }) {
  return (
    <div className="px-5 py-2 bg-surface-soft border-y border-border-soft">
      <h3 className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">{title}</h3>
    </div>
  );
}

function Line({
  label,
  codigo,
  value,
  subtract,
  muted,
}: {
  label: string;
  codigo?: string;
  value: number;
  subtract?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {codigo && <span className="font-mono text-[10px] text-text-subtle w-14 shrink-0">{codigo}</span>}
        <span className="text-sm text-text-main truncate">{label}</span>
      </div>
      <span className={`text-sm tabular-nums ${muted ? 'text-text-muted' : 'text-text-main'}`}>
        {subtract && '('}
        {formatCurrency(value)}
        {subtract && ')'}
      </span>
    </div>
  );
}

function Subtotal({ label, value, subtract }: { label: string; value: number; subtract?: boolean }) {
  // Convención impresa: línea simple sobre el monto del subtotal, sin fondos.
  return (
    <div className="flex items-center justify-between px-5 py-2 border-b border-border-soft">
      <span className="text-xs uppercase tracking-wider font-semibold text-text-muted">{label}</span>
      <span className="text-sm font-bold tabular-nums text-text-main border-t border-text-main/60 pt-0.5">
        {subtract && '('}
        {formatCurrency(value)}
        {subtract && ')'}
      </span>
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
  // Los totales de un estado financiero van en tinta neutra; solo el resultado
  // final conserva el verde/rojo semántico y el doble subrayado contable.
  const toneColors = {
    primary: 'text-text-main',
    success: 'text-success',
    error: 'text-error',
  };
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-soft">
      <span className={`text-sm uppercase tracking-wider font-bold ${toneColors[tone]}`}>{label}</span>
      <span className={`text-lg font-bold tabular-nums ${toneColors[tone]} ${highlight ? 'total-final' : ''}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'error' | 'primary' | 'info' }) {
  const dot = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    primary: 'bg-primary-500',
    info: 'bg-info',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-text-muted">
        <span className={`w-1.5 h-1.5 rounded-full ${dot[tone]}`} />
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}
