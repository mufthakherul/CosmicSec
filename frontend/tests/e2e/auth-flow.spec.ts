import { expect, test } from "@playwright/test";

test("protected route redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("login page links navigate to register and forgot password", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("link", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();

  await page.goto("/auth/login");
  await page.getByRole("link", { name: /forgot password\?/i }).click();
  await expect(page).toHaveURL(/\/auth\/forgot$/);
  await expect(page.getByRole("heading", { name: /forgot password\?/i })).toBeVisible();
});

test("login form validates empty submit", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Email is required")).toBeVisible();
  await expect(page.getByText("Password is required")).toBeVisible();
});
