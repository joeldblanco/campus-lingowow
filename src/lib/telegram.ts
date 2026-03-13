export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!token || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not configured')
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Telegram] Error sending message:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Telegram] Exception:', error)
    return false
  }
}
