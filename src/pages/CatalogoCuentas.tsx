import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import { Search, ChevronDown, ChevronRight, FileDown, Plus, AlertCircle, ListTree, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/toast-context';
import type { Account } from '../types';

export function CatalogoCuentas() {
  const accounts = useStore(s => s.accounts);
  const addAccount = useStore(s => s.addAccount);
  const deleteAccount = useStore(s => s.deleteAccount);
  const entries = useStore(s => s.entries);
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1', '2', '3', '4', '5', '6']));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  const [newAcc, setNewAcc] = useState({
    codigo: '',
    nombre: '',
    tipo: 'Detalle' as 'Detalle' | 'Agrupador',
    naturaleza: 'Deudor' as 'Deudor' | 'Acreedor',
  });
  const [error, setError] = useState<string | null>(null);

  const accountsByParent = useMemo(() => {
    const map = new Map<string, Account[]>();
    for (const acc of accounts) {
      const key = acc.cuenta_padre ?? '__root__';
      const list = map.get(key) ?? [];
      list.push(acc);
      map.set(key, list);
    }
    for (const [key, list] of map) {
      map.set(key, list.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true })));
    }
    return map;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return [];
    return accounts.filter(a => a.codigo.includes(q) || a.nombre.toLowerCase().includes(q));
  }, [accounts, searchTerm]);

  const toggleExpand = (codigo: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });

  const handleAddAccount = () => {
    if (!newAcc.codigo.trim() || !newAcc.nombre.trim()) {
      setError('Código y nombre son obligatorios');
      return;
    }
    if (accounts.some(a => a.codigo === newAcc.codigo.trim())) {
      setError('El código ya existe');
      return;
    }
    const parts = newAcc.codigo.split('.');
    const nivel = parts.length;
    const cuenta_padre = nivel > 1 ? parts.slice(0, -1).join('.') : null;
    if (cuenta_padre && !accounts.some(a => a.codigo === cuenta_padre)) {
      setError(`La cuenta padre "${cuenta_padre}" no existe`);
      return;
    }
    addAccount({
      ...newAcc,
      codigo: newAcc.codigo.trim(),
      nombre: newAcc.nombre.trim(),
      nivel,
      cuenta_padre,
      permite_movimientos: newAcc.tipo === 'Detalle',
      estado: 'activa',
    });
    toast.success('Cuenta agregada', `${newAcc.codigo} — ${newAcc.nombre}`);
    setIsModalOpen(false);
    setNewAcc({ codigo: '', nombre: '', tipo: 'Detalle', naturaleza: 'Deudor' });
    setError(null);
  };

  const handleDelete = () => {
    if (!deleteCode) return;
    const used = entries.some(e => e.lineas.some(l => l.cuenta_codigo === deleteCode));
    if (used) {
      toast.error('No se puede eliminar', 'La cuenta tiene partidas asociadas');
      setDeleteCode(null);
      return;
    }
    const hasChildren = accounts.some(a => a.cuenta_padre === deleteCode);
    if (hasChildren) {
      toast.error('No se puede eliminar', 'La cuenta tiene subcuentas. Bórralas primero.');
      setDeleteCode(null);
      return;
    }
    deleteAccount(deleteCode);
    toast.success('Cuenta eliminada');
    setDeleteCode(null);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo-cuentas-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Catálogo exportado', `${accounts.length} cuentas`);
  };

  const renderAccountNode = (account: Account, depth = 0) => {
    const children = accountsByParent.get(account.codigo) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(account.codigo);

    return (
      <div key={account.codigo}>
        <div
          className={`flex items-center gap-3 px-3 py-2.5 hover:bg-surface-soft/60 rounded-md transition-colors group ${
            depth === 0 ? 'bg-primary-50/40 dark:bg-primary-100/5 font-semibold' : ''
          }`}
          style={{ paddingLeft: `${0.75 + depth * 1.5}rem` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(account.codigo)}
            className="w-5 h-5 flex items-center justify-center text-text-subtle shrink-0"
            aria-label={hasChildren ? (isExpanded ? 'Contraer' : 'Expandir') : undefined}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : null}
          </button>
          <span className="font-mono text-xs text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-100 px-2 py-0.5 rounded w-24 shrink-0 text-center">
            {account.codigo}
          </span>
          <span className="flex-1 text-sm text-text-main truncate">{account.nombre}</span>
          <Badge variant={account.tipo === 'Agrupador' ? 'default' : 'info'} size="sm">
            {account.tipo}
          </Badge>
          <Badge variant={account.naturaleza === 'Deudor' ? 'primary' : 'warning'} size="sm" className="hidden sm:inline-flex">
            {account.naturaleza}
          </Badge>
          <button
            onClick={() => setDeleteCode(account.codigo)}
            className="opacity-0 group-hover:opacity-100 p-1 text-text-subtle hover:text-error hover:bg-error-soft rounded transition-all"
            aria-label="Eliminar cuenta"
            title="Eliminar cuenta"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {hasChildren && isExpanded && !searchTerm && (
          <div>{children.map(child => renderAccountNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const rootAccounts = accountsByParent.get('__root__') ?? [];
  const stats = {
    total: accounts.length,
    agrupadores: accounts.filter(a => a.tipo === 'Agrupador').length,
    detalle: accounts.filter(a => a.tipo === 'Detalle').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Cuentas"
        description="Estructura jerárquica de rubros contables"
        icon={ListTree}
        actions={
          <>
            <Button variant="outline" leftIcon={<FileDown className="w-4 h-4" />} onClick={handleExportJSON}>
              Exportar JSON
            </Button>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
              Nueva cuenta
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Total cuentas" value={stats.total} />
        <MiniStat label="Agrupadoras" value={stats.agrupadores} />
        <MiniStat label="Detalle" value={stats.detalle} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Input
            placeholder="Buscar por código o nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-soft border border-border-soft rounded-md text-[10px] uppercase tracking-wider font-semibold text-text-subtle">
            <span className="w-5" />
            <span className="w-24 text-center">Código</span>
            <span className="flex-1">Cuenta</span>
            <span className="w-16">Tipo</span>
            <span className="hidden sm:inline w-20">Naturaleza</span>
            <span className="w-6" />
          </div>

          <div>
            {searchTerm
              ? filteredAccounts.length > 0
                ? filteredAccounts.map(a => renderAccountNode(a))
                : (
                  <EmptyState icon={Search} title="Sin coincidencias" description="No se encontraron cuentas con ese término" />
                )
              : rootAccounts.map(a => renderAccountNode(a))}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setError(null); setNewAcc({ codigo: '', nombre: '', tipo: 'Detalle', naturaleza: 'Deudor' }); }}
        title="Nueva cuenta contable"
        description="Define el código jerárquico, nombre y propiedades"
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setError(null); setNewAcc({ codigo: '', nombre: '', tipo: 'Detalle', naturaleza: 'Deudor' }); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddAccount}>Guardar cuenta</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Código"
            value={newAcc.codigo}
            onChange={e => setNewAcc({ ...newAcc, codigo: e.target.value })}
            placeholder="Ej. 1.1.01.01"
            hint="Usa puntos para indicar jerarquía"
          />
          <Input
            label="Nombre de la cuenta"
            value={newAcc.nombre}
            onChange={e => setNewAcc({ ...newAcc, nombre: e.target.value })}
            placeholder="Nombre descriptivo..."
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Tipo</label>
              <select
                value={newAcc.tipo}
                onChange={e => setNewAcc({ ...newAcc, tipo: e.target.value as 'Detalle' | 'Agrupador' })}
                className="w-full h-10 px-3 bg-surface border border-border-strong rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              >
                <option value="Detalle">Detalle (permite movimientos)</option>
                <option value="Agrupador">Agrupador (suma subcuentas)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Naturaleza</label>
              <select
                value={newAcc.naturaleza}
                onChange={e => setNewAcc({ ...newAcc, naturaleza: e.target.value as 'Deudor' | 'Acreedor' })}
                className="w-full h-10 px-3 bg-surface border border-border-strong rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              >
                <option value="Deudor">Deudor (Activos / Gastos)</option>
                <option value="Acreedor">Acreedor (Pasivos / Capital / Ingresos)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-error-soft border border-error/30 text-error rounded-sm text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteCode !== null}
        onClose={() => setDeleteCode(null)}
        onConfirm={handleDelete}
        title="¿Eliminar cuenta?"
        message={`Se eliminará la cuenta ${deleteCode}. Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border-soft rounded-sm p-4">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-text-subtle">{label}</p>
      <p className="text-2xl font-bold text-text-main mt-1 tabular-nums">{value}</p>
    </div>
  );
}
