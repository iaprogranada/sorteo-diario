import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/** Prepara la base de datos de pruebas (sorteo_test): aplica migraciones y la vacía */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://sorteo:sorteo@localhost:5432/sorteo_test";
  if (!/_test\b|_test$/.test(url)) throw new Error("Por seguridad, la BD de pruebas debe terminar en _test");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  const prisma = new PrismaClient({ datasourceUrl: url });
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  await prisma.$disconnect();
}
