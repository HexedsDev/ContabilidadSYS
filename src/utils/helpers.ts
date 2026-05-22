import type { RawAccount, Account } from '../types';

export const transformAccount = (raw: RawAccount): Account => {
  const parts = raw.codigo.split('.');
  const nivel = parts.length;
  let cuenta_padre = null;
  if (nivel > 1) {
    cuenta_padre = parts.slice(0, nivel - 1).join('.');
  }

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

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
  }).format(amount);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 11);
};
