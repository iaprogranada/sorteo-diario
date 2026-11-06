import { execSync } from "node:child_process";

/** Recarga los datos ficticios antes de las pruebas de extremo a extremo */
export default function setup() {
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}
