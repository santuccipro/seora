/**
 * Claude client — thin proxy over the Mac-mini "usage_server" tunnel.
 *
 * Instead of paying per-token Anthropic API, we forward prompts to a local
 * Python HTTP server running on the owner's Mac mini, which shells out to
 * the `claude --print` CLI (using the owner's Claude Max subscription).
 *
 * The server exposes POST /lead-advice — endpoint name is historical, the
 * payload contract is: {system, prompt, model} → {result: string}.
 *
 * Env vars:
 *   CLAUDE_RUNNER_URL     e.g. https://xxx.trycloudflare.com
 *   CLAUDE_RUNNER_TOKEN   Bearer token
 *
 * The Cloudflare tunnel URL rotates on every Mac reboot; the tunnel-patcher
 * script on the Mac auto-updates these env vars on Vercel.
 */

export type ClaudeModel = "claude-opus-4-8" | "claude-opus-4-7" | "claude-sonnet-4-6" | "claude-haiku-4-5";

export interface CallClaudeOptions {
  system?: string;
  model?: ClaudeModel;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 70_000;
const DEFAULT_MODEL: ClaudeModel = "claude-sonnet-4-6";

/**
 * Call Claude via the Mac-mini runner.
 * Returns the raw text response. Throws on error.
 */
export async function callClaude(
  prompt: string,
  options: CallClaudeOptions = {}
): Promise<string> {
  const url = process.env.CLAUDE_RUNNER_URL;
  const token = process.env.CLAUDE_RUNNER_TOKEN;

  if (!url || !token) {
    throw new Error("Claude runner not configured (CLAUDE_RUNNER_URL / CLAUDE_RUNNER_TOKEN)");
  }

  const trimmedUrl = url.replace(/\/$/, "");
  const model = options.model ?? DEFAULT_MODEL;
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const res = await fetch(`${trimmedUrl}/lead-advice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      system: options.system ?? "",
      prompt,
      model,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Claude runner ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json().catch(() => null) as { result?: string; text?: string; content?: string } | null;
  if (!data) throw new Error("Claude runner returned invalid JSON");

  // The runner returns different keys depending on version — normalize
  const text = data.result ?? data.text ?? data.content ?? "";
  if (!text) throw new Error("Claude runner returned empty response");
  return text;
}

/**
 * Call Claude expecting a JSON object in the response. Extracts the first
 * `{...}` block from the text and parses it. Throws on parse failure.
 */
export async function callClaudeJSON<T = unknown>(
  prompt: string,
  options: CallClaudeOptions = {}
): Promise<T> {
  const text = await callClaude(prompt, options);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Claude response did not contain JSON: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(match[0]) as T;
  } catch (err) {
    throw new Error(`Failed to parse Claude JSON: ${err instanceof Error ? err.message : "unknown"}`);
  }
}
