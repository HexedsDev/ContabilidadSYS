import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Search, ChevronDown, ChevronRight, FileDown, Plus, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import type { Account } from '../types';

export function CatalogoCuentas() {
  const { accounts, addAccount } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['1', '2', '3', '4', '5']));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Account State
  const [newAcc, setNewAcc] = useState({
    codigo: '',
    nombre: '',
    tipo: 'Detalle',
    naturaleza: 'Deudor',
    cuenta_padre: '',
  });
  const [error, setError] = useState<string | null>(null);

  const toggleExpand = (codigo: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo);
    } else {
      newExpanded.add(codigo);
    }
    setExpanded(newExpanded);
  };

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;
    const lower = searchTerm.toLowerCase();
    return accounts.filter(a => a.codigo.includes(lower) || a.nombre.toLowerCase().includes(lower));
  }, [accounts, searchTerm]);

  const rootAccounts = useMemo(() => {
    if (searchTerm) return filteredAccounts; // Flat list if searching
    return accounts.filter(a => a.nivel === 1);
  }, [filteredAccounts, searchTerm, accounts]);

  const getChildren = (parentCodigo: string) => {
    return accounts.filter(a => a.cuenta_padre === parentCodigo);
  };

  const handleAddAccount = () => {
    if (!newAcc.codigo || !newAcc.nombre) {
      setError('Código y nombre son obligatorios.');
      return;
    }
    if (accounts.some(a => a.codigo === newAcc.codigo)) {
      setError('El código de cuenta ya existe.');
      return;
    }

    const nivel = newAcc.codigo.split('.').length;
    const cuenta_padre = nivel > 1 ? newAcc.codigo.split('.').slice(0, -1).join('.') : null;

    addAccount({
      ...newAcc,
      nivel,
      cuenta_padre,
      permite_movimientos: newAcc.tipo === 'Detalle',
      estado: 'activa',
    });

    setIsModalOpen(false);
    setNewAcc({ codigo: '', nombre: '', tipo: 'Detalle', naturaleza: 'Deudor', cuenta_padre: '' });
    setError(null);
  };

  const renderAccountNode = (account: Account) => {
    const children = getChildren(account.codigo);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(account.codigo);

    return (
      <div key={account.codigo} className="w-full">
        <div 
          className={`flex items-center py-2 px-3 hover:bg-background rounded-md transition-colors cursor-pointer border-b border-border-soft/30 ${account.nivel === 1 ? 'font-semibold bg-primary-50/30' : ''}`}
          onClick={() => hasChildren && toggleExpand(account.codigo)}
        >
          <div className="flex-shrink-0 w-6 flex items-center justify-center" style={{ marginLeft: `${(account.nivel - 1) * 1.5}rem` }}>
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />
            ) : <div className="w-4 h-4" />}
          </div>
          <div className="w-32 font-mono text-sm text-text-muted shrink-0">{account.codigo}</div>
          <div className="flex-1 text-sm text-text-main">{account.nombre}</div>
          <div className="w-24 text-right shrink-0">
            <Badge variant={account.tipo === 'Agrupador' ? 'default' : 'info'}>{account.tipo}</Badge>
          </div>
          <div className="w-24 text-right shrink-0 text-sm text-text-muted">{account.naturaleza}</div>
        </div>
        
        {hasChildren && isExpanded && !searchTerm && (
          <div className="w-full">
            {children.map(child => renderAccountNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Catálogo de Cuentas</h1>
          <p className="text-text-muted mt-1">Estructura jerárquica y rubros contables.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-soft rounded-md text-sm font-medium hover:bg-background transition-colors">
            <FileDown className="w-4 h-4" /> Exportar JSON
          </button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Cuenta
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b border-border-soft">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border-soft rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex px-3 py-3 bg-primary-50 border-b border-border-soft text-sm font-semibold text-primary-700">
            <div className="w-6 shrink-0"></div>
            <div className="w-32 shrink-0">Código</div>
            <div className="flex-1">Nombre de Cuenta</div>
            <div className="w-24 text-right shrink-0">Tipo</div>
            <div className="w-24 text-right shrink-0 pr-3">Naturaleza</div>
          </div>
          <div className="p-2">
            {searchTerm ? (
              filteredAccounts.length > 0 ? (
                filteredAccounts.map(acc => renderAccountNode(acc))
              ) : (
                <div className="text-center py-8 text-text-muted">No se encontraron cuentas.</div>
              )
            ) : (
              rootAccounts.map(acc => renderAccountNode(acc))
            )}
          </div>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Agregar Nueva Cuenta"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-main">Código (ej: 1.1.01.01)</label>
            <input
              type="text"
              value={newAcc.codigo}
              onChange={e => setNewAcc({ ...newAcc, codigo: e.target.value })}
              placeholder="X.X.XX.XX"
              className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-main">Nombre de la Cuenta</label>
            <input
              type="text"
              value={newAcc.nombre}
              onChange={e => setNewAcc({ ...newAcc, nombre: e.target.value })}
              placeholder="Nombre descriptivo..."
              className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">Tipo</label>
              <select
                value={newAcc.tipo}
                onChange={e => setNewAcc({ ...newAcc, tipo: e.target.value })}
                className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="Detalle">Detalle (Permite movimientos)</option>
                <option value="Agrupador">Agrupador (Suma subcuentas)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-main">Naturaleza</label>
              <select
                value={newAcc.naturaleza}
                onChange={e => setNewAcc({ ...newAcc, naturaleza: e.target.value })}
                className="w-full border border-border-soft rounded-md p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="Deudor">Deudor (Activos/Gastos)</option>
                <option value="Acreedor">Acreedor (Pasivos/Capital/Ingresos)</option>
              </select>
            </div>
          </div>
          
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 text-error rounded-md text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleAddAccount}>Guardar Cuenta</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
