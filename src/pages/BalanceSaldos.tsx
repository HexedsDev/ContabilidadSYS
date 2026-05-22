import { useMemo, useState } from 'react';
import { useStore, filterByDateRange } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { DateRangeFilter } from '../components/ui/DateRangeFilter';
import { formatCurrency } from '../utils/helpers';
import { Printer, CheckCircle2, AlertCircle, Scale } from 'lucide-react';
import type { DateRange } from '../types';

export function BalanceSaldos() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const balanceData = useMemo(() => {
    const data: Record<string, { codigo: string; nombre: string; debe: number; haber: number; naturaleza: string }> = {};

    filterByDateRange(entries, dateRange.from, dateRange.to)
      .filter(e => e.estado === 'contabilizada' || e.estado === 'observada')
      .forEach(entry => {
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

    return Object.values(data)
      .map(item => {
        let saldoDeudor = 0;
        let saldoAcreedor = 0;
        if (item.naturaleza === 'Deudor') {
          const s = item.debe - item.haber;
          if (s >= 0) saldoDeudor = s;
          else saldoAcreedor = Math.abs(s);
        } else {
          const s = item.haber - item.debe;
          if (s >= 0) saldoAcreedor = s;
          else saldoDeudor = Math.abs(s);
        }
        return { ...item, saldoDeudor, saldoAcreedor };
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  }, [entries, accounts, dateRange]);

  const totalDeudor = balanceData.reduce((s, i) => s + i.saldoDeudor, 0);
  const totalAcreedor = balanceData.reduce((s, i) => s + i.saldoAcreedor, 0);
  const totalDebe = balanceData.reduce((s, i) => s + i.debe, 0);
  const totalHaber = balanceData.reduce((s, i) => s + i.haber, 0);
  const isBalanced = Math.abs(totalDeudor - totalAcreedor) < 0.01;
  const diff = Math.abs(totalDeudor - totalAcreedor);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Balance de Saldos"
        description="Verificación de partida doble y saldos finales"
        icon={Scale}
        actions={
          <>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            {balanceData.length > 0 && (
              <Badge variant={isBalanced ? 'success' : 'error'} dot size="md">
                {isBalanced ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isBalanced ? 'Balance cuadrado' : `Diferencia: ${formatCurrency(diff)}`}
              </Badge>
            )}
            <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              Imprimir
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {balanceData.length === 0 ? (
            <div className="py-2">
              <EmptyState
                icon={Scale}
                title="Sin movimientos"
                description="Necesitas partidas contabilizadas para generar el balance"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-surface-soft text-[10px] uppercase tracking-wider text-text-subtle">
                  <tr>
                    <th className="p-3 text-left font-semibold w-28">Código</th>
                    <th className="p-3 text-left font-semibold">Cuenta</th>
                    <th className="p-3 text-right font-semibold w-32 border-l border-border-soft">Movim. Debe</th>
                    <th className="p-3 text-right font-semibold w-32">Movim. Haber</th>
                    <th className="p-3 text-right font-semibold w-32 border-l border-border-soft bg-primary-50/40 dark:bg-primary-100/10">Saldo Deudor</th>
                    <th className="p-3 text-right font-semibold w-32 bg-primary-50/40 dark:bg-primary-100/10">Saldo Acreedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {balanceData.map(item => (
                    <tr key={item.codigo} className="hover:bg-surface-soft/50 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-xs text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-100 px-2 py-0.5 rounded">
                          {item.codigo}
                        </span>
                      </td>
                      <td className="p-3 text-text-main">{item.nombre}</td>
                      <td className="p-3 text-right tabular-nums text-text-muted border-l border-border-soft">
                        {item.debe > 0 ? formatCurrency(item.debe) : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums text-text-muted">
                        {item.haber > 0 ? formatCurrency(item.haber) : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium text-text-main border-l border-border-soft bg-primary-50/30 dark:bg-primary-100/5">
                        {item.saldoDeudor > 0 ? formatCurrency(item.saldoDeudor) : '—'}
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium text-text-main bg-primary-50/30 dark:bg-primary-100/5">
                        {item.saldoAcreedor > 0 ? formatCurrency(item.saldoAcreedor) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-soft border-t-2 border-primary-500/40">
                  <tr>
                    <td colSpan={2} className="p-3 font-bold text-right text-text-main uppercase text-[11px] tracking-wider">
                      Sumas iguales
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-text-main border-l border-border-soft">{formatCurrency(totalDebe)}</td>
                    <td className="p-3 text-right font-bold tabular-nums text-text-main">{formatCurrency(totalHaber)}</td>
                    <td
                      className={`p-3 text-right font-bold tabular-nums border-l border-border-soft border-b-4 border-double ${
                        isBalanced ? 'border-b-primary-600 text-primary-700 dark:text-primary-300' : 'border-b-error text-error'
                      }`}
                    >
                      {formatCurrency(totalDeudor)}
                    </td>
                    <td
                      className={`p-3 text-right font-bold tabular-nums border-b-4 border-double ${
                        isBalanced ? 'border-b-primary-600 text-primary-700 dark:text-primary-300' : 'border-b-error text-error'
                      }`}
                    >
                      {formatCurrency(totalAcreedor)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
