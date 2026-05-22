import { useMemo, useState } from 'react';
import { Plus, Trash2, UserRoundCog, Power, PowerOff } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/toast-context';
import { useAuthStore } from '../store/useAuthStore';

const initialForm = {
  nombre: '',
  email: '',
  password: '',
  rol: 'contador' as const,
};

export function AdminUsuarios() {
  const toast = useToast();
  const users = useAuthStore(s => s.users);
  const currentUser = useAuthStore(s => s.currentUser);
  const createUser = useAuthStore(s => s.createUser);
  const updateUser = useAuthStore(s => s.updateUser);
  const deleteUser = useAuthStore(s => s.deleteUser);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const active = users.filter(user => user.activo).length;
    const counters = users.filter(user => user.rol === 'contador').length;
    return { total: users.length, active, counters };
  }, [users]);

  const resetForm = () => setForm(initialForm);

  const handleCreate = () => {
    setSaving(true);
    const result = createUser({
      nombre: form.nombre,
      email: form.email,
      password: form.password,
      rol: form.rol,
      activo: true,
    });
    setSaving(false);

    if (!result.success) {
      toast.error('No se pudo crear el usuario', result.message);
      return;
    }

    toast.success('Usuario creado', 'El nuevo contador quedó registrado');
    setOpen(false);
    resetForm();
  };

  const handleToggleActive = (userId: string, nextActive: boolean) => {
    const result = updateUser(userId, { activo: nextActive });
    if (!result.success) {
      toast.error('No se pudo actualizar el estado', result.message);
      return;
    }
    toast.success(nextActive ? 'Usuario activado' : 'Usuario desactivado');
  };

  const handleDelete = (userId: string) => {
    const result = deleteUser(userId);
    if (!result.success) {
      toast.error('No se pudo eliminar', result.message);
      return;
    }
    toast.success('Usuario eliminado');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de usuarios"
        description="El Super Admin puede crear, desactivar y eliminar contadores."
        icon={UserRoundCog}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
            Crear usuario
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-widest text-text-muted">Usuarios</p>
            <p className="mt-2 text-3xl font-semibold text-text-main">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-widest text-text-muted">Activos</p>
            <p className="mt-2 text-3xl font-semibold text-success">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-widest text-text-muted">Contadores</p>
            <p className="mt-2 text-3xl font-semibold text-primary-700">{stats.counters}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-hidden rounded-sm border border-border-soft">
            <div className="grid grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_0.8fr] bg-surface-soft px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <div>Nombre</div>
              <div>Email</div>
              <div>Rol</div>
              <div>Estado</div>
              <div className="text-right">Acciones</div>
            </div>

            <div className="divide-y divide-border-soft bg-surface">
              {users.map(user => {
                const isCurrent = currentUser?.id === user.id;
                return (
                  <div key={user.id} className="grid grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_0.8fr] items-center px-4 py-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-text-main truncate">{user.nombre}</p>
                      <p className="text-xs text-text-muted mt-0.5">Creado {new Date(user.creado_en).toLocaleDateString()}</p>
                    </div>
                    <div className="min-w-0 truncate text-text-muted">{user.email}</div>
                    <div>
                      <Badge variant={user.rol === 'super_admin' ? 'primary' : 'default'} size="sm">
                        {user.rol === 'super_admin' ? 'Super Admin' : 'Contador'}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant={user.activo ? 'success' : 'warning'} dot size="sm">
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={user.activo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        onClick={() => handleToggleActive(user.id, !user.activo)}
                        disabled={isCurrent && !user.activo}
                      >
                        {user.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleDelete(user.id)}
                        disabled={user.rol === 'super_admin' && users.filter(u => u.rol === 'super_admin' && u.activo).length <= 1}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title="Crear usuario"
        description="Registra un nuevo contador para acceder al sistema."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={saving}>
              Crear usuario
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
            placeholder="Nombre del contador"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="contador@empresa.com"
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Define una contraseña"
          />
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Rol</label>
            <div className="rounded-sm border border-border-strong bg-surface-soft px-3 py-2.5 text-sm text-text-main">
              Contador
            </div>
            <p className="mt-1 text-xs text-text-muted">
              En esta versión el Super Admin crea contadores directamente.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
