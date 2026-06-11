import { useState } from 'react';
import { Building2, Save, Bot, KeyRound, Percent } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/toast-context';
import { Badge } from '../components/ui/Badge';
import type { AiSettings, Empresa } from '../types';
import type { CierreRates } from '../utils/cierre';

const RATE_FIELDS: { key: keyof CierreRates; label: string; group: 'fiscal' | 'deprec' }[] = [
  { key: 'isr', label: 'ISR sobre utilidad', group: 'fiscal' },
  { key: 'reservaLegal', label: 'Reserva Legal', group: 'fiscal' },
  { key: 'incobrables', label: 'Cuentas incobrables', group: 'fiscal' },
  { key: 'edificioPct', label: 'Edificio del inmueble (resto = terreno)', group: 'deprec' },
  { key: 'deprEdificio', label: 'Depreciación edificios', group: 'deprec' },
  { key: 'deprMobiliario', label: 'Depreciación mobiliario y equipo', group: 'deprec' },
  { key: 'deprComputo', label: 'Depreciación equipo de cómputo', group: 'deprec' },
  { key: 'deprVehiculos', label: 'Depreciación vehículos', group: 'deprec' },
  { key: 'deprMaquinaria', label: 'Depreciación maquinaria', group: 'deprec' },
  { key: 'deprHerramientas', label: 'Depreciación herramientas', group: 'deprec' },
  { key: 'amortizacion', label: 'Amortización activos diferidos', group: 'deprec' },
];

export function Configuracion() {
  const empresa = useStore(s => s.empresa);
  const aiSettings = useStore(s => s.aiSettings);
  const setEmpresa = useStore(s => s.setEmpresa);
  const setAiSettings = useStore(s => s.setAiSettings);
  const cierreRates = useStore(s => s.cierreRates);
  const setCierreRates = useStore(s => s.setCierreRates);
  const toast = useToast();
  const [form, setForm] = useState<Empresa>(empresa);
  const [aiForm, setAiForm] = useState<AiSettings>(aiSettings);
  const [ratesForm, setRatesForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(RATE_FIELDS.map(f => [f.key, String(+(cierreRates[f.key] * 100).toFixed(4))]))
  );

  const handleSaveRates = () => {
    const next: Partial<CierreRates> = {};
    for (const f of RATE_FIELDS) {
      const v = parseFloat(ratesForm[f.key]);
      next[f.key] = Number.isFinite(v) ? v / 100 : cierreRates[f.key];
    }
    setCierreRates(next);
    toast.success('Tasas de cierre guardadas', 'Se aplican en Estado de Resultados, Balance General y Cierre');
  };

  const handleSave = () => {
    if (!form.razon_social.trim()) {
      toast.error('Razón social es obligatoria');
      return;
    }
    setEmpresa(form);
    toast.success('Configuración guardada', 'Se aplicará en reportes y encabezados');
  };

  const handleSaveAi = () => {
    if (aiForm.enabled && !aiForm.apiKey.trim()) {
      toast.error('La API key es obligatoria cuando el asistente IA está activo');
      return;
    }
    setAiSettings(aiForm);
    toast.success(
      'API de OpenAI guardada',
      aiForm.enabled ? 'El asistente IA ya puede usarse' : 'La clave quedó guardada'
    );
  };

  const update = <K extends keyof Empresa>(key: K, value: Empresa[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Configuración de la empresa"
        description="Estos datos aparecen en los reportes PDF, en el encabezado del sistema y en el asistente de documentos"
        icon={Building2}
        actions={
          <Button leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Guardar cambios
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razón social"
              value={form.razon_social}
              onChange={e => update('razon_social', e.target.value)}
              placeholder="Mi Empresa, S.A."
            />
            <Input
              label="NIT"
              value={form.nit}
              onChange={e => update('nit', e.target.value)}
              placeholder="0000000-0"
            />
          </div>
          <Input
            label="Dirección"
            value={form.direccion}
            onChange={e => update('direccion', e.target.value)}
            placeholder="Ciudad de Guatemala"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={e => update('telefono', e.target.value)}
              placeholder="+502 0000 0000"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <h2 className="text-sm font-semibold text-text-main">Período fiscal</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Inicio"
              type="date"
              value={form.periodo_inicio}
              onChange={e => update('periodo_inicio', e.target.value)}
            />
            <Input
              label="Cierre"
              type="date"
              value={form.periodo_fin}
              onChange={e => update('periodo_fin', e.target.value)}
            />
            <Input
              label="Ciclo"
              value={form.ciclo}
              onChange={e => update('ciclo', e.target.value)}
              placeholder="Ciclo Contable 2026"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Moneda"
              value={form.moneda}
              onChange={e => update('moneda', e.target.value)}
              placeholder="GTQ"
            />
            <Input
              label="Símbolo"
              value={form.simbolo_moneda}
              onChange={e => update('simbolo_moneda', e.target.value)}
              placeholder="Q"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-text-main">Asistente IA para documentos</h2>
              </div>
              <p className="text-sm text-text-muted mt-1">
                Cuando lo actives, la pantalla de partidas puede leer un archivo y proponer un borrador contable.
              </p>
            </div>
            <Badge variant={aiForm.enabled ? 'success' : 'default'} dot size="sm">
              {aiForm.enabled ? 'Activo' : 'Desactivado'}
            </Badge>
          </div>

          <label className="flex items-start gap-3 rounded-sm border border-border-soft bg-surface-soft/60 p-3">
            <input
              type="checkbox"
              checked={aiForm.enabled}
              onChange={e => setAiForm(prev => ({ ...prev, enabled: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-border-strong text-primary-600 focus:ring-primary-500"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-main">Habilitar análisis automático</span>
              <span className="block text-xs text-text-muted mt-0.5">
                El sistema usará OpenAI para leer documentos y completar un borrador de partida.
              </span>
            </span>
          </label>

          <Input
            label="API key de OpenAI"
            type="password"
            value={aiForm.apiKey}
            onChange={e => setAiForm(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="sk-..."
            leftIcon={<KeyRound className="w-4 h-4" />}
            hint="Se guarda en este navegador para usarla en el análisis de documentos."
          />

          <div className="flex justify-end">
            <Button variant="outline" leftIcon={<Save className="w-4 h-4" />} onClick={handleSaveAi}>
              Guardar cambios
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Bot className="w-3.5 h-3.5" />
            <span>La carga del documento se hace desde Registrar Partida.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-text-main">Tasas de cierre contable</h2>
              </div>
              <p className="text-sm text-text-muted mt-1">
                Porcentajes legales de Guatemala usados en el Estado de Resultados, Balance General y la página de Cierre.
              </p>
            </div>
            <Button variant="outline" size="sm" leftIcon={<Save className="w-4 h-4" />} onClick={handleSaveRates}>
              Guardar tasas
            </Button>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-subtle mb-2">Impuestos y reservas</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {RATE_FIELDS.filter(f => f.group === 'fiscal').map(f => (
                <Input
                  key={f.key}
                  label={f.label}
                  type="number"
                  step="0.01"
                  value={ratesForm[f.key]}
                  onChange={e => setRatesForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  rightIcon={<Percent className="w-3.5 h-3.5" />}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-text-subtle mb-2">Depreciación y amortización</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {RATE_FIELDS.filter(f => f.group === 'deprec').map(f => (
                <Input
                  key={f.key}
                  label={f.label}
                  type="number"
                  step="0.01"
                  value={ratesForm[f.key]}
                  onChange={e => setRatesForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  rightIcon={<Percent className="w-3.5 h-3.5" />}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
