
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, Play } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
// generateId removed

export function Auditoria() {
  const { entries, accounts, alerts, addAlert, resolveAlert } = useStore();

  const runAudit = () => {
    const now = new Date().toISOString();
    let foundIssues = 0;

    // Check 1: Partidas descuadradas
    entries.forEach(entry => {
      const debe = entry.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
      const haber = entry.lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
      if (Math.abs(debe - haber) > 0.01) {
        addAlert({
          fecha: now,
          tipo: 'descuadre',
          severidad: 'alta',
          descripcion: `La partida #${entry.numero} tiene un descuadre. Debe: ${debe}, Haber: ${haber}`,
          sugerencia: 'Revisar y ajustar los montos de la partida para que cuadren.',
          referencia_id: entry.id,
        });
        foundIssues++;
      }

      // Check 2: Uso de cuentas agrupadoras
      entry.lineas.forEach(line => {
        const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
        if (acc && acc.tipo === 'Agrupador') {
          addAlert({
            fecha: now,
            tipo: 'cuenta_agrupadora',
            severidad: 'alta',
            descripcion: `La partida #${entry.numero} utiliza la cuenta agrupadora ${acc.codigo}.`,
            sugerencia: 'Cambiar a una cuenta de detalle (nivel más bajo).',
            referencia_id: entry.id,
          });
          foundIssues++;
        }
      });
    });

    if (foundIssues === 0) {
      alert('Auditoría completada sin encontrar problemas nuevos.');
    } else {
      alert(`Auditoría completada. Se encontraron ${foundIssues} problemas.`);
    }
  };

  const activeAlerts = alerts.filter(a => !a.resuelta);
  const resolvedAlerts = alerts.filter(a => a.resuelta);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-warning" />
            Módulo de Auditoría
          </h1>
          <p className="text-text-muted mt-1">Detección automática de inconsistencias contables.</p>
        </div>
        <Button onClick={runAudit} variant="primary">
          <Play className="w-4 h-4 mr-2" /> Ejecutar Auditoría
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-border-soft pb-4">
              <CardTitle className="text-error flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alertas Activas ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activeAlerts.length === 0 ? (
                <div className="p-8 text-center text-text-muted flex flex-col items-center">
                  <CheckCircle2 className="w-12 h-12 text-success mb-3 opacity-50" />
                  <p>El sistema se encuentra limpio de errores.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-soft">
                  {activeAlerts.map(alert => (
                    <div key={alert.id} className="p-4 hover:bg-background transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <AlertCircle className={`w-5 h-5 shrink-0 ${alert.severidad === 'alta' ? 'text-error' : alert.severidad === 'media' ? 'text-warning' : 'text-info'}`} />
                          <div>
                            <p className="text-sm font-bold text-text-main">{alert.descripcion}</p>
                            <p className="text-sm text-text-muted mt-1">Sugerencia: {alert.sugerencia}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-text-muted">{new Date(alert.fecha).toLocaleString()}</span>
                              <Badge variant={alert.severidad === 'alta' ? 'error' : 'warning'}>{alert.severidad}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => resolveAlert(alert.id)}>
                          Resolver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {resolvedAlerts.length > 0 && (
            <Card>
              <CardHeader className="border-b border-border-soft pb-4">
                <CardTitle className="text-text-muted flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Alertas Resueltas ({resolvedAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border-soft max-h-64 overflow-y-auto">
                  {resolvedAlerts.map(alert => (
                    <div key={alert.id} className="p-4 opacity-70">
                      <p className="text-sm line-through text-text-muted">{alert.descripcion}</p>
                      <span className="text-xs text-text-muted">Resuelta</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Auditoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-sm text-text-main">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span><strong>Partida doble:</strong> El total del Debe debe ser exactamente igual al total del Haber en cada partida.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span><strong>Cuentas de detalle:</strong> Solo se pueden registrar movimientos en cuentas de último nivel (Detalle).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span><strong>Saldos normales:</strong> Las cuentas no deben tener un saldo contrario a su naturaleza (ej. Caja negativa).</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
