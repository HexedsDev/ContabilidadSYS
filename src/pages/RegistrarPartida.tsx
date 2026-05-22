import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency, generateId } from '../utils/helpers';
import { Plus, Trash2, Save, Send, AlertCircle, ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import type { EntryLine } from '../types';

export function RegistrarPartida() {
  const { accounts, addEntry, updateEntry, entries } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const editId = location.state?.entryId;
  const entryToEdit = entries.find(e => e.id === editId);

  const [fecha, setFecha] = useState(entryToEdit?.fecha || new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState(entryToEdit?.concepto || '');
  const [lineas, setLineas] = useState<Omit<EntryLine, 'id'>[]>(
    entryToEdit ? entryToEdit.lineas.map(l => ({ ...l })) : [
      { cuenta_codigo: '', debe: 0, haber: 0 },
      { cuenta_codigo: '', debe: 0, haber: 0 },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  const detalleAccounts = useMemo(() => accounts.filter(a => a.tipo === 'Detalle' || a.permite_movimientos), [accounts]);

  const totalDebe = lineas.reduce((sum, line) => sum + (Number(line.debe) || 0), 0);
  const totalHaber = lineas.reduce((sum, line) => sum + (Number(line.haber) || 0), 0);
  const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01;

  const handleAddLine = () => {
    setLineas([...lineas, { cuenta_codigo: '', debe: 0, haber: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineas.length <= 2) {
      setError('Una partida debe tener al menos dos líneas.');
      return;
    }
    setError(null);
    setLineas(lineas.filter((_, i) => i !== index));
  };

  const handleChangeLine = (index: number, field: keyof EntryLine, value: string | number) => {
    const newLines = [...lineas];
    if (field === 'debe') {
      newLines[index].debe = Number(value);
      if (Number(value) > 0) newLines[index].haber = 0;
    } else if (field === 'haber') {
      newLines[index].haber = Number(value);
      if (Number(value) > 0) newLines[index].debe = 0;
    } else {
      (newLines[index] as any)[field] = value;
    }
    setLineas(newLines);
  };

  const validate = () => {
    if (!fecha) return 'La fecha es obligatoria.';
    if (!concepto) return 'El concepto es obligatorio.';
    if (lineas.some(l => !l.cuenta_codigo)) return 'Todas las líneas deben tener una cuenta seleccionada.';
    if (!isBalanced) return 'La partida no está cuadrada (Debe ≠ Haber).';
    if (totalDebe === 0) return 'Los montos no pueden ser cero.';
    return null;
  };

  const handleSave = (estado: 'borrador' | 'contabilizada') => {
    const validationError = validate();
    if (validationError && estado === 'contabilizada') {
      setError(validationError);
      return;
    }
    if (!fecha || !concepto) {
      setError('Fecha y concepto son obligatorios para guardar.');
      return;
    }

    const linesWithIds = lineas.map(l => ({ ...l, id: generateId() }));

    if (editId) {
      updateEntry(editId, {
        fecha,
        concepto,
        estado,
        lineas: linesWithIds,
      });
      alert(`Partida modificada correctamente.`);
      navigate('/diario');
    } else {
      addEntry({
        fecha,
        concepto,
        estado,
        observaciones: '',
        lineas: linesWithIds,
      });

      // Reset
      setFecha(new Date().toISOString().split('T')[0]);
      setConcepto('');
      setLineas([
        { cuenta_codigo: '', debe: 0, haber: 0 },
        { cuenta_codigo: '', debe: 0, haber: 0 },
      ]);
      setError(null);
      alert(`Partida ${estado} correctamente.`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {editId && (
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-surface rounded-md border border-border-soft text-text-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-main">{editId ? 'Editar Partida' : 'Registrar Partida'}</h1>
            <p className="text-text-muted mt-1">{editId ? 'Modifica los datos del movimiento contable.' : 'Ingresa un nuevo movimiento contable.'}</p>
          </div>
        </div>
        <div className="text-lg font-semibold bg-surface border border-border-soft px-4 py-2 rounded-lg">
          Partida #{editId ? entryToEdit?.numero : entries.length + 1}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">Concepto</label>
              <input
                type="text"
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                placeholder="Por compra de mercadería..."
                className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="border border-border-soft rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-primary-50 text-primary-700">
                <tr>
                  <th className="p-3 font-semibold w-1/2">Cuenta</th>
                  <th className="p-3 font-semibold w-1/5 text-right">Debe</th>
                  <th className="p-3 font-semibold w-1/5 text-right">Haber</th>
                  <th className="p-3 font-semibold w-12 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((line, index) => (
                  <tr key={index} className="border-b border-border-soft last:border-0 bg-surface">
                    <td className="p-2">
                      <SearchableSelect
                        value={line.cuenta_codigo}
                        onChange={val => handleChangeLine(index, 'cuenta_codigo', val)}
                        options={detalleAccounts.map(acc => ({
                          value: acc.codigo,
                          label: `${acc.codigo} - ${acc.nombre}`
                        }))}
                        placeholder="Buscar cuenta..."
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debe || ''}
                        onChange={e => handleChangeLine(index, 'debe', e.target.value)}
                        className="w-full border border-border-soft rounded-md p-2 text-right focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        placeholder="0.00"
                        disabled={line.haber > 0}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.haber || ''}
                        onChange={e => handleChangeLine(index, 'haber', e.target.value)}
                        className="w-full border border-border-soft rounded-md p-2 text-right focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        placeholder="0.00"
                        disabled={line.debe > 0}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleRemoveLine(index)}
                        className="text-text-muted hover:text-error transition-colors p-1"
                      >
                        <Trash2 className="w-5 h-5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-background">
                <tr>
                  <td className="p-3 font-semibold text-right text-text-main">TOTALES</td>
                  <td className={`p-3 font-bold text-right ${isBalanced ? 'text-text-main' : 'text-error'}`}>
                    {formatCurrency(totalDebe)}
                  </td>
                  <td className={`p-3 font-bold text-right ${isBalanced ? 'text-text-main' : 'text-error'}`}>
                    {formatCurrency(totalHaber)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleAddLine} type="button">
              <Plus className="w-4 h-4 mr-2" /> Agregar Línea
            </Button>

            {!isBalanced && (
              <div className="flex items-center text-error text-sm font-medium">
                <AlertCircle className="w-4 h-4 mr-1" />
                Descuadre de {formatCurrency(Math.abs(totalDebe - totalHaber))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-md text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-border-soft flex justify-end gap-3">
            {!editId && (
              <Button variant="outline" onClick={() => handleSave('borrador')} type="button">
                <Save className="w-4 h-4 mr-2" /> Guardar Borrador
              </Button>
            )}
            <Button variant="primary" onClick={() => handleSave('contabilizada')} type="button">
              <Send className="w-4 h-4 mr-2" /> {editId ? 'Actualizar Partida' : 'Contabilizar Partida'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
