import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Printer, BookOpen, Search } from 'lucide-react';

interface Mov {
  fecha: string;
  partida: number;
  concepto: string;
  debe: number;
  haber: number;
  saldoCorrido: number;
}

interface LedgerAccount {
  codigo: string;
  nombre: string;
  naturaleza: string;
  movimientos: Mov[];
  totalDebe: number;
  totalHaber: number;
  saldo: number;
}

export function LibroMayor() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const [search, setSearch] = useState('');

  const ledgerData = useMemo<LedgerAccount[]>(() => {
    const data: Record<string, LedgerAccount> = {};
    const validEntries = entries
      .filter(e => e.estado === 'contabilizada' || e.estado === 'observada')
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.numero - b.numero);

    for (const entry of validEntries) {
      for (const line of entry.lineas) {
        const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
        if (!acc) continue;
        if (!data[acc.codigo]) {
          data[acc.codigo] = {
            codigo: acc.codigo,
            nombre: acc.nombre,
            naturaleza: acc.naturaleza,
            movimientos: [],
            totalDebe: 0,
            totalHaber: 0,
            saldo: 0,
          };
        }
        const debe = line.debe || 0;
        const haber = line.haber || 0;
        data[acc.codigo].totalDebe += debe;
        data[acc.codigo].totalHaber += haber;
        const delta = acc.naturaleza === 'Deudor' ? debe - haber : haber - debe;
        const prev = data[acc.codigo].movimientos.at(-1)?.saldoCorrido ?? 0;
        data[acc.codigo].movimientos.push({
          fecha: entry.fecha,
          partida: entry.numero,
          concepto: entry.concepto,
          debe,
          haber,
          saldoCorrido: prev + delta,
        });
      }
    }

    for (const code in data) {
      const acc = data[code];
      acc.saldo = acc.movimientos.at(-1)?.saldoCorrido ?? 0;
    }

    return Object.values(data).sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
    );
  }, [entries, accounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ledgerData;
    return ledgerData.filter(
      a => a.codigo.includes(q) || a.nombre.toLowerCase().includes(q)
    );
  }, [ledgerData, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Libro Mayor"
        description="Saldos y movimientos detallados por cuenta"
        icon={BookOpen}
        actions={
          <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Imprimir
          </Button>
        }
      />

      <Input
        placeholder="Buscar cuenta por código o nombre..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={BookOpen}
              title={ledgerData.length === 0 ? 'Sin movimientos' : 'Sin resultados'}
              description={
                ledgerData.length === 0
                  ? 'Registra partidas para generar el libro mayor'
                  : 'Ajusta el término de búsqueda'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filtered.map(acc => (
            <Card key={acc.codigo} className="print:break-inside-avoid">
              <div className="bg-surface-soft px-4 py-3 border-b border-border-soft flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-primary-600 bg-primary-50 dark:bg-primary-100 dark:text-primary-300 px-2 py-1 rounded font-bold">
                    {acc.codigo}
                  </span>
                  <h3 className="text-sm font-semibold text-text-main truncate">{acc.nombre}</h3>
                </div>
                <Badge variant={acc.naturaleza === 'Deudor' ? 'info' : 'warning'} size="sm">
                  {acc.naturaleza}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-soft uppercase tracking-wider text-[10px] text-text-subtle">
                      <th className="px-3 py-2 text-left font-semibold w-24">Fecha</th>
                      <th className="px-3 py-2 text-center font-semibold w-14">Ref</th>
                      <th className="px-3 py-2 text-right font-semibold w-24">Debe</th>
                      <th className="px-3 py-2 text-right font-semibold w-24">Haber</th>
                      <th className="px-3 py-2 text-right font-semibold w-24">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acc.movimientos.map((mov, i) => (
                      <tr key={i} className="border-b border-border-soft/50 hover:bg-surface-soft/40 transition-colors">
                        <td className="px-3 py-1.5 whitespace-nowrap text-text-muted">{formatDate(mov.fecha)}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span className="font-mono text-[10px] text-primary-600 dark:text-primary-300">P-{mov.partida}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-main tabular-nums">
                          {mov.debe > 0 ? formatCurrency(mov.debe) : <span className="text-text-subtle">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-main tabular-nums">
                          {mov.haber > 0 ? formatCurrency(mov.haber) : <span className="text-text-subtle">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium text-text-main">
                          {formatCurrency(mov.saldoCorrido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface-soft border-t border-border-soft">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-right font-semibold text-text-muted uppercase text-[10px] tracking-wider">
                        Totales
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-text-main tabular-nums">{formatCurrency(acc.totalDebe)}</td>
                      <td className="px-3 py-2 text-right font-bold text-text-main tabular-nums">{formatCurrency(acc.totalHaber)}</td>
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${acc.saldo < 0 ? 'text-error' : 'text-primary-600 dark:text-primary-300'}`}>
                        {formatCurrency(acc.saldo)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
