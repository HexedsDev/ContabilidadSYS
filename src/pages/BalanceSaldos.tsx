import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../utils/helpers';
import { Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function BalanceSaldos() {
  const { entries, accounts } = useStore();

  const balanceData = useMemo(() => {
    const data: Record<string, { codigo: string, nombre: string, debe: number, haber: number }> = {};

    entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').forEach(entry => {
      entry.lineas.forEach(line => {
        if (!data[line.cuenta_codigo]) {
          const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
          if (!acc) return;
          data[line.cuenta_codigo] = {
            codigo: acc.codigo,
            nombre: acc.nombre,
            debe: 0,
            haber: 0,
          };
        }
        data[line.cuenta_codigo].debe += line.debe || 0;
        data[line.cuenta_codigo].haber += line.haber || 0;
      });
    });

    const items = Object.values(data).map(item => {
      const acc = accounts.find(a => a.codigo === item.codigo);
      let saldoDeudor = 0;
      let saldoAcreedor = 0;

      if (acc?.naturaleza === 'Deudor') {
        const saldo = item.debe - item.haber;
        if (saldo >= 0) saldoDeudor = saldo;
        else saldoAcreedor = Math.abs(saldo); // Saldo anormal
      } else {
        const saldo = item.haber - item.debe;
        if (saldo >= 0) saldoAcreedor = saldo;
        else saldoDeudor = Math.abs(saldo); // Saldo anormal
      }

      return {
        ...item,
        saldoDeudor,
        saldoAcreedor,
      };
    }).sort((a, b) => a.codigo.localeCompare(b.codigo));

    return items;
  }, [entries, accounts]);

  const totalDeudor = balanceData.reduce((sum, item) => sum + item.saldoDeudor, 0);
  const totalAcreedor = balanceData.reduce((sum, item) => sum + item.saldoAcreedor, 0);
  const isBalanced = Math.abs(totalDeudor - totalAcreedor) < 0.01;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Balance de Saldos</h1>
          <p className="text-text-muted mt-1">Verificación de la partida doble y saldos finales.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir Balance
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Saldos de Cuentas</CardTitle>
          {balanceData.length > 0 && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${isBalanced ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
              {isBalanced ? (
                <><CheckCircle2 className="w-4 h-4" /> Balance Cuadrado</>
              ) : (
                <><AlertCircle className="w-4 h-4" /> Diferencia: {formatCurrency(Math.abs(totalDeudor - totalAcreedor))}</>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-primary-50 text-primary-700">
                <tr>
                  <th className="p-4 font-semibold border-b border-border-soft w-32">Código</th>
                  <th className="p-4 font-semibold border-b border-border-soft">Nombre de la Cuenta</th>
                  <th className="p-4 font-semibold border-b border-border-soft text-right w-40">Deudor</th>
                  <th className="p-4 font-semibold border-b border-border-soft text-right w-40">Acreedor</th>
                </tr>
              </thead>
              <tbody>
                {balanceData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-text-muted">
                      No hay datos para generar el balance de saldos.
                    </td>
                  </tr>
                ) : (
                  balanceData.map((item) => (
                    <tr key={item.codigo} className="border-b border-border-soft last:border-0 hover:bg-background">
                      <td className="p-4 font-mono text-text-muted">{item.codigo}</td>
                      <td className="p-4">{item.nombre}</td>
                      <td className="p-4 text-right">{item.saldoDeudor > 0 ? formatCurrency(item.saldoDeudor) : '-'}</td>
                      <td className="p-4 text-right">{item.saldoAcreedor > 0 ? formatCurrency(item.saldoAcreedor) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {balanceData.length > 0 && (
                <tfoot className="bg-background">
                  <tr>
                    <td colSpan={2} className="p-4 font-bold text-right text-text-main border-t border-border-soft">SUMAS IGUALES</td>
                    <td className={`p-4 font-bold text-right border-t border-border-soft border-b-4 border-double ${isBalanced ? 'border-primary-600 text-primary-700' : 'border-error text-error'}`}>
                      {formatCurrency(totalDeudor)}
                    </td>
                    <td className={`p-4 font-bold text-right border-t border-border-soft border-b-4 border-double ${isBalanced ? 'border-primary-600 text-primary-700' : 'border-error text-error'}`}>
                      {formatCurrency(totalAcreedor)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
