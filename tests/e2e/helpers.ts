import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string, password = "test1234") {
  await page.goto("/entrar");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL("/");
}

export async function advanceClock(page: Page, hours: number) {
  await page.goto("/admin");
  await page.locator("form", { has: page.locator(`input[name=hours][value="${hours}"]`) }).getByRole("button").click();
  await expect(page.getByText(/Reloj (adelantado|restablecido)/)).toBeVisible();
}

/** Completa la acción de desbloqueo (o una acción) esperando el tiempo mínimo */
export async function runAction(page: Page, button: ReturnType<Page["getByTestId"]>) {
  const popup = page.waitForEvent("popup", { timeout: 3000 }).catch(() => null);
  await button.click();
  const p = await popup;
  await p?.close();
  const complete = page.getByTestId("complete-action");
  if (await complete.isVisible().catch(() => false)) {
    await expect(complete).toBeEnabled({ timeout: 30_000 });
    await complete.click();
  }
}
