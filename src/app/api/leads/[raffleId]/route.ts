import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function csv(v: string | null | undefined) {
  const s = (v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET(_: Request, { params }: { params: Promise<{ raffleId: string }> }) {
  const { raffleId } = await params;
  const user = await getCurrentUser();
  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
  if (!user || !raffle || (user.sponsor?.id !== raffle.sponsorId && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const leads = await prisma.lead.findMany({ where: { action: { raffleId } }, include: { action: true }, orderBy: { createdAt: "asc" } });
  const rows = [
    ["Nombre", "Email", "Teléfono", "Pregunta", "Respuesta", "Consentimiento", "Fecha"].map(csv).join(";"),
    ...leads.map((l) => [l.name, l.email, l.phone, l.action.formQuestion, l.answer, l.consent ? "sí" : "no", l.createdAt.toISOString()].map(csv).join(";")),
  ];
  return new NextResponse("﻿" + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${raffleId}.csv"`,
    },
  });
}
