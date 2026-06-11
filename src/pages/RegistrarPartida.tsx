import { useState, useMemo, useEffect, useRef } from 'react';
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
  Bot,
  Wand2,
  FileText,
  Loader2,
  Upload,
  ListChecks,
} from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import type { EntryLine } from '../types';
import { useToast } from '../components/ui/toast-context';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../components/ui/PageHeader';
import {
  analyzeDocumentWithOpenAI,
  analyzeExerciseWithOpenAI,
  MAX_ANALYSIS_FILE_BYTES,
  OPENAI_DEFAULT_MODEL,
  type AIAnalysisDraft,
  type AIAnalysisLine,
  type AIExercisePartida,
} from '../utils/openaiDocumentAnalysis';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type Line = Omit<EntryLine, 'id'>;

// Heurística: un EJERCICIO COMPLETO trae varias operaciones fechadas ("Febrero 2:",
// "Abril 10:") y/o pide diario/mayor/balance. Esta pantalla genera UNA partida;
// si el texto parece un ejercicio, se envía a Resolver Ejercicio (IA) que genera
// la apertura y todas las partidas de una vez.
const looksLikeFullExercise = (text: string): boolean => {
  const t = text.toLowerCase();
  const operacionesFechadas =
    t.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{1,2}\s*:/g) ??
    [];
  const pideTodo =
    /se\s+solicita|partidas?\s+de\s+diario|balance\s+de\s+saldos|capital\s+inicial|saldos\s+iniciales|inventario\s+inicial/.test(t);
  return operacionesFechadas.length >= 2 || (pideTodo && operacionesFechadas.length >= 1);
};

interface ExercisePartidaPrep {
  fecha: string;
  concepto: string;
  observaciones: string;
  lineas: { cuenta_codigo: string; cuenta_nombre: string; debe: number; haber: number }[];
  totalDebe: number;
  totalHaber: number;
  cuadrada: boolean;
  faltantes: string[];
}

export function RegistrarPartida() {
  const accounts = useStore(s => s.accounts);
  const entries = useStore(s => s.entries);
  const empresa = useStore(s => s.empresa);
  const aiSettings = useStore(s => s.aiSettings);
  const addEntry = useStore(s => s.addEntry);
  const updateEntry = useStore(s => s.updateEntry);
  const clearData = useStore(s => s.clearData);

  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const documentInputRef = useRef<HTMLInputElement>(null);

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
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<string | null>(null);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  // Ejercicio completo resuelto por la IA: apertura + todas las operaciones,
  // listo para guardarse como borradores o contabilizarse de una vez.
  const [exercise, setExercise] = useState<{
    capitalInicial: number;
    resumen: string;
    partidas: ExercisePartidaPrep[];
  } | null>(null);
  const [limpiarPrimero, setLimpiarPrimero] = useState(true);
  const [confirmExercise, setConfirmExercise] = useState(false);
  const exerciseFileRef = useRef<HTMLInputElement>(null);

  const detalleAccounts = useMemo(
    () => accounts.filter(a => a.permite_movimientos || a.tipo === 'Detalle'),
    [accounts]
  );

  const accName = useMemo(() => {
    const m = new Map(accounts.map(a => [a.codigo, a.nombre]));
    return (c: string) => m.get(c) ?? c;
  }, [accounts]);

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
  const aiEnabled = aiSettings.enabled && aiSettings.apiKey.trim().length > 0;

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

  const resolveDocumentAccount = (line: AIAnalysisLine): string | null => {
    // Solo cuentas de detalle: la IA nunca debe colocar agrupadores en el formulario.
    if (line.cuenta_codigo) {
      const byCode = detalleAccounts.find(acc => acc.codigo === line.cuenta_codigo);
      if (byCode) return byCode.codigo;
    }
    if (line.cuenta_nombre) {
      const normalized = line.cuenta_nombre.trim().toLowerCase();
      const byName = detalleAccounts.find(acc => acc.nombre.toLowerCase() === normalized);
      if (byName) return byName.codigo;
      const partial = detalleAccounts.filter(acc => acc.nombre.toLowerCase().includes(normalized));
      if (partial.length === 1) return partial[0].codigo;
    }
    return null;
  };

  const normalizeAnalysisDraft = (draft: AIAnalysisDraft): { lines: Line[]; warnings: string[] } => {
    const warnings: string[] = [];
    const unmatched: string[] = [];
    // Consolida por cuenta (neto debe−haber): evita cuentas repetidas, que la
    // validación de partidas rechaza, y líneas con ambos lados a la vez.
    const porCuenta = new Map<string, number>();

    for (const line of draft.lineas) {
      const debe = Number(line.debe) || 0;
      const haber = Number(line.haber) || 0;
      if (debe === 0 && haber === 0) continue;
      if (debe < 0 || haber < 0) {
        warnings.push(`Se descartó una línea con monto negativo (${line.cuenta_nombre ?? line.cuenta_codigo}).`);
        continue;
      }
      const cuenta_codigo = resolveDocumentAccount(line);
      if (!cuenta_codigo) {
        unmatched.push(line.cuenta_nombre || line.cuenta_codigo || 'cuenta sin nombre');
        continue;
      }
      porCuenta.set(cuenta_codigo, (porCuenta.get(cuenta_codigo) ?? 0) + debe - haber);
    }

    const resolved: Line[] = [...porCuenta.entries()]
      .filter(([, neto]) => Math.abs(neto) >= 0.005)
      .map(([cuenta_codigo, neto]) => ({
        cuenta_codigo,
        debe: neto > 0 ? Number(neto.toFixed(2)) : 0,
        haber: neto < 0 ? Number(Math.abs(neto).toFixed(2)) : 0,
      }));

    if (resolved.length < 2) {
      throw new Error('No se pudieron interpretar suficientes lineas contables');
    }

    if (unmatched.length > 0) {
      // NO se re-cuadra: mover la diferencia a otra cuenta corrompería la partida.
      warnings.push(
        `No se reconocieron ${unmatched.length} cuenta(s): ${unmatched.join(', ')}. Agrégalas manualmente antes de contabilizar.`
      );
      return { lines: resolved, warnings };
    }

    const totalDebeResolved = resolved.reduce((sum, line) => sum + line.debe, 0);
    const totalHaberResolved = resolved.reduce((sum, line) => sum + line.haber, 0);
    const diffResolved = Number((totalDebeResolved - totalHaberResolved).toFixed(2));

    if (Math.abs(diffResolved) > 0.01 && Math.abs(diffResolved) <= 0.05) {
      // Diferencia de centavos por redondeo: se ajusta en el lado que ya tiene monto.
      const last = resolved[resolved.length - 1];
      if (diffResolved > 0 && last.haber > 0) {
        last.haber = Number((last.haber + diffResolved).toFixed(2));
      } else if (diffResolved < 0 && last.debe > 0) {
        last.debe = Number((last.debe - diffResolved).toFixed(2));
      } else {
        warnings.push(`Quedó una diferencia de redondeo de ${formatCurrency(Math.abs(diffResolved))}.`);
      }
    } else if (Math.abs(diffResolved) > 0.05) {
      warnings.push(
        `El borrador quedó descuadrado por ${formatCurrency(Math.abs(diffResolved))}. Revisa los montos antes de contabilizar.`
      );
    }

    return { lines: resolved, warnings };
  };

  const prepararPartidaEjercicio = (p: AIExercisePartida): ExercisePartidaPrep => {
    const faltantes: string[] = [];
    // Consolida por cuenta (neto debe−haber) para no repetir cuentas.
    const porCuenta = new Map<string, number>();
    for (const line of p.lineas) {
      const debe = Number(line.debe) || 0;
      const haber = Number(line.haber) || 0;
      if (debe === 0 && haber === 0) continue;
      const codigo = resolveDocumentAccount(line);
      if (!codigo) {
        faltantes.push(line.cuenta_nombre || line.cuenta_codigo || 'cuenta sin nombre');
        continue;
      }
      porCuenta.set(codigo, (porCuenta.get(codigo) ?? 0) + debe - haber);
    }
    const lineasPrep = [...porCuenta.entries()]
      .filter(([, neto]) => Math.abs(neto) >= 0.005)
      .map(([codigo, neto]) => ({
        cuenta_codigo: codigo,
        cuenta_nombre: accName(codigo),
        debe: neto > 0 ? Number(neto.toFixed(2)) : 0,
        haber: neto < 0 ? Number(Math.abs(neto).toFixed(2)) : 0,
      }));
    const totalDebe = Number(lineasPrep.reduce((s, l) => s + l.debe, 0).toFixed(2));
    const totalHaber = Number(lineasPrep.reduce((s, l) => s + l.haber, 0).toFixed(2));
    return {
      fecha: p.fecha,
      concepto: p.concepto,
      observaciones: p.observaciones,
      lineas: lineasPrep,
      totalDebe,
      totalHaber,
      cuadrada: Math.abs(totalDebe - totalHaber) < 0.01 && lineasPrep.length >= 2,
      faltantes,
    };
  };

  // Resuelve un EJERCICIO COMPLETO sin salir de esta pantalla: la IA genera la
  // apertura (con el capital calculado) y una partida por cada operación.
  const runExercise = async (input: { file?: File; text?: string }) => {
    if (!aiEnabled) return;
    if (!input.file && !input.text?.trim()) {
      toast.warning('Sin enunciado', 'Pega el ejercicio o sube el archivo del enunciado');
      return;
    }
    if (input.file && input.file.size > MAX_ANALYSIS_FILE_BYTES) {
      toast.error('Archivo demasiado grande', `Maximo ${MAX_ANALYSIS_FILE_BYTES / 1024 / 1024} MB`);
      if (exerciseFileRef.current) exerciseFileRef.current.value = '';
      return;
    }

    setAnalysisLoading(true);
    setExercise(null);
    setAnalysisSource(input.file ? input.file.name : 'Ejercicio completo (texto)');
    setAnalysisNote('Resolviendo el ejercicio completo: apertura + todas las operaciones...');
    try {
      const intentar = async (feedback?: string) => {
        const result = await analyzeExerciseWithOpenAI({
          file: input.file,
          text: input.file ? undefined : input.text,
          apiKey: aiSettings.apiKey,
          accounts,
          empresa,
          model: OPENAI_DEFAULT_MODEL,
          feedback,
        });
        const partidas = result.partidas.map(prepararPartidaEjercicio).filter(p => p.lineas.length > 0);
        return { result, partidas, problemas: partidas.filter(p => !p.cuadrada || p.faltantes.length > 0) };
      };

      let intento = await intentar();
      if (intento.partidas.length === 0) throw new Error('No se pudieron interpretar partidas del ejercicio');

      // Auto-corrección: si alguna partida quedó descuadrada o con cuentas sin
      // resolver, se reintenta UNA vez describiéndole a la IA el error exacto,
      // y se conserva el mejor de los dos resultados.
      if (intento.problemas.length > 0) {
        setAnalysisNote('Algunas partidas no cuadraron; pidiendo a la IA que las corrija...');
        const detalle = intento.problemas
          .map(
            p =>
              `- "${p.concepto}" (${p.fecha}): Debe ${p.totalDebe.toFixed(2)} vs Haber ${p.totalHaber.toFixed(2)}${
                p.faltantes.length > 0 ? `; cuentas no reconocidas: ${p.faltantes.join(', ')}` : ''
              }`
          )
          .join('\n');
        try {
          const reintento = await intentar(
            `Estas partidas quedaron DESCUADRADAS o con cuentas inválidas:\n${detalle}\nVuelve a resolver TODO el ejercicio. Cada partida debe cuadrar al centavo, usando únicamente montos derivados del enunciado (jamás de los ejemplos). Recuerda la bonificación incentivo de ley (Q250.00 por trabajador) cuando el enunciado indique cuántos trabajadores hay.`
          );
          if (reintento.partidas.length > 0 && reintento.problemas.length < intento.problemas.length) {
            intento = reintento;
          }
        } catch {
          // Si el reintento falla, se conserva el primer resultado.
        }
      }

      const partidas = intento.partidas;
      setExercise({ capitalInicial: intento.result.capitalInicial, resumen: intento.result.resumen, partidas });
      setLimpiarPrimero(entries.length > 0);
      const conProblemas = intento.problemas.length;
      setAnalysisNote(
        `Ejercicio resuelto: ${partidas.length} partidas generadas${conProblemas > 0 ? `, ${conProblemas} requieren revisión` : ''}. Revísalas abajo y guarda o contabiliza.`
      );
      if (conProblemas > 0) {
        toast.warning(
          'Ejercicio resuelto con avisos',
          `${conProblemas} partida(s) requieren revisión; al contabilizar quedarán como borrador para corregirlas`
        );
      } else {
        toast.success('Ejercicio resuelto', `${partidas.length} partidas generadas, todas cuadradas`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo resolver el ejercicio';
      setAnalysisNote(message);
      toast.error('Error al resolver el ejercicio', message);
    } finally {
      setAnalysisLoading(false);
      if (exerciseFileRef.current) exerciseFileRef.current.value = '';
    }
  };

  const handleExerciseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void runExercise({ file });
  };

  const guardarEjercicio = (estado: 'borrador' | 'contabilizada') => {
    if (!exercise) return;
    if (estado === 'contabilizada' && limpiarPrimero) clearData();
    const ordenadas = [...exercise.partidas].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    let contabilizadas = 0;
    let comoBorrador = 0;
    for (const p of ordenadas) {
      // Garantía del sistema: una partida descuadrada o con cuentas faltantes
      // JAMÁS se contabiliza (corrompería Mayor, Balance y estados); entra
      // como borrador para corregirla a mano en el Libro Diario.
      const esSegura = p.cuadrada && p.faltantes.length === 0;
      const estadoFinal = estado === 'contabilizada' && esSegura ? 'contabilizada' : 'borrador';
      if (estadoFinal === 'contabilizada') contabilizadas++;
      else comoBorrador++;
      addEntry({
        fecha: p.fecha || empresa.periodo_inicio,
        concepto: p.concepto || 'Partida del ejercicio',
        observaciones: [p.observaciones, '[ejercicio-IA]'].filter(Boolean).join(' '),
        estado: estadoFinal,
        lineas: p.lineas.map(l => ({
          id: generateId(),
          cuenta_codigo: l.cuenta_codigo,
          debe: l.debe,
          haber: l.haber,
        })),
      });
    }
    setConfirmExercise(false);
    setExercise(null);
    if (estado === 'contabilizada') {
      if (comoBorrador > 0) {
        toast.warning(
          'Ejercicio registrado con pendientes',
          `${contabilizadas} partida(s) contabilizadas; ${comoBorrador} quedaron como borrador por descuadre o cuentas faltantes — corrígelas en el Libro Diario`
        );
      } else {
        toast.success('Ejercicio contabilizado', `${contabilizadas} partidas en el Libro Diario`);
      }
      navigate('/app/diario');
    } else {
      toast.success('Cambios guardados', `${ordenadas.length} partidas guardadas como borrador en el Libro Diario`);
    }
  };

  const handleAnalyzeDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!aiEnabled) {
      toast.warning('Asistente IA desactivado', 'Activa la opcion en Configuracion para analizar documentos');
      if (documentInputRef.current) documentInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_ANALYSIS_FILE_BYTES) {
      toast.error('Archivo demasiado grande', `Maximo ${MAX_ANALYSIS_FILE_BYTES / 1024 / 1024} MB`);
      if (documentInputRef.current) documentInputRef.current.value = '';
      return;
    }

    setAnalysisLoading(true);
    setExercise(null);
    setAnalysisSource(file.name);
    setAnalysisNote(null);

    try {
      const draft = await analyzeDocumentWithOpenAI({
        file,
        apiKey: aiSettings.apiKey,
        accounts,
        empresa,
        model: OPENAI_DEFAULT_MODEL,
      });

      const { lines: resolvedLines, warnings } = normalizeAnalysisDraft(draft);
      const today = new Date().toISOString().split('T')[0];
      const fechaIA = draft.fecha?.trim() ?? '';
      const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaIA);
      if (fechaIA && !fechaValida) {
        warnings.push(`La fecha "${fechaIA}" no tiene formato válido; se usó la fecha de hoy.`);
      }

      setFecha(fechaValida ? fechaIA : today);
      setConcepto(draft.concepto?.trim() || `Documento analizado: ${file.name}`);
      setObservaciones(
        [draft.observaciones?.trim(), `Fuente: ${file.name}`, draft.confidence ? `Confianza: ${Math.round(draft.confidence * 100)}%` : null]
          .filter(Boolean)
          .join(' | ')
      );
      setLineas(
        resolvedLines.map(line => ({
          cuenta_codigo: line.cuenta_codigo,
          debe: line.debe,
          haber: line.haber,
        }))
      );
      setAnalysisNote(
        [`Se generó un borrador con ${resolvedLines.length} líneas. Revisa antes de contabilizar.`, ...warnings].join(' ')
      );
      if (warnings.length > 0) {
        toast.warning('Documento analizado con advertencias', warnings[0]);
      } else {
        toast.success('Documento analizado', 'El borrador se completó automáticamente');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo analizar el documento';
      setAnalysisNote(message);
      toast.error('Error al analizar documento', message);
    } finally {
      setAnalysisLoading(false);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleAnalyzeText = async () => {
    if (!analysisText.trim()) {
      toast.warning('Texto vacío', 'Escribe o pega el contenido del documento antes de enviar');
      return;
    }
    if (!aiEnabled) return;

    // Un ejercicio completo no cabe en una sola partida: se resuelve aquí
    // mismo, generando la apertura y todas las operaciones.
    if (looksLikeFullExercise(analysisText)) {
      await runExercise({ text: analysisText });
      return;
    }

    setAnalysisLoading(true);
    setExercise(null);
    setAnalysisSource('Texto escrito por el usuario');
    setAnalysisNote(null);

    try {
      const draft = await analyzeDocumentWithOpenAI({
        text: analysisText,
        apiKey: aiSettings.apiKey,
        accounts,
        empresa,
        model: OPENAI_DEFAULT_MODEL,
      });

      const { lines: resolvedLines, warnings } = normalizeAnalysisDraft(draft);
      const today = new Date().toISOString().split('T')[0];
      const fechaIA = draft.fecha?.trim() ?? '';
      const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaIA);
      if (fechaIA && !fechaValida) {
        warnings.push(`La fecha "${fechaIA}" no tiene formato válido; se usó la fecha de hoy.`);
      }

      setFecha(fechaValida ? fechaIA : today);
      setConcepto(draft.concepto?.trim() || 'Documento analizado desde texto');
      setObservaciones(
        [
          draft.observaciones?.trim(),
          'Fuente: texto ingresado manualmente',
          draft.confidence ? `Confianza: ${Math.round(draft.confidence * 100)}%` : null,
        ]
          .filter(Boolean)
          .join(' | ')
      );
      setLineas(
        resolvedLines.map(line => ({
          cuenta_codigo: line.cuenta_codigo,
          debe: line.debe,
          haber: line.haber,
        }))
      );
      setAnalysisNote(
        [`Se generó un borrador con ${resolvedLines.length} líneas. Revisa antes de contabilizar.`, ...warnings].join(' ')
      );
      if (warnings.length > 0) {
        toast.warning('Texto analizado con advertencias', warnings[0]);
      } else {
        toast.success('Texto analizado', 'El borrador se completó automáticamente');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo analizar el texto';
      setAnalysisNote(message);
      toast.error('Error al analizar texto', message);
    } finally {
      setAnalysisLoading(false);
    }
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
      if (lineas.some(l => l.debe < 0 || l.haber < 0)) errs.push('Los montos no pueden ser negativos');
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
      navigate('/app/diario');
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

  // Keep a stable ref to the latest handleSave so the keydown listener
  // (registered once) always calls the current version, not a stale closure.
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveRef.current('contabilizada');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Re-sincroniza el formulario al entrar/salir del modo edición: navegar de
  // "Editar partida" al enlace "Registrar Partida" (misma ruta, sin state) no
  // desmonta el componente; sin este reset el formulario retendría la partida
  // editada y "Contabilizar" la duplicaría como partida nueva.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (entryToEdit) {
      setFecha(entryToEdit.fecha);
      setConcepto(entryToEdit.concepto);
      setObservaciones(entryToEdit.observaciones);
      setLineas(entryToEdit.lineas.map(l => ({ ...l })));
    } else {
      setFecha(new Date().toISOString().split('T')[0]);
      setConcepto('');
      setObservaciones('');
      setLineas([
        { cuenta_codigo: '', debe: 0, haber: 0 },
        { cuenta_codigo: '', debe: 0, haber: 0 },
      ]);
    }
    setErrors([]);
    /* eslint-enable react-hooks/set-state-in-effect */
    // entryToEdit deriva de editId; depender solo de editId evita resets
    // mientras la lista de partidas cambia durante la edición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

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

      {aiEnabled && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary-600" />
                  <h2 className="text-sm font-semibold text-text-main">Analizar documento con IA</h2>
                </div>
                <p className="text-sm text-text-muted mt-1">
                  Sube una factura, recibo o documento escaneado para que el sistema proponga un borrador de partida.
                </p>
              </div>
              <Badge variant="success" dot size="sm">
                IA activa
              </Badge>
            </div>

            <input
              ref={documentInputRef}
              type="file"
              accept="application/pdf,image/*,.txt,.md,.csv,.html"
              onChange={handleAnalyzeDocument}
              className="hidden"
            />
            <input
              ref={exerciseFileRef}
              type="file"
              accept="application/pdf,image/*,.txt,.md,.csv,.html"
              onChange={handleExerciseFile}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                leftIcon={analysisLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                onClick={() => documentInputRef.current?.click()}
                disabled={analysisLoading}
              >
                {analysisLoading ? 'Analizando...' : 'Seleccionar documento'}
              </Button>
              <div className="text-xs text-text-muted">
                Usa la clave configurada en <span className="font-medium text-text-main">Configuración</span>.
              </div>
            </div>

            <div className="space-y-3">
              <Textarea
                label="O pega texto del documento"
                value={analysisText}
                onChange={e => setAnalysisText(e.target.value)}
                placeholder="Pega aquí el contenido del documento si no quieres subir un archivo..."
                hint="Esta opción solo aparece cuando el asistente IA está activo."
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button
                  variant="outline"
                  title="Pega el enunciado en el cuadro o súbelo en foto/PDF: genera la apertura y TODAS las partidas"
                  leftIcon={analysisLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  onClick={() => {
                    if (analysisText.trim()) void runExercise({ text: analysisText });
                    else exerciseFileRef.current?.click();
                  }}
                  disabled={analysisLoading}
                >
                  Resolver ejercicio completo
                </Button>
                <Button
                  leftIcon={analysisLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  onClick={handleAnalyzeText}
                  disabled={analysisLoading || !analysisText.trim()}
                >
                  {analysisLoading ? 'Analizando...' : 'Enviar texto'}
                </Button>
              </div>
            </div>

            {analysisSource && (
              <div className="rounded-sm border border-border-soft bg-surface-soft px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-text-main font-medium">
                  <FileText className="w-4 h-4 text-text-subtle" />
                  <span>{analysisSource}</span>
                </div>
                {analysisNote && <p className="mt-1 text-xs text-text-muted">{analysisNote}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ejercicio completo resuelto: revisar, guardar como borradores o contabilizar todo */}
      {aiEnabled && exercise && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border-soft flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Wand2 className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-text-main">Ejercicio resuelto</h2>
              <Badge variant="primary" size="sm">
                Capital inicial: {formatCurrency(exercise.capitalInicial)}
              </Badge>
            </div>
            <span className="text-xs text-text-muted">{exercise.partidas.length} partida(s) generadas</span>
          </div>
          <CardContent className="p-0 divide-y divide-border-soft">
            {exercise.partidas.map((p, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-text-main truncate">
                    <span className="font-mono text-xs text-text-muted mr-2">{p.fecha || '—'}</span>
                    {p.concepto}
                  </p>
                  {p.cuadrada && p.faltantes.length === 0 ? (
                    <Badge variant="success" size="sm" dot>
                      Cuadrada
                    </Badge>
                  ) : (
                    <Badge variant="error" size="sm" dot>
                      Revisar
                    </Badge>
                  )}
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {p.lineas.map((l, j) => (
                      <tr key={j} className="border-b border-border-soft/40 last:border-0">
                        <td className="py-1.5 font-mono text-[10px] text-text-subtle w-16">{l.cuenta_codigo}</td>
                        <td className={`py-1.5 text-text-main ${l.haber > 0 ? 'pl-8' : ''}`}>
                          {l.haber > 0 ? `a ${l.cuenta_nombre}` : l.cuenta_nombre}
                        </td>
                        <td className="py-1.5 text-right tabular-nums w-28 text-text-muted">
                          {l.debe > 0 ? formatCurrency(l.debe) : ''}
                        </td>
                        <td className="py-1.5 text-right tabular-nums w-28 text-text-muted">
                          {l.haber > 0 ? formatCurrency(l.haber) : ''}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold text-text-main">
                      <td colSpan={2} className="py-1.5 text-right uppercase text-[10px] tracking-wider text-text-muted">
                        Sumas
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{formatCurrency(p.totalDebe)}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatCurrency(p.totalHaber)}</td>
                    </tr>
                  </tbody>
                </table>
                {p.faltantes.length > 0 && (
                  <p className="mt-1 text-xs text-error">
                    No se reconocieron: {p.faltantes.join(', ')}. Agrégalas a mano antes de contabilizar.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
          <div className="px-5 py-3 border-t border-border-soft bg-surface-soft/50 flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={limpiarPrimero}
                onChange={e => setLimpiarPrimero(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-primary-600 focus:ring-primary-500"
              />
              Borrar las partidas actuales al contabilizar (ejercicio nuevo)
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={() => guardarEjercicio('borrador')}
              >
                Guardar cambios
              </Button>
              <Button size="sm" leftIcon={<ListChecks className="w-4 h-4" />} onClick={() => setConfirmExercise(true)}>
                Contabilizar todas ({exercise.partidas.length})
              </Button>
            </div>
          </div>
        </Card>
      )}

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

      <ConfirmDialog
        isOpen={confirmExercise}
        onClose={() => setConfirmExercise(false)}
        onConfirm={() => guardarEjercicio('contabilizada')}
        title="¿Contabilizar todo el ejercicio?"
        message={`${
          limpiarPrimero ? 'Se borrarán las partidas actuales y ' : 'Se agregarán al Libro Diario '
        }se contabilizarán ${exercise?.partidas.length ?? 0} partida(s). Luego podrás ver el Libro Mayor y el Balance de Saldos.`}
        confirmText="Sí, contabilizar todo"
        variant={limpiarPrimero ? 'danger' : 'primary'}
      />
    </div>
  );
}
