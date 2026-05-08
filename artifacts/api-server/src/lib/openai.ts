const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 350;

export interface OpenAiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAiChatResult {
  ok: true;
  text: string;
}
export interface OpenAiChatError {
  ok: false;
  message: string;
}
export type OpenAiChatResponse = OpenAiChatResult | OpenAiChatError;

export function getOpenAiApiKey(): string | null {
  return (
    process.env["OPENAI_API_KEY"] ??
    process.env["OPEN_AI_KEY"] ??
    null
  );
}

export function isOpenAiConfigured(): boolean {
  return !!getOpenAiApiKey();
}

export async function openAiChat(
  messages: OpenAiMessage[],
  options?: { maxTokens?: number; temperature?: number; model?: string },
): Promise<OpenAiChatResponse> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      message:
        "AI tools are not configured. Add OPENAI_API_KEY to Replit Secrets and restart the API server.",
    };
  }

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model ?? DEFAULT_MODEL,
        messages,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: options?.temperature ?? 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg =
        (err as { error?: { message?: string } }).error?.message ??
        `OpenAI API error ${response.status}`;
      return { ok: false, message: msg };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false, message: "OpenAI returned an empty response." };
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "OpenAI request failed.",
    };
  }
}
