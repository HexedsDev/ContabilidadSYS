import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../utils/helpers';
import { Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function BalanceGeneral() {
  const { entries, accounts } = useStore();

  const { activos, pasivos, patrimonio, totalActivo, totalPasivo, totalPatrimonio, resultadoEjercicio } = useMemo(() => {
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

    let totalIngresos = 0;
    let totalCostosGastos = 0;
    Object.keys(balances).forEach(codigo => {
      if (codigo.startsWith('4')) totalIngresos += balances[codigo];
      if (codigo.startsWith('5') || codigo.startsWith('6')) totalCostosGastos += balances[codigo];
    });
    const resultadoEjercicio = totalIngresos - totalCostosGastos;

    const activosList: { nombre: string, monto: number }[] = [];
    const pasivosList: { nombre: string, monto: number }[] = [];
    const patrimonioList: { nombre: string, monto: number }[] = [];

    let totalActivo = 0;
    let totalPasivo = 0;
    let totalPatrimonio = 0;

    accounts.forEach(acc => {
      const balance = balances[acc.codigo];
      if (!balance) return;

      if (acc.codigo.startsWith('1')) {
        activosList.push({ nombre: acc.nombre, monto: balance });
        totalActivo += balance;
      } else if (acc.codigo.startsWith('2')) {
        pasivosList.push({ nombre: acc.nombre, monto: balance });
        totalPasivo += balance;
      } else if (acc.codigo.startsWith('3')) {
        patrimonioList.push({ nombre: acc.nombre, monto: balance });
        totalPatrimonio += balance;
      }
    });

    totalPatrimonio += resultadoEjercicio; // Add resultado to total

    return { 
      activos: activosList, 
      pasivos: pasivosList, 
      patrimonio: patrimonioList, 
      totalActivo, 
      totalPasivo, 
      totalPatrimonio, 
      resultadoEjercicio 
    };
  }, [entries, accounts]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Balance General</h1>
          <p className="text-text-muted mt-1">Situación financiera de la empresa.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir Balance
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">BALANCE GENERAL</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-primary-50 text-primary-700">
                <tr>
                  <th className="p-4 font-semibold border-b border-border-soft">Concepto</th>
                  <th className="p-4 font-semibold border-b border-border-soft text-right w-40">Monto</th>
                  <th className="p-4 font-semibold border-b border-border-soft text-right w-40">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Activo */}
                <tr className="bg-surface"><td colSpan={3} className="p-4 font-bold">ACTIVO</td></tr>
                {activos.map((item, i) => (
                  <tr key={'a'+i} className="border-b border-border-soft/50 hover:bg-background">
                    <td className="p-4 pl-8">{item.nombre}</td>
                    <td className="p-4 text-right text-text-muted">{formatCurrency(item.monto)}</td>
                    <td className="p-4 text-right"></td>
                  </tr>
                ))}
                <tr className="border-b-4 border-border-soft">
                  <td className="p-4 pl-8 font-bold italic">Suma del Activo</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-bold text-primary-700">{formatCurrency(totalActivo)}</td>
                </tr>

                {/* Pasivo */}
                <tr className="bg-surface"><td colSpan={3} className="p-4 font-bold">PASIVO</td></tr>
                {pasivos.map((item, i) => (
                  <tr key={'p'+i} className="border-b border-border-soft/50 hover:bg-background">
                    <td className="p-4 pl-8">{item.nombre}</td>
                    <td className="p-4 text-right text-text-muted">{formatCurrency(item.monto)}</td>
                    <td className="p-4 text-right"></td>
                  </tr>
                ))}
                <tr className="border-b-2 border-border-soft">
                  <td className="p-4 pl-8 font-semibold italic">Suma del Pasivo</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-semibold text-text-main">{formatCurrency(totalPasivo)}</td>
                </tr>
                
                {/* Patrimonio */}
                <tr className="bg-surface"><td colSpan={3} className="p-4 font-bold">PATRIMONIO</td></tr>
                {patrimonio.map((item, i) => (
                  <tr key={'pat'+i} className="border-b border-border-soft/50 hover:bg-background">
                    <td className="p-4 pl-8">{item.nombre}</td>
                    <td className="p-4 text-right text-text-muted">{formatCurrency(item.monto)}</td>
                    <td className="p-4 text-right"></td>
                  </tr>
                ))}
                <tr className="border-b border-border-soft/50 hover:bg-background">
                  <td className="p-4 pl-8">Resultado del Ejercicio</td>
                  <td className="p-4 text-right text-text-muted">{formatCurrency(resultadoEjercicio)}</td>
                  <td className="p-4 text-right"></td>
                </tr>
                <tr className="border-b-2 border-border-soft">
                  <td className="p-4 pl-8 font-semibold italic">Suma del Patrimonio</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-semibold text-text-main">{formatCurrency(totalPatrimonio)}</td>
                </tr>

                {/* Pasivo + Patrimonio */}
                <tr className="bg-primary-50 border-t border-border-soft">
                  <td colSpan={2} className="p-4 font-bold text-primary-900 text-base">SUMA PASIVO + PATRIMONIO</td>
                  <td className="p-4 text-right font-bold text-primary-900 text-base border-b-4 border-double border-primary-600">
                    {formatCurrency(totalPasivo + totalPatrimonio)}
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
