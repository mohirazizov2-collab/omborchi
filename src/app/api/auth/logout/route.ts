import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/server/session";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(sessionCookie.name, "", { ...sessionCookie.options, maxAge: 0 });
  return response;
}
