import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, generateId, parseAmount } from '../utils/helpers';
import {
  Plus,
  Trash2,
  Save,
  Send,
  AlertCircle,
  ArrowLeft,
  BookPlus,
  Calendar,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import type { EntryLine } from '../types';
import { useToast } from '../components/ui/toast-context';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../components/ui/PageHeader';

type Line = Omit<EntryLine, 'id'>;

export function RegistrarPartida() {
  const accounts = useStore(s => s.accounts);
  const entries = useStore(s => s.entries);
  const addEntry = useStore(s => s.addEntry);
  const updateEntry = useStore(s => s.updateEntry);

  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const editId: string | undefined = location.state?.entryId;
  const entryToEdit = entries.find(e => e.id === editId);

  const [fecha, setFecha] = useState(entryToEdit?.fecha || new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState(entryToEdit?.concepto || '');
  const [observaciones, setObservaciones] = useState(entryToEdit?.observaciones || '');
  const [lineas, setLineas] = useState<Line[]>(
    entryToEdit
      ? entryToEdit.lineas.map(l => ({ ...l }))
      : [
          { cuenta_codigo: '', debe: 0, haber: 0 },
          { cuenta_codigo: '', debe: 0, haber: 0 },
        ]
  );
  const [errors, setErrors] = useState<string[]>([]);

  const detalleAccounts = useMemo(
    () => accounts.filter(a => a.permite_movimientos || a.tipo === 'Detalle'),
    [accounts]
  );

  const accountOptions = useMemo(
    () =>
      detalleAccounts.map(acc => ({
        value: acc.codigo,
        label: `${acc.codigo} — ${acc.nombre}`,
        sublabel: acc.naturaleza,
      })),
    [detalleAccounts]
  );

  const totalDebe = lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
  const totalHaber = lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  const diff = totalDebe - totalHaber;
  const isBalanced = Math.abs(diff) < 0.01;
  const hasAmounts = totalDebe > 0 || totalHaber > 0;

  const handleAddLine = () => {
    setLineas(prev => [...prev, { cuenta_codigo: '', debe: 0, haber: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineas.length <= 2) {
      toast.warning('Mínimo dos líneas', 'Una partida contable requiere al menos dos asientos');
      return;
    }
    setLineas(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangeLine = (index: number, field: keyof Line, value: string | number) => {
    setLineas(prev => {
      const next = [...prev];
      const line = { ...next[index] };
      if (field === 'debe') {
        line.debe = parseAmount(value);
        if (line.debe > 0) line.haber = 0;
      } else if (field === 'haber') {
        line.haber = parseAmount(value);
        if (line.haber > 0) line.debe = 0;
      } else if (field === 'cuenta_codigo') {
        line.cuenta_codigo = String(value);
      }
      next[index] = line;
      return next;
    });
  };

  const handleSave = (estado: 'borrador' | 'contabilizada') => {
    const errs: string[] = [];
    if (!fecha) errs.push('La fecha es obligatoria');
    if (!concepto.trim()) errs.push('El concepto es obligatorio');

    if (estado === 'contabilizada') {
      const accountCodes = lineas.map(l => l.cuenta_codigo).filter(Boolean);
      const duplicates = accountCodes.filter((c, i) => accountCodes.indexOf(c) !== i);
      if (duplicates.length > 0) {
        errs.push(`Cuenta repetida: ${[...new Set(duplicates)].join(', ')}`);
      }
      if (lineas.some(l => !l.cuenta_codigo)) errs.push('Todas las líneas requieren una cuenta seleccionada');
      if (lineas.some(l => l.debe === 0 && l.haber === 0)) errs.push('No puede haber líneas sin monto');
      if (lineas.some(l => l.debe > 0 && l.haber > 0)) errs.push('Una línea no puede tener valor en Debe y Haber a la vez');
      if (!isBalanced) errs.push(`Partida descuadrada: diferencia de ${formatCurrency(Math.abs(diff))}`);
      if (totalDebe === 0) errs.push('Los montos no pueden ser cero');
      const groupers = lineas
        .map(l => accounts.find(a => a.codigo === l.cuenta_codigo))
        .filter(a => a && a.tipo === 'Agrupador');
      if (groupers.length > 0) errs.push('No se permiten cuentas agrupadoras en una partida');
    }

    if (errs.length > 0) {
      setErrors(errs);
      toast.error('No se puede guardar', errs[0]);
      return;
    }
    setErrors([]);

    const linesWithIds = lineas
      .filter(l => l.cuenta_codigo)
      .map(l => ({ ...l, id: generateId() }));

    if (editId) {
      updateEntry(editId, { fecha, concepto, observaciones, estado, lineas: linesWithIds });
      toast.success('Partida actualizada', `#${entryToEdit?.numero} guardada como ${estado}`);
      navigate('/diario');
    } else {
      const newEntry = addEntry({ fecha, concepto, observaciones, estado, lineas: linesWithIds });
      toast.success(estado === 'contabilizada' ? 'Partida contabilizada' : 'Borrador guardado', `#${newEntry.numero} creada`);
      setFecha(new Date().toISOString().split('T')[0]);
      setConcepto('');
      setObservaciones('');
      setLineas([
        { cuenta_codigo: '', debe: 0, haber: 0 },
        { cuenta_codigo: '', debe: 0, haber: 0 },
      ]);
    }
  };

  // Keyboard shortcut: Ctrl/Cmd+Enter to post
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave('contabilizada');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextNumber = editId ? entryToEdit?.numero : (entries.length > 0 ? Math.max(...entries.map(e => e.numero)) + 1 : 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={editId ? 'Editar partida' : 'Registrar partida'}
        description={editId ? 'Modifica los datos del movimiento contable' : 'Captura un nuevo asiento. Usa Ctrl+Enter para contabilizar.'}
        icon={BookPlus}
        actions={
          <>
            {editId && (
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
                Volver
              </Button>
            )}
            <Badge variant="primary" size="md">
              Partida #{nextNumber}
            </Badge>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <Input
              label="Concepto"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Ej. Compra de mercadería al contado"
            />
          </div>

          {/* Líneas */}
          <div className="rounded-sm border border-border-soft overflow-hidden">
            <div className="bg-surface-soft px-4 py-2.5 grid grid-cols-12 gap-3 text-[11px] font-semibold tracking-wider text-text-muted uppercase">
              <div className="col-span-6">Cuenta</div>
              <div className="col-span-2 text-right">Debe</div>
              <div className="col-span-2 text-right">Haber</div>
              <div className="col-span-2 text-center">Acción</div>
            </div>
            <div className="divide-y divide-border-soft">
              <AnimatePresence initial={false}>
                {lineas.map((line, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="grid grid-cols-12 gap-3 px-3 py-2 items-center bg-surface hover:bg-surface-soft/50 transition-colors"
                  >
                    <div className="col-span-6">
                      <SearchableSelect
                        value={line.cuenta_codigo}
                        onChange={val => handleChangeLine(index, 'cuenta_codigo', val)}
                        options={accountOptions}
                        placeholder="Buscar cuenta..."
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debe || ''}
                        onChange={e => handleChangeLine(index, 'debe', e.target.value)}
                        className="w-full h-9 px-2.5 text-sm text-right bg-surface border border-border-strong rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 tabular-nums disabled:opacity-50 disabled:bg-surface-soft"
                        placeholder="0.00"
                        disabled={line.haber > 0}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.haber || ''}
                        onChange={e => handleChangeLine(index, 'haber', e.target.value)}
                        className="w-full h-9 px-2.5 text-sm text-right bg-surface border border-border-strong rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 tabular-nums disabled:opacity-50 disabled:bg-surface-soft"
                        placeholder="0.00"
                        disabled={line.debe > 0}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(index)}
                        aria-label={`Eliminar línea ${index + 1}`}
                        className="p-1.5 text-text-subtle hover:text-error hover:bg-error-soft rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-12 gap-3 px-3 py-3 items-center bg-surface-soft border-t border-border-soft text-sm font-semibold">
              <div className="col-span-6 text-text-muted uppercase text-xs tracking-wider">Totales</div>
              <div className={`col-span-2 text-right tabular-nums ${isBalanced ? 'text-text-main' : 'text-error'}`}>
                {formatCurrency(totalDebe)}
              </div>
              <div className={`col-span-2 text-right tabular-nums ${isBalanced ? 'text-text-main' : 'text-error'}`}>
                {formatCurrency(totalHaber)}
              </div>
              <div className="col-span-2 flex justify-center">
                {hasAmounts && isBalanced ? (
                  <Badge variant="success" dot size="sm">
                    Cuadrada
                  </Badge>
                ) : hasAmounts ? (
                  <Badge variant="error" dot size="sm">
                    Descuadre
                  </Badge>
                ) : (
                  <Badge variant="default" size="sm">
                    Sin datos
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddLine}>
              Agregar línea
            </Button>
            {hasAmounts && !isBalanced && (
              <div className="flex items-center gap-2 text-error text-sm font-medium">
                <Scale className="w-4 h-4" />
                Diferencia: {formatCurrency(Math.abs(diff))}
              </div>
            )}
            {hasAmounts && isBalanced && (
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Partida cuadrada
              </div>
            )}
          </div>

          <Textarea
            label="Observaciones (opcional)"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Notas, referencias o documentos relacionados..."
          />

          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-error-soft border border-error/30 text-error rounded-sm text-sm space-y-1"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4" />
                Errores de validación
              </div>
              <ul className="list-disc list-inside text-xs space-y-0.5 pl-1">
                {errors.map((er, i) => (
                  <li key={i}>{er}</li>
                ))}
              </ul>
            </motion.div>
          )}

          <div className="pt-2 border-t border-border-soft flex justify-end gap-3 flex-wrap">
            {!editId && (
              <Button variant="outline" leftIcon={<Save className="w-4 h-4" />} onClick={() => handleSave('borrador')}>
                Guardar borrador
              </Button>
            )}
            <Button variant="primary" leftIcon={<Send className="w-4 h-4" />} onClick={() => handleSave('contabilizada')}>
              {editId ? 'Actualizar partida' : 'Contabilizar partida'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
