export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Telegram send failed: ${payload}`);
  }
}
