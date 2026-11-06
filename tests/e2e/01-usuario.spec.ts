import { test, expect } from "@playwright/test";
import { runAction } from "./helpers";

test("un usuario nuevo se registra, verifica, desbloquea y usa comodines hasta el tope de 10", async ({ page }) => {
  const email = `nuevo${Date.now()}@test.com`;
  await page.goto("/registro");
  await page.fill("#name", "Laura Prueba");
  await page.fill("#email", email);
  await page.fill("#phone", `6${String(Date.now()).slice(-8)}`);
  await page.fill("#password", "test12345");
  await page.check("input[name=adult]");
  await page.check("input[name=terms]");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();

  // Verificación por SMS simulada
  await page.waitForURL("/verificar-telefono");
  const code = (await page.getByTestId("mock-sms").locator("b").textContent())!.trim();
  await page.fill("#code", code);
  await page.getByRole("button", { name: /Verificar/ }).click();
  await page.waitForURL(/bienvenida=1/);
  await expect(page.getByTestId("wildcard-balance")).toHaveText(/12/); // 10 bienvenida + 2 entrada diaria

  // Sorteo con desbloqueo "visitar web" (5 s)
  await page.getByTestId("raffle-card").filter({ hasText: "Pala de pádel" }).click();
  await expect(page.getByTestId("raffle-title")).toHaveText(/Pala de pádel/);
  await runAction(page, page.getByTestId("unlock-button"));
  await expect(page.getByText(/\+3 papeletas/)).toBeVisible();
  await expect(page.getByTestId("my-ticket-count")).toHaveText("3/10");

  // Solo caben 7 comodines más (tope 10); el formulario no deja poner más
  await page.getByTestId("wildcard-count").fill("7");
  await page.getByRole("button", { name: "Añadir papeletas" }).click();
  await expect(page.getByTestId("my-ticket-count")).toHaveText("10/10");
  await expect(page.getByTestId("wildcard-balance")).toHaveText(/ 5$/);

  // Acción extra (cupón): se completa, enseña el código, pero no da más papeletas
  await page.getByRole("button", { name: /10 % de descuento/ }).click();
  await expect(page.getByText("SORTEO10")).toBeVisible();
  await expect(page.getByTestId("my-ticket-count")).toHaveText("10/10");

  // Compartir da +1 comodín
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByTestId("share-button").click();
  await expect(page.getByText(/\+1 comodín por compartir/)).toBeVisible();

  // Perfil: completar da +5
  await page.goto("/perfil");
  await page.getByTestId("province").selectOption("Granada");
  await page.getByTestId("birthdate").fill("1990-05-10");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/\+5 comodines por completar tu perfil/)).toBeVisible();
});

test("un sorteo especial permite hasta 30 papeletas", async ({ page }) => {
  await page.goto("/entrar");
  await page.fill("#email", "demo@test.com");
  await page.fill("#password", "test1234");
  await page.click("button[type=submit]");
  await page.waitForURL("/");
  await page.getByTestId("raffle-card").filter({ hasText: "Fin de semana en hotel" }).click();
  await expect(page.getByTestId("my-ticket-count")).toHaveText("0/30");
});
