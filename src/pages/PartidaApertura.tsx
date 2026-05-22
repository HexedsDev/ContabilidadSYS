import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, generateId, parseAmount } from '../utils/helpers';
import { Plus, Trash2, Send, AlertCircle, Calculator, Wallet, CreditCard, Building2, Calendar } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';
import type { EntryLine } from '../types';
import { useToast } from '../components/ui/toast-context';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';

type Line = Omit<EntryLine, 'id'>;

export function PartidaApertura() {
  const accounts = useStore(s => s.accounts);
  const addEntry = useStore(s => s.addEntry);
  const navigate = useNavigate();
  const toast = useToast();

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState('Partida de Apertura - Ciclo Contable 2026');
  const [activos, setActivos] = useState<Line[]>([{ cuenta_codigo: '1.1.01', debe: 0, haber: 0 }]);
  const [pasivos, setPasivos] = useState<Line[]>([{ cuenta_codigo: '', debe: 0, haber: 0 }]);
  const [capitalCuenta, setCapitalCuenta] = useState('3.1.01');
  const [error, setError] = useState<string | null>(null);

  const assetAccounts = useMemo(
    () => accounts.filter(a => a.codigo.startsWith('1') && a.permite_movimientos),
    [accounts]
  );
  const liabilityAccounts = useMemo(
    () => accounts.filter(a => a.codigo.startsWith('2') && a.permite_movimientos),
    [accounts]
  );
  const equityAccounts = useMemo(
    () => accounts.filter(a => a.codigo.startsWith('3') && a.permite_movimientos),
    [accounts]
  );

  const totalActivos = activos.reduce((s, l) => s + (Number(l.debe) || 0), 0);
  const totalPasivos = pasivos.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  const capitalCalculado = totalActivos - totalPasivos;
  const ecuacionOK = capitalCalculado > 0 && totalActivos > 0;

  const updateLine = (type: 'activo' | 'pasivo', index: number, field: keyof Line, value: string | number) => {
    const setter = type === 'activo' ? setActivos : setPasivos;
    setter(prev => {
      const next = [...prev];
      const line = { ...next[index] };
      if (field === 'cuenta_codigo') line.cuenta_codigo = String(value);
      else if (field === 'debe') line.debe = parseAmount(value);
      else if (field === 'haber') line.haber = parseAmount(value);
      next[index] = line;
      return next;
    });
  };

  const handleSave = () => {
    if (!fecha || !concepto.trim()) {
      setError('Fecha y concepto son obligatorios');
      return;
    }
    const validActivos = activos.filter(a => a.cuenta_codigo && a.debe > 0);
    if (validActivos.length === 0) {
      setError('Debes registrar al menos un activo con monto mayor a cero');
      return;
    }
    const duplicateActivos = validActivos.map(a => a.cuenta_codigo).filter((c, i, arr) => arr.indexOf(c) !== i);
    if (duplicateActivos.length > 0) {
      setError(`Cuenta de activo repetida: ${[...new Set(duplicateActivos)].join(', ')}`);
      return;
    }
    if (capitalCalculado <= 0) {
      setError('El capital calculado debe ser mayor a cero. Revisa activos y pasivos.');
      return;
    }
    if (!capitalCuenta) {
      setError('Selecciona la cuenta de patrimonio');
      return;
    }
    setError(null);

    const lineasFinales: EntryLine[] = [
      ...validActivos.map(a => ({ ...a, id: generateId(), haber: 0 })),
      ...pasivos.filter(p => p.cuenta_codigo && p.haber > 0).map(p => ({ ...p, id: generateId(), debe: 0 })),
      { id: generateId(), cuenta_codigo: capitalCuenta, debe: 0, haber: capitalCalculado, concepto_linea: 'Capital inicial' },
    ];

    addEntry({
      fecha,
      concepto,
      estado: 'contabilizada',
      observaciones: 'Generado por el asistente de apertura',
      lineas: lineasFinales,
    });

    toast.success('Partida de apertura registrada', `Capital: ${formatCurrency(capitalCalculado)}`);
    navigate('/diario');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Asistente de partida de apertura"
        description="Ingresa activos y pasivos iniciales. El capital se calcula automáticamente."
        icon={Calculator}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
                <Input
                  label="Fecha"
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
                <Input
                  label="Concepto global"
                  value={concepto}
                  onChange={e => setConcepto(e.target.value)}
                />
              </div>

              <LineSection
                title="Activos"
                subtitle="Cuentas con saldo deudor inicial"
                tone="success"
                icon={Wallet}
                lines={activos}
                onAdd={() => setActivos(p => [...p, { cuenta_codigo: '', debe: 0, haber: 0 }])}
                onRemove={i => setActivos(p => p.filter((_, idx) => idx !== i))}
                onChange={(i, f, v) => updateLine('activo', i, f, v)}
                accountOptions={assetAccounts.map(a => ({ value: a.codigo, label: `${a.codigo} — ${a.nombre}` }))}
                amountField="debe"
              />

              <LineSection
                title="Pasivos"
                subtitle="Deudas y obligaciones iniciales"
                tone="warning"
                icon={CreditCard}
                lines={pasivos}
                onAdd={() => setPasivos(p => [...p, { cuenta_codigo: '', debe: 0, haber: 0 }])}
                onRemove={i => setPasivos(p => p.filter((_, idx) => idx !== i))}
                onChange={(i, f, v) => updateLine('pasivo', i, f, v)}
                accountOptions={liabilityAccounts.map(a => ({ value: a.codigo, label: `${a.codigo} — ${a.nombre}` }))}
                amountField="haber"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Panel tone="primary" padding="md">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-white/70">Ecuación contable</span>
              <Badge
                variant={ecuacionOK ? 'success' : 'default'}
                size="sm"
                dot
                className="bg-white/10 text-white ring-white/20"
              >
                {ecuacionOK ? 'OK' : 'Pendiente'}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              <Row label="Total Activos" value={formatCurrency(totalActivos)} />
              <Row label="Total Pasivos" value={formatCurrency(totalPasivos)} faded />
              <div className="h-px bg-white/15 my-3" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">Capital a registrar</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{formatCurrency(capitalCalculado)}</p>
              </div>
            </div>
          </Panel>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Cuenta de patrimonio
                  </span>
                </label>
                <SearchableSelect
                  value={capitalCuenta}
                  onChange={setCapitalCuenta}
                  options={equityAccounts.map(a => ({ value: a.codigo, label: `${a.codigo} — ${a.nombre}` }))}
                  size="md"
                />
              </div>

              {error && (
                <div className="p-3 bg-error-soft border border-error/30 text-error rounded-sm text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button fullWidth size="lg" leftIcon={<Send className="w-5 h-5" />} onClick={handleSave}>
                Contabilizar apertura
              </Button>
            </CardContent>
          </Card>

          <div className="p-4 rounded-sm bg-surface-soft border border-border-soft text-xs text-text-muted leading-relaxed">
            <p className="font-semibold text-text-main mb-1">Nota contable</p>
            La apertura es el primer registro del ciclo. Debe cumplir:
            <code className="block mt-2 px-2 py-1 bg-surface rounded font-mono text-primary-600 dark:text-primary-300">
              Activo = Pasivo + Capital
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, faded }: { label: string; value: string; faded?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${faded ? 'text-white/80' : ''}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

interface LineSectionProps {
  title: string;
  subtitle: string;
  tone: 'success' | 'warning';
  icon: React.ElementType;
  lines: Line[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChange: (i: number, field: keyof Line, value: string | number) => void;
  accountOptions: { value: string; label: string }[];
  amountField: 'debe' | 'haber';
}

function LineSection({
  title,
  subtitle,
  tone,
  icon: Icon,
  lines,
  onAdd,
  onRemove,
  onChange,
  accountOptions,
  amountField,
}: LineSectionProps) {
  const toneClass = tone === 'success' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning';
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${toneClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-main">{title}</h3>
            <p className="text-xs text-text-muted">{subtitle}</p>
          </div>
        </div>
        <Button variant="outline" size="xs" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>
          Agregar
        </Button>
      </div>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="flex gap-2 items-center">
            <SearchableSelect
              value={line.cuenta_codigo}
              onChange={val => onChange(index, 'cuenta_codigo', val)}
              options={accountOptions}
              className="flex-1"
              placeholder="Seleccione cuenta..."
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={line[amountField] || ''}
              placeholder="0.00"
              onChange={e => onChange(index, amountField, e.target.value)}
              className="w-36 h-9 px-2.5 text-sm text-right bg-surface border border-border-strong rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 tabular-nums"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label="Eliminar línea"
              className="p-1.5 text-text-subtle hover:text-error hover:bg-error-soft rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
