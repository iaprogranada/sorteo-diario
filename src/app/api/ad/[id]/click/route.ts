import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.adBanner.findUnique({ where: { id } });
  if (!b) return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
  await prisma.adBanner.update({ where: { id }, data: { clicks: { increment: 1 } } });
  return NextResponse.redirect(b.linkUrl);
}
