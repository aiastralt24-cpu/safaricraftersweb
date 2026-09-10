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
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByRole("button", { name: "Tigers", exact: true }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();

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

test("destination search and gallery lightbox remain usable on mobile", async ({ page }) => {
  await page.goto("/destinations");
  await page.getByRole("textbox", { name: "Search" }).fill("polar bear");
  await expect(page.locator(".destination-finder-results a")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Svalbard Norway/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto("/journeys/big-cats-of-india");
  const gallery = page.locator(".gallery-trigger");
  await expect(gallery.first()).toBeVisible();
  await gallery.first().tap();
  const lightbox = page.getByRole("dialog", { name: /image viewer/ });
  await expect(lightbox).toBeVisible();
  await expect(page.getByRole("button", { name: "Close image viewer" })).toBeFocused();
  await expect(page.locator("main")).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(page.locator("main")).not.toHaveAttribute("aria-hidden", "true");
});

test("destination briefs never render explicitly temporary photography", async ({ page }) => {
  await page.goto("/destinations/rajaji");
  await expect(page.locator('img[alt^="Temporary"]')).toHaveCount(0);
  await expect(page.locator(".page-hero > img")).toBeVisible();

  await page.goto("/destinations/svalbard");
  await expect(page.locator(".page-hero > img")).toBeVisible();
  await expect(page.locator('img[alt^="Temporary"]')).toHaveCount(0);
});

test("planner disables elapsed months in the current year", async ({ page }) => {
  await page.goto("/plan?region=India");
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();
  await page.getByRole("button", { name: "Tigers", exact: true }).tap();
  await page.getByRole("button", { name: "Continue" }).tap();
  const elapsedMonthCount = new Date().getMonth();
  await expect(page.locator(".chip:disabled")).toHaveCount(elapsedMonthCount);
});

test("contact brief uses the enquiry pipeline and shows a reference", async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;
  await page.route("**/api/enquiry", async (route) => {
    submittedPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, enquiryId: "SC-CONTACT-TEST", specialist: "Safari Crafters" }) });
  });
  await page.goto("/contact");
  await page.getByLabel("Name", { exact: true }).fill("Field Traveller");
  await page.getByLabel("Email", { exact: true }).fill("field@example.com");
  await page.getByLabel("Message", { exact: true }).fill("A private Svalbard conversation.");
  await page.getByLabel(/I consent to Safari Crafters/).check();
  await page.getByRole("button", { name: "Send Brief" }).tap();
  await expect(page.getByText("Your brief has been received.")).toBeVisible();
  await expect(page.getByText(/SC-CONTACT-TEST/)).toBeVisible();
  expect(submittedPayload?.source).toBe("planner");
  expect(submittedPayload?.sourceType).toBe("contact");
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
  expect(videoRequests.some((url) => url.endsWith("/assets/safari-crafters/safari-crafters-mobile.mp4"))).toBe(true);

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
