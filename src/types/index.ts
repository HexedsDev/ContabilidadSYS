export interface RawAccount {
  codigo: string;
  nombre: string;
  tipo: 'Agrupador' | 'Detalle' | string;
  saldo_normal: 'Deudor' | 'Acreedor' | string;
  estado_financiero: string;
}

export type AccountType = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Gasto' | 'Costo' | string;
export type AccountNature = 'Deudor' | 'Acreedor' | string;

export interface Account {
  codigo: string;
  nombre: string;
  tipo: 'Agrupador' | 'Detalle' | string;
  naturaleza: AccountNature;
  nivel: number;
  cuenta_padre: string | null;
  permite_movimientos: boolean;
  estado: 'activa' | 'inactiva' | string;
}

export type EntryStatus = 'borrador' | 'contabilizada' | 'observada' | 'anulada';

export interface EntryLine {
  id: string;
  cuenta_codigo: string;
  debe: number;
  haber: number;
  concepto_linea?: string;
}

export interface JournalEntry {
  id: string;
  numero: number;
  fecha: string;
  concepto: string;
  estado: EntryStatus;
  observaciones: string;
  lineas: EntryLine[];
  creada_en: string;
  actualizada_en: string;
}

export interface AuditAlert {
  id: string;
  fecha: string;
  tipo: 'descuadre' | 'saldo_negativo' | 'movimiento_invalido' | 'cuenta_agrupadora' | string;
  severidad: 'alta' | 'media' | 'baja';
  descripcion: string;
  sugerencia: string;
  referencia_id?: string;
  resuelta: boolean;
}

export interface Empresa {
  razon_social: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  moneda: string;
  simbolo_moneda: string;
  periodo_inicio: string; // YYYY-MM-DD
  periodo_fin: string;    // YYYY-MM-DD
  ciclo: string;          // e.g. "Ciclo Contable 2026"
}

export interface AiSettings {
  enabled: boolean;
  apiKey: string;
}

export type UserRole = 'super_admin' | 'contador';

export interface User {
  id: string;
  nombre: string;
  email: string;
  password: string;
  rol: UserRole;
  activo: boolean;
  creado_en: string;
}

export interface AuthState {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  createUser: (user: Omit<User, 'id' | 'creado_en'>) => { success: boolean; message: string };
  deleteUser: (id: string) => { success: boolean; message: string };
  updateUser: (
    id: string,
    updates: Partial<Omit<User, 'id' | 'creado_en'>>
  ) => { success: boolean; message: string };
}

export interface DateRange {
  from: string | null;
  to: string | null;
}
