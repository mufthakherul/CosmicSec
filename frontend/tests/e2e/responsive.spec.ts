import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 720 },
] as const;

for (const vp of viewports) {
  test(`landing page remains usable on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await expect(page.getByRole("link", { name: /start free/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /pricing/i }).first()).toBeVisible();
  });
}
