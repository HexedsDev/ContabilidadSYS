import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Activity, AlertTriangle, BookCheck, BookX, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '../components/ui/Badge';

export function Dashboard() {
  const { entries, accounts, alerts, initializeStore, loadFakeData } = useStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const totalEntries = entries.length;
  const postedEntries = entries.filter(e => e.estado === 'contabilizada').length;
  const observedEntries = entries.filter(e => e.estado === 'observada').length;
  const activeAlerts = alerts.filter(a => !a.resuelta).length;

  // Calculate quick summary (very basic logic for the dashboard)
  let totalActivos = 0;
  let totalPasivos = 0;

  // We could calculate actual balances, but for now we'll do a quick pass
  // In a real app we'd have a selector for this
  const accountBalances: Record<string, number> = {};
  
  entries.filter(e => e.estado === 'contabilizada').forEach(entry => {
    entry.lineas.forEach(line => {
      if (!accountBalances[line.cuenta_codigo]) {
        accountBalances[line.cuenta_codigo] = 0;
      }
      accountBalances[line.cuenta_codigo] += (line.debe - line.haber);
    });
  });

  accounts.forEach(acc => {
    if (acc.tipo === 'Activo' || acc.codigo.startsWith('1')) {
      totalActivos += accountBalances[acc.codigo] || 0;
    }
    if (acc.tipo === 'Pasivo' || acc.codigo.startsWith('2')) {
      // Pasivos are usually negative in this simple debe-haber sum (haber > debe)
      totalPasivos += Math.abs(accountBalances[acc.codigo] || 0);
    }
  });

  const recentEntries = [...entries].sort((a, b) => new Date(b.creada_en).getTime() - new Date(a.creada_en).getTime()).slice(0, 5);

  const stats = [
    { title: 'Total Partidas', value: totalEntries, icon: Activity, color: 'text-info' },
    { title: 'Contabilizadas', value: postedEntries, icon: BookCheck, color: 'text-success' },
    { title: 'Observadas', value: observedEntries, icon: BookX, color: 'text-warning' },
    { title: 'Alertas Activas', value: activeAlerts, icon: AlertTriangle, color: 'text-error' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dashboard Financiero</h1>
          <p className="text-text-muted mt-1">Resumen del estado contable y auditoría general.</p>
        </div>
        <button 
          onClick={() => {
            if(window.confirm('¿Reemplazar datos actuales por datos de prueba?')) {
              loadFakeData();
            }
          }}
          className="px-4 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          Cargar Datos de Prueba
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-full bg-surface border border-border-soft shadow-sm ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted">{stat.title}</p>
                  <p className="text-2xl font-bold text-text-main">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Partidas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No hay partidas registradas aún.
              </div>
            ) : (
              <div className="space-y-4">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg border border-border-soft hover:bg-primary-50/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-main">Partida #{entry.numero}</span>
                        <Badge variant={entry.estado === 'contabilizada' ? 'success' : entry.estado === 'observada' ? 'warning' : 'default'}>
                          {entry.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-muted mt-1">{entry.concepto}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{new Date(entry.fecha).toLocaleDateString()}</p>
                      <p className="text-sm text-text-muted">
                        {entry.lineas.length} líneas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-muted flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Activos Totales
                </span>
              </div>
              <p className="text-2xl font-bold text-text-main">{formatCurrency(totalActivos)}</p>
            </div>
            
            <div className="pt-4 border-t border-border-soft">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-muted flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-error" /> Pasivos Totales
                </span>
              </div>
              <p className="text-2xl font-bold text-text-main">{formatCurrency(totalPasivos)}</p>
            </div>

            <div className="pt-4 border-t border-border-soft">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-muted flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" /> Patrimonio
                </span>
              </div>
              <p className="text-2xl font-bold text-text-main">{formatCurrency(totalActivos - totalPasivos)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
