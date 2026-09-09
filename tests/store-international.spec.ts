import { expect, test } from "@playwright/test";

test("international store request opens, submits and confirms email follow-up", async ({ page }) => {
  await page.route("**/api/enquiry", async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload.sourceType).toBe("store-international");
    expect(payload.name).toBe("Asha Mehta");
    expect(payload.email).toBe("asha@example.com");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, enquiryId: "SC-STORE01" }) });
  });

  await page.goto("/store");
  const internationalTab = page.getByRole("button", { name: "International payments & dispatch" });
  await internationalTab.scrollIntoViewIfNeeded();
  await internationalTab.click();

  const dialog = page.getByRole("dialog", { name: "Payment and dispatch, arranged personally." });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name").fill("Asha Mehta");
  await dialog.getByLabel("Email address").fill("asha@example.com");
  await dialog.getByRole("button", { name: "Request international assistance" }).click();

  const confirmation = page.getByRole("dialog", { name: "We’ll be in touch by email." });
  await expect(confirmation.getByRole("heading", { name: "We’ll be in touch by email." })).toBeVisible();
  await expect(confirmation).toContainText("SC-STORE01");
});
