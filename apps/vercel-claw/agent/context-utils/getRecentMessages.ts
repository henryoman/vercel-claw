import type { ThreadMessage } from "@vercel-claw/core";

const DEFAULT_TOKEN_BUDGET = 2000;
const DEFAULT_MIN_MESSAGES = 8;
const ESTIMATED_CHARS_PER_TOKEN = 4;
const ESTIMATED_MESSAGE_OVERHEAD = 48;

export function getRecentMessages(
  messages: ThreadMessage[],
  options: {
    tokenBudget?: number;
    minMessages?: number;
  } = {},
) {
  if (messages.length <= 1) {
    return messages;
  }

  const maxChars =
    Math.max(1, options.tokenBudget ?? DEFAULT_TOKEN_BUDGET) * ESTIMATED_CHARS_PER_TOKEN;
  const minMessages = Math.max(1, options.minMessages ?? DEFAULT_MIN_MESSAGES);
  const selected: ThreadMessage[] = [];
  let remainingChars = maxChars;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const estimatedCost = message.content.length + ESTIMATED_MESSAGE_OVERHEAD;

    if (selected.length >= minMessages && estimatedCost > remainingChars) {
      break;
    }

    selected.push(message);
    remainingChars = Math.max(0, remainingChars - estimatedCost);
  }

  return selected.reverse();
}