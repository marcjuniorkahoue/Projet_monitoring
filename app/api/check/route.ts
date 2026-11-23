import { NextResponse } from "next/server";
import { lancerTests } from "@/lib/probe";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (key !== process.env.API_KEY) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const resultats = await lancerTests();
  return NextResponse.json({ ok: true, resultats });
}