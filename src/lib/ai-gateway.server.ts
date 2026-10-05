import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return res;
  };
}

export class AiGatewayError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Streams a single Responses call and returns the final text. */
export async function generarTextoIA(instructions: string, prompt: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new AiGatewayError("La función de IA no está configurada.", 401);
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: createRunIdFetch(),
  });
  let streamError: unknown = null;
  const result = streamText({
    model: provider.responses(MODEL),
    instructions,
    messages: [{ role: "user", content: prompt }],
    onError: ({ error }) => { streamError = error; },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let text = "";
  try {
    text = await result.text;
  } catch (e) {
    streamError ??= e;
  }
  if (streamError) {
    const err = streamError as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;
    const msg =
      status === 402 ? "Se agotaron los créditos de IA del espacio de trabajo. Agrega créditos para continuar."
      : status === 429 ? "Demasiadas solicitudes. Intenta de nuevo en unos minutos."
      : status === 403 ? "El acceso a la IA está bloqueado para este espacio de trabajo."
      : "No se pudo completar el análisis con IA.";
    console.error("AI gateway error", status, err.message);
    throw new AiGatewayError(msg, status);
  }
  if (!text.trim()) throw new AiGatewayError("La IA no devolvió una respuesta.", 500);
  return text;
}
