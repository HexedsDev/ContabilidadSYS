import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account, JournalEntry, AuditAlert } from '../types';
import rawAccounts from '../data/cat_cuentas.json';
import { transformAccount, generateId } from '../utils/helpers';

interface AppState {
  accounts: Account[];
  entries: JournalEntry[];
  alerts: AuditAlert[];
  
  initializeStore: () => void;
  loadFakeData: () => void;
  addEntry: (entry: Omit<JournalEntry, 'id' | 'numero' | 'creada_en' | 'actualizada_en'>) => void;
  updateEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  addAlert: (alert: Omit<AuditAlert, 'id' | 'resuelta'>) => void;
  resolveAlert: (id: string) => void;
  clearData: () => void;
  addAccount: (account: Account) => void;
  deleteAccount: (codigo: string) => void;
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
      { id: 'l8', cuenta_codigo: '3.1.01', debe: 0, haber: 175000 }
    ]
  },
  {
    fecha: '2026-04-02',
    concepto: 'Renta de local para la empresa',
    estado: 'contabilizada',
    observaciones: 'Pago en efectivo',
    lineas: [
      { id: 'l9', cuenta_codigo: '5.2.09', debe: 1339.29, haber: 0 },
      { id: 'l10', cuenta_codigo: '1.1.10', debe: 160.71, haber: 0 },
      { id: 'l11', cuenta_codigo: '1.1.01', debe: 0, haber: 1500.00 }
    ]
  },
  {
    fecha: '2026-04-04',
    concepto: 'Venta de mercaderías (Contado y Crédito)',
    estado: 'contabilizada',
    observaciones: 'Contado Q. 19,800.00 y crédito Q. 9,000.00',
    lineas: [
      { id: 'l12', cuenta_codigo: '1.1.01', debe: 19800.00, haber: 0 },
      { id: 'l13', cuenta_codigo: '1.1.05', debe: 9000.00, haber: 0 },
      { id: 'l14', cuenta_codigo: '4.1.01', debe: 0, haber: 25714.29 },
      { id: 'l15', cuenta_codigo: '2.1.05', debe: 0, haber: 3085.71 }
    ]
  },
  {
    fecha: '2026-04-06',
    concepto: 'Compra de mercaderías (Documentos)',
    estado: 'contabilizada',
    observaciones: 'A través de firma de documentos',
    lineas: [
      { id: 'l16', cuenta_codigo: '5.1.01', debe: 16500.00, haber: 0 },
      { id: 'l17', cuenta_codigo: '1.1.10', debe: 1980.00, haber: 0 },
      { id: 'l18', cuenta_codigo: '2.1.04', debe: 0, haber: 18480.00 }
    ]
  },
  {
    fecha: '2026-04-08',
    concepto: 'Abono por documentos pendientes',
    estado: 'contabilizada',
    observaciones: '',
    lineas: [
      { id: 'l19', cuenta_codigo: '1.1.01', debe: 10000.00, haber: 0 },
      { id: 'l20', cuenta_codigo: '1.1.07', debe: 0, haber: 10000.00 }
    ]
  },
  {
    fecha: '2026-04-10',
    concepto: 'Pago a deuda de documentos',
    estado: 'contabilizada',
    observaciones: '',
    lineas: [
      { id: 'l21', cuenta_codigo: '2.1.04', debe: 10000.00, haber: 0 },
      { id: 'l22', cuenta_codigo: '1.1.01', debe: 0, haber: 10000.00 }
    ]
  },
  {
    fecha: '2026-04-18',
    concepto: 'Devolución de mercadería',
    estado: 'contabilizada',
    observaciones: 'Recibe mercadería en devolución',
    lineas: [
      { id: 'l23', cuenta_codigo: '5.1.04', debe: 4464.29, haber: 0 },
      { id: 'l24', cuenta_codigo: '2.1.05', debe: 535.71, haber: 0 },
      { id: 'l25', cuenta_codigo: '1.1.01', debe: 0, haber: 5000.00 }
    ]
  },
  {
    fecha: '2026-04-21',
    concepto: 'Venta de mercadería al crédito (Documentos)',
    estado: 'contabilizada',
    observaciones: '',
    lineas: [
      { id: 'l26', cuenta_codigo: '1.1.07', debe: 11000.00, haber: 0 },
      { id: 'l27', cuenta_codigo: '4.1.01', debe: 0, haber: 9821.43 },
      { id: 'l28', cuenta_codigo: '2.1.05', debe: 0, haber: 1178.57 }
    ]
  },
  {
    fecha: '2026-04-25',
    concepto: 'Devolución sobre venta',
    estado: 'contabilizada',
    observaciones: 'Devolución de mercadería vendida',
    lineas: [
      { id: 'l29', cuenta_codigo: '5.1.04', debe: 3928.57, haber: 0 },
      { id: 'l30', cuenta_codigo: '2.1.05', debe: 471.43, haber: 0 },
      { id: 'l31', cuenta_codigo: '1.1.01', debe: 0, haber: 4400.00 }
    ]
  },
  {
    fecha: '2026-04-28',
    concepto: 'Pago sueldos ventas y administración',
    estado: 'contabilizada',
    observaciones: 'Incluye IGSS por pagar patronal e IGSS por pagar laboral',
    lineas: [
      { id: 'l32', cuenta_codigo: '5.2.02', debe: 3000.00, haber: 0 },
      { id: 'l33', cuenta_codigo: '5.2.03', debe: 4000.00, haber: 0 },
      { id: 'l34', cuenta_codigo: '5.2.04', debe: 500.00, haber: 0 },
      { id: 'l35', cuenta_codigo: '5.2.05', debe: 886.90, haber: 0 },
      { id: 'l36', cuenta_codigo: '5.2.50', debe: 338.10, haber: 0 },
      { id: 'l37', cuenta_codigo: '2.1.07', debe: 0, haber: 338.10 },
      { id: 'l38', cuenta_codigo: '2.1.09', debe: 0, haber: 886.90 },
      { id: 'l39', cuenta_codigo: '1.1.01', debe: 0, haber: 7500.00 }
    ]
  }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      entries: [],
      alerts: [],

      initializeStore: () => {
        const currentAccounts = get().accounts;
        if (currentAccounts.length === 0) {
          const formattedAccounts = (rawAccounts as any[]).map(transformAccount);
          set({ accounts: formattedAccounts });
        }
      },

      loadFakeData: () => {
        const now = new Date().toISOString();
        const newEntries = FAKE_ENTRIES.map((entry, index) => ({
          ...entry,
          id: generateId(),
          numero: index + 1,
          creada_en: now,
          actualizada_en: now,
          lineas: entry.lineas.map(l => ({ ...l, id: generateId() })) // refresh ids
        }));

        set({ entries: newEntries, alerts: [] });
      },

      clearData: () => {
        const formattedAccounts = (rawAccounts as any[]).map(transformAccount);
        set({ entries: [], alerts: [], accounts: formattedAccounts });
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
      },

      updateEntry: (id, updatedFields) => {
        const now = new Date().toISOString();
        set(state => ({
          entries: state.entries.map(e => 
            e.id === id ? { ...e, ...updatedFields, actualizada_en: now } : e
          )
        }));
      },

      deleteEntry: (id) => {
        set(state => ({
          entries: state.entries.filter(e => e.id !== id)
        }));
      },

      addAlert: (alertData) => {
        const newAlert: AuditAlert = {
          ...alertData,
          id: generateId(),
          resuelta: false,
        };
        set(state => ({ alerts: [...state.alerts, newAlert] }));
      },

      resolveAlert: (id) => {
        set(state => ({
          alerts: state.alerts.map(a => 
            a.id === id ? { ...a, resuelta: true } : a
          )
        }));
      },

      addAccount: (account) => {
        set(state => ({
          accounts: [...state.accounts, account].sort((a, b) => a.codigo.localeCompare(b.codigo))
        }));
      },

      deleteAccount: (codigo) => {
        set(state => ({
          accounts: state.accounts.filter(a => a.codigo !== codigo)
        }));
      }
    }),
    {
      name: 'accounting-store-v1',
    }
  )
);
