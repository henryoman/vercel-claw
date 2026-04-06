export interface UserPromptPartLike {
  text?: string | null;
  type: string;
}

export interface UserPromptMessageLike {
  content?: string | null;
  createdAt?: number | null;
  id?: string | null;
  parts?: readonly UserPromptPartLike[] | null;
  role?: string | null;
  text?: string | null;
}

export interface UserGeneratedPromptContext {
  createdAt: number | null;
  index: number;
  messageId: string | null;
  source: "content" | "parts" | "string" | "text";
  text: string;
}

export function getUserGeneratedPrompt(
  input: readonly UserPromptMessageLike[] | string | null | undefined,
): UserGeneratedPromptContext | null {
  if (typeof input === "string") {
    const text = normalizeText(input);
    if (!text) {
      return null;
    }

    return {
      createdAt: null,
      index: 0,
      messageId: null,
      source: "string",
      text,
    };
  }

  if (!input || input.length === 0) {
    return null;
  }

  for (let index = input.length - 1; index >= 0; index -= 1) {
    const message = input[index];
    if ((message.role ?? "").toLowerCase() !== "user") {
      continue;
    }

    const extracted = extractPromptText(message);
    if (!extracted) {
      continue;
    }

    return {
      createdAt:
        typeof message.createdAt === "number" && Number.isFinite(message.createdAt)
          ? message.createdAt
          : null,
      index,
      messageId: message.id ?? null,
      source: extracted.source,
      text: extracted.text,
    };
  }

  return null;
}

export function formatUserGeneratedPromptForPrompt(
  input: readonly UserPromptMessageLike[] | string | null | undefined,
) {
  const prompt = getUserGeneratedPrompt(input);
  return prompt ? `Latest user prompt:\n${prompt.text}` : null;
}

function extractPromptText(message: UserPromptMessageLike) {
  const content = normalizeText(message.content);
  if (content) {
    return {
      source: "content" as const,
      text: content,
    };
  }

  const text = normalizeText(message.text);
  if (text) {
    return {
      source: "text" as const,
      text,
    };
  }

  const parts = (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => normalizeText(part.text))
    .filter((part): part is string => part !== null);

  if (parts.length > 0) {
    return {
      source: "parts" as const,
      text: parts.join("\n\n"),
    };
  }

  return null;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
