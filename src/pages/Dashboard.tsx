import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, computeBalances } from '../store/useStore';
import { formatCurrency, formatRelative, formatNumber } from '../utils/helpers';
import { computeRatios } from '../utils/financial';
import { computeEstadoResultados, computeBalanceGeneral } from '../utils/cierre';
import {
  Activity,
  AlertTriangle,
  BookCheck,
  BookX,
  TrendingUp,
  Wallet,
  Scale,
  Database,
  ArrowRight,
  Building2,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/toast-context';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel, PanelStat } from '../components/ui/Panel';

export function Dashboard() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const alerts = useStore(s => s.alerts);
  const cierreRates = useStore(s => s.cierreRates);
  const initializeStore = useStore(s => s.initializeStore);
  const loadFakeData = useStore(s => s.loadFakeData);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const balances = useMemo(() => computeBalances(entries, accounts), [entries, accounts]);
  const ratios = useMemo(() => computeRatios(balances, cierreRates), [balances, cierreRates]);
  const er = useMemo(() => computeEstadoResultados(balances, cierreRates), [balances, cierreRates]);
  const bg = useMemo(() => computeBalanceGeneral(balances, cierreRates), [balances, cierreRates]);

  const totals = useMemo(() => {
    const totalCapital = bg.capital.reduce((s, c) => s + c.monto, 0);
    return {
      totalActivo: bg.totalActivo,
      totalPasivo: bg.totalPasivo,
      totalCapital,
      patrimonioTotal: bg.totalPatrimonio,
      totalIngresos: er.ventasNetas + er.totalOtrosIngresos,
      totalCostos: er.comprasNetas,
      totalGastos: er.totalGastosOperacion + er.totalGastosNoOperativos,
      utilidad: er.gananciaEjercicio,
      difEcuacion: bg.diferencia,
    };
  }, [bg, er]);

  const stats = {
    total: entries.length,
    posted: entries.filter(e => e.estado === 'contabilizada').length,
    observed: entries.filter(e => e.estado === 'observada').length,
    activeAlerts: alerts.filter(a => !a.resuelta).length,
  };

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.creada_en).getTime() - new Date(a.creada_en).getTime()).slice(0, 6),
    [entries]
  );

  const handleLoadDemo = () => {
    if (entries.length > 0) {
      toast.warning('Ya hay datos', 'Borra los datos actuales primero');
      return;
    }
    loadFakeData();
    toast.success('Datos de demo cargados');
  };

  const ecuacionOK = bg.cuadrado;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Financiero"
        description="Resumen ejecutivo del estado contable, partidas y auditoría"
        actions={
          <>
            {entries.length === 0 && (
              <Button variant="subtle" leftIcon={<Database className="w-4 h-4" />} onClick={handleLoadDemo}>
                Cargar demo
              </Button>
            )}
            <Button leftIcon={<BookCheck className="w-4 h-4" />} onClick={() => navigate('/app/registrar')}>
              Nueva partida
            </Button>
          </>
        }
      />

      {/* Hero ecuación contable — Solid Panel */}
      <Panel tone="primary" padding="lg">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Ecuación Contable</p>
            <p className="mt-1 text-sm text-white/80">A = P + C</p>
            <div className="mt-4">
              <Badge
                variant={ecuacionOK ? 'success' : 'error'}
                dot
                className="bg-white/15 text-white ring-white/20"
              >
                {ecuacionOK ? 'Balance cuadrado' : `Descuadre: ${formatCurrency(totals.difEcuacion)}`}
              </Badge>
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            <PanelStat label="Activo" value={formatCurrency(totals.totalActivo)} />
            <PanelStat label="Pasivo" value={formatCurrency(totals.totalPasivo)} divider />
            <PanelStat label="Patrimonio" value={formatCurrency(totals.patrimonioTotal)} divider />
          </div>
        </div>
      </Panel>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Partidas" value={formatNumber(stats.total).replace(/[,.]00$/, '')} icon={Activity} tone="info" />
        <StatCard label="Contabilizadas" value={stats.posted} icon={BookCheck} tone="success" />
        <StatCard label="Observadas" value={stats.observed} icon={BookX} tone="warning" />
        <StatCard label="Alertas activas" value={stats.activeAlerts} icon={AlertTriangle} tone={stats.activeAlerts > 0 ? 'error' : 'neutral'} />
      </div>

      {/* Razones financieras */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Razones financieras</CardTitle>
              <CardDescription>Indicadores clave de liquidez, solvencia y rentabilidad</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <Ratio label="Liquidez corriente" value={ratios.liquidezCorriente.toFixed(2)} hint="AC / PC" good={ratios.liquidezCorriente >= 1.5} />
              <Ratio label="Prueba ácida" value={ratios.pruebaAcida.toFixed(2)} hint="(AC − Inv) / PC" good={ratios.pruebaAcida >= 1} />
              <Ratio label="Endeudamiento" value={`${ratios.endeudamiento.toFixed(1)}%`} hint="Pasivo / Activo" good={ratios.endeudamiento <= 60} />
              <Ratio label="Autonomía" value={`${ratios.autonomia.toFixed(1)}%`} hint="Patrimonio / Activo" good={ratios.autonomia >= 40} />
              <Ratio label="Margen bruto" value={`${ratios.margenBruto.toFixed(1)}%`} hint="UB / Ingresos" good={ratios.margenBruto > 0} />
              <Ratio label="Margen neto" value={`${ratios.margenNeto.toFixed(1)}%`} hint="UN / Ingresos" good={ratios.margenNeto > 0} />
              <Ratio label="ROA" value={`${ratios.roa.toFixed(1)}%`} hint="UN / Activo" good={ratios.roa > 0} />
              <Ratio label="ROE" value={`${ratios.roe.toFixed(1)}%`} hint="UN / Patrimonio" good={ratios.roe > 0} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent entries */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Partidas recientes</CardTitle>
              <CardDescription>Últimos asientos registrados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => navigate('/app/diario')}>
              Ver libro diario
            </Button>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <EmptyState
                icon={BookCheck}
                title="No hay partidas registradas"
                description="Empieza creando una partida o carga datos de prueba"
                action={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" leftIcon={<Database className="w-4 h-4" />} onClick={handleLoadDemo}>
                      Cargar demo
                    </Button>
                    <Button size="sm" onClick={() => navigate('/app/registrar')}>
                      Nueva partida
                    </Button>
                  </div>
                }
              />
            ) : (
              <ul className="divide-y divide-border-soft -mx-2">
                {recentEntries.map(entry => {
                  const total = entry.lineas.reduce((s, l) => s + (l.debe || 0), 0);
                  return (
                    <li key={entry.id}>
                      <button
                        onClick={() => navigate('/app/registrar', { state: { entryId: entry.id } })}
                        className="w-full text-left grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 px-2 py-3 rounded-sm hover:bg-surface-soft transition-colors"
                      >
                        <div className="w-10 h-10 rounded-sm bg-primary-50 text-primary-600 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          #{entry.numero}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-main text-sm truncate">{entry.concepto}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatRelative(entry.creada_en)} · {entry.lineas.length} líneas
                          </p>
                        </div>
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
                          size="sm"
                          className="hidden sm:inline-flex w-[100px] justify-center"
                        >
                          {entry.estado}
                        </Badge>
                        <p className="text-sm font-semibold tabular-nums text-right w-[110px] shrink-0">{formatCurrency(total)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Financial summary */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Resumen financiero</CardTitle>
              <CardDescription>Saldos consolidados del ciclo</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow icon={Wallet} label="Activos" value={totals.totalActivo} tone="primary" />
            <SummaryRow icon={CreditCard} label="Pasivos" value={totals.totalPasivo} tone="warning" />
            <SummaryRow icon={Building2} label="Capital" value={totals.totalCapital} tone="info" />
            <div className="h-px bg-border-soft my-2" />
            <SummaryRow icon={BarChart3} label="Ingresos" value={totals.totalIngresos} tone="success" />
            <SummaryRow icon={Scale} label="Costos + Gastos" value={totals.totalCostos + totals.totalGastos} tone="error" />
            <Panel tone={totals.utilidad >= 0 ? 'success' : 'error'} padding="sm" className="mt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Utilidad del ejercicio</span>
                </div>
                <span className="text-lg font-bold tabular-nums">{formatCurrency(totals.utilidad)}</span>
              </div>
            </Panel>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Ratio({ label, value, hint, good }: { label: string; value: string; hint: string; good: boolean }) {
  return (
    <div className="border-l-2 border-border-soft pl-3">
      <p className="text-[11px] uppercase tracking-wide font-semibold text-text-subtle">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1 ${good ? 'text-success' : 'text-error'}`}>{value}</p>
      <p className="text-[10px] text-text-muted mt-0.5">{hint}</p>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: 'primary' | 'success' | 'warning' | 'error' | 'info';
}) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    error: 'bg-error-soft text-error',
    info: 'bg-info-soft text-info',
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${colors[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
      <span className="text-sm font-semibold text-text-main tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}
