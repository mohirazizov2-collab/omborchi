import { chatWithAI } from "@/ai/flows/chat-flow";
import { z } from "zod";

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, "Xabar matni majburiy."),
  history: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      content: z.string(),
    })
  ).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "So'rov JSON formatida bo'lishi kerak." },
      { status: 400 }
    );
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "So'rov ma'lumotlari noto'g'ri." },
      { status: 400 }
    );
  }

  if (!process.env.TOKENROUTER_API_KEY) {
    return Response.json(
      { error: "TokenRouter API kaliti sozlanmagan." },
      { status: 503 }
    );
  }

  try {
    return Response.json(await chatWithAI(parsed.data));
  } catch (error) {
    console.error("AI chat request failed:", error);
    const message = error instanceof Error ? error.message : "";
    if (/\b(401|403)\b/.test(message)) {
      return Response.json(
        { error: "TokenRouter API kaliti noto'g'ri yoki ruxsati yo'q." },
        { status: 502 }
      );
    }
    if (/\b404\b/.test(message)) {
      return Response.json(
        { error: "TokenRouter modeli topilmadi. TOKENROUTER_MODEL sozlamasini tekshiring." },
        { status: 502 }
      );
    }
    if (/\b429\b/.test(message)) {
      return Response.json(
        { error: "AI so'rovlar limiti tugadi. TokenRouter hisobini tekshiring." },
        { status: 502 }
      );
    }
    return Response.json(
      { error: "AI bilan bog'lanib bo'lmadi. Server ulanishi va TokenRouter sozlamalarini tekshiring." },
      { status: 502 }
    );
  }
}
