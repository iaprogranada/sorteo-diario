import { NextResponse } from "next/server";
import { tick } from "@/lib/engine";

/** Llamado por el cron (Vercel Cron cada pocos minutos). Protegido con CRON_SECRET. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const r = await tick();
  return NextResponse.json({ ok: true, closed: r.closed, expired: r.expired, at: r.now });
}
