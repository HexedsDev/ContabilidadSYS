import type { RawAccount, Account } from '../types';

export const transformAccount = (raw: RawAccount): Account => {
  const parts = raw.codigo.split('.');
  const nivel = parts.length;
  const cuenta_padre = nivel > 1 ? parts.slice(0, nivel - 1).join('.') : null;

  return {
    codigo: raw.codigo,
    nombre: raw.nombre,
    tipo: raw.tipo,
    naturaleza: raw.saldo_normal,
    nivel,
    cuenta_padre,
    permite_movimientos: raw.tipo === 'Detalle',
    estado: 'activa',
  };
};

const currencyFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('es-GT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('es-GT', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatCurrency = (amount: number): string =>
  currencyFormatter.format(Number.isFinite(amount) ? amount : 0);

export const formatNumber = (amount: number): string =>
  numberFormatter.format(Number.isFinite(amount) ? amount : 0);

export const formatCompact = (amount: number): string =>
  `Q ${compactFormatter.format(Number.isFinite(amount) ? amount : 0)}`;

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-GT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (input: string | Date): string => {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d);
};

export const formatDateTime = (input: string | Date): string => {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFormatter.format(d);
};

export const formatRelative = (input: string | Date): string => {
  const d = input instanceof Date ? input : new Date(input);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'hace instantes';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return formatDate(d);
};

export const generateId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;

/**
 * Parse a user-typed amount, allowing commas, spaces, and currency symbols.
 */
export const parseAmount = (value: string | number): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};
