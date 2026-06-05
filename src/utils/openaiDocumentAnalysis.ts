import type { Account, Empresa } from '../types';

export const OPENAI_DEFAULT_MODEL = 'gpt-4o';
// Por defecto se llama directamente a la API de OpenAI (funciona desde el navegador
// con la API key del usuario). Si tienes un proxy backend propio, configura
// VITE_OPENAI_API_URL para apuntar a él y ocultar la clave.
export const OPENAI_API_URL =
  (import.meta.env.VITE_OPENAI_API_URL as string | undefined)?.trim() || 'https://api.openai.com/v1/responses';
export const OPENAI_TIMEOUT_MS = 90_000;
export const MAX_ANALYSIS_FILE_BYTES = 10 * 1024 * 1024;

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
      minItems: 2,
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

const SYSTEM_PROMPT = [
  'Eres un contador experto en contabilidad de Guatemala (partida doble) que analiza documentos —facturas, recibos, fotos o texto— y genera un borrador de partida de diario.',
  'Devuelve EXCLUSIVAMENTE JSON válido conforme al esquema solicitado, sin texto adicional ni explicaciones.',
  'Usa únicamente cuentas del catálogo proporcionado, por código exacto, y prefiere cuentas de detalle (las que permiten movimientos).',
  'Reglas contables de Guatemala que debes respetar:',
  '- El IVA es 12%. Separa siempre la base del impuesto: en compras usa IVA por cobrar (crédito fiscal); en ventas usa IVA por pagar (débito fiscal).',
  '- Las devoluciones sobre ventas reducen las ventas; las devoluciones sobre compras reducen las compras.',
  '- La cuota patronal del IGSS es gasto de la empresa; la cuota laboral del IGSS se RETIENE al trabajador (es un pasivo por pagar, NO un gasto).',
  '- La partida SIEMPRE debe quedar cuadrada: la suma del Debe es igual a la suma del Haber.',
  'Si el documento no muestra una fecha clara, deja "fecha" como cadena vacía; cuando exista, usa formato YYYY-MM-DD.',
  'Mantén el concepto corto y útil para un libro diario; las observaciones resumen el documento de forma breve.',
].join('\n');

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

const buildAccountCatalog = (accounts: Account[]): string =>
  accounts
    .filter(acc => acc.permite_movimientos || acc.tipo === 'Detalle')
    .map(acc => `${acc.codigo} | ${acc.nombre} | ${acc.naturaleza}`)
    .join('\n');

const extractResponseText = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';

  const response = payload as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
      text?: string;
    }>;
  };

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

const ensureBalanced = (draft: AIAnalysisDraft): AIAnalysisDraft => {
  const totalDebe = draft.lineas.reduce((sum, line) => sum + (Number(line.debe) || 0), 0);
  const totalHaber = draft.lineas.reduce((sum, line) => sum + (Number(line.haber) || 0), 0);
  const diff = Number((totalDebe - totalHaber).toFixed(2));

  if (Math.abs(diff) <= 0.01 || draft.lineas.length === 0) return draft;

  const next = draft.lineas.map(line => ({ ...line }));
  const last = next[next.length - 1];

  if (diff > 0) {
    last.haber = Number((last.haber + diff).toFixed(2));
  } else {
    last.debe = Number((last.debe + Math.abs(diff)).toFixed(2));
  }

  return { ...draft, lineas: next };
};

const parseAnalysisDraft = (raw: string): AIAnalysisDraft => {
  const text = raw.trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  const candidate = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
  const parsed = JSON.parse(candidate) as AIAnalysisDraft;
  return ensureBalanced(parsed);
};

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

  const prompt = [
    `Empresa: ${empresa.razon_social}`,
    `Moneda: ${empresa.moneda} (${empresa.simbolo_moneda})`,
    'Catalogo de cuentas disponibles:',
    buildAccountCatalog(accounts),
    '',
    'Analiza el documento y devuelve un borrador de partida contable.',
    'Instrucciones:',
    '- Usa solo cuentas del catalogo y prefiere cuentas de detalle.',
    '- Devuelve cuentas exactas por codigo y tambien por nombre en cada linea.',
    '- Si el documento es una factura, recibo o documento similar, sugiere la partida mas probable.',
    '- La partida debe quedar cuadrada.',
    '- Si falta algun dato, deja el campo vacio en lugar de inventarlo.',
    '- Mantén observaciones breves y utiles para trazabilidad.',
  ].join('\n');

  // La Responses API distingue imágenes (input_image) de documentos como PDF
  // (input_file). Enviar una foto como input_file impide que el modelo la "vea".
  const inputContent: Array<Record<string, unknown>> = [];
  if (file) {
    inputContent.push({ type: 'input_text', text: prompt });
    if (file.type.startsWith('image/')) {
      inputContent.push({ type: 'input_image', image_url: await toDataUrl(file), detail: 'high' });
    } else {
      inputContent.push({ type: 'input_file', filename: file.name, file_data: await toDataUrl(file) });
    }
  } else {
    inputContent.push({
      type: 'input_text',
      text: `${prompt}\n\nTexto proporcionado por el usuario:\n${text?.trim() ?? ''}`,
    });
  }

  // Timeout para que la solicitud nunca quede colgada (síntoma "se traba").
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        instructions: SYSTEM_PROMPT,
        input: [
          {
            role: 'user',
            content: inputContent,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'accounting_document_analysis',
            strict: true,
            schema: ANALYSIS_SCHEMA,
          },
        },
      }),
    });
  } catch (error) {
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
  } finally {
    clearTimeout(timer);
  }

  // Lee el cuerpo como texto y luego intenta JSON: si el endpoint devolvió HTML
  // (proxy mal configurado, 404), da un mensaje claro en vez de un error críptico.
  const rawBody = await response.text();
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
    if (response.status === 401) {
      throw new Error('API key de OpenAI inválida o sin permisos. Revísala en Configuración → Asistente IA.');
    }
    if (response.status === 429) {
      throw new Error('Límite de uso de OpenAI alcanzado (sin crédito o demasiadas solicitudes). Revisa tu cuenta.');
    }
    if (response.status === 404 || response.status === 502 || response.status === 503) {
      throw new Error(PRODUCTION_AI_ENDPOINT_MESSAGE);
    }
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? JSON.stringify((payload as { error?: unknown }).error)
        : `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  const rawText = extractResponseText(payload);
  if (!rawText) throw new Error('La respuesta de OpenAI no incluyo texto utilizable');

  return parseAnalysisDraft(rawText);
}
