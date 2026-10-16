import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "Bot token missing" }, { status: 500 });

  try {
    const update = await req.json();
    
    // Simple command router
    if (update.message?.text) {
      const { text, chat, from } = update.message;
      const chatId = chat.id;

      if (text === "/start") {
        await sendMessage(token, chatId, 
          `Assalomu alaykum, ${from.first_name}! 🌟\n\n` +
          `LifeOS — bu shaxsiy rivojlanish va hayotni tartibga solish tizimi.\n\n` +
          `Siz bu bot orqali:\n` +
          `✅ Kunlik vazifalarni boshqarishingiz\n` +
          `✅ Maqsadlaringizni kuzatishingiz\n` +
          `✅ Uyqu rejimini tartibga solishingiz\n` +
          `✅ Va foydali bildirishnomalar olishingiz mumkin.\n\n` +
          `Ilovani ochish uchun pastdagi tugmani bosing:`,
          {
            inline_keyboard: [[
              { text: "LifeOS App 🚀", web_app: { url: process.env.NEXT_PUBLIC_APP_URL || "" } }
            ]]
          }
        );
      } else if (text === "/today") {
        // Logic for today's tasks would go here
        await sendMessage(token, chatId, "Bugungi rejangizni ilovada ko'rishingiz mumkin.");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Bot error:", err);
    return NextResponse.json({ ok: false, error: "Processing error" }, { status: 500 });
  }
}

async function sendMessage(token: string, chatId: number, text: string, replyMarkup?: any) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
      parse_mode: "HTML"
    })
  });
}
