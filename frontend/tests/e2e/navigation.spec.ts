import { expect, test } from "@playwright/test";

test("landing navigation links work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Universal Cybersecurity Intelligence Platform").first()).toBeVisible();

  await page.getByRole("link", { name: "Pricing" }).first().click();
  await expect(page).toHaveURL(/\/pricing$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Start Free" }).first().click();
  await expect(page).toHaveURL(/\/auth\/register$/);
});

test("unknown routes show 404 page", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
});
