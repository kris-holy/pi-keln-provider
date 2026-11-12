import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BASE_URL = "https://api.keln.ai/v1";
const MODELS_URL = `${BASE_URL}/models`;
// /v1/models publishes no output cap; this is Keln's default when a request sends none.
const DEFAULT_MAX_TOKENS = 32768;
const THINKING_LEVELS = ["minimal", "low", "medium", "high", "xhigh", "max"] as const;

type KelnRow = {
  id: string;
  context_length?: number;
  input_modalities?: string[];
  output_modalities?: string[];
  pricing?: { prompt?: string; completion?: string; input_cache_read?: string | null };
  reasoning?: { mandatory?: boolean; supported_efforts?: string[] | null; default_effort?: string | null } | null;
};

const perMillion = (value: string | null | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1_000_000 * 1e6) / 1e6 : 0;
};

/** Pi thinking levels to Keln's reasoning_effort values, as published for this model. */
function thinkingLevelMap(efforts: string[]) {
  const supported = new Set(efforts);
  const map: Record<string, string | null> = { off: supported.has("none") ? "none" : null };
  for (const level of THINKING_LEVELS) map[level] = supported.has(level) ? level : null;
  return map;
}

/** Maps one /v1/models row to a pi model; rows without text output (decision, embedding, reranker) are skipped. */
function toModel(row: KelnRow) {
  if (!row.output_modalities?.includes("text")) return undefined;
  const efforts = row.reasoning?.supported_efforts ?? [];
  const reasoning = efforts.some((effort) => effort !== "none");
  const context = row.context_length && row.context_length > 0 ? row.context_length : 128000;
  return {
    id: row.id,
    name: row.id,
    reasoning,
    ...(reasoning && { thinkingLevelMap: thinkingLevelMap(efforts) }),
    input: row.input_modalities?.includes("image") ? ["text", "image"] : ["text"],
    cost: {
      input: perMillion(row.pricing?.prompt),
      output: perMillion(row.pricing?.completion),
      cacheRead: perMillion(row.pricing?.input_cache_read),
      cacheWrite: 0,
    },
    contextWindow: context,
    maxTokens: Math.min(DEFAULT_MAX_TOKENS, context),
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      maxTokensField: "max_tokens",
      thinkingFormat: "openai",
      // Keln asks clients to send reasoning back on assistant turns in multi-turn tool calling.
      requiresReasoningContentOnAssistantMessages: true,
    },
  };
}

async function fetchModels(signal?: AbortSignal) {
  const response = await fetch(MODELS_URL, { signal: signal ?? AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Keln catalog request failed: ${response.status}`);
  const body = (await response.json()) as { data?: KelnRow[] };
  return (body.data ?? []).flatMap((row) => {
    const model = toModel(row);
    return model ? [model] : [];
  });
}

export default async function (pi: ExtensionAPI) {
  // The catalog is public, so models list before a key is set.
  let models: Awaited<ReturnType<typeof fetchModels>> = [];
  try {
    models = await fetchModels();
  } catch {
    // Offline at startup: the provider still registers, and refresh fills the list later.
  }

  pi.registerProvider("keln", {
    name: "Keln",
    baseUrl: BASE_URL,
    api: "openai-completions",
    // KELN_API_KEY when set; otherwise users store a key with /login.
    ...(process.env.KELN_API_KEY ? { apiKey: "$KELN_API_KEY" } : {}),
    models,
    async refreshModels({ signal }) {
      return fetchModels(signal);
    },
  } as any);
}
