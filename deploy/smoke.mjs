import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import jsQR from "jsqr";
import { PNG } from "pngjs";
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
  assert.equal(
    await page.getByRole("heading", { level: 1 }).innerText(),
    "助力失业者找到好的归属",
  );
  await page.screenshot({
    path: destination + "/home-desktop.png",
    fullPage: true,
  });
  checks.push("desktop homepage");
  assert(
    await page
      .locator(".landscape-image")
      .evaluate((image) => image.complete && image.naturalWidth > 0),
  );
  assert.equal(await page.locator("main button, main a, main p").count(), 0);
  assert.equal(await page.getByRole("button", { name: "下载 App" }).count(), 1);
  assert.deepEqual(await page.locator(".landscape-background").boundingBox(), {
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  });
  const notice = page.getByRole("status");
  await page
    .locator("header")
    .getByRole("button", { name: "下载 App" })
    .click();
  await notice.waitFor();
  assert.equal(await notice.innerText(), "暂未上线");
  assert.equal(await page.locator(".download-popover").count(), 0);
  await page.screenshot({
    path: destination + "/notification-desktop.png",
    fullPage: true,
  });
  await notice.waitFor({ state: "hidden" });
  checks.push(
    "full viewport background, single header actions and download notification",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.deepEqual(await page.locator(".landscape-background").boundingBox(), {
    x: 0,
    y: 0,
    width: 390,
    height: 844,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: destination + "/home-mobile.png",
    fullPage: true,
  });
  checks.push("mobile homepage");
  await page
    .locator("header")
    .getByRole("button", { name: "下载 App" })
    .click();
  await notice.waitFor();
  await page.screenshot({
    path: destination + "/notification-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await notice.waitFor({ state: "hidden" });
  await page.goto(base + "/console", { waitUntil: "domcontentloaded" });
  const appHeader = await page.locator(".header-inner").boundingBox();
  assert.equal(appHeader.height, 56);
  assert.equal(appHeader.width, 390);
  assert.equal(appHeader.x, 0);
  assert.deepEqual(await page.locator(".console-application").boundingBox(), {x: 0, y: 56, width: 390, height: 788});
  assert.equal(await page.locator(".site-footer").count(), 0);

  await page.screenshot({
    path: destination + "/console-mobile.png",
    fullPage: true,
  });
  checks.push("full viewport console application shell and compact header");
  await page.getByRole("link", { name: "登录并进入控制台" }).click();
  await page.waitForURL(
    (url) =>
      url.pathname === "/login" && url.searchParams.get("next") === "/console",
    { waitUntil: "domcontentloaded" },
  );
  checks.push("anonymous console login link preserves return target");
  await page.screenshot({
    path: destination + "/login-mobile.png",
    fullPage: true,
  });
  const creation = page.waitForResponse(
    (r) =>
      r.url() === base + "/web-api/auth/qr" && r.request().method() === "POST",
  );
  await page.getByRole("checkbox").check();
  const result = await creation;
  assert.equal(result.status(), 201);
  const qr = await result.json();
  assert(qr.qrDataUrl.startsWith("data:image/svg+xml;base64,"));
  const status = await page.waitForResponse((r) =>
    r.url().startsWith(base + "/web-api/auth/qr?"),
  );
  assert.equal(status.status(), 200);
  assert.equal((await status.json()).status, "waiting");
  checks.push("production QR creation and polling");
  await page.locator(".qr-image").evaluate((image) => image.decode());
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const bitmap = PNG.sync.read(await page.locator(".qr-stage").screenshot());
    const decoded = jsQR(
      new Uint8ClampedArray(bitmap.data),
      bitmap.width,
      bitmap.height,
    );
    assert(decoded, `Blue QR decodes at ${width}px`);
    assert.match(decoded.data, /^https:\/\/bojian\.kelance\.cn\/app-login#/);
    checks.push(`blue QR decodes at ${width}px`);
  }
  await page.getByRole("checkbox").uncheck();
  for (const path of [
    "/privacy",
    "/terms",
    "/app-login",
    "/console/template-guide",
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
