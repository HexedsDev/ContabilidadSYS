import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../utils/helpers';
import { Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function EstadoResultados() {
  const { entries, accounts } = useStore();

  const { totalIngresos, totalCostos, totalGastos, ingresos, costos, gastos } = useMemo(() => {
    const balances: Record<string, number> = {};
    entries.filter(e => e.estado === 'contabilizada' || e.estado === 'observada').forEach(entry => {
      entry.lineas.forEach(line => {
        const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
        if (!acc) return;
        if (!balances[acc.codigo]) balances[acc.codigo] = 0;
        
        if (acc.naturaleza === 'Deudor') {
          balances[acc.codigo] += (line.debe - line.haber);
        } else {
          balances[acc.codigo] += (line.haber - line.debe);
        }
      });
    });

    const ingresosList: { nombre: string, monto: number }[] = [];
    const costosList: { nombre: string, monto: number }[] = [];
    const gastosList: { nombre: string, monto: number }[] = [];

    let totalIngresos = 0;
    let totalCostos = 0;
    let totalGastos = 0;

    accounts.forEach(acc => {
      const balance = balances[acc.codigo];
      if (!balance) return;

      if (acc.codigo.startsWith('4')) {
        ingresosList.push({ nombre: acc.nombre, monto: balance });
        totalIngresos += balance;
      } else if (acc.codigo.startsWith('5.1')) {
        costosList.push({ nombre: acc.nombre, monto: balance });
        totalCostos += balance;
      } else if (acc.codigo.startsWith('5.2') || acc.codigo.startsWith('6')) {
        gastosList.push({ nombre: acc.nombre, monto: balance });
        totalGastos += balance;
      }
    });

    return { totalIngresos, totalCostos, totalGastos, ingresos: ingresosList, costos: costosList, gastos: gastosList };
  }, [entries, accounts]);

  const utilidadBruta = totalIngresos - totalCostos;
  const utilidadNeta = utilidadBruta - totalGastos;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Estado de Resultados</h1>
          <p className="text-text-muted mt-1">Ingresos, costos y gastos del periodo.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir Estado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">ESTADO DE RESULTADOS</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-primary-50 text-primary-700">
                <tr>
                  <th className="p-4 font-semibold border-b border-border-soft">Concepto</th>
                  <th className="p-4 font-semibold border-b border-border-soft text-right w-40">Parcial</th>
                  <th className="p-4 font-semibold border-b border-border-soft text-right w-40">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Ingresos */}
                <tr className="bg-surface"><td colSpan={3} className="p-4 font-bold">INGRESOS</td></tr>
                {ingresos.map((item, i) => (
                  <tr key={'i'+i} className="border-b border-border-soft/50 hover:bg-background">
                    <td className="p-4 pl-8">{item.nombre}</td>
                    <td className="p-4 text-right text-text-muted">{formatCurrency(item.monto)}</td>
                    <td className="p-4 text-right"></td>
                  </tr>
                ))}
                <tr className="border-b-2 border-border-soft">
                  <td className="p-4 pl-8 font-semibold italic">Total Ingresos</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-bold text-text-main">{formatCurrency(totalIngresos)}</td>
                </tr>

                {/* Costos */}
                <tr className="bg-surface"><td colSpan={3} className="p-4 font-bold">COSTOS</td></tr>
                {costos.map((item, i) => (
                  <tr key={'c'+i} className="border-b border-border-soft/50 hover:bg-background">
                    <td className="p-4 pl-8">{item.nombre}</td>
                    <td className="p-4 text-right text-text-muted">{formatCurrency(item.monto)}</td>
                    <td className="p-4 text-right"></td>
                  </tr>
                ))}
                <tr className="border-b border-border-soft">
                  <td className="p-4 pl-8 font-semibold italic">Total Costos</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-semibold text-text-main">{formatCurrency(totalCostos)}</td>
                </tr>
                
                {/* Utilidad Bruta */}
                <tr className="border-b-2 border-primary-100 bg-primary-50/30">
                  <td colSpan={2} className="p-4 font-bold text-primary-800">UTILIDAD BRUTA</td>
                  <td className="p-4 text-right font-bold text-primary-800">{formatCurrency(utilidadBruta)}</td>
                </tr>

                {/* Gastos */}
                <tr className="bg-surface"><td colSpan={3} className="p-4 font-bold">GASTOS</td></tr>
                {gastos.map((item, i) => (
                  <tr key={'g'+i} className="border-b border-border-soft/50 hover:bg-background">
                    <td className="p-4 pl-8">{item.nombre}</td>
                    <td className="p-4 text-right text-text-muted">{formatCurrency(item.monto)}</td>
                    <td className="p-4 text-right"></td>
                  </tr>
                ))}
                <tr className="border-b border-border-soft">
                  <td className="p-4 pl-8 font-semibold italic">Total Gastos</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-semibold text-text-main">{formatCurrency(totalGastos)}</td>
                </tr>

                {/* Utilidad Neta */}
                <tr className="bg-primary-50">
                  <td colSpan={2} className="p-4 font-bold text-primary-900 text-base">UTILIDAD O PÉRDIDA DEL EJERCICIO</td>
                  <td className="p-4 text-right font-bold text-primary-900 text-base border-b-4 border-double border-primary-600">
                    {formatCurrency(utilidadNeta)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
