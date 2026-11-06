import { test, expect } from "@playwright/test";
import { advanceClock, login, logout, runAction } from "./helpers";

test("patrocinador crea → admin aprueba → usuario participa → cierre → ganador acepta → verificación", async ({ page }) => {
  const title = `Bono spa prueba ${Date.now()}`;

  // 1. El patrocinador crea un sorteo
  await login(page, "patrocinador1@test.com");
  await page.getByTestId("new-raffle").click();
  await page.fill("input[name=title]", title);
  await page.fill("textarea[name=description]", "Bono de prueba para el test automático.");
  await page.fill("input[name=prizeValue]", "350");
  await page.getByTestId("action-type-0").selectOption("VISIT");
  await page.getByTestId("action-label-0").fill("Visita nuestra web");
  await page.getByTestId("action-url-0").fill("https://example.com");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText(/inferior a 300/)).toBeVisible(); // tope de valor
  await page.fill("input[name=prizeValue]", "80");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await page.waitForURL(/creado=1/);
  await expect(page.getByTestId("sponsor-raffle-state")).toHaveText("Pendiente de aprobación");
  await logout(page);

  // 2. El admin lo aprueba y adelanta el reloj hasta que abre (8:00 siguiente)
  await login(page, "admin@sorteodiario.test", "admin1234");
  await page.goto("/admin/sorteos");
  await page.getByTestId("pending-raffle").filter({ hasText: title }).getByTestId("approve").click();
  await expect(page.getByTestId("pending-raffle").filter({ hasText: title })).toHaveCount(0);
  await advanceClock(page, 24);
  await logout(page);

  // 3. El usuario demo participa
  await login(page, "demo@test.com");
  await page.getByTestId("raffle-card").filter({ hasText: title }).click();
  await runAction(page, page.getByTestId("unlock-button"));
  await expect(page.getByTestId("my-ticket-count")).toHaveText("3/10");
  await logout(page);

  // 4. El admin adelanta 3 días: el sorteo se cierra y se sortea
  await login(page, "admin@sorteodiario.test", "admin1234");
  await advanceClock(page, 72);
  await logout(page);

  // 5. El usuario es el único participante: gana, acepta y verifica
  await login(page, "demo@test.com");
  await page.goto("/perfil");
  const prize = page.getByTestId("prize").filter({ hasText: title });
  await expect(prize).toBeVisible();
  await prize.getByRole("button", { name: /Aceptar premio/ }).click();
  await expect(prize).toContainText("Aceptado. El patrocinador te contactará");

  await page.goto("/ganadores");
  await page.getByRole("row", { name: new RegExp(title) }).getByRole("link", { name: "Verificar" }).click();
  await page.getByTestId("verify-run").click();
  await expect(page.getByTestId("verify-result")).toContainText("✅ La clave coincide");
  await expect(page.getByTestId("verify-result")).toContainText("✅ Ganador");
  await logout(page);

  // 6. El patrocinador ve al ganador y marca la entrega
  await login(page, "patrocinador1@test.com");
  await page.getByRole("row", { name: new RegExp(title) }).getByRole("link", { name: "Estadísticas" }).click();
  await page.fill("input[name=notes]", "Código BONO-123");
  await page.getByRole("button", { name: "Marcar como entregado" }).click();
  await expect(page.getByText("Entregado", { exact: true })).toBeVisible();
  await logout(page);

});

// Siempre dejar el reloj de pruebas en la hora real
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await login(page, "admin@sorteodiario.test", "admin1234");
  await advanceClock(page, 0);
  await page.close();
});
