import "server-only";

export async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string,
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (response.ok) {
    return;
  }

  const errorBody = await response.text().catch(() => "");
  throw new Error(
    `Telegram sendMessage failed with ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
  );
}
