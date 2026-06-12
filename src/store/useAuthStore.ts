import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/helpers';
import type { AuthState, User, UserRole } from '../types';

type AuthResult = { success: boolean; message: string };

const DEFAULT_SUPER_ADMIN: User = {
  id: 'auth-super-admin',
  nombre: 'Monky Adam',
  email: 'monky.adam@contabilidad.sys',
  password: 'monky2026',
  rol: 'super_admin',
  activo: true,
  creado_en: '2026-01-01T00:00:00.000Z',
};

const DEFAULT_DERIK_USER: User = {
  id: 'auth-demo-counter',
  nombre: 'Monky Derik',
  email: 'monky.derik@contabilidad.sys',
  password: 'monky2026',
  rol: 'contador',
  activo: true,
  creado_en: '2026-01-02T00:00:00.000Z',
};

const DEFAULT_MARK_USER: User = {
  id: 'auth-monky-mark',
  nombre: 'Monky Mark',
  email: 'monky.mark@contabilidad.sys',
  password: 'monky2026',
  rol: 'contador',
  activo: true,
  creado_en: '2026-01-03T00:00:00.000Z',
};

const DEFAULT_EMPERATRIZ_USER: User = {
  id: 'auth-monky-emperatriz',
  nombre: 'Monky Emperatriz',
  email: 'monky.emperatriz@contabilidad.sys',
  password: 'monky2026',
  rol: 'contador',
  activo: true,
  creado_en: '2026-01-04T00:00:00.000Z',
};

const seedUsers = (): User[] => [
  DEFAULT_SUPER_ADMIN,
  DEFAULT_DERIK_USER,
  DEFAULT_MARK_USER,
  DEFAULT_EMPERATRIZ_USER,
];

const syncSeedUsers = (users: User[]): User[] => {
  const seedsById = new Map(seedUsers().map(user => [user.id, user]));
  return users.map(user => {
    const seed = seedsById.get(user.id);
    return seed ? { ...seed, activo: user.activo } : user;
  });
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const makeResult = (success: boolean, message: string): AuthResult => ({ success, message });

const findUserByEmail = (users: User[], email: string) =>
  users.find(user => normalizeEmail(user.email) === normalizeEmail(email));

const getActiveSuperAdminCount = (users: User[]) =>
  users.filter(user => user.rol === 'super_admin' && user.activo).length;

const canKeepSuperAdmin = (users: User[], targetId: string, nextActive: boolean, nextRole?: UserRole) => {
  const target = users.find(user => user.id === targetId);
  if (!target || target.rol !== 'super_admin') return true;

  const remainingActiveSuperAdmins = users.filter(
    user => user.rol === 'super_admin' && user.activo && user.id !== targetId
  ).length;

  const nextWouldBeSuperAdmin = nextRole ? nextRole === 'super_admin' : target.rol === 'super_admin';
  if (nextWouldBeSuperAdmin && nextActive) return true;

  return remainingActiveSuperAdmins > 0;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: seedUsers(),
      removedSeedIds: [],
      isAuthenticated: false,
      hydrated: false,

      login: (email, password) => {
        const users = get().users.length > 0 ? get().users : seedUsers();
        const user = findUserByEmail(users, email);

        if (!user) {
          return makeResult(false, 'Credenciales inválidas');
        }

        if (!user.activo) {
          return makeResult(false, 'Este usuario está desactivado');
        }

        if (user.password !== password) {
          return makeResult(false, 'Credenciales inválidas');
        }

        set({
          currentUser: user,
          isAuthenticated: true,
        });

        return makeResult(true, 'Sesión iniciada');
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      createUser: userData => {
        const users = get().users.length > 0 ? get().users : seedUsers();
        const email = normalizeEmail(userData.email);

        if (!userData.nombre.trim()) {
          return makeResult(false, 'El nombre es obligatorio');
        }
        if (!email) {
          return makeResult(false, 'El email es obligatorio');
        }
        if (!userData.password.trim()) {
          return makeResult(false, 'La contraseña es obligatoria');
        }
        if (findUserByEmail(users, email)) {
          return makeResult(false, 'Ya existe un usuario con ese email');
        }
        if (userData.rol === 'super_admin' && getActiveSuperAdminCount(users) > 0) {
          return makeResult(false, 'Ya existe un Super Admin activo');
        }

        const newUser: User = {
          id: generateId(),
          nombre: userData.nombre.trim(),
          email,
          password: userData.password,
          rol: userData.rol,
          activo: userData.activo ?? true,
          creado_en: new Date().toISOString(),
        };

        set(state => ({ users: [...state.users, newUser].sort((a, b) => a.nombre.localeCompare(b.nombre)) }));
        return makeResult(true, 'Usuario creado');
      },

      deleteUser: id => {
        const { users, currentUser } = get();
        const target = users.find(user => user.id === id);

        if (!target) {
          return makeResult(false, 'Usuario no encontrado');
        }

        if (!canKeepSuperAdmin(users, id, false)) {
          return makeResult(false, 'Debe conservar al menos un Super Admin activo');
        }

        const seedIds = new Set(seedUsers().map(user => user.id));
        set(state => ({
          users: state.users.filter(user => user.id !== id),
          // Tombstone: sin esto, un usuario semilla eliminado "resucitaría" en
          // la próxima hidratación al volver a fusionar seedUsers().
          ...(seedIds.has(id)
            ? { removedSeedIds: [...new Set([...state.removedSeedIds, id])] }
            : {}),
          ...(currentUser?.id === id ? { currentUser: null, isAuthenticated: false } : {}),
        }));

        return makeResult(true, 'Usuario eliminado');
      },

      updateUser: (id, updates) => {
        const { users } = get();
        const target = users.find(user => user.id === id);

        if (!target) {
          return makeResult(false, 'Usuario no encontrado');
        }

        const nextEmail = updates.email ? normalizeEmail(updates.email) : target.email;
        const duplicate = users.find(user => user.id !== id && normalizeEmail(user.email) === nextEmail);
        if (duplicate) {
          return makeResult(false, 'Ya existe un usuario con ese email');
        }

        const nextRole = updates.rol ?? target.rol;
        const nextActive = updates.activo ?? target.activo;
        if (!canKeepSuperAdmin(users, id, nextActive, nextRole)) {
          return makeResult(false, 'Debe conservar al menos un Super Admin activo');
        }

        const updatedUser: User = {
          ...target,
          ...updates,
          nombre: updates.nombre !== undefined ? updates.nombre.trim() : target.nombre,
          email: nextEmail,
          password: updates.password !== undefined ? updates.password : target.password,
          rol: nextRole,
          activo: nextActive,
        };

        set(state => ({
          users: state.users
            .map(user => (user.id === id ? updatedUser : user))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
          currentUser:
            get().currentUser?.id === id
              ? updatedUser.activo
                ? updatedUser
                : null
              : get().currentUser,
          isAuthenticated:
            get().currentUser?.id === id
              ? updatedUser.activo
              : get().isAuthenticated,
        }));

        return makeResult(true, 'Usuario actualizado');
      },
    }),
    {
      name: 'auth-store-v1',
      partialize: state => ({
        currentUser: state.currentUser,
        users: state.users,
        removedSeedIds: state.removedSeedIds,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => state => {
        if (!state) return;
        // Seeds eliminados por un admin no vuelven a sembrarse (tombstones).
        const removedSeedIds = state.removedSeedIds ?? [];
        const removed = new Set(removedSeedIds);
        const persistedUsers = syncSeedUsers(state.users ?? []);
        const seededUsers = seedUsers().filter(user => !removed.has(user.id));
        // Persisted users come FIRST so active/deleted state is respected.
        // Seeded users are added only when no persisted user shares the same id/email.
        const users = [...persistedUsers, ...seededUsers].reduce<User[]>((acc, user) => {
          const exists = acc.some(item => item.id === user.id || item.email === user.email);
          if (!exists) acc.push(user);
          return acc;
        }, []);
        const currentUser =
          state.currentUser && users.some(user => user.id === state.currentUser?.id && user.activo)
            ? users.find(user => user.id === state.currentUser?.id) ?? null
            : null;
        useAuthStore.setState({
          users,
          currentUser,
          removedSeedIds,
          isAuthenticated: !!currentUser && currentUser.activo,
          hydrated: true,
        });
      },
    }
  )
);
