import type { Account, Empresa } from '../types';

export const OPENAI_DEFAULT_MODEL = 'gpt-5.5';
export const OPENAI_API_URL =
  (import.meta.env.VITE_OPENAI_API_URL as string | undefined)?.trim() || '/api/openai/v1/responses';
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
  'El analisis con IA necesita un endpoint backend en produccion. Configura VITE_OPENAI_API_URL o un proxy del servidor antes de usar esta opcion.';

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
  'Eres un asistente contable que analiza documentos y genera un borrador de partida.',
  'Devuelve solo el contenido solicitado en formato JSON valido.',
  'Usa exclusivamente cuentas del catalogo proporcionado.',
  'Si el documento no muestra una fecha clara, devuelve una cadena vacia en fecha.',
  'La partida sugerida debe quedar cuadrada.',
  'Mantén el concepto corto y util para un libro diario.',
  'Las observaciones pueden resumir el documento de forma breve.',
].join(' ');

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

  const inputContent = file
    ? [
        { type: 'input_text', text: prompt },
        {
          type: 'input_file',
          filename: file.name,
          file_data: await toDataUrl(file),
        },
      ]
    : [
        {
          type: 'input_text',
          text: `${prompt}\n\nTexto proporcionado por el usuario:\n${text?.trim() ?? ''}`,
        },
      ];

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
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
    const message = error instanceof Error ? error.message : '';
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      throw new Error(PRODUCTION_AI_ENDPOINT_MESSAGE, {
        cause: error,
      });
    }
    throw error;
  }

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
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
