import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Printer } from 'lucide-react';

interface LedgerAccount {
  codigo: string;
  nombre: string;
  naturaleza: string;
  movimientos: {
    fecha: string;
    partida: number;
    concepto: string;
    debe: number;
    haber: number;
  }[];
  totalDebe: number;
  totalHaber: number;
  saldo: number;
}

export function LibroMayor() {
  const { entries, accounts } = useStore();

  const ledgerData = useMemo(() => {
    const data: Record<string, LedgerAccount> = {};

    entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').forEach(entry => {
      entry.lineas.forEach(line => {
        if (!data[line.cuenta_codigo]) {
          const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
          if (!acc) return;
          data[line.cuenta_codigo] = {
            codigo: acc.codigo,
            nombre: acc.nombre,
            naturaleza: acc.naturaleza,
            movimientos: [],
            totalDebe: 0,
            totalHaber: 0,
            saldo: 0,
          };
        }

        data[line.cuenta_codigo].movimientos.push({
          fecha: entry.fecha,
          partida: entry.numero,
          concepto: entry.concepto,
          debe: line.debe || 0,
          haber: line.haber || 0,
        });

        data[line.cuenta_codigo].totalDebe += line.debe || 0;
        data[line.cuenta_codigo].totalHaber += line.haber || 0;
      });
    });

    Object.values(data).forEach(acc => {
      if (acc.naturaleza === 'Deudor') {
        acc.saldo = acc.totalDebe - acc.totalHaber;
      } else {
        acc.saldo = acc.totalHaber - acc.totalDebe;
      }
    });

    return Object.values(data).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [entries, accounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Libro Mayor</h1>
          <p className="text-text-muted mt-1">Saldos y movimientos detallados por cuenta.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir Mayor
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {ledgerData.map(acc => (
          <Card key={acc.codigo} className="print:break-inside-avoid print:shadow-none print:border-border-soft">
            <CardHeader className="bg-primary-50 border-b border-border-soft pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-primary-700">
                  {acc.codigo} - {acc.nombre}
                </CardTitle>
                <span className="text-xs font-semibold px-2 py-1 bg-surface rounded-md text-text-muted border border-border-soft">
                  {acc.naturaleza}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-text-muted border-b border-border-soft">Fecha</th>
                    <th className="px-4 py-2 text-center font-medium text-text-muted border-b border-border-soft">Ref</th>
                    <th className="px-4 py-2 text-right font-medium text-text-muted border-b border-border-soft border-r w-28">Debe</th>
                    <th className="px-4 py-2 text-right font-medium text-text-muted border-b border-border-soft w-28">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  {acc.movimientos.map((mov, i) => (
                    <tr key={i} className="border-b border-border-soft/50 last:border-0 hover:bg-background/50">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(mov.fecha).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-center text-text-muted">P-{mov.partida}</td>
                      <td className="px-4 py-2 text-right border-r border-border-soft/50">
                        {mov.debe > 0 ? formatCurrency(mov.debe) : ''}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {mov.haber > 0 ? formatCurrency(mov.haber) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-primary-50/50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-text-main border-t border-border-soft">
                      TOTALES
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-text-main border-t border-border-soft border-r">
                      {formatCurrency(acc.totalDebe)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-text-main border-t border-border-soft">
                      {formatCurrency(acc.totalHaber)}
                    </td>
                  </tr>
                  <tr className="bg-background">
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-text-main border-t border-border-soft">
                      SALDO FINAL
                    </td>
                    <td colSpan={2} className={`px-4 py-3 text-center font-bold border-t border-border-soft ${acc.saldo < 0 ? 'text-error' : 'text-primary-600'}`}>
                      {formatCurrency(acc.saldo)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        ))}
        {ledgerData.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-muted bg-surface rounded-lg border border-border-soft">
            No hay movimientos contabilizados para generar el libro mayor.
          </div>
        )}
      </div>
    </div>
  );
}
