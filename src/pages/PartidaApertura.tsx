import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency, generateId } from '../utils/helpers';
import { Plus, Trash2, Send, AlertCircle, Calculator } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import type { EntryLine } from '../types';

export function PartidaApertura() {
  const { accounts, addEntry, entries } = useStore();
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState('Partida de Apertura - Ciclo Contable 2026');
  
  // Separation of lines for easier UI
  const [activos, setActivos] = useState<Omit<EntryLine, 'id'>[]>([
    { cuenta_codigo: '1.1.01', debe: 0, haber: 0 }, // Caja por defecto
  ]);
  
  const [pasivos, setPasivos] = useState<Omit<EntryLine, 'id'>[]>([
    { cuenta_codigo: '', debe: 0, haber: 0 },
  ]);

  const [capitalCuenta, setCapitalCuenta] = useState('3.1.01'); // Capital
  const [error, setError] = useState<string | null>(null);

  const assetAccounts = useMemo(() => accounts.filter(a => a.codigo.startsWith('1') && (a.tipo === 'Detalle' || a.permite_movimientos)), [accounts]);
  const liabilityAccounts = useMemo(() => accounts.filter(a => a.codigo.startsWith('2') && (a.tipo === 'Detalle' || a.permite_movimientos)), [accounts]);
  const equityAccounts = useMemo(() => accounts.filter(a => a.codigo.startsWith('3') && (a.tipo === 'Detalle' || a.permite_movimientos)), [accounts]);

  const totalActivos = activos.reduce((sum, line) => sum + (Number(line.debe) || 0), 0);
  const totalPasivos = pasivos.reduce((sum, line) => sum + (Number(line.haber) || 0), 0);
  const capitalCalculado = totalActivos - totalPasivos;

  const handleAddActivo = () => setActivos([...activos, { cuenta_codigo: '', debe: 0, haber: 0 }]);
  const handleAddPasivo = () => setPasivos([...pasivos, { cuenta_codigo: '', debe: 0, haber: 0 }]);

  const handleRemoveActivo = (index: number) => setActivos(activos.filter((_, i) => i !== index));
  const handleRemovePasivo = (index: number) => setPasivos(pasivos.filter((_, i) => i !== index));

  const handleChangeLine = (type: 'activo' | 'pasivo', index: number, field: keyof EntryLine, value: string | number) => {
    if (type === 'activo') {
      const newLines = [...activos];
      (newLines[index] as any)[field] = field === 'cuenta_codigo' ? value : Number(value);
      setActivos(newLines);
    } else {
      const newLines = [...pasivos];
      (newLines[index] as any)[field] = field === 'cuenta_codigo' ? value : Number(value);
      setPasivos(newLines);
    }
  };

  const handleSave = () => {
    if (!fecha || !concepto) {
      setError('Fecha y concepto son obligatorios.');
      return;
    }

    if (activos.some(a => !a.cuenta_codigo || a.debe <= 0)) {
      setError('Todos los activos deben tener cuenta y monto mayor a cero.');
      return;
    }

    if (capitalCalculado <= 0) {
      setError('El capital calculado debe ser mayor a cero. Verifique sus activos y pasivos.');
      return;
    }

    const lineasFinales: EntryLine[] = [
      ...activos.map(a => ({ ...a, id: generateId(), haber: 0 })),
      ...pasivos.filter(p => p.cuenta_codigo && p.haber > 0).map(p => ({ ...p, id: generateId(), debe: 0 })),
      { 
        id: generateId(), 
        cuenta_codigo: capitalCuenta, 
        debe: 0, 
        haber: capitalCalculado,
        concepto_linea: 'Para registrar el capital inicial'
      }
    ];

    addEntry({
      fecha,
      concepto,
      estado: 'contabilizada',
      observaciones: 'Generado automáticamente desde el asistente de apertura.',
      lineas: lineasFinales,
    });

    alert('Partida de apertura contabilizada correctamente.');
    navigate('/diario');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Calculator className="w-8 h-8 text-primary-600" />
            Asistente de Partida de Apertura
          </h1>
          <p className="text-text-muted mt-1">Ingresa tus activos y pasivos iniciales para calcular el capital automáticamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data Entry */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-visible">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-muted uppercase">Concepto Global</label>
                  <input
                    type="text"
                    value={concepto}
                    onChange={e => setConcepto(e.target.value)}
                    className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Activos Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border-soft pb-2">
                  <h3 className="font-bold text-emerald-700">ACTIVOS (DEBE)</h3>
                  <Button variant="outline" size="sm" onClick={handleAddActivo}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar Activo
                  </Button>
                </div>
                {activos.map((line, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <SearchableSelect
                      value={line.cuenta_codigo}
                      onChange={val => handleChangeLine('activo', index, 'cuenta_codigo', val)}
                      options={assetAccounts.map(acc => ({
                        value: acc.codigo,
                        label: `${acc.codigo} - ${acc.nombre}`
                      }))}
                      className="flex-1"
                      placeholder="Seleccione cuenta..."
                    />
                    <input
                      type="number"
                      value={line.debe || ''}
                      placeholder="0.00"
                      onChange={e => handleChangeLine('activo', index, 'debe', e.target.value)}
                      className="w-32 border border-border-soft rounded-md p-2 text-right text-sm focus:outline-none"
                    />
                    <button onClick={() => handleRemoveActivo(index)} className="text-text-muted hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pasivos Section */}
              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between border-b border-border-soft pb-2">
                  <h3 className="font-bold text-amber-700">PASIVOS (HABER)</h3>
                  <Button variant="outline" size="sm" onClick={handleAddPasivo}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar Pasivo
                  </Button>
                </div>
                {pasivos.map((line, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <SearchableSelect
                      value={line.cuenta_codigo}
                      onChange={val => handleChangeLine('pasivo', index, 'cuenta_codigo', val)}
                      options={liabilityAccounts.map(acc => ({
                        value: acc.codigo,
                        label: `${acc.codigo} - ${acc.nombre}`
                      }))}
                      className="flex-1"
                      placeholder="Seleccione cuenta..."
                    />
                    <input
                      type="number"
                      value={line.haber || ''}
                      placeholder="0.00"
                      onChange={e => handleChangeLine('pasivo', index, 'haber', e.target.value)}
                      className="w-32 border border-border-soft rounded-md p-2 text-right text-sm focus:outline-none"
                    />
                    <button onClick={() => handleRemovePasivo(index)} className="text-text-muted hover:text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results & Action */}
        <div className="space-y-6">
          <Card className="bg-primary-50 border-primary-200 overflow-visible">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-primary-800 border-b border-primary-200 pb-2">Resumen de Ecuación Pat.</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted">Total Activos:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(totalActivos)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted">Total Pasivos:</span>
                <span className="font-bold text-amber-700">{formatCurrency(totalPasivos)}</span>
              </div>

              <div className="pt-4 border-t border-primary-200">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-primary-700 uppercase">Capital a Registrar (Diferencia):</span>
                  <span className="text-3xl font-black text-primary-900">{formatCurrency(capitalCalculado)}</span>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-xs font-bold text-primary-700 uppercase">Cuenta de Patrimonio</label>
                <SearchableSelect
                  value={capitalCuenta}
                  onChange={setCapitalCuenta}
                  options={equityAccounts.map(acc => ({
                    value: acc.codigo,
                    label: `${acc.codigo} - ${acc.nombre}`
                  }))}
                  className="w-full bg-white"
                />
              </div>

              {error && (
                <div className="p-3 bg-error/10 border border-error/20 text-error rounded-md text-xs flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                  {error}
                </div>
              )}

              <Button 
                variant="primary" 
                className="w-full py-6 text-lg shadow-lg"
                onClick={handleSave}
              >
                <Send className="w-5 h-5 mr-2" /> Contabilizar Apertura
              </Button>
            </CardContent>
          </Card>

          <div className="p-4 bg-surface border border-border-soft rounded-lg text-xs text-text-muted">
            <p className="font-bold mb-1">Nota Contable:</p>
            La partida de apertura es el primer registro del ciclo. Debe cumplir con la ecuación: <br/>
            <code className="text-primary-600 font-bold">Activo = Pasivo + Capital</code>
          </div>
        </div>
      </div>
    </div>
  );
}
