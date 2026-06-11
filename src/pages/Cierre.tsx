import { useMemo, useState } from 'react';
import { useStore, computeBalances } from '../store/useStore';
import {
  computeDepreciaciones,
  computeIncobrables,
  computeEstadoResultados,
  type DepRow,
} from '../utils/cierre';
import { generateId, formatCurrency } from '../utils/helpers';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Panel, PanelStat } from '../components/ui/Panel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/toast-context';
import type { JournalEntry, EntryLine } from '../types';
import { Calculator, TrendingDown, Receipt, FilePlus2, CheckCircle2 } from 'lucide-react';

// La marca antigua era '[ajuste-cierre]'; las nuevas llevan el tipo
// ('[ajuste-cierre:deprec]') para poder registrar cada ajuste por separado.
const ADJ_MARK_BASE = '[ajuste-cierre';
type AdjKey = 'deprec' | 'amort' | 'incobrables';
const adjMark = (k: AdjKey) => `${ADJ_MARK_BASE}:${k}]`;
type AdjEntry = Omit<JournalEntry, 'id' | 'numero' | 'creada_en' | 'actualizada_en'>;

export function Cierre() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const cierreRates = useStore(s => s.cierreRates);
  const empresa = useStore(s => s.empresa);
  const addEntry = useStore(s => s.addEntry);
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const accName = useMemo(() => {
    const m = new Map(accounts.map(a => [a.codigo, a.nombre]));
    return (c: string) => m.get(c) ?? c;
  }, [accounts]);

  const balances = useMemo(() => computeBalances(entries, accounts), [entries, accounts]);
  const dep = useMemo(() => computeDepreciaciones(balances, cierreRates), [balances, cierreRates]);
  const inc = useMemo(() => computeIncobrables(balances, cierreRates), [balances, cierreRates]);
  const er = useMemo(() => computeEstadoResultados(balances, cierreRates), [balances, cierreRates]);

  const fecha = empresa.periodo_fin || new Date().toISOString().split('T')[0];
  const hasAdjustments = dep.depreciaciones.length > 0 || dep.amortizaciones.length > 0 || inc.monto > 0;
  const pct = (r: number) => `${(r * 100).toFixed((r * 100) % 1 === 0 ? 0 : 2)}%`;

  // Qué tipos de ajuste ya están en el diario: por marca tipada o, para
  // partidas creadas con la marca genérica antigua, por su concepto.
  const postedTypes = useMemo<Record<AdjKey, boolean>>(() => {
    const marcadas = entries.filter(
      e => e.estado !== 'anulada' && (e.observaciones ?? '').includes(ADJ_MARK_BASE)
    );
    const tiene = (k: AdjKey, palabra: string) =>
      marcadas.some(
        e => (e.observaciones ?? '').includes(adjMark(k)) || e.concepto.toLowerCase().includes(palabra)
      );
    return {
      deprec: tiene('deprec', 'depreciación'),
      amort: tiene('amort', 'amortización'),
      incobrables: tiene('incobrables', 'incobrables'),
    };
  }, [entries]);

  const [selected, setSelected] = useState<Record<AdjKey, boolean>>({
    deprec: true,
    amort: true,
    incobrables: true,
  });

  const buildPartidas = (): { tipo: AdjKey; partida: AdjEntry }[] => {
    // Consolida montos por cuenta: dos activos pueden compartir la cuenta de
    // gasto o la acumulada (p.ej. Edificios e Inmuebles → 5.2.20 / 1.3.01) y
    // una partida con cuenta repetida no se puede volver a editar después.
    const acumular = (map: Map<string, number>, cuenta: string, monto: number) =>
      map.set(cuenta, (map.get(cuenta) ?? 0) + monto);
    const mkLineas = (debe: Map<string, number>, haber: Map<string, number>): EntryLine[] => [
      ...[...debe.entries()].map(([cuenta_codigo, monto]) => ({
        id: generateId(),
        cuenta_codigo,
        debe: Number(monto.toFixed(2)),
        haber: 0,
      })),
      ...[...haber.entries()].map(([cuenta_codigo, monto]) => ({
        id: generateId(),
        cuenta_codigo,
        debe: 0,
        haber: Number(monto.toFixed(2)),
      })),
    ];

    const partidas: { tipo: AdjKey; partida: AdjEntry }[] = [];

    if (dep.depreciaciones.length > 0) {
      const debe = new Map<string, number>();
      const haber = new Map<string, number>();
      dep.depreciaciones.forEach(d => {
        acumular(debe, d.cuentaGasto, d.montoAnual);
        acumular(haber, d.cuentaAcumulada, d.montoAnual);
      });
      partidas.push({
        tipo: 'deprec',
        partida: {
          fecha,
          concepto: 'Partida de ajuste — Depreciación del ejercicio',
          estado: 'contabilizada',
          observaciones: `${adjMark('deprec')} Depreciación anual según tasas legales`,
          lineas: mkLineas(debe, haber),
        },
      });
    }
    if (dep.amortizaciones.length > 0) {
      const debe = new Map<string, number>();
      const haber = new Map<string, number>();
      dep.amortizaciones.forEach(d => {
        acumular(debe, d.cuentaGasto, d.montoAnual);
        acumular(haber, d.cuentaAcumulada, d.montoAnual);
      });
      partidas.push({
        tipo: 'amort',
        partida: {
          fecha,
          concepto: 'Partida de ajuste — Amortización del ejercicio',
          estado: 'contabilizada',
          observaciones: `${adjMark('amort')} Amortización anual según tasas legales`,
          lineas: mkLineas(debe, haber),
        },
      });
    }
    if (inc.monto > 0) {
      partidas.push({
        tipo: 'incobrables',
        partida: {
          fecha,
          concepto: 'Partida de ajuste — Cuentas incobrables',
          estado: 'contabilizada',
          observaciones: `${adjMark('incobrables')} Estimación ${pct(cierreRates.incobrables)} sobre clientes`,
          lineas: [
            { id: generateId(), cuenta_codigo: inc.cuentaGasto, debe: inc.monto, haber: 0 },
            { id: generateId(), cuenta_codigo: inc.cuentaReserva, debe: 0, haber: inc.monto },
          ],
        },
      });
    }
    return partidas;
  };

  const partidas = buildPartidas();
  const pendientes = partidas.filter(p => !postedTypes[p.tipo]);
  const aRegistrar = pendientes.filter(p => selected[p.tipo]);
  const alreadyPosted = Object.values(postedTypes).some(Boolean);

  const handlePost = () => {
    aRegistrar.forEach(p => addEntry(p.partida));
    toast.success(
      'Partidas de ajuste registradas',
      `${aRegistrar.length} partida(s) contabilizadas en el diario`
    );
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Cierre Contable"
        description="Depreciaciones, amortizaciones, cuentas incobrables, ISR y reserva legal"
        icon={Calculator}
        actions={
          <>
            {alreadyPosted && (
              <Badge variant="success" dot>
                <CheckCircle2 className="w-3 h-3" /> Ajustes registrados
              </Badge>
            )}
            <Button
              leftIcon={<FilePlus2 className="w-4 h-4" />}
              onClick={() => setConfirmOpen(true)}
              disabled={aRegistrar.length === 0}
            >
              Registrar partidas de ajuste
            </Button>
          </>
        }
      />

      {/* Resultado proyectado */}
      <Panel tone={er.gananciaEjercicio >= 0 ? 'primary' : 'error'} padding="md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Resultado del ejercicio</p>
            <p className="mt-1 text-sm text-white/80">Con ISR {pct(cierreRates.isr)} y reserva {pct(cierreRates.reservaLegal)}</p>
          </div>
          <PanelStat label="Utilidad antes de ISR" value={formatCurrency(er.utilidadAntesISR)} divider />
          <PanelStat label={`ISR (${pct(cierreRates.isr)})`} value={formatCurrency(er.isr)} divider />
          <PanelStat label="Ganancia del ejercicio" value={formatCurrency(er.gananciaEjercicio)} divider />
        </div>
      </Panel>

      {!hasAdjustments && !alreadyPosted && (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={Calculator}
              title="Sin ajustes pendientes"
              description="No hay activos depreciables ni saldo de clientes para estimar. Registra activos fijos (1.2.x) o ventas al crédito para calcular el cierre."
            />
          </CardContent>
        </Card>
      )}

      {/* Depreciaciones */}
      {dep.depreciaciones.length > 0 && (
        <DepTable
          title="Depreciación de activos fijos"
          subtitle="Tasas legales de Guatemala · el terreno (30% del inmueble) no se deprecia"
          rows={dep.depreciaciones}
          total={dep.totalDepreciacion}
        />
      )}

      {/* Amortizaciones */}
      {dep.amortizaciones.length > 0 && (
        <DepTable
          title="Amortización de activos diferidos"
          subtitle="Gastos de organización, marcas y patentes"
          rows={dep.amortizaciones}
          total={dep.totalAmortizacion}
        />
      )}

      {/* Cuentas incobrables */}
      {inc.clientes > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-border-soft flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-text-main">Estimación de cuentas incobrables</h3>
          </div>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-text-muted">
                Clientes <span className="font-mono text-text-main">{formatCurrency(inc.clientes)}</span> ×{' '}
                <span className="font-semibold text-text-main">{pct(inc.tasa)}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-subtle font-semibold">Reserva a crear</p>
                <p className="text-lg font-bold tabular-nums text-text-main">{formatCurrency(inc.monto)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-subtle">
              Cargo a {inc.cuentaGasto} {accName(inc.cuentaGasto)} · abono a {inc.cuentaReserva} {accName(inc.cuentaReserva)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Partidas de ajuste a registrar */}
      {partidas.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-border-soft flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-text-main">Partidas de ajuste ({partidas.length})</h3>
            <span className="text-xs text-text-subtle ml-auto">Fecha: {fecha}</span>
          </div>
          <div className="px-5 py-2 border-b border-border-soft bg-surface-soft/60">
            <p className="text-xs text-text-muted">
              Marca qué ajustes registrar. Si tu ejercicio no pide depreciación, puedes registrar solo incobrables.
            </p>
          </div>
          <CardContent className="p-0 divide-y divide-border-soft">
            {partidas.map(({ tipo, partida: p }) => {
              const totalDebe = p.lineas.reduce((s, l) => s + l.debe, 0);
              const registrada = postedTypes[tipo];
              return (
                <div key={tipo} className={`p-4 ${registrada ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className={`flex items-center gap-2.5 min-w-0 ${registrada ? '' : 'cursor-pointer'}`}>
                      {!registrada && (
                        <input
                          type="checkbox"
                          checked={selected[tipo]}
                          onChange={e => setSelected(prev => ({ ...prev, [tipo]: e.target.checked }))}
                          className="h-4 w-4 rounded border-border-strong text-primary-600 focus:ring-primary-500"
                        />
                      )}
                      <p className="text-sm font-semibold text-text-main truncate">{p.concepto}</p>
                    </label>
                    {registrada && (
                      <Badge variant="success" size="sm" dot>
                        Registrada
                      </Badge>
                    )}
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {p.lineas.map(l => (
                        <tr key={l.id} className="border-b border-border-soft/40 last:border-0">
                          <td className="py-1.5 font-mono text-[10px] text-primary-600 dark:text-primary-300 w-16">{l.cuenta_codigo}</td>
                          <td className={`py-1.5 text-text-main ${l.haber > 0 ? 'pl-8' : ''}`}>
                            {l.haber > 0 ? `a ${accName(l.cuenta_codigo)}` : accName(l.cuenta_codigo)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums w-28 text-text-muted">{l.debe > 0 ? formatCurrency(l.debe) : ''}</td>
                          <td className="py-1.5 text-right tabular-nums w-28 text-text-muted">{l.haber > 0 ? formatCurrency(l.haber) : ''}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-text-main">
                        <td colSpan={2} className="py-1.5 text-right uppercase text-[10px] tracking-wider text-text-muted">Sumas</td>
                        <td className="py-1.5 text-right tabular-nums">{formatCurrency(totalDebe)}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatCurrency(totalDebe)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handlePost}
        title="¿Registrar partidas de ajuste?"
        message={`Se contabilizarán ${aRegistrar.length} partida(s) de ajuste con fecha ${fecha}. El ISR y la reserva legal se calculan automáticamente en el Estado de Resultados y Balance General (no requieren partida).`}
        confirmText="Sí, registrar"
        variant="primary"
      />
    </div>
  );
}

function DepTable({
  title,
  subtitle,
  rows,
  total,
}: {
  title: string;
  subtitle: string;
  rows: DepRow[];
  total: number;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary-600" />
          <h3 className="text-sm font-semibold text-text-main">{title}</h3>
        </div>
        <p className="text-xs text-text-subtle mt-0.5">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-[10px] uppercase tracking-wider text-text-subtle">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Activo</th>
              <th className="px-4 py-2 text-right font-semibold">Valor histórico</th>
              <th className="px-4 py-2 text-right font-semibold">Base depreciable</th>
              <th className="px-4 py-2 text-right font-semibold w-16">Tasa</th>
              <th className="px-4 py-2 text-right font-semibold">Depreciación anual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {rows.map(r => (
              <tr key={r.cuentaActivo}>
                <td className="px-4 py-2">
                  <span className="font-mono text-[10px] text-text-subtle mr-2">{r.cuentaActivo}</span>
                  <span className="text-text-main">{r.nombre}</span>
                  {r.noDepreciable !== undefined && r.noDepreciable > 0 && (
                    <span className="block text-[10px] text-text-subtle mt-0.5">
                      Terreno no depreciable: {formatCurrency(r.noDepreciable)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-text-muted">{formatCurrency(r.valorHistorico)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-text-main">{formatCurrency(r.baseDepreciable)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-text-muted">{(r.tasa * 100).toFixed(2)}%</td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold text-text-main">{formatCurrency(r.montoAnual)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-soft border-t border-border-soft">
            <tr>
              <td colSpan={4} className="px-4 py-2.5 text-right uppercase text-[10px] tracking-wider font-semibold text-text-muted">
                Total
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums font-bold text-text-main">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
