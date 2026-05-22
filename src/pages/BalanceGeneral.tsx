import { useMemo } from 'react';
import { useStore, computeBalances } from '../store/useStore';
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

  const data = useMemo(() => {
    const balances = computeBalances(entries, accounts);
    const activos: { codigo: string; nombre: string; monto: number }[] = [];
    const pasivos: { codigo: string; nombre: string; monto: number }[] = [];
    const patrimonio: { codigo: string; nombre: string; monto: number }[] = [];

    let totalActivo = 0;
    let totalPasivo = 0;
    let totalPatrimonio = 0;
    let totalIngresos = 0;
    let totalCostosGastos = 0;

    for (const code in balances) {
      const b = balances[code];
      if (b.saldo === 0) continue;
      if (code.startsWith('1')) {
        activos.push({ codigo: code, nombre: b.nombre, monto: b.saldo });
        totalActivo += b.saldo;
      } else if (code.startsWith('2')) {
        pasivos.push({ codigo: code, nombre: b.nombre, monto: b.saldo });
        totalPasivo += b.saldo;
      } else if (code.startsWith('3')) {
        patrimonio.push({ codigo: code, nombre: b.nombre, monto: b.saldo });
        totalPatrimonio += b.saldo;
      } else if (code.startsWith('4')) {
        totalIngresos += b.saldo;
      } else if (code.startsWith('5') || code.startsWith('6')) {
        totalCostosGastos += b.saldo;
      }
    }
    const resultadoEjercicio = totalIngresos - totalCostosGastos;
    totalPatrimonio += resultadoEjercicio;

    const sortByCode = (arr: typeof activos) =>
      arr.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

    return {
      activos: sortByCode(activos),
      pasivos: sortByCode(pasivos),
      patrimonio: sortByCode(patrimonio),
      totalActivo,
      totalPasivo,
      totalPatrimonio,
      resultadoEjercicio,
    };
  }, [entries, accounts]);

  const totalPasivoPatrimonio = data.totalPasivo + data.totalPatrimonio;
  const diff = data.totalActivo - totalPasivoPatrimonio;
  const isBalanced = Math.abs(diff) < 0.01;
  const hasData = data.activos.length > 0 || data.pasivos.length > 0 || data.patrimonio.length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Balance General"
        description="Situación financiera al cierre del ciclo"
        icon={PieChart}
        actions={
          <>
            {hasData && (
              <Badge variant={isBalanced ? 'success' : 'error'} dot>
                {isBalanced ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isBalanced ? 'Ecuación cuadrada' : `Diferencia ${formatCurrency(Math.abs(diff))}`}
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
              description="Registra partidas para generar el balance general"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ACTIVO */}
          <Card>
            <SectionHeader title="Activo" tone="primary" />
            <div className="divide-y divide-border-soft">
              {data.activos.map(a => (
                <Row key={a.codigo} codigo={a.codigo} nombre={a.nombre} monto={a.monto} />
              ))}
            </div>
            <TotalRow label="Total Activo" value={data.totalActivo} tone="primary" highlight />
          </Card>

          {/* PASIVO + PATRIMONIO */}
          <Card>
            <SectionHeader title="Pasivo y Patrimonio" tone="warning" />

            {data.pasivos.length > 0 && (
              <>
                <SubHeader title="Pasivos" />
                <div className="divide-y divide-border-soft">
                  {data.pasivos.map(a => (
                    <Row key={a.codigo} codigo={a.codigo} nombre={a.nombre} monto={a.monto} />
                  ))}
                </div>
                <TotalRow label="Total Pasivo" value={data.totalPasivo} tone="warning" />
              </>
            )}

            <SubHeader title="Patrimonio" />
            <div className="divide-y divide-border-soft">
              {data.patrimonio.map(a => (
                <Row key={a.codigo} codigo={a.codigo} nombre={a.nombre} monto={a.monto} />
              ))}
              {data.resultadoEjercicio !== 0 && (
                <Row
                  codigo="——"
                  nombre="Resultado del ejercicio"
                  monto={data.resultadoEjercicio}
                  italic
                />
              )}
            </div>
            <TotalRow label="Total Patrimonio" value={data.totalPatrimonio} tone="info" />
            <TotalRow label="Total Pasivo + Patrimonio" value={totalPasivoPatrimonio} tone="primary" highlight />
          </Card>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, tone }: { title: string; tone: 'primary' | 'warning' }) {
  const toneClass = tone === 'primary' ? 'bg-primary-700' : 'bg-warning';
  return (
    <div className={`px-5 py-3 ${toneClass} text-white`}>
      <h2 className="text-sm font-bold uppercase tracking-widest">{title}</h2>
    </div>
  );
}

function SubHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-2 bg-surface-soft border-y border-border-soft">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">{title}</p>
    </div>
  );
}

function Row({ codigo, nombre, monto, italic }: { codigo: string; nombre: string; monto: number; italic?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-5 py-2.5 hover:bg-surface-soft/40 transition-colors ${italic ? 'italic' : ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-mono text-[10px] text-text-subtle w-14 shrink-0">{codigo}</span>
        <span className="text-sm text-text-main truncate">{nombre}</span>
      </div>
      <span className="text-sm font-medium tabular-nums text-text-main shrink-0 ml-3">{formatCurrency(monto)}</span>
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
