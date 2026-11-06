// Ejecuta las tareas programadas una vez (útil en local): npm run tick
import { tick } from "../src/lib/engine";
tick().then((r) => {
  console.log("Tick:", r);
  process.exit(0);
});
