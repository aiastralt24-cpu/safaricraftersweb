import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("mobile menu traps focus, locks scroll, restores focus, and navigates", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu" });

  await trigger.tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close menu" })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  for (let index = 0; index < 14; index += 1) await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest("[role=dialog]")?.id)).toBe("concept-full-menu");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");

  await trigger.tap();
  await dialog.getByRole("link", { name: /Guest Notes/ }).tap();
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(dialog).toBeHidden();
});

test("planner survives keyboard-sized viewport and orientation change", async ({ page }) => {
  await page.route("**/api/enquiry", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, enquiryId: "SC-MOBILE-TEST", specialist: "Test specialist" })
    });
  });

  await page.goto("/plan?region=India");
  for (let step = 0; step < 4; step += 1) await page.getByRole("button", { name: "Continue" }).tap();

  const name = page.getByLabel("Name");
  await name.tap();
  await page.setViewportSize({ width: 390, height: 500 });
  await name.fill("Mobile Traveller");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("mobile@example.com");
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('input[name="name"]')).toHaveValue("Mobile Traveller");
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByLabel(/consent/i).check();

  const submit = page.getByRole("button", { name: /send|submit|brief/i });
  await submit.dblclick();
  await expect(page.getByText("Your brief has been received.")).toBeVisible();
  await expect(page.getByText(/SC-MOBILE-TEST/)).toBeVisible();
});

test("mobile home remains stable through rapid taps, back navigation, and refresh", async ({ page }) => {
  const videoRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".mp4")) videoRequests.push(request.url());
  });

  await page.goto("/");
  const heroFragments = page.locator(".concept-hero-line > span");
  const openingLine = await heroFragments.allTextContents();
  await page.waitForTimeout(6500);
  expect(await heroFragments.allTextContents()).toEqual(openingLine);
  expect(videoRequests).toEqual([]);

  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Open menu" }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close menu" }).tap();
    await expect(page.getByRole("dialog")).toBeHidden();
  }

  await page.getByRole("button", { name: "Open menu" }).tap();
  await page.getByRole("dialog").getByRole("link", { name: /Guest Notes/ }).tap();
  await expect(page).toHaveURL(/\/reviews$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.evaluate(() => window.scrollTo(0, Math.min(1200, document.body.scrollHeight - innerHeight)));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
