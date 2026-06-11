import { useState, useMemo } from 'react';
import { useStore, filterByDateRange } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DateRangeFilter } from '../components/ui/DateRangeFilter';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Printer, Edit, BookText, Search, Filter, Trash2, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/toast-context';
import type { EntryStatus, DateRange } from '../types';

const STATUS_OPTIONS: { value: 'all' | EntryStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'contabilizada', label: 'Contabilizadas' },
  { value: 'observada', label: 'Observadas' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'anulada', label: 'Anuladas' },
];

export function LibroDiario() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const deleteEntry = useStore(s => s.deleteEntry);
  const voidEntry = useStore(s => s.voidEntry);
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | EntryStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);

  const accountName = useMemo(() => {
    const map = new Map(accounts.map(a => [a.codigo, a.nombre]));
    return (code: string) => map.get(code) ?? 'Cuenta desconocida';
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return filterByDateRange(entries, dateRange.from, dateRange.to)
      .filter(e => (filter === 'all' ? true : e.estado === filter))
      .filter(e => {
        if (!q) return true;
        return (
          e.concepto.toLowerCase().includes(q) ||
          String(e.numero).includes(q) ||
          e.lineas.some(l => l.cuenta_codigo.includes(q))
        );
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [entries, search, filter, dateRange]);

  const handleDelete = () => {
    if (deleteId) {
      deleteEntry(deleteId);
      toast.success('Partida eliminada');
      setDeleteId(null);
    }
  };

  const handleVoid = () => {
    if (voidId) {
      voidEntry(voidId);
      toast.success('Partida anulada', 'La partida queda en el libro como anulada (trazabilidad)');
      setVoidId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Libro Diario"
        description="Registro cronológico de movimientos contables"
        icon={BookText}
        actions={
          <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            Imprimir
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Buscar por número, concepto o cuenta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="flex-1"
              />
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 h-9 text-xs font-medium rounded-sm border transition-colors ring-focus ${
                    filter === opt.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-surface border-border-strong text-text-muted hover:text-text-main hover:border-text-subtle'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            entries.length === 0 ? (
              <EmptyState
                icon={BookText}
                title="No hay partidas registradas"
                description="Empieza creando una partida nueva o carga los datos de demo"
                action={<Button onClick={() => navigate('/app/registrar')}>Nueva partida</Button>}
              />
            ) : (
              <EmptyState
                icon={Filter}
                title="Sin resultados"
                description="Ajusta los filtros o el término de búsqueda"
              />
            )
          ) : (
            <div className="space-y-4">
              {filtered.map(entry => {
                const totalDebe = entry.lineas.reduce((s, l) => s + (l.debe || 0), 0);
                const totalHaber = entry.lineas.reduce((s, l) => s + (l.haber || 0), 0);
                const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01;

                return (
                  <div
                    key={entry.id}
                    className="border border-border-soft rounded-sm overflow-hidden bg-surface page-break-inside-avoid"
                  >
                    <div className="bg-surface-soft px-4 py-2.5 flex items-center justify-between border-b border-border-soft flex-wrap gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-semibold text-text-muted shrink-0">
                          N.º {entry.numero}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-main text-sm truncate">{entry.concepto}</p>
                          <p className="text-xs text-text-muted">{formatDate(entry.fecha)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 no-print">
                        <Badge
                          variant={
                            entry.estado === 'contabilizada'
                              ? 'success'
                              : entry.estado === 'observada'
                                ? 'warning'
                                : entry.estado === 'anulada'
                                  ? 'error'
                                  : 'default'
                          }
                          dot
                          size="sm"
                        >
                          {entry.estado}
                        </Badge>
                        {!isBalanced && (
                          <Badge variant="error" size="sm" dot>
                            Descuadre
                          </Badge>
                        )}
                        <button
                          onClick={() => navigate('/app/registrar', { state: { entryId: entry.id } })}
                          className="p-1.5 hover:bg-surface text-text-muted hover:text-primary-600 rounded-sm transition-colors ring-focus"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {entry.estado === 'contabilizada' && (
                          <button
                            onClick={() => setVoidId(entry.id)}
                            className="p-1.5 hover:bg-warning-soft text-text-muted hover:text-warning rounded-sm transition-colors ring-focus"
                            title="Anular (mantiene trazabilidad)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(entry.id)}
                          className="p-1.5 hover:bg-error-soft text-text-muted hover:text-error rounded-sm transition-colors ring-focus"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-soft text-[10px] uppercase tracking-wider text-text-subtle">
                            <th className="px-4 py-2 text-left font-semibold w-24">Código</th>
                            <th className="px-4 py-2 text-left font-semibold">Cuenta</th>
                            <th className="px-4 py-2 text-right font-semibold w-36">Debe</th>
                            <th className="px-4 py-2 text-right font-semibold w-36">Haber</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lineas.map(line => (
                            <tr key={line.id} className="border-b border-border-soft/50 last:border-0">
                              <td className="px-4 py-1.5 font-mono text-xs text-text-muted">{line.cuenta_codigo}</td>
                              <td className={`px-4 py-1.5 text-text-main ${line.haber > 0 ? 'pl-10' : ''}`}>
                                {accountName(line.cuenta_codigo)}
                              </td>
                              <td className="px-4 py-1.5 text-right text-text-main tabular-nums">
                                {line.debe > 0 ? formatCurrency(line.debe) : <span className="text-text-subtle">—</span>}
                              </td>
                              <td className="px-4 py-1.5 text-right text-text-main tabular-nums">
                                {line.haber > 0 ? formatCurrency(line.haber) : <span className="text-text-subtle">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-surface-soft border-t border-border-soft">
                          <tr>
                            <td colSpan={2} className="px-4 py-2.5 text-xs italic text-text-muted">
                              {entry.observaciones || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-text-main tabular-nums">{formatCurrency(totalDebe)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-text-main tabular-nums">{formatCurrency(totalHaber)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="¿Eliminar partida?"
        message="Esta acción no se puede deshacer. La partida y sus líneas serán eliminadas permanentemente."
        confirmText="Eliminar partida"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={voidId !== null}
        onClose={() => setVoidId(null)}
        onConfirm={handleVoid}
        title="¿Anular partida?"
        message="La partida quedará registrada como anulada (estado 'anulada'). No afectará el balance pero conservará la trazabilidad. Recomendado vs eliminar."
        confirmText="Sí, anular"
        variant="primary"
      />
    </div>
  );
}
