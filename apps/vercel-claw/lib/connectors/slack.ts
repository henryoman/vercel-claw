import "server-only";

export async function sendSlackMessage(
  botToken: string,
  channel: string,
  text: string,
  threadTs?: string,
) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel,
      text,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;

  if (response.ok && payload?.ok) {
    return;
  }

  throw new Error(
    `Slack chat.postMessage failed with ${response.status}${payload?.error ? `: ${payload.error}` : ""}`,
  );
}
