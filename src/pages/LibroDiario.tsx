import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/helpers';
import { Printer, Edit } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function LibroDiario() {
  const { entries, accounts } = useStore();
  const navigate = useNavigate();

  const sortedEntries = [...entries]
    .filter(e => e.estado === 'contabilizada' || e.estado === 'observada')
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const getAccountName = (codigo: string) => {
    const acc = accounts.find(a => a.codigo === codigo);
    return acc ? acc.nombre : 'Cuenta Desconocida';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Libro Diario</h1>
          <p className="text-text-muted mt-1">Registro cronológico de movimientos contables.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Imprimir Libro
        </Button>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <CardTitle>Movimientos del Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {sortedEntries.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                No hay partidas contabilizadas en este periodo.
              </div>
            ) : (
              sortedEntries.map((entry) => {
                const totalDebe = entry.lineas.reduce((sum, line) => sum + (Number(line.debe) || 0), 0);
                const totalHaber = entry.lineas.reduce((sum, line) => sum + (Number(line.haber) || 0), 0);
                
                return (
                  <div key={entry.id} className="border border-border-soft rounded-lg overflow-hidden page-break-inside-avoid">
                    <div className="bg-primary-50 px-4 py-3 flex items-center justify-between border-b border-border-soft">
                      <div className="font-semibold text-primary-700">
                        Partida No. {entry.numero}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-text-muted">
                        <span>{new Date(entry.fecha).toLocaleDateString()}</span>
                        <Badge variant={entry.estado === 'observada' ? 'warning' : 'success'}>
                          {entry.estado}
                        </Badge>
                        <button 
                          onClick={() => navigate('/registrar', { state: { entryId: entry.id } })}
                          className="p-1 hover:text-primary-600 transition-colors"
                          title="Editar partida"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-soft">
                          <th className="px-4 py-2 text-left font-medium text-text-muted w-24">Código</th>
                          <th className="px-4 py-2 text-left font-medium text-text-muted">Cuenta</th>
                          <th className="px-4 py-2 text-right font-medium text-text-muted w-32">Debe</th>
                          <th className="px-4 py-2 text-right font-medium text-text-muted w-32">Haber</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lineas.map((line) => (
                          <tr key={line.id} className="border-b border-border-soft/50 last:border-0">
                            <td className="px-4 py-2 font-mono text-text-muted">{line.cuenta_codigo}</td>
                            <td className={`px-4 py-2 ${line.haber > 0 ? 'pl-10' : ''}`}>
                              {getAccountName(line.cuenta_codigo)}
                            </td>
                            <td className="px-4 py-2 text-right text-text-main">
                              {line.debe > 0 ? formatCurrency(line.debe) : ''}
                            </td>
                            <td className="px-4 py-2 text-right text-text-main">
                              {line.haber > 0 ? formatCurrency(line.haber) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-background border-t border-border-soft">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-sm italic text-text-muted border-b border-border-soft">
                            {entry.concepto}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-text-main border-b border-border-soft">
                            {formatCurrency(totalDebe)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-text-main border-b border-border-soft">
                            {formatCurrency(totalHaber)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
