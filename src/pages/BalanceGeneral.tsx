import { useMemo } from 'react';
import { useStore, computeBalances } from '../store/useStore';
import { computeBalanceGeneral, type LineItem } from '../utils/cierre';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { formatCurrency } from '../utils/helpers';
import { Printer, PieChart, CheckCircle2, AlertCircle } from 'lucide-react';

export function BalanceGeneral() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const cierreRates = useStore(s => s.cierreRates);

  const bg = useMemo(() => {
    const balances = computeBalances(entries, accounts);
    return computeBalanceGeneral(balances, cierreRates);
  }, [entries, accounts, cierreRates]);

  const hasData =
    bg.totalActivo !== 0 || bg.totalPasivo !== 0 || bg.totalPatrimonio !== 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Balance General"
        description="Situación financiera al cierre — Activo = Pasivo + Patrimonio"
        icon={PieChart}
        actions={
          <>
            {hasData && (
              <Badge variant={bg.cuadrado ? 'success' : 'error'} dot>
                {bg.cuadrado ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {bg.cuadrado ? 'Ecuación cuadrada' : `Diferencia ${formatCurrency(Math.abs(bg.diferencia))}`}
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
              icon={PieChart}
              title="Sin datos"
              description="Registra partidas y ejecuta el cierre para generar el balance general"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ===== ACTIVO ===== */}
          <Card className="overflow-hidden self-start">
            <Band title="Activo" tone="primary" />

            <SubGroup title="Corriente" />
            {bg.disponible.length > 0 && <MiniLabel text="Disponible" />}
            {bg.disponible.map(a => <Row key={a.codigo} item={a} />)}
            {bg.exigible.length > 0 && <MiniLabel text="Exigible" />}
            {bg.exigible.map(a => <Row key={a.codigo} item={a} />)}
            {bg.realizable.length > 0 && <MiniLabel text="Realizable" />}
            {bg.realizable.map(a => <Row key={a.codigo} item={a} />)}
            {bg.diferido.length > 0 && <MiniLabel text="Diferido" />}
            {bg.diferido.map(a => <Row key={a.codigo} item={a} />)}
            <TotalRow label="Total Activo Corriente" value={bg.totalCorriente} tone="info" />

            {bg.noCorriente.length > 0 && (
              <>
                <SubGroup title="No Corriente" />
                {bg.noCorriente.map(a => <Row key={a.codigo} item={a} />)}
                <TotalRow label="Total Activo No Corriente" value={bg.totalNoCorriente} tone="info" />
              </>
            )}

            <TotalRow label="SUMA TOTAL DEL ACTIVO" value={bg.totalActivo} tone="primary" highlight />
          </Card>

          {/* ===== PASIVO + PATRIMONIO ===== */}
          <Card className="overflow-hidden self-start">
            <Band title="Pasivo y Patrimonio" tone="warning" />

            <SubGroup title="Pasivo Corriente" />
            {bg.pasivoCorriente.map(a => <Row key={a.codigo} item={a} />)}
            {bg.isrPorPagar > 0 && (
              <Row item={{ codigo: '2.1.06', nombre: 'ISR por Pagar', monto: bg.isrPorPagar }} />
            )}
            <TotalRow label="Total Pasivo Corriente" value={bg.totalPasivoCorriente} tone="warning" />

            {bg.pasivoNoCorriente.length > 0 && (
              <>
                <SubGroup title="Pasivo No Corriente" />
                {bg.pasivoNoCorriente.map(a => <Row key={a.codigo} item={a} />)}
                <TotalRow label="Total Pasivo No Corriente" value={bg.totalPasivoNoCorriente} tone="warning" />
              </>
            )}
            <TotalRow label="TOTAL DEL PASIVO" value={bg.totalPasivo} tone="warning" />

            <SubGroup title="Patrimonio" />
            {bg.capital.map(a => <Row key={a.codigo} item={a} />)}
            {bg.reservaLegal !== 0 && (
              <Row item={{ codigo: '3.1.06', nombre: 'Reserva Legal', monto: bg.reservaLegal }} italic />
            )}
            {bg.gananciaEjercicio !== 0 && (
              <Row
                item={{ codigo: '3.1.09', nombre: 'Ganancia del Ejercicio', monto: bg.gananciaEjercicio }}
                italic
              />
            )}
            <TotalRow label="Total del Patrimonio" value={bg.totalPatrimonio} tone="info" />

            <TotalRow label="SUMA IGUAL AL ACTIVO" value={bg.totalPasivoPatrimonio} tone="primary" highlight />
          </Card>
        </div>
      )}
    </div>
  );
}

function Band({ title, tone }: { title: string; tone: 'primary' | 'warning' }) {
  const cls = tone === 'primary' ? 'bg-primary-700' : 'bg-warning';
  return (
    <div className={`px-5 py-3 ${cls} text-white`}>
      <h2 className="text-sm font-bold uppercase tracking-widest">{title}</h2>
    </div>
  );
}

function SubGroup({ title }: { title: string }) {
  return (
    <div className="px-5 py-2 bg-surface-soft border-y border-border-soft">
      <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{title}</p>
    </div>
  );
}

function MiniLabel({ text }: { text: string }) {
  return <p className="px-5 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-text-subtle">{text}</p>;
}

function Row({ item, italic }: { item: LineItem; italic?: boolean }) {
  const negative = item.monto < 0;
  return (
    <div className={`flex items-center justify-between px-5 py-2 hover:bg-surface-soft/40 transition-colors ${italic ? 'italic' : ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-mono text-[10px] text-text-subtle w-14 shrink-0">{item.codigo}</span>
        <span className="text-sm text-text-main truncate">
          {negative ? `(−) ${item.nombre}` : item.nombre}
        </span>
      </div>
      <span className={`text-sm font-medium tabular-nums shrink-0 ml-3 ${negative ? 'text-error' : 'text-text-main'}`}>
        {negative ? `(${formatCurrency(Math.abs(item.monto))})` : formatCurrency(item.monto)}
      </span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  tone: 'primary' | 'warning' | 'info';
  highlight?: boolean;
}) {
  const toneColors = {
    primary: 'text-primary-700 dark:text-primary-300',
    warning: 'text-warning',
    info: 'text-info',
  };
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 border-t border-border-soft ${
        highlight ? 'bg-primary-50 dark:bg-primary-100/10 border-t-2 border-primary-500/40' : 'bg-surface-soft'
      }`}
    >
      <span className={`text-xs uppercase tracking-wider font-bold ${toneColors[tone]}`}>{label}</span>
      <span className={`text-base font-bold tabular-nums ${toneColors[tone]}`}>{formatCurrency(value)}</span>
    </div>
  );
}
