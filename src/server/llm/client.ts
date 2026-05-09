import OpenAI from "openai";

import { env } from "@/lib/env";

let cached: OpenAI | null = null;

/**
 * The LLM client is OpenAI-compatible. It defaults to a local Ollama at
 * `http://localhost:11434/v1` so the project can run end-to-end with no paid
 * dependencies. Any OpenAI-compatible endpoint (OpenAI, Groq, OpenRouter,
 * Together, vLLM, llama.cpp server, etc.) works by editing `.env`.
 *
 * Most callers should use `completeJson()` rather than the raw client, so
 * temperature: 0 and JSON output mode are enforced consistently.
 */
export function llm(): OpenAI {
  if (!cached) {
    const e = env();
    cached = new OpenAI({
      apiKey: e.LLM_API_KEY,
      baseURL: e.LLM_BASE_URL,
    });
  }
  return cached;
}

export function llmModel(): string {
  return env().LLM_MODEL;
}

export type CompleteJsonOptions = {
  /** System prompt: should describe the JSON contract precisely. */
  system: string;
  /** User content: the actual claim + evidence. */
  user: string;
  /** Hard cap on output tokens. Default 1024. */
  maxTokens?: number;
  /** Override the configured model for this call. */
  model?: string;
  /** Abort request if the provider exceeds timeout budget. */
  timeoutMs?: number;
};

/**
 * Single chat completion forced to emit valid JSON. Always uses temperature 0
 * so the same input produces the same labels. The result is parsed before it
 * is returned; callers can `as` the type they expect.
 *
 * For Ollama, `response_format: { type: 'json_object' }` is supported on
 * recent versions and degrades to "best effort" on older ones. We catch the
 * `JSON.parse` failure and surface it as a typed error so the caller can
 * decide whether to retry or block.
 */
/**
 * Single chat completion for free-form text.
 */
export async function completeJson<T>(opts: CompleteJsonOptions): Promise<T> {
  const c = llm();
  const model = opts.model ?? llmModel();
  const timeoutMs = opts.timeoutMs ?? 5_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let completion;
  try {
    completion = await c.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: opts.maxTokens ?? 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }, { signal: controller.signal });
  } catch (err) {
    if ((err as { name?: string } | null)?.name === "AbortError") {
      throw new LlmError(`timeout after ${timeoutMs}ms`, { model, raw: "" });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw new LlmError(`empty response from ${model}`, { model, raw: text });
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new LlmError(`non-JSON response from ${model}`, {
      model,
      raw: text,
      cause: err,
    });
  }
}

/**
 * Single chat completion for free-form text.
 */
export async function completeText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
}): Promise<string> {
  const c = llm();
  const model = opts.model ?? llmModel();
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await c.chat.completions.create({
      model,
      temperature: 0.7, // Higher temperature for more natural chat
      max_tokens: opts.maxTokens ?? 1024,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }, { signal: controller.signal });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    if ((err as { name?: string } | null)?.name === "AbortError") {
      throw new LlmError(`timeout after ${timeoutMs}ms`, { model, raw: "" });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export class LlmError extends Error {
  readonly model: string;
  readonly raw: string;
  constructor(
    message: string,
    init: { model: string; raw: string; cause?: unknown },
  ) {
    super(message);
    this.name = "LlmError";
    this.model = init.model;
    this.raw = init.raw;
    if (init.cause) (this as { cause?: unknown }).cause = init.cause;
  }
}
