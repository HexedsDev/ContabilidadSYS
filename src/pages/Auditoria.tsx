import { useMemo, useState } from 'react';
import { useStore, computeBalances } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Play,
  Trash2,
  ListChecks,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/toast-context';
import { formatDateTime, formatCurrency } from '../utils/helpers';

const AUDIT_RULES = [
  { title: 'Partida doble', desc: 'Debe = Haber en cada partida' },
  { title: 'Cuentas de detalle', desc: 'Movimientos solo en cuentas hoja' },
  { title: 'Saldos normales', desc: 'Sin saldos contrarios a la naturaleza' },
  { title: 'Cuentas duplicadas', desc: 'Sin repetir cuenta en una misma partida' },
  { title: 'Líneas válidas', desc: 'Cada línea debe tener monto > 0' },
  { title: 'Exclusividad debe/haber', desc: 'Una línea no puede tener ambos' },
];

export function Auditoria() {
  const entries = useStore(s => s.entries);
  const accounts = useStore(s => s.accounts);
  const alerts = useStore(s => s.alerts);
  const addAlert = useStore(s => s.addAlert);
  const resolveAlert = useStore(s => s.resolveAlert);
  const clearAlerts = useStore(s => s.clearAlerts);
  const toast = useToast();

  const [filter, setFilter] = useState<'all' | 'alta' | 'media' | 'baja'>('all');

  const activeAlerts = useMemo(
    () => alerts.filter(a => !a.resuelta && (filter === 'all' || a.severidad === filter)),
    [alerts, filter]
  );
  const resolvedAlerts = useMemo(() => alerts.filter(a => a.resuelta), [alerts]);

  const runAudit = () => {
    clearAlerts();
    const now = new Date().toISOString();
    let count = 0;
    const balances = computeBalances(entries, accounts);

    for (const entry of entries) {
      const debe = entry.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
      const haber = entry.lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);

      if (Math.abs(debe - haber) > 0.01) {
        addAlert({
          fecha: now,
          tipo: 'descuadre',
          severidad: 'alta',
          descripcion: `Partida #${entry.numero} descuadrada: ${formatCurrency(debe)} vs ${formatCurrency(haber)}`,
          sugerencia: 'Revisa los montos hasta que Debe = Haber',
          referencia_id: entry.id,
        });
        count++;
      }

      const seenCodes = new Set<string>();
      for (const line of entry.lineas) {
        if (seenCodes.has(line.cuenta_codigo)) {
          addAlert({
            fecha: now,
            tipo: 'movimiento_invalido',
            severidad: 'media',
            descripcion: `Partida #${entry.numero} repite la cuenta ${line.cuenta_codigo}`,
            sugerencia: 'Consolida las líneas con la misma cuenta',
            referencia_id: entry.id,
          });
          count++;
        }
        seenCodes.add(line.cuenta_codigo);

        if (line.debe > 0 && line.haber > 0) {
          addAlert({
            fecha: now,
            tipo: 'movimiento_invalido',
            severidad: 'alta',
            descripcion: `Partida #${entry.numero}: una línea tiene valor en Debe y Haber simultáneamente`,
            sugerencia: 'Separa el movimiento en dos líneas distintas',
            referencia_id: entry.id,
          });
          count++;
        }

        if ((line.debe || 0) === 0 && (line.haber || 0) === 0) {
          addAlert({
            fecha: now,
            tipo: 'movimiento_invalido',
            severidad: 'baja',
            descripcion: `Partida #${entry.numero} contiene una línea sin monto`,
            sugerencia: 'Elimina la línea vacía o asigna un valor',
            referencia_id: entry.id,
          });
          count++;
        }

        const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
        if (acc && acc.tipo === 'Agrupador') {
          addAlert({
            fecha: now,
            tipo: 'cuenta_agrupadora',
            severidad: 'alta',
            descripcion: `Partida #${entry.numero} usa cuenta agrupadora ${acc.codigo}`,
            sugerencia: 'Sustituye por una cuenta de detalle',
            referencia_id: entry.id,
          });
          count++;
        }
      }
    }

    // Saldos anormales (negativos para naturaleza correspondiente)
    for (const code in balances) {
      const b = balances[code];
      if (b.saldo < 0) {
        addAlert({
          fecha: now,
          tipo: 'saldo_negativo',
          severidad: 'media',
          descripcion: `La cuenta ${b.codigo} (${b.nombre}) tiene saldo ${b.naturaleza.toLowerCase()} anormal: ${formatCurrency(b.saldo)}`,
          sugerencia: 'Revisa los movimientos. Esto puede indicar un error de clasificación',
        });
        count++;
      }
    }

    if (count === 0) {
      toast.success('Auditoría OK', 'No se encontraron problemas');
    } else {
      toast.warning(`Auditoría: ${count} hallazgo${count > 1 ? 's' : ''}`, 'Revisa las alertas activas');
    }
  };

  const severityCounts = {
    alta: alerts.filter(a => !a.resuelta && a.severidad === 'alta').length,
    media: alerts.filter(a => !a.resuelta && a.severidad === 'media').length,
    baja: alerts.filter(a => !a.resuelta && a.severidad === 'baja').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Módulo de Auditoría"
        description="Detección automática de inconsistencias contables"
        icon={ShieldAlert}
        actions={
          <>
            {alerts.length > 0 && (
              <Button variant="outline" leftIcon={<Trash2 className="w-4 h-4" />} onClick={clearAlerts}>
                Limpiar alertas
              </Button>
            )}
            <Button leftIcon={<Play className="w-4 h-4" />} onClick={runAudit}>
              Ejecutar auditoría
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox
          label="Alta"
          value={severityCounts.alta}
          active={filter === 'alta'}
          onClick={() => setFilter(filter === 'alta' ? 'all' : 'alta')}
          tone="error"
        />
        <StatBox
          label="Media"
          value={severityCounts.media}
          active={filter === 'media'}
          onClick={() => setFilter(filter === 'media' ? 'all' : 'media')}
          tone="warning"
        />
        <StatBox
          label="Baja"
          value={severityCounts.baja}
          active={filter === 'baja'}
          onClick={() => setFilter(filter === 'baja' ? 'all' : 'baja')}
          tone="info"
        />
        <StatBox label="Resueltas" value={resolvedAlerts.length} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="px-5 py-3 border-b border-border-soft flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error" />
                Alertas activas ({activeAlerts.length})
              </h2>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Quitar filtro
                </button>
              )}
            </div>
            <CardContent className="p-0">
              {activeAlerts.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Sin alertas activas"
                  description="El sistema está limpio o aún no se ha ejecutado la auditoría"
                />
              ) : (
                <div className="divide-y divide-border-soft">
                  {activeAlerts.map(alert => {
                    const sevTone =
                      alert.severidad === 'alta'
                        ? 'error'
                        : alert.severidad === 'media'
                          ? 'warning'
                          : 'info';
                    return (
                      <div key={alert.id} className="p-4 hover:bg-surface-soft/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 ${
                              sevTone === 'error'
                                ? 'bg-error-soft text-error'
                                : sevTone === 'warning'
                                  ? 'bg-warning-soft text-warning'
                                  : 'bg-info-soft text-info'
                            }`}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-main">{alert.descripcion}</p>
                            <p className="text-xs text-text-muted mt-1">
                              <span className="font-medium text-text-main">Sugerencia:</span> {alert.sugerencia}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={sevTone} size="sm" dot>
                                {alert.severidad}
                              </Badge>
                              <span className="text-[10px] text-text-subtle">{formatDateTime(alert.fecha)}</span>
                            </div>
                          </div>
                          <Button size="xs" variant="outline" onClick={() => resolveAlert(alert.id)}>
                            Resolver
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {resolvedAlerts.length > 0 && (
            <Card>
              <div className="px-5 py-3 border-b border-border-soft">
                <h2 className="text-sm font-semibold text-text-muted flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Alertas resueltas ({resolvedAlerts.length})
                </h2>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-border-soft max-h-64 overflow-y-auto">
                  {resolvedAlerts.map(alert => (
                    <div key={alert.id} className="p-3 px-5 opacity-60 hover:opacity-100 transition-opacity">
                      <p className="text-sm line-through text-text-muted">{alert.descripcion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="px-5 py-3 border-b border-border-soft">
              <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary-600" />
                Reglas de auditoría
              </h2>
            </div>
            <CardContent className="space-y-3 pt-4">
              {AUDIT_RULES.map(rule => (
                <div key={rule.title} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-main">{rule.title}</p>
                    <p className="text-xs text-text-muted">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  active,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
  tone: 'error' | 'warning' | 'info' | 'success';
}) {
  const tones = {
    error: 'text-error',
    warning: 'text-warning',
    info: 'text-info',
    success: 'text-success',
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-surface border rounded-sm p-4 transition-all ${
        active
          ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md'
          : 'border-border-soft hover:border-text-subtle'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold text-text-subtle">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${tones[tone]}`}>{value}</p>
    </button>
  );
}
