import type { Account, Empresa } from '../types';

export const OPENAI_DEFAULT_MODEL = 'gpt-4o';
// Por defecto se llama directamente a la API de OpenAI (funciona desde el navegador
// con la API key del usuario). Si tienes un proxy backend propio, configura
// VITE_OPENAI_API_URL para apuntar a él y ocultar la clave.
export const OPENAI_API_URL =
  (import.meta.env.VITE_OPENAI_API_URL as string | undefined)?.trim() || 'https://api.openai.com/v1/responses';
export const OPENAI_TIMEOUT_MS = 90_000;
export const MAX_ANALYSIS_FILE_BYTES = 10 * 1024 * 1024;

// La Responses API solo "ve" imágenes vía input_image y PDFs vía input_file.
// Los formatos de texto se leen en el navegador y se envían como input_text;
// Word/Office no son soportados y se rechazan con un mensaje claro.
const TEXT_FILE_PATTERN = /\.(txt|md|csv|html?)$/i;
export const SUPPORTED_FILE_HINT = 'PDF, imagen (foto o escaneo) o texto (.txt, .md, .csv, .html)';

export interface AIAnalysisLine {
  cuenta_codigo: string;
  cuenta_nombre?: string;
  debe: number;
  haber: number;
  concepto_linea?: string;
}

export interface AIAnalysisDraft {
  fecha: string;
  concepto: string;
  observaciones: string;
  lineas: AIAnalysisLine[];
  confidence?: number;
}

const PRODUCTION_AI_ENDPOINT_MESSAGE =
  'No se pudo contactar el servicio de OpenAI. Verifica tu API key, el modelo y tu conexión a internet. Si usas un proxy backend propio, revisa la variable VITE_OPENAI_API_URL.';

// Nota: sin minItems/minimum/pattern en el esquema — no todos los modelos o
// proxies compatibles los aceptan en modo strict y un 400 rompería la función
// completa. Esas restricciones se validan del lado del cliente al normalizar.
const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fecha: { type: 'string' },
    concepto: { type: 'string' },
    observaciones: { type: 'string' },
    confidence: { type: 'number' },
    lineas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          cuenta_codigo: { type: 'string' },
          cuenta_nombre: { type: 'string' },
          debe: { type: 'number' },
          haber: { type: 'number' },
          concepto_linea: { type: 'string' },
        },
        required: ['cuenta_codigo', 'cuenta_nombre', 'debe', 'haber', 'concepto_linea'],
      },
    },
  },
  required: ['fecha', 'concepto', 'observaciones', 'lineas', 'confidence'],
} as const;

/**
 * Reglas contables del método de la Licda. Mazariegos (Guatemala).
 * Cada regla usa códigos EXACTOS del catálogo para que el modelo no invente.
 */
const SYSTEM_PROMPT = [
  'Eres un contador experto en contabilidad de Guatemala (partida doble) que analiza documentos —facturas, recibos, planillas, fotos o texto— y genera un borrador de partida de diario siguiendo el método de la Licda. Mazariegos.',
  'Devuelve EXCLUSIVAMENTE JSON válido conforme al esquema solicitado, sin texto adicional, sin markdown y sin explicaciones.',
  'Usa únicamente cuentas del catálogo proporcionado: copia el código EXACTO con sus puntos (ej. "2.1.05") y el nombre EXACTO. Nunca inventes códigos ni uses cuentas agrupadoras (las de 1 o 2 niveles como "1.1" o "5.2").',
  'REGLA DE IVA (12%): el monto total de una factura SIEMPRE incluye IVA. Calcula: base = redondear(total / 1.12, 2) e IVA = total - base. Si el documento ya desglosa base e IVA, usa esos valores exactos. El IVA NUNCA se queda dentro del gasto, la compra, el activo ni la venta.',
  '- En COMPRAS de bienes o servicios: el IVA va al DEBE en 1.1.10 IVA por Cobrar (crédito fiscal).',
  '- En VENTAS o servicios prestados: el IVA va al HABER en 2.1.05 IVA por Pagar (débito fiscal).',
  'COMPRA de mercadería para revender → DEBE 5.1.01 Compras (base) + DEBE 1.1.10 IVA por Cobrar (IVA). NO uses 1.1.13 Mercaderías para compras del período (esa cuenta solo aparece en partidas de apertura o de inventario).',
  'VENTA de mercadería → HABER 4.1.01 Ventas (base) + HABER 2.1.05 IVA por Pagar (IVA). Al DEBE: 1.1.01 Caja por lo cobrado al contado, 1.1.05 Clientes por el crédito en cuenta abierta, o 1.1.07 Documentos por Cobrar a Corto Plazo si el cliente firmó letras o pagarés.',
  'SERVICIOS recibidos con factura (alquiler, energía, teléfono, honorarios) → DEBE la cuenta de gasto 5.2.x por la base (5.2.09 Alquileres Pagados, 5.2.10 Energía Eléctrica, 5.2.12 Comunicaciones (Internet y Teléfono), 5.2.19 Honorarios Profesionales) + DEBE 1.1.10 IVA por Cobrar por el IVA.',
  'DEVOLUCIÓN SOBRE VENTAS (un cliente nos devuelve mercadería): DEBE 5.1.04 Devoluciones y Rebajas sobre Ventas (base) + DEBE 2.1.05 IVA por Pagar (IVA, se reversa el débito fiscal); HABER 1.1.01 Caja o 1.1.05 Clientes por el total devuelto. NUNCA cargues 4.1.01 Ventas.',
  'DEVOLUCIÓN SOBRE COMPRAS (nosotros devolvemos al proveedor): DEBE 1.1.01 Caja o 2.1.01 Proveedores por el total; HABER 4.1.03 Devoluciones y Rebajas sobre Compras (base) + HABER 1.1.10 IVA por Cobrar (IVA, se reversa el crédito fiscal). NUNCA abones 5.1.01 Compras. Ejemplo: devolución de Q4,400.00 → Caja debe 4,400.00; 4.1.03 haber 3,928.57; 1.1.10 haber 471.43.',
  'PLANILLA DE SUELDOS: los sueldos van al DEBE en 5.2.01 Sueldos y Salarios (o separados en 5.2.02 Sueldos Administración y 5.2.03 Sueldos Sala de Ventas si el documento los distingue) y 5.2.04 Bonificación Incentivo si aplica.',
  '- La cuota PATRONAL IGSS (12.67% del sueldo ordinario, SIN incluir bonificación incentivo) SÍ es gasto: DEBE 5.2.05 Cuota Patronal IGSS y HABER 2.1.09 IGSS por pagar patronal por el mismo monto.',
  '- La cuota LABORAL IGSS (4.83% del sueldo ordinario) NO es gasto de la empresa: se RETIENE al trabajador. Va únicamente al HABER en 2.1.07 IGSS por pagar laboral y reduce el efectivo pagado. PROHIBIDO registrar la cuota laboral como gasto: jamás va en una cuenta 5.x.',
  '- El efectivo pagado de la planilla (HABER 1.1.01 Caja o 1.1.03 Bancos) = sueldos + bonificación - cuota laboral retenida.',
  'COMPRA DE ACTIVOS FIJOS (mobiliario, computadoras, vehículos, maquinaria, edificios) → DEBE la cuenta 1.2.x por la base (1.2.04 Mobiliario y Equipo, 1.2.05 Equipo de Computación, 1.2.06 Vehículos, 1.2.07 Maquinaria, 1.2.03 Edificios) + DEBE 1.1.10 IVA por Cobrar por el IVA. Un activo fijo NUNCA va a 5.1.01 Compras ni a cuentas de gasto.',
  'PAGOS PARCIALES O MIXTOS: si el documento indica parte al contado y parte al crédito, divide la contrapartida: en compras, HABER 1.1.01 Caja por el contado y HABER 2.1.01 Proveedores (o 2.1.04 Documentos por Pagar a Corto Plazo si se firmaron documentos) por el saldo; en ventas, DEBE 1.1.01 Caja y DEBE 1.1.05 Clientes o 1.1.07. El IVA se calcula sobre el TOTAL de la factura, no solo sobre la parte pagada.',
  'CUADRE OBLIGATORIO: la suma del Debe debe ser EXACTAMENTE igual a la suma del Haber, al centavo. Antes de responder, suma ambas columnas; si hay diferencia de Q0.01 por redondeo, ajústala en la línea del IVA.',
  'Cada línea lleva monto solo en "debe" o solo en "haber" (el otro campo en 0). Nunca uses montos negativos ni repitas la misma cuenta en dos líneas: consolida los montos en una sola línea por cuenta.',
  'Si el documento muestra fecha, devuélvela en formato YYYY-MM-DD. Si solo muestra día y mes, complétala con el año del período fiscal indicado por el usuario. Si no hay fecha clara, deja "fecha" como cadena vacía; nunca inventes una fecha.',
  'Mantén "concepto" corto y útil para el libro diario (ej. "Compra de mercaderías al crédito"); en "observaciones" resume el documento: proveedor o cliente, número de factura y forma de pago.',
  '"confidence" es un número entre 0 y 1 que refleja qué tan seguro estás de la partida propuesta; usa valores bajos cuando el documento sea ilegible o ambiguo.',
].join('\n');

/** Ejemplos resueltos con el método exacto — anclan formato, códigos y cuadre. */
const FEW_SHOT_EXAMPLES = [
  [
    'EJEMPLO 1 — Venta mixta (contado y crédito).',
    'Documento: "Factura de venta No. 045, fecha 04/04/2026. Venta de mercaderías por Q28,800.00 (IVA incluido). El cliente paga Q19,800.00 en efectivo y deja Q9,000.00 al crédito en cuenta abierta."',
    'Cálculo: base = 28,800.00 / 1.12 = 25,714.29; IVA = 28,800.00 - 25,714.29 = 3,085.71.',
    'Partida: {"fecha":"2026-04-04","concepto":"Venta de mercaderías (contado y crédito)","observaciones":"Factura 045. Contado Q19,800.00 y crédito Q9,000.00","confidence":0.95,"lineas":[{"cuenta_codigo":"1.1.01","cuenta_nombre":"Caja","debe":19800.00,"haber":0,"concepto_linea":"Cobro al contado"},{"cuenta_codigo":"1.1.05","cuenta_nombre":"Clientes","debe":9000.00,"haber":0,"concepto_linea":"Saldo al crédito"},{"cuenta_codigo":"4.1.01","cuenta_nombre":"Ventas","debe":0,"haber":25714.29,"concepto_linea":"Venta base sin IVA"},{"cuenta_codigo":"2.1.05","cuenta_nombre":"IVA por Pagar","debe":0,"haber":3085.71,"concepto_linea":"IVA débito fiscal 12%"}]}',
    'Verificación: Debe 19,800.00 + 9,000.00 = 28,800.00 = Haber 25,714.29 + 3,085.71. Cuadrada.',
  ].join('\n'),
  [
    'EJEMPLO 2 — Compra de mercadería firmando documentos.',
    'Documento: "Factura No. 1031 del proveedor, fecha 06/04/2026. Compra de mercadería para la venta por Q18,480.00 (IVA incluido). Se firmó un pagaré a 60 días por el total."',
    'Cálculo: base = 18,480.00 / 1.12 = 16,500.00; IVA = 18,480.00 - 16,500.00 = 1,980.00.',
    'Partida: {"fecha":"2026-04-06","concepto":"Compra de mercaderías con documentos","observaciones":"Factura 1031. Pagaré a 60 días por el total","confidence":0.95,"lineas":[{"cuenta_codigo":"5.1.01","cuenta_nombre":"Compras","debe":16500.00,"haber":0,"concepto_linea":"Compra base sin IVA"},{"cuenta_codigo":"1.1.10","cuenta_nombre":"IVA por Cobrar","debe":1980.00,"haber":0,"concepto_linea":"IVA crédito fiscal 12%"},{"cuenta_codigo":"2.1.04","cuenta_nombre":"Documentos por Pagar a Corto Plazo","debe":0,"haber":18480.00,"concepto_linea":"Pagaré firmado a 60 días"}]}',
    'Verificación: Debe 16,500.00 + 1,980.00 = 18,480.00 = Haber. Cuadrada.',
  ].join('\n'),
  [
    'EJEMPLO 3 — Devolución sobre ventas (el cliente devuelve, se le paga en efectivo).',
    'Documento: "Nota de crédito No. 12, fecha 18/04/2026. Un cliente devuelve mercadería que se le había vendido por Q5,000.00 (IVA incluido). Se le reintegra el dinero en efectivo."',
    'Cálculo: base = 5,000.00 / 1.12 = 4,464.29; IVA = 5,000.00 - 4,464.29 = 535.71. La devolución sobre ventas NO toca 4.1.01 Ventas: usa 5.1.04 y reversa el IVA por Pagar al DEBE.',
    'Partida: {"fecha":"2026-04-18","concepto":"Devolución sobre ventas","observaciones":"Nota de crédito 12. Reintegro en efectivo Q5,000.00","confidence":0.95,"lineas":[{"cuenta_codigo":"5.1.04","cuenta_nombre":"Devoluciones y Rebajas sobre Ventas","debe":4464.29,"haber":0,"concepto_linea":"Base de la devolución"},{"cuenta_codigo":"2.1.05","cuenta_nombre":"IVA por Pagar","debe":535.71,"haber":0,"concepto_linea":"Reversa de IVA débito fiscal"},{"cuenta_codigo":"1.1.01","cuenta_nombre":"Caja","debe":0,"haber":5000.00,"concepto_linea":"Reintegro en efectivo"}]}',
    'Verificación: Debe 4,464.29 + 535.71 = 5,000.00 = Haber. Cuadrada.',
  ].join('\n'),
  [
    'EJEMPLO 4 — Planilla de sueldos con IGSS (la cuota laboral se RETIENE, no es gasto).',
    'Documento: "Planilla de abril 2026, pagada el 28/04/2026 en efectivo. Sueldos de administración Q3,000.00, sueldos de sala de ventas Q4,000.00, bonificación incentivo Q500.00. IGSS sobre sueldos ordinarios de Q7,000.00 (la bonificación incentivo no está afecta): cuota patronal 12.67% y cuota laboral 4.83%."',
    'Cálculo: patronal = 7,000.00 × 12.67% = 886.90 (gasto y pasivo); laboral = 7,000.00 × 4.83% = 338.10 (solo pasivo, retenida); efectivo pagado = 7,500.00 - 338.10 = 7,161.90.',
    'Partida: {"fecha":"2026-04-28","concepto":"Pago de sueldos ventas y administración","observaciones":"Planilla abril. Cuota laboral IGSS Q338.10 retenida al trabajador","confidence":0.95,"lineas":[{"cuenta_codigo":"5.2.02","cuenta_nombre":"Sueldos Administración","debe":3000.00,"haber":0,"concepto_linea":"Sueldos administración"},{"cuenta_codigo":"5.2.03","cuenta_nombre":"Sueldos Sala de Ventas","debe":4000.00,"haber":0,"concepto_linea":"Sueldos sala de ventas"},{"cuenta_codigo":"5.2.04","cuenta_nombre":"Bonificación Incentivo","debe":500.00,"haber":0,"concepto_linea":"Bonificación incentivo"},{"cuenta_codigo":"5.2.05","cuenta_nombre":"Cuota Patronal IGSS","debe":886.90,"haber":0,"concepto_linea":"IGSS patronal 12.67%"},{"cuenta_codigo":"2.1.09","cuenta_nombre":"IGSS por pagar patronal","debe":0,"haber":886.90,"concepto_linea":"IGSS patronal por pagar"},{"cuenta_codigo":"2.1.07","cuenta_nombre":"IGSS por pagar laboral","debe":0,"haber":338.10,"concepto_linea":"IGSS laboral retenido al trabajador"},{"cuenta_codigo":"1.1.01","cuenta_nombre":"Caja","debe":0,"haber":7161.90,"concepto_linea":"Efectivo pagado neto de retenciones"}]}',
    'Verificación: Debe 3,000.00 + 4,000.00 + 500.00 + 886.90 = 8,386.90 = Haber 886.90 + 338.10 + 7,161.90. Cuadrada.',
  ].join('\n'),
].join('\n\n');

const INSTRUCTIONS = `${SYSTEM_PROMPT}\n\nEJEMPLOS RESUELTOS CON EL MÉTODO EXACTO (imítalos en estructura, códigos y cuadre):\n\n${FEW_SHOT_EXAMPLES}`;

const toBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const toDataUrl = async (file: File): Promise<string> => {
  const mimeType = file.type || 'application/octet-stream';
  const base64 = await toBase64(file);
  return `data:${mimeType};base64,${base64}`;
};

// Cuenta-trampa: existe en el catálogo pero la cuota laboral IGSS jamás es
// gasto (se retiene al trabajador). No se le muestra a la IA para no invitarla
// al error más común en planillas.
const EXCLUDED_AI_ACCOUNTS = new Set(['5.2.50']);

const buildAccountCatalog = (accounts: Account[]): string =>
  accounts
    .filter(acc => (acc.permite_movimientos || acc.tipo === 'Detalle') && !EXCLUDED_AI_ACCOUNTS.has(acc.codigo))
    .map(acc => `${acc.codigo} | ${acc.nombre} | ${acc.naturaleza}`)
    .join('\n');

const extractResponseText = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';

  const response = payload as {
    status?: string;
    incomplete_details?: { reason?: string };
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string; refusal?: string }>;
      text?: string;
    }>;
  };

  // Negativa explícita del modelo o respuesta cortada: errores claros en vez
  // del genérico "no incluyó texto utilizable".
  for (const item of response.output ?? []) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      const refusal = item.content.find(c => c?.type === 'refusal');
      if (refusal && typeof refusal.refusal === 'string' && refusal.refusal.trim()) {
        throw new Error(`El modelo rechazó la solicitud: ${refusal.refusal.trim()}`);
      }
    }
  }
  if (response.status === 'incomplete') {
    const reason = response.incomplete_details?.reason ?? 'desconocida';
    throw new Error(`La respuesta de OpenAI quedó incompleta (razón: ${reason}). Reintenta con un documento más corto.`);
  }

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const parts: string[] = [];
  for (const item of response.output ?? []) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (content?.type === 'output_text' && typeof content.text === 'string') {
          parts.push(content.text);
        }
      }
    } else if (item?.type === 'output_text' && typeof item.text === 'string') {
      parts.push(item.text);
    }
  }

  return parts.join('\n').trim();
};

/**
 * Valida la forma del JSON devuelto. El cuadre y la resolución de cuentas se
 * hacen al normalizar en la pantalla (donde se puede avisar al usuario);
 * aquí no se "re-cuadra" a ciegas para no corromper montos.
 */
const parseAnalysisDraft = (raw: string): AIAnalysisDraft => {
  const text = raw.trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  const candidate = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    throw new Error('La IA no devolvió JSON válido. Reintenta el análisis.', { cause: err });
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as AIAnalysisDraft).lineas)) {
    throw new Error('La respuesta de la IA no tiene el formato esperado (faltan las líneas de la partida).');
  }

  const draft = parsed as AIAnalysisDraft;
  return {
    fecha: typeof draft.fecha === 'string' ? draft.fecha : '',
    concepto: typeof draft.concepto === 'string' ? draft.concepto : '',
    observaciones: typeof draft.observaciones === 'string' ? draft.observaciones : '',
    confidence: typeof draft.confidence === 'number' ? draft.confidence : undefined,
    lineas: draft.lineas.map(line => ({
      cuenta_codigo: typeof line?.cuenta_codigo === 'string' ? line.cuenta_codigo.trim() : '',
      cuenta_nombre: typeof line?.cuenta_nombre === 'string' ? line.cuenta_nombre : undefined,
      debe: Number(line?.debe) || 0,
      haber: Number(line?.haber) || 0,
      concepto_linea: typeof line?.concepto_linea === 'string' ? line.concepto_linea : undefined,
    })),
  };
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);

export async function analyzeDocumentWithOpenAI(params: {
  file?: File;
  text?: string;
  apiKey: string;
  accounts: Account[];
  empresa: Empresa;
  model?: string;
}): Promise<AIAnalysisDraft> {
  const { file, text, apiKey, accounts, empresa, model = OPENAI_DEFAULT_MODEL } = params;
  if (!apiKey.trim()) throw new Error('Falta la API key de OpenAI');
  if (!file && !text?.trim()) {
    throw new Error('Debes subir un archivo o escribir el contenido del documento');
  }
  if (file && file.size > MAX_ANALYSIS_FILE_BYTES) {
    throw new Error(`El archivo excede el limite permitido (${MAX_ANALYSIS_FILE_BYTES / 1024 / 1024} MB)`);
  }

  const today = new Date().toISOString().split('T')[0];
  const prompt = [
    `Empresa: ${empresa.razon_social}`,
    `NIT de la empresa: ${empresa.nit}`,
    `Moneda: ${empresa.moneda} (${empresa.simbolo_moneda})`,
    `Período fiscal: ${empresa.periodo_inicio} a ${empresa.periodo_fin} (${empresa.ciclo}).`,
    `Fecha de hoy: ${today}.`,
    'Catalogo de cuentas disponibles:',
    buildAccountCatalog(accounts),
    '',
    'Analiza el documento y devuelve un borrador de partida contable.',
    'Instrucciones:',
    '- Si la empresa aparece como EMISOR de la factura, es una VENTA; si aparece como CLIENTE/RECEPTOR, es una COMPRA. Usa el NIT y la razón social para decidirlo.',
    '- Calcula primero el TOTAL del documento; luego base = redondear(total / 1.12, 2) e IVA = total - base. Si el documento desglosa base e IVA, usa esos valores exactos.',
    '- Devuelve cada código de cuenta EXACTAMENTE como aparece en el catálogo, incluyendo los puntos (ej. 2.1.05, nunca 2105 ni 2.1.5), y también el nombre exacto.',
    '- Usa solo cuentas del catálogo de detalle; prefiere las cuentas específicas sobre las genéricas.',
    '- Antes de responder verifica que la suma del Debe sea igual a la suma del Haber al centavo; si hay Q0.01 de diferencia por redondeo, ajústala en la línea de IVA.',
    '- No repitas la misma cuenta en dos líneas: consolida los montos por cuenta.',
    '- Si el archivo contiene varias facturas o documentos, genera la partida solo del documento principal e indícalo en observaciones.',
    '- Si falta algún dato de texto (fecha, contraparte), deja el campo vacío; los montos nunca se inventan: si no puedes leer el monto total, devuelve confidence menor a 0.3 y explica el problema en observaciones.',
    '- Las fechas parciales ("15 de abril") se completan con el año del período fiscal; las relativas ("ayer") se resuelven con la fecha de hoy.',
  ].join('\n');

  // La Responses API distingue imágenes (input_image), PDFs (input_file) y
  // texto plano (input_text). Enviar una foto como input_file impide que el
  // modelo la "vea", y enviar .txt/.docx como input_file produce un 400.
  const inputContent: Array<Record<string, unknown>> = [{ type: 'input_text', text: prompt }];
  if (file) {
    const name = file.name.toLowerCase();
    if (file.type.startsWith('image/')) {
      inputContent.push({ type: 'input_image', image_url: await toDataUrl(file), detail: 'high' });
    } else if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
      inputContent.push({ type: 'input_file', filename: file.name, file_data: await toDataUrl(file) });
    } else if (file.type.startsWith('text/') || TEXT_FILE_PATTERN.test(name)) {
      const fileText = await file.text();
      inputContent.push({
        type: 'input_text',
        text: `Contenido del documento "${file.name}":\n${fileText.slice(0, 60_000)}`,
      });
    } else {
      throw new Error(`Formato no soportado para análisis. Usa ${SUPPORTED_FILE_HINT}; si es un documento de Word/Office, conviértelo a PDF.`);
    }
  } else {
    inputContent.push({ type: 'input_text', text: `Texto proporcionado por el usuario:\n${text?.trim() ?? ''}` });
  }

  const body = JSON.stringify({
    model,
    instructions: INSTRUCTIONS,
    input: [{ role: 'user', content: inputContent }],
    text: {
      format: {
        type: 'json_schema',
        name: 'accounting_document_analysis',
        strict: true,
        schema: ANALYSIS_SCHEMA,
      },
    },
  });

  // Un intento + un reintento ante errores transitorios (429/5xx). La
  // operación es idempotente (solo genera un borrador), así que es seguro.
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 1200));

    // Timeout que cubre TODO el ciclo (headers + cuerpo): leer el body fuera
    // del try del fetch dejaba la lectura sin abort y la pantalla "se trababa".
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let response: Response;
    let rawBody: string;
    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body,
      });
      rawBody = await response.text();
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(
          `La solicitud a OpenAI superó los ${OPENAI_TIMEOUT_MS / 1000}s y se canceló. Reintenta o usa una imagen/archivo más pequeño.`,
          { cause: error }
        );
      }
      const message = error instanceof Error ? error.message : '';
      if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
        throw new Error(PRODUCTION_AI_ENDPOINT_MESSAGE, { cause: error });
      }
      throw error;
    }
    clearTimeout(timer);

    // Lee el cuerpo como texto y luego intenta JSON: si el endpoint devolvió HTML
    // (proxy mal configurado, 404), da un mensaje claro en vez de un error críptico.
    let payload: unknown = {};
    if (rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        if (response.ok) {
          throw new Error('La respuesta de OpenAI no es JSON válido. Si usas un proxy, revisa VITE_OPENAI_API_URL.');
        }
      }
    }

    if (!response.ok) {
      if (RETRYABLE_STATUS.has(response.status) && attempt === 0) {
        lastError = new Error(`OpenAI respondió ${response.status}; reintentando...`);
        continue;
      }
      if (response.status === 401) {
        throw new Error('API key de OpenAI inválida o sin permisos. Revísala en Configuración → Asistente IA.');
      }
      if (response.status === 429) {
        throw new Error('Límite de uso de OpenAI alcanzado (sin crédito o demasiadas solicitudes). Revisa tu cuenta.');
      }
      if (response.status === 404 || response.status === 502 || response.status === 503) {
        throw new Error(PRODUCTION_AI_ENDPOINT_MESSAGE);
      }
      const apiError =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? (payload as { error?: { message?: unknown } }).error
          : undefined;
      const message =
        apiError && typeof apiError === 'object' && typeof apiError.message === 'string'
          ? `OpenAI: ${apiError.message}`
          : apiError !== undefined
            ? JSON.stringify(apiError)
            : `OpenAI request failed (${response.status})`;
      throw new Error(message);
    }

    const rawText = extractResponseText(payload);
    if (!rawText) throw new Error('La respuesta de OpenAI no incluyo texto utilizable');

    return parseAnalysisDraft(rawText);
  }

  throw lastError ?? new Error(PRODUCTION_AI_ENDPOINT_MESSAGE);
}
