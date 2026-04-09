export async function POST(req: Request) {
  const { message } = await req.json();

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return Response.json({ error: "API key topilmadi" }, { status: 500 });
  }

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GOOGLE_GENAI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: message }] }],
    }),
  });

  const data = await res.json();

  return Response.json(data);
}
