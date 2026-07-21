import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const widths = [320, 375, 390, 412, 768, 1024, 1440];
const heightFor = (width: number) => (width === 1024 ? 768 : width >= 1440 ? 900 : width >= 768 ? 1024 : 844);

type Finding = {
  route: string;
  width: number;
  category: string;
  detail: string;
};

async function sitemapRoutes(page: Page) {
  const response = await page.request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  const routes = [...xml.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map((match) => match[1] || "/");
  return [...new Set(routes)].filter((route) => !route.startsWith("/admin") && !route.startsWith("/studio"));
}

for (const width of widths) {
  test(`all public pages meet layout and interaction invariants at ${width}px`, async ({ page }, testInfo) => {
    const findings: Finding[] = [];
    const routes = await sitemapRoutes(page);
    await page.setViewportSize({ width, height: heightFor(width) });
    for (const route of routes) {
      const consoleErrors: string[] = [];
      const onConsole = (message: { type(): string; text(): string }) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      };
      page.on("console", onConsole);
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(50);

      if (!response?.ok()) {
        findings.push({ route, width, category: "response", detail: `HTTP ${response?.status() ?? "no response"}` });
      }

      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const interactive = [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, summary")]
          .filter((element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
          })
          .map((element) => {
            const ownBox = element.getBoundingClientRect();
            const label = element.matches("input, select, textarea") ? element.closest("label") : null;
            const labelBox = label?.getBoundingClientRect();
            const box = labelBox && labelBox.width > 0 && labelBox.height > 0 ? labelBox : ownBox;
            return {
              label: (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 80),
              width: Math.round(box.width),
              height: Math.round(box.height),
              tag: element.tagName.toLowerCase()
            };
          });
        const inputs = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")].map((element) => ({
          name: element.name || element.id || ("placeholder" in element ? element.placeholder : "") || element.tagName,
          type: element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase(),
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
          autocomplete: element.getAttribute("autocomplete") || ""
        }));
        const brokenImages = [...document.images]
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src);
        return {
          viewportWidth: window.innerWidth,
          scrollWidth: root.scrollWidth,
          interactive,
          inputs,
          brokenImages
        };
      });

      if (metrics.scrollWidth > metrics.viewportWidth + 1) {
        findings.push({ route, width, category: "horizontal-overflow", detail: `${metrics.scrollWidth}px document in ${metrics.viewportWidth}px viewport` });
      }
      if (width <= 1024) {
        for (const target of metrics.interactive) {
          if (target.width < 44 || target.height < 44) {
            findings.push({ route, width, category: "tap-target", detail: `${target.tag} “${target.label}” is ${target.width}x${target.height}` });
          }
        }
      }
      for (const input of metrics.inputs) {
        if (input.fontSize < 16) findings.push({ route, width, category: "input-zoom", detail: `${input.name} uses ${input.fontSize}px text` });
        if (input.type === "email" && !/email/.test(input.autocomplete)) findings.push({ route, width, category: "autofill", detail: `${input.name} lacks email autocomplete` });
        if (input.type === "tel" && !/tel/.test(input.autocomplete)) findings.push({ route, width, category: "autofill", detail: `${input.name} lacks tel autocomplete` });
      }
      for (const image of metrics.brokenImages) findings.push({ route, width, category: "image", detail: `Broken image: ${image}` });
      for (const error of consoleErrors) findings.push({ route, width, category: "console", detail: error.slice(0, 200) });
      page.off("console", onConsole);
    }

    await testInfo.attach("mobile-audit-findings", {
      body: Buffer.from(JSON.stringify({ routes: routes.length, width, findings }, null, 2)),
      contentType: "application/json"
    });
    const outputDirectory = path.resolve("output/mobile-audit");
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(path.join(outputDirectory, `findings-${width}.json`), JSON.stringify({ routes: routes.length, width, findings }, null, 2));
    const counts = findings.reduce<Record<string, number>>((result, finding) => {
      result[finding.category] = (result[finding.category] || 0) + 1;
      return result;
    }, {});
    const summary = JSON.stringify({ counts, examples: findings.slice(0, 20) }, null, 2);
    expect(findings.length, summary).toBe(0);
  });
}
