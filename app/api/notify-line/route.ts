import { NextResponse } from "next/server";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const USER_IDS = (process.env.LINE_ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);

export async function POST(req: Request) {
  const { message } = await req.json();
  if (!TOKEN || USER_IDS.length === 0) return NextResponse.json({ ok: false, reason: "not configured" });

  await Promise.all(
    USER_IDS.map((to) =>
      fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ to, messages: [{ type: "text", text: message }] }),
      })
    )
  );
  return NextResponse.json({ ok: true });
}
