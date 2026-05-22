import type { Account, JournalEntry, EntryLine, Empresa } from '../types';

/**
 * Security boundary for importing untrusted JSON backups.
 *
 * Defends against:
 * - Prototype pollution (`__proto__`, `constructor`, `prototype` keys)
 * - DoS via oversized payloads (10MB file cap, array length caps)
 * - Schema confusion (every field strictly type-checked)
 * - Memory bombs (string length caps per field)
 */

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ENTRIES = 50_000;
export const MAX_ACCOUNTS = 10_000;
export const MAX_LINES_PER_ENTRY = 500;
export const MAX_STRING_LEN = 2_000;

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/** JSON.parse reviver that rejects prototype-polluting keys. */
const safeReviver = (key: string, value: unknown): unknown => {
  if (DANGEROUS_KEYS.has(key)) {
    throw new Error(`Clave peligrosa detectada: ${key}`);
  }
  return value;
};

const isString = (v: unknown, max = MAX_STRING_LEN): v is string =>
  typeof v === 'string' && v.length <= max;

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

interface ValidationResult {
  accounts: Account[];
  entries: JournalEntry[];
  empresa?: Empresa;
}

const VALID_ENTRY_STATUS = new Set(['borrador', 'contabilizada', 'observada', 'anulada']);
const VALID_ACCOUNT_TYPES = new Set(['Agrupador', 'Detalle']);
const VALID_NATURE = new Set(['Deudor', 'Acreedor']);
const VALID_ACCOUNT_STATE = new Set(['activa', 'inactiva']);

export const validateEmpresa = (raw: unknown): Empresa => {
  if (!isPlainObject(raw)) throw new Error('empresa no es objeto');
  const {
    razon_social,
    nit,
    direccion,
    telefono,
    email,
    moneda,
    simbolo_moneda,
    periodo_inicio,
    periodo_fin,
    ciclo,
  } = raw;

  if (!isString(razon_social, 200) || razon_social.trim().length === 0) {
    throw new Error('empresa.razon_social inválido');
  }
  if (!isString(nit, 50)) throw new Error('empresa.nit inválido');
  if (!isString(direccion, 300)) throw new Error('empresa.direccion inválido');
  if (!isString(telefono, 50)) throw new Error('empresa.telefono inválido');
  if (!isString(email, 200)) throw new Error('empresa.email inválido');
  if (!isString(moneda, 20)) throw new Error('empresa.moneda inválido');
  if (!isString(simbolo_moneda, 10)) throw new Error('empresa.simbolo_moneda inválido');
  if (!isString(periodo_inicio, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(periodo_inicio)) {
    throw new Error('empresa.periodo_inicio inválido');
  }
  if (!isString(periodo_fin, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(periodo_fin)) {
    throw new Error('empresa.periodo_fin inválido');
  }
  if (!isString(ciclo, 100)) throw new Error('empresa.ciclo inválido');

  return {
    razon_social: razon_social.trim(),
    nit: nit.trim(),
    direccion: direccion.trim(),
    telefono: telefono.trim(),
    email: email.trim(),
    moneda: moneda.trim(),
    simbolo_moneda: simbolo_moneda.trim(),
    periodo_inicio: periodo_inicio.trim(),
    periodo_fin: periodo_fin.trim(),
    ciclo: ciclo.trim(),
  };
};

const validateAccount = (raw: unknown, idx: number): Account => {
  if (!isPlainObject(raw)) throw new Error(`accounts[${idx}] no es objeto`);
  const { codigo, nombre, tipo, naturaleza, nivel, cuenta_padre, permite_movimientos, estado } = raw;

  if (!isString(codigo, 50) || !/^[0-9.]+$/.test(codigo)) {
    throw new Error(`accounts[${idx}].codigo inválido`);
  }
  if (!isString(nombre, 200)) throw new Error(`accounts[${idx}].nombre inválido`);
  if (!isString(tipo) || !VALID_ACCOUNT_TYPES.has(tipo)) {
    throw new Error(`accounts[${idx}].tipo inválido`);
  }
  if (!isString(naturaleza) || !VALID_NATURE.has(naturaleza)) {
    throw new Error(`accounts[${idx}].naturaleza inválido`);
  }
  if (!isFiniteNumber(nivel) || nivel < 1 || nivel > 10) {
    throw new Error(`accounts[${idx}].nivel inválido`);
  }
  if (cuenta_padre !== null && !isString(cuenta_padre, 50)) {
    throw new Error(`accounts[${idx}].cuenta_padre inválido`);
  }
  if (typeof permite_movimientos !== 'boolean') {
    throw new Error(`accounts[${idx}].permite_movimientos inválido`);
  }
  if (!isString(estado) || !VALID_ACCOUNT_STATE.has(estado)) {
    throw new Error(`accounts[${idx}].estado inválido`);
  }

  return { codigo, nombre, tipo, naturaleza, nivel, cuenta_padre, permite_movimientos, estado };
};

const validateLine = (raw: unknown, entryIdx: number, lineIdx: number): EntryLine => {
  if (!isPlainObject(raw)) throw new Error(`entries[${entryIdx}].lineas[${lineIdx}] no es objeto`);
  const { id, cuenta_codigo, debe, haber, concepto_linea } = raw;

  if (!isString(id, 50)) throw new Error(`entries[${entryIdx}].lineas[${lineIdx}].id inválido`);
  if (!isString(cuenta_codigo, 50)) {
    throw new Error(`entries[${entryIdx}].lineas[${lineIdx}].cuenta_codigo inválido`);
  }
  if (!isFiniteNumber(debe) || debe < 0 || debe > 1e12) {
    throw new Error(`entries[${entryIdx}].lineas[${lineIdx}].debe inválido`);
  }
  if (!isFiniteNumber(haber) || haber < 0 || haber > 1e12) {
    throw new Error(`entries[${entryIdx}].lineas[${lineIdx}].haber inválido`);
  }
  if (concepto_linea !== undefined && !isString(concepto_linea, 500)) {
    throw new Error(`entries[${entryIdx}].lineas[${lineIdx}].concepto_linea inválido`);
  }

  const line: EntryLine = { id, cuenta_codigo, debe, haber };
  if (concepto_linea !== undefined) line.concepto_linea = concepto_linea;
  return line;
};

const validateEntry = (raw: unknown, idx: number): JournalEntry => {
  if (!isPlainObject(raw)) throw new Error(`entries[${idx}] no es objeto`);
  const { id, numero, fecha, concepto, estado, observaciones, lineas, creada_en, actualizada_en } = raw;

  if (!isString(id, 50)) throw new Error(`entries[${idx}].id inválido`);
  if (!isFiniteNumber(numero) || numero < 0 || numero > 1e9) {
    throw new Error(`entries[${idx}].numero inválido`);
  }
  if (!isString(fecha, 30) || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    throw new Error(`entries[${idx}].fecha inválido`);
  }
  if (!isString(concepto, 500)) throw new Error(`entries[${idx}].concepto inválido`);
  if (!isString(estado) || !VALID_ENTRY_STATUS.has(estado)) {
    throw new Error(`entries[${idx}].estado inválido`);
  }
  if (!isString(observaciones, 2000)) throw new Error(`entries[${idx}].observaciones inválido`);
  if (!Array.isArray(lineas) || lineas.length === 0 || lineas.length > MAX_LINES_PER_ENTRY) {
    throw new Error(`entries[${idx}].lineas inválido (1-${MAX_LINES_PER_ENTRY})`);
  }
  if (!isString(creada_en, 40)) throw new Error(`entries[${idx}].creada_en inválido`);
  if (!isString(actualizada_en, 40)) throw new Error(`entries[${idx}].actualizada_en inválido`);

  const validatedLines = lineas.map((l, i) => validateLine(l, idx, i));

  return {
    id,
    numero,
    fecha,
    concepto,
    estado: estado as JournalEntry['estado'],
    observaciones,
    lineas: validatedLines,
    creada_en,
    actualizada_en,
  };
};

/**
 * Parse + validate a JSON backup string. Throws on any malformed input.
 * Returns clean, type-safe objects ready for the store.
 */
export const validateBackup = (text: string): ValidationResult => {
  if (text.length > MAX_IMPORT_BYTES) {
    throw new Error('Archivo demasiado grande (máx 10 MB)');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text, safeReviver);
  } catch (err) {
    throw new Error(`JSON inválido: ${err instanceof Error ? err.message : 'parse error'}`, { cause: err });
  }

  if (!isPlainObject(raw)) throw new Error('La raíz debe ser un objeto');

  const { accounts, entries, empresa } = raw;

  if (!Array.isArray(accounts)) throw new Error('Falta el array "accounts"');
  if (!Array.isArray(entries)) throw new Error('Falta el array "entries"');
  if (accounts.length > MAX_ACCOUNTS) {
    throw new Error(`Demasiadas cuentas (máx ${MAX_ACCOUNTS})`);
  }
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`Demasiadas partidas (máx ${MAX_ENTRIES})`);
  }

  const validatedAccounts = accounts.map((a, i) => validateAccount(a, i));
  const validatedEntries = entries.map((e, i) => validateEntry(e, i));
  const validatedEmpresa = empresa === undefined ? undefined : validateEmpresa(empresa);

  // Cross-check: every entry line must reference an existing account
  const codes = new Set(validatedAccounts.map(a => a.codigo));
  for (const e of validatedEntries) {
    for (const l of e.lineas) {
      if (!codes.has(l.cuenta_codigo)) {
        throw new Error(`Partida #${e.numero} referencia cuenta inexistente: ${l.cuenta_codigo}`);
      }
    }
  }

  return {
    accounts: validatedAccounts,
    entries: validatedEntries,
    ...(validatedEmpresa ? { empresa: validatedEmpresa } : {}),
  };
};
