import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account, JournalEntry, AuditAlert, RawAccount, Empresa, AiSettings } from '../types';
import rawAccounts from '../data/cat_cuentas.json';
import { transformAccount, generateId } from '../utils/helpers';
import { DEFAULT_CIERRE_RATES, type CierreRates } from '../utils/cierre';

export type ThemeMode = 'light' | 'dark' | 'system';

const DEFAULT_EMPRESA: Empresa = {
  razon_social: 'Mi Empresa, S.A.',
  nit: '0000000-0',
  direccion: 'Ciudad de Guatemala',
  telefono: '',
  email: '',
  moneda: 'GTQ',
  simbolo_moneda: 'Q',
  periodo_inicio: '2026-01-01',
  periodo_fin: '2026-12-31',
  ciclo: 'Ciclo Contable 2026',
};

const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  apiKey: '',
};

interface AppState {
  accounts: Account[];
  entries: JournalEntry[];
  alerts: AuditAlert[];
  empresa: Empresa;
  aiSettings: AiSettings;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  cierreRates: CierreRates;

  initializeStore: () => void;
  loadFakeData: () => void;
  addEntry: (entry: Omit<JournalEntry, 'id' | 'numero' | 'creada_en' | 'actualizada_en'>) => JournalEntry;
  updateEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  voidEntry: (id: string) => void;
  addAlert: (alert: Omit<AuditAlert, 'id' | 'resuelta'>) => void;
  resolveAlert: (id: string) => void;
  clearAlerts: () => void;
  clearData: () => void;
  addAccount: (account: Account) => void;
  deleteAccount: (codigo: string) => void;
  setEmpresa: (empresa: Partial<Empresa>) => void;
  setAiSettings: (settings: Partial<AiSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setCierreRates: (rates: Partial<CierreRates>) => void;
}

const FAKE_ENTRIES: Omit<JournalEntry, 'id' | 'numero' | 'creada_en' | 'actualizada_en'>[] = [
  {
    fecha: '2026-04-01',
    concepto: 'Partida de Apertura - El Éxito',
    estado: 'contabilizada',
    observaciones: 'Apertura según inventario inicial',
    lineas: [
      { id: 'l1', cuenta_codigo: '1.1.13', debe: 50000, haber: 0 },
      { id: 'l2', cuenta_codigo: '1.1.01', debe: 40000, haber: 0 },
      { id: 'l3', cuenta_codigo: '1.2.04', debe: 25000, haber: 0 },
      { id: 'l4', cuenta_codigo: '1.1.07', debe: 20000, haber: 0 },
      { id: 'l5', cuenta_codigo: '1.2.06', debe: 70000, haber: 0 },
      { id: 'l6', cuenta_codigo: '2.1.02', debe: 0, haber: 10000 },
      { id: 'l7', cuenta_codigo: '2.1.04', debe: 0, haber: 20000 },
      { id: 'l8', cuenta_codigo: '3.1.01', debe: 0, haber: 175000 },
    ],
  },
  {
    fecha: '2026-04-02',
    concepto: 'Renta de local para la empresa',
    estado: 'contabilizada',
    observaciones: 'Pago en efectivo',
    lineas: [
      { id: 'l9', cuenta_codigo: '5.2.09', debe: 1339.29, haber: 0 },
      { id: 'l10', cuenta_codigo: '1.1.10', debe: 160.71, haber: 0 },
      { id: 'l11', cuenta_codigo: '1.1.01', debe: 0, haber: 1500.0 },
    ],
  },
  {
    fecha: '2026-04-04',
    concepto: 'Venta de mercaderías (Contado y Crédito)',
    estado: 'contabilizada',
    observaciones: 'Contado Q. 19,800.00 y crédito Q. 9,000.00',
    lineas: [
      { id: 'l12', cuenta_codigo: '1.1.01', debe: 19800.0, haber: 0 },
      { id: 'l13', cuenta_codigo: '1.1.05', debe: 9000.0, haber: 0 },
      { id: 'l14', cuenta_codigo: '4.1.01', debe: 0, haber: 25714.29 },
      { id: 'l15', cuenta_codigo: '2.1.05', debe: 0, haber: 3085.71 },
    ],
  },
  {
    fecha: '2026-04-06',
    concepto: 'Compra de mercaderías (Documentos)',
    estado: 'contabilizada',
    observaciones: 'A través de firma de documentos',
    lineas: [
      { id: 'l16', cuenta_codigo: '5.1.01', debe: 16500.0, haber: 0 },
      { id: 'l17', cuenta_codigo: '1.1.10', debe: 1980.0, haber: 0 },
      { id: 'l18', cuenta_codigo: '2.1.04', debe: 0, haber: 18480.0 },
    ],
  },
  {
    fecha: '2026-04-08',
    concepto: 'Abono por documentos pendientes',
    estado: 'contabilizada',
    observaciones: '',
    lineas: [
      { id: 'l19', cuenta_codigo: '1.1.01', debe: 10000.0, haber: 0 },
      { id: 'l20', cuenta_codigo: '1.1.07', debe: 0, haber: 10000.0 },
    ],
  },
  {
    fecha: '2026-04-10',
    concepto: 'Pago a deuda de documentos',
    estado: 'contabilizada',
    observaciones: '',
    lineas: [
      { id: 'l21', cuenta_codigo: '2.1.04', debe: 10000.0, haber: 0 },
      { id: 'l22', cuenta_codigo: '1.1.01', debe: 0, haber: 10000.0 },
    ],
  },
  {
    fecha: '2026-04-18',
    concepto: 'Devolución de mercadería',
    estado: 'contabilizada',
    observaciones: 'Recibe mercadería en devolución',
    lineas: [
      { id: 'l23', cuenta_codigo: '5.1.04', debe: 4464.29, haber: 0 },
      { id: 'l24', cuenta_codigo: '2.1.05', debe: 535.71, haber: 0 },
      { id: 'l25', cuenta_codigo: '1.1.01', debe: 0, haber: 5000.0 },
    ],
  },
  {
    fecha: '2026-04-21',
    concepto: 'Venta de mercadería al crédito (Documentos)',
    estado: 'contabilizada',
    observaciones: '',
    lineas: [
      { id: 'l26', cuenta_codigo: '1.1.07', debe: 11000.0, haber: 0 },
      { id: 'l27', cuenta_codigo: '4.1.01', debe: 0, haber: 9821.43 },
      { id: 'l28', cuenta_codigo: '2.1.05', debe: 0, haber: 1178.57 },
    ],
  },
  {
    fecha: '2026-04-25',
    concepto: 'Devolución sobre compras',
    estado: 'contabilizada',
    observaciones: 'Devuelve mercadería comprada (contra-costo 4.1.03 y reversa IVA crédito)',
    lineas: [
      { id: 'l29', cuenta_codigo: '1.1.01', debe: 4400.0, haber: 0 },
      { id: 'l30', cuenta_codigo: '4.1.03', debe: 0, haber: 3928.57 },
      { id: 'l31', cuenta_codigo: '1.1.10', debe: 0, haber: 471.43 },
    ],
  },
  {
    fecha: '2026-04-28',
    concepto: 'Pago sueldos ventas y administración',
    estado: 'contabilizada',
    observaciones: 'Cuota patronal IGSS es gasto; cuota laboral IGSS (338.10) se retiene al trabajador',
    lineas: [
      { id: 'l32', cuenta_codigo: '5.2.02', debe: 3000.0, haber: 0 },
      { id: 'l33', cuenta_codigo: '5.2.03', debe: 4000.0, haber: 0 },
      { id: 'l34', cuenta_codigo: '5.2.04', debe: 500.0, haber: 0 },
      { id: 'l35', cuenta_codigo: '5.2.05', debe: 886.9, haber: 0 },
      { id: 'l36', cuenta_codigo: '2.1.09', debe: 0, haber: 886.9 },
      { id: 'l37', cuenta_codigo: '2.1.07', debe: 0, haber: 338.1 },
      { id: 'l38', cuenta_codigo: '1.1.01', debe: 0, haber: 7161.9 },
    ],
  },
];

const seedAccounts = (): Account[] =>
  (rawAccounts as RawAccount[]).map(transformAccount);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      entries: [],
      alerts: [],
      empresa: DEFAULT_EMPRESA,
      aiSettings: DEFAULT_AI_SETTINGS,
      theme: 'light',
      sidebarCollapsed: false,
      cierreRates: DEFAULT_CIERRE_RATES,

      initializeStore: () => {
        if (get().accounts.length === 0) {
          set({ accounts: seedAccounts() });
        }
      },

      loadFakeData: () => {
        const now = new Date().toISOString();
        const newEntries: JournalEntry[] = FAKE_ENTRIES.map((entry, index) => ({
          ...entry,
          id: generateId(),
          numero: index + 1,
          creada_en: now,
          actualizada_en: now,
          lineas: entry.lineas.map(l => ({ ...l, id: generateId() })),
        }));
        set({ entries: newEntries, alerts: [] });
      },

      clearData: () => {
        set({ entries: [], alerts: [], accounts: seedAccounts() });
      },

      addEntry: (entryData) => {
        const { entries } = get();
        const numero = entries.length > 0 ? Math.max(...entries.map(e => e.numero)) + 1 : 1;
        const now = new Date().toISOString();
        const newEntry: JournalEntry = {
          ...entryData,
          id: generateId(),
          numero,
          creada_en: now,
          actualizada_en: now,
        };
        set({ entries: [...entries, newEntry] });
        return newEntry;
      },

      updateEntry: (id, updatedFields) => {
        const now = new Date().toISOString();
        set(state => ({
          entries: state.entries.map(e =>
            e.id === id ? { ...e, ...updatedFields, actualizada_en: now } : e
          ),
        }));
      },

      deleteEntry: (id) => {
        set(state => ({ entries: state.entries.filter(e => e.id !== id) }));
      },

      voidEntry: (id) => {
        const now = new Date().toISOString();
        set(state => ({
          entries: state.entries.map(e =>
            e.id === id ? { ...e, estado: 'anulada', actualizada_en: now } : e
          ),
        }));
      },

      addAlert: (alertData) => {
        const newAlert: AuditAlert = { ...alertData, id: generateId(), resuelta: false };
        set(state => ({ alerts: [...state.alerts, newAlert] }));
      },

      resolveAlert: (id) => {
        set(state => ({
          alerts: state.alerts.map(a => (a.id === id ? { ...a, resuelta: true } : a)),
        }));
      },

      clearAlerts: () => set({ alerts: [] }),

      addAccount: (account) => {
        set(state => ({
          accounts: [...state.accounts, account].sort((a, b) =>
            a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
          ),
        }));
      },

      deleteAccount: (codigo) => {
        set(state => ({ accounts: state.accounts.filter(a => a.codigo !== codigo) }));
      },

      setEmpresa: (empresa) => {
        set(state => ({ empresa: { ...state.empresa, ...empresa } }));
      },

      setAiSettings: (settings) => {
        set(state => ({ aiSettings: { ...state.aiSettings, ...settings } }));
      },

      setCierreRates: (rates) => {
        set(state => ({ cierreRates: { ...state.cierreRates, ...rates } }));
      },

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    {
      name: 'accounting-store-v3',
      partialize: (state) => ({
        accounts: state.accounts,
        entries: state.entries,
        alerts: state.alerts,
        empresa: state.empresa,
        aiSettings: state.aiSettings,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        cierreRates: state.cierreRates,
      }),
      onRehydrateStorage: () => state => {
        if (!state || state.accounts.length === 0) return;
        // Migración de catálogo: agrega cuentas del catálogo base que falten en
        // stores ya persistidos (p.ej. el agrupador 3.1 o las cuentas de
        // depreciación de maquinaria/herramientas) sin tocar las del usuario.
        const existing = new Set(state.accounts.map(a => a.codigo));
        const missing = seedAccounts().filter(a => !existing.has(a.codigo));
        if (missing.length > 0) {
          useStore.setState({
            accounts: [...state.accounts, ...missing].sort((a, b) =>
              a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
            ),
          });
        }
      },
    }
  )
);

/* === Selectors === */

export interface AccountBalance {
  codigo: string;
  nombre: string;
  naturaleza: string;
  debe: number;
  haber: number;
  saldo: number; // signed by naturaleza
}

export const computeBalances = (
  entries: JournalEntry[],
  accounts: Account[]
): Record<string, AccountBalance> => {
  const map: Record<string, AccountBalance> = {};
  const validEntries = entries.filter(
    e => e.estado === 'contabilizada' || e.estado === 'observada'
  );

  for (const entry of validEntries) {
    for (const line of entry.lineas) {
      const acc = accounts.find(a => a.codigo === line.cuenta_codigo);
      if (!acc) continue;
      if (!map[acc.codigo]) {
        map[acc.codigo] = {
          codigo: acc.codigo,
          nombre: acc.nombre,
          naturaleza: acc.naturaleza,
          debe: 0,
          haber: 0,
          saldo: 0,
        };
      }
      map[acc.codigo].debe += line.debe || 0;
      map[acc.codigo].haber += line.haber || 0;
    }
  }

  for (const code in map) {
    const b = map[code];
    b.saldo = b.naturaleza === 'Deudor' ? b.debe - b.haber : b.haber - b.debe;
  }
  return map;
};

export const totalsByPrefix = (
  balances: Record<string, AccountBalance>,
  prefix: string
): number => {
  let total = 0;
  for (const code in balances) {
    if (code.startsWith(prefix)) total += balances[code].saldo;
  }
  return total;
};

/** Filter entries by inclusive date range. Null bounds = unbounded. */
export const filterByDateRange = (
  entries: JournalEntry[],
  from: string | null,
  to: string | null
): JournalEntry[] => {
  if (!from && !to) return entries;
  return entries.filter(e => {
    if (from && e.fecha < from) return false;
    if (to && e.fecha > to) return false;
    return true;
  });
};
