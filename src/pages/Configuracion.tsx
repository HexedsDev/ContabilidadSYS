import { useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/toast-context';
import type { Empresa } from '../types';

export function Configuracion() {
  const empresa = useStore(s => s.empresa);
  const setEmpresa = useStore(s => s.setEmpresa);
  const toast = useToast();
  const [form, setForm] = useState<Empresa>(empresa);

  const handleSave = () => {
    if (!form.razon_social.trim()) {
      toast.error('Razón social es obligatoria');
      return;
    }
    setEmpresa(form);
    toast.success('Configuración guardada', 'Se aplicará en reportes y encabezados');
  };

  const update = <K extends keyof Empresa>(key: K, value: Empresa[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Configuración de la empresa"
        description="Estos datos aparecen en los reportes PDF y en el encabezado del sistema"
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
    </div>
  );
}
