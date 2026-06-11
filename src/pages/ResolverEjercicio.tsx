import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Panel, PanelStat } from '../components/ui/Panel';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/toast-context';
import { formatCurrency, generateId } from '../utils/helpers';
import {
  analyzeExerciseWithOpenAI,
  MAX_ANALYSIS_FILE_BYTES,
  OPENAI_DEFAULT_MODEL,
  SUPPORTED_FILE_HINT,
  type AIAnalysisLine,
  type AIExercisePartida,
} from '../utils/openaiDocumentAnalysis';
import { Wand2, Upload, Loader2, FileText, AlertCircle, CheckCircle2, ListChecks, Send } from 'lucide-react';
import type { EntryLine } from '../types';

interface PreparedLine {
  cuenta_codigo: string;
  cuenta_nombre: string;
  debe: number;
  haber: number;
}

interface PreparedPartida {
  fecha: string;
  concepto: string;
  observaciones: string;
  lineas: PreparedLine[];
  totalDebe: number;
  totalHaber: number;
  cuadrada: boolean;
  faltantes: string[];
}

export function ResolverEjercicio() {
  const accounts = useStore(s => s.accounts);
  const empresa = useStore(s => s.empresa);
  const aiSettings = useStore(s => s.aiSettings);
  const entries = useStore(s => s.entries);
  const addEntry = useStore(s => s.addEntry);
  const clearData = useStore(s => s.clearData);
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [fuente, setFuente] = useState<string | null>(null);
  const [capitalInicial, setCapitalInicial] = useState<number | null>(null);
  const [resumen, setResumen] = useState<string>('');
  const [partidas, setPartidas] = useState<PreparedPartida[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [limpiarPrimero, setLimpiarPrimero] = useState(true);

  const aiEnabled = aiSettings.enabled && aiSettings.apiKey.trim().length > 0;

  const accName = useMemo(() => {
    const m = new Map(accounts.map(a => [a.codigo, a.nombre]));
    return (c: string) => m.get(c) ?? c;
  }, [accounts]);

  const detalleAccounts = useMemo(
    () => accounts.filter(a => a.permite_movimientos || a.tipo === 'Detalle'),
    [accounts]
  );

  const resolveAccount = (line: AIAnalysisLine): string | null => {
    if (line.cuenta_codigo) {
      const byCode = detalleAccounts.find(a => a.codigo === line.cuenta_codigo);
      if (byCode) return byCode.codigo;
    }
    if (line.cuenta_nombre) {
      const n = line.cuenta_nombre.trim().toLowerCase();
      const byName = detalleAccounts.find(a => a.nombre.toLowerCase() === n);
      if (byName) return byName.codigo;
      const partial = detalleAccounts.filter(a => a.nombre.toLowerCase().includes(n));
      if (partial.length === 1) return partial[0].codigo;
    }
    return null;
  };

  const prepararPartida = (p: AIExercisePartida): PreparedPartida => {
    const faltantes: string[] = [];
    // Consolida por cuenta (neto debe−haber) para no repetir cuentas.
    const porCuenta = new Map<string, number>();
    for (const line of p.lineas) {
      const debe = Number(line.debe) || 0;
      const haber = Number(line.haber) || 0;
      if (debe === 0 && haber === 0) continue;
      const codigo = resolveAccount(line);
      if (!codigo) {
        faltantes.push(line.cuenta_nombre || line.cuenta_codigo || 'cuenta sin nombre');
        continue;
      }
      porCuenta.set(codigo, (porCuenta.get(codigo) ?? 0) + debe - haber);
    }
    const lineas: PreparedLine[] = [...porCuenta.entries()]
      .filter(([, neto]) => Math.abs(neto) >= 0.005)
      .map(([codigo, neto]) => ({
        cuenta_codigo: codigo,
        cuenta_nombre: accName(codigo),
        debe: neto > 0 ? Number(neto.toFixed(2)) : 0,
        haber: neto < 0 ? Number(Math.abs(neto).toFixed(2)) : 0,
      }));
    const totalDebe = Number(lineas.reduce((s, l) => s + l.debe, 0).toFixed(2));
    const totalHaber = Number(lineas.reduce((s, l) => s + l.haber, 0).toFixed(2));
    return {
      fecha: p.fecha,
      concepto: p.concepto,
      observaciones: p.observaciones,
      lineas,
      totalDebe,
      totalHaber,
      cuadrada: Math.abs(totalDebe - totalHaber) < 0.01 && lineas.length >= 2,
      faltantes,
    };
  };

  const run = async (file?: File) => {
    if (!aiEnabled) {
      toast.warning('Asistente IA desactivado', 'Actívalo en Configuración para resolver ejercicios');
      return;
    }
    if (!file && !texto.trim()) {
      toast.warning('Sin enunciado', 'Pega el ejercicio o sube el archivo del enunciado');
      return;
    }
    if (file && file.size > MAX_ANALYSIS_FILE_BYTES) {
      toast.error('Archivo demasiado grande', `Máximo ${MAX_ANALYSIS_FILE_BYTES / 1024 / 1024} MB`);
      return;
    }

    setLoading(true);
    setPartidas([]);
    setCapitalInicial(null);
    setResumen('');
    setFuente(file ? file.name : 'Enunciado pegado');
    try {
      const result = await analyzeExerciseWithOpenAI({
        file,
        text: file ? undefined : texto,
        apiKey: aiSettings.apiKey,
        accounts,
        empresa,
        model: OPENAI_DEFAULT_MODEL,
      });
      const prep = result.partidas.map(prepararPartida).filter(p => p.lineas.length > 0);
      if (prep.length === 0) throw new Error('No se pudieron interpretar partidas del ejercicio');
      setCapitalInicial(result.capitalInicial);
      setResumen(result.resumen);
      setPartidas(prep);
      setLimpiarPrimero(entries.length > 0);
      const conProblemas = prep.filter(p => !p.cuadrada || p.faltantes.length > 0).length;
      if (conProblemas > 0) {
        toast.warning('Ejercicio resuelto con avisos', `${prep.length} partidas; ${conProblemas} requieren revisión`);
      } else {
        toast.success('Ejercicio resuelto', `${prep.length} partidas generadas. Revísalas y contabiliza.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo resolver el ejercicio';
      toast.error('Error al resolver el ejercicio', message);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void run(file);
  };

  const contabilizarTodas = () => {
    if (limpiarPrimero) clearData();
    const ordenadas = [...partidas].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    for (const p of ordenadas) {
      const lineas: EntryLine[] = p.lineas.map(l => ({
        id: generateId(),
        cuenta_codigo: l.cuenta_codigo,
        debe: l.debe,
        haber: l.haber,
      }));
      addEntry({
        fecha: p.fecha || empresa.periodo_inicio,
        concepto: p.concepto || 'Partida del ejercicio',
        observaciones: [p.observaciones, '[ejercicio-IA]'].filter(Boolean).join(' '),
        estado: 'contabilizada',
        lineas,
      });
    }
    toast.success('Ejercicio contabilizado', `${ordenadas.length} partidas en el Libro Diario`);
    setConfirmOpen(false);
    navigate('/app/diario');
  };

  const totalPartidas = partidas.length;
  const conProblemas = partidas.filter(p => !p.cuadrada || p.faltantes.length > 0).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Resolver Ejercicio (IA)"
        description="Pega o sube el enunciado completo y el sistema genera la apertura y todas las partidas"
        icon={Wand2}
      />

      {!aiEnabled && (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={AlertCircle}
              title="Activa el asistente IA"
              description="Ve a Configuración → Asistente IA, marca la casilla y guarda tu API key de OpenAI para usar esta función."
              action={<Button size="sm" onClick={() => navigate('/app/configuracion')}>Ir a Configuración</Button>}
            />
          </CardContent>
        </Card>
      )}

      {aiEnabled && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-text-main">Enunciado del ejercicio</h2>
              <Badge variant="success" dot size="sm" className="ml-auto">IA activa</Badge>
            </div>

            <Textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={'Pega aquí el ejercicio completo: saldos iniciales y todas las operaciones del mes...\n\nEjemplo: "Inventario Q50,000, Caja Q40,000... Operaciones: Abril 2: Renta de local Q1,500 IVA incluido..."'}
              className="min-h-[200px] font-mono text-xs"
            />

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*,.txt,.md,.csv,.html"
              onChange={handleFile}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                onClick={() => void run()}
                disabled={loading || !texto.trim()}
              >
                {loading ? 'Resolviendo...' : 'Resolver ejercicio'}
              </Button>
              <Button
                variant="outline"
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={() => fileRef.current?.click()}
                disabled={loading}
              >
                Subir enunciado (foto/PDF)
              </Button>
              <span className="text-xs text-text-subtle">{SUPPORTED_FILE_HINT}</span>
            </div>

            {fuente && !loading && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <FileText className="w-3.5 h-3.5" /> Fuente: {fuente}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {capitalInicial !== null && (
        <Panel tone="primary" padding="md">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Ejercicio resuelto</p>
              <p className="mt-1 text-sm text-white/80">{resumen || 'Revisa las partidas antes de contabilizar'}</p>
            </div>
            <PanelStat label="Capital inicial" value={formatCurrency(capitalInicial)} divider />
            <PanelStat label="Partidas generadas" value={String(totalPartidas)} divider />
            <PanelStat label="Requieren revisión" value={String(conProblemas)} divider />
          </div>
        </Panel>
      )}

      {partidas.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={limpiarPrimero}
                onChange={e => setLimpiarPrimero(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-primary-600 focus:ring-primary-500"
              />
              Borrar las partidas actuales antes de contabilizar (recomendado para un ejercicio nuevo)
            </label>
            <Button leftIcon={<ListChecks className="w-4 h-4" />} onClick={() => setConfirmOpen(true)}>
              Contabilizar todas ({totalPartidas})
            </Button>
          </div>

          <div className="space-y-4">
            {partidas.map((p, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="px-5 py-2.5 border-b border-border-soft flex items-center justify-between gap-3 bg-surface-soft/60">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-main truncate">
                      <span className="font-mono text-xs text-text-muted mr-2">{p.fecha || '—'}</span>
                      {p.concepto}
                    </p>
                  </div>
                  {p.cuadrada && p.faltantes.length === 0 ? (
                    <Badge variant="success" size="sm" dot>Cuadrada</Badge>
                  ) : (
                    <Badge variant="error" size="sm" dot>Revisar</Badge>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {p.lineas.map((l, j) => (
                        <tr key={j} className="border-b border-border-soft/50 last:border-0">
                          <td className="px-5 py-1.5 font-mono text-[10px] text-text-subtle w-16">{l.cuenta_codigo}</td>
                          <td className={`px-2 py-1.5 text-text-main ${l.haber > 0 ? 'pl-8' : ''}`}>
                            {l.haber > 0 ? `a ${l.cuenta_nombre}` : l.cuenta_nombre}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-text-muted w-28">{l.debe > 0 ? formatCurrency(l.debe) : ''}</td>
                          <td className="px-5 py-1.5 text-right tabular-nums text-text-muted w-28">{l.haber > 0 ? formatCurrency(l.haber) : ''}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-text-main bg-surface-soft/40">
                        <td colSpan={2} className="px-5 py-1.5 text-right uppercase text-[10px] tracking-wider text-text-muted">Sumas</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(p.totalDebe)}</td>
                        <td className="px-5 py-1.5 text-right tabular-nums">{formatCurrency(p.totalHaber)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {p.faltantes.length > 0 && (
                  <div className="px-5 py-2 text-xs text-error bg-error-soft/40 border-t border-error/20">
                    No se reconocieron: {p.faltantes.join(', ')}. Agrégalas a mano en el Libro Diario.
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-soft flex-wrap">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              {conProblemas === 0 ? (
                <><CheckCircle2 className="w-4 h-4 text-success" /> Todas las partidas cuadran</>
              ) : (
                <><AlertCircle className="w-4 h-4 text-error" /> {conProblemas} partida(s) requieren revisión</>
              )}
            </div>
            <Button leftIcon={<Send className="w-4 h-4" />} onClick={() => setConfirmOpen(true)}>
              Contabilizar todas ({totalPartidas})
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={contabilizarTodas}
        title="¿Contabilizar todo el ejercicio?"
        message={
          (limpiarPrimero
            ? 'Se borrarán las partidas actuales y '
            : 'Se agregarán al Libro Diario ') +
          `se contabilizarán ${totalPartidas} partida(s). Luego podrás ver el Libro Mayor y el Balance de Saldos.`
        }
        confirmText="Sí, contabilizar todo"
        variant={limpiarPrimero ? 'danger' : 'primary'}
      />
    </div>
  );
}
