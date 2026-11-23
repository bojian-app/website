import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BOJIAN_SMOKE_ORIGIN || "https://bojian.kelance.cn";
const destination =
  process.env.BOJIAN_SMOKE_ARTIFACTS || "artifacts/deploy-smoke";
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.BOJIAN_TEST_BROWSER ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const errors = [],
  badResponses = [],
  checks = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      badResponses.push({ url: r.url().split("?")[0], status: r.status() });
  });
  const home = await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(home.status(), 200);
  const heading = page.getByRole("heading", { level: 1 });
  assert.equal(
    (await heading.innerText()).replace(/\s/g, ""),
    "每段经历，都值得好好写下。",
  );
  const screens = page.locator("#screens");
  const selectors = screens.locator("button[aria-pressed]");
  const selectedImages = new Set();
  assert((await selectors.count()) >= 3);
  for (const button of await selectors.all()) {
    await button.click();
    await button.and(screens.locator('[aria-pressed="true"]')).waitFor();
    assert.equal(
      await screens.getByRole("button", { pressed: true }).count(),
      1,
    );
    const shot = screens.locator("img[data-screen-image]:visible");
    await shot.scrollIntoViewIfNeeded();
    selectedImages.add(
      await shot.evaluate(async (el) => {
        await el.decode();
        if (
          !el.alt.trim() ||
          !el.naturalWidth ||
          el.naturalWidth >= el.naturalHeight
        )
          throw Error("无有效的竖屏产品截图");
        return el.currentSrc;
      }),
    );
  }
  assert.equal(selectedImages.size, await selectors.count());
  await selectors.first().click();
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: destination + "/home-desktop.png",
    fullPage: true,
  });
  checks.push("desktop homepage and screen gallery");

  await page.locator('main a[href="#features"]').first().click();
  const tabs = page.locator("#features").getByRole("tab");
  assert((await tabs.count()) >= 5);
  await tabs.last().click();
  await tabs.last().and(page.locator('[aria-selected="true"]')).waitFor();
  assert(await page.locator("#features").getByRole("tabpanel").isVisible());
  assert(await page.locator("#community h2").isVisible());
  const closedQuestion = page.locator("#questions details:not([open])").first();
  await closedQuestion.locator("summary").click();
  assert((await page.locator("#questions details[open]").count()) > 0);
  checks.push("interactive features and FAQ");

  const download = page
    .locator(".site-header")
    .getByRole("button", { name: "下载 App" });
  const notice = page
    .getByRole("status")
    .filter({ hasText: "官网暂未开放下载" });
  for (const [label, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base, { waitUntil: "networkidle" });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if (label === "mobile")
      await page.screenshot({
        path: destination + "/home-mobile.png",
        fullPage: true,
      });
    await download.click();
    await notice.waitFor();
    await page.screenshot({
      path: destination + "/notification-" + label + ".png",
    });
    await page.keyboard.press("Escape");
    await notice.waitFor({ state: "hidden" });
    checks.push(label + " layout and download notice");
  }
  for (const path of [
    "/privacy",
    "/terms",
    "/robots.txt",
    "/sitemap.xml",
    "/opengraph-image",
  ]) {
    const response = await context.request.get(base + path);
    assert.equal(response.status(), 200, path);
    checks.push(path);
  }
  if (new URL(base).hostname === "bojian.kelance.cn") {
    for (const path of ["/api/v1/health", "/api/v1/ready", "/admin/"]) {
      assert.equal(
        (await context.request.get(base + path)).status(),
        200,
        path,
      );
      checks.push(path);
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(badResponses, []);
  await writeFile(
    destination + "/smoke-result.json",
    JSON.stringify({ base, checks, errors, badResponses }, null, 2),
  );
  console.log(JSON.stringify({ base, checks, errors, badResponses }, null, 2));
} finally {
  await browser.close();
}
