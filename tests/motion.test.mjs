import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
let server, browser, base;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
before(async () => {
  assert(existsSync(".next/BUILD_ID"), "Run pnpm build first");
  mkdirSync("artifacts", { recursive: true });
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  base = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        BOJIAN_APP_AUTH_ORIGIN: "",
        BOJIAN_WEBSITE_ORIGIN: base,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let log = "";
  server.stdout.on("data", (value) => (log += value));
  server.stderr.on("data", (value) => (log += value));
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try {
      if ((await fetch(base + "/robots.txt")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(100);
  }
  assert(ready, "Preview did not start");
  browser = await chromium.launch({
    executablePath:
      process.env.BOJIAN_TEST_BROWSER ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
});
after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
});

test("产品首页可跳转到流程、功能、实机界面、社区与常见问题", async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const response = await page.goto(base, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    assert.equal(
      (await page.getByRole("heading", { level: 1 }).innerText()).replace(
        /\s/g,
        "",
      ),
      "每段经历，都值得好好写下。",
    );
    await page.locator('main a[href="#features"]').first().click();
    await page.waitForURL(base + "/#features");
    for (const area of ["story", "features", "screens", "community", "questions"]) {
      assert(
        await page
          .locator(`#${area}`)
          .getByRole("heading", { level: 2 })
          .first()
          .isVisible(),
        area,
      );
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("实机截图库支持点击和键盘切换，图片与说明同步", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    const gallery = page.locator("#screens");
    const buttons = gallery.locator("button[aria-pressed]");
    const count = await buttons.count();
    assert(count >= 3);
    const images = new Set(),
      descriptions = new Set();
    for (const [i, button] of (await buttons.all()).entries()) {
      if (i % 2 === 0) {
        await button.click();
      } else {
        await button.focus();
        await page.keyboard.press("Space");
      }
      await button.and(gallery.locator('[aria-pressed="true"]')).waitFor();
      assert.equal(
        await gallery.getByRole("button", { pressed: true }).count(),
        1,
      );
      assert(await button.evaluate((el) => document.activeElement === el));
      const image = gallery.locator("img[data-screen-image]:visible");
      await image.scrollIntoViewIfNeeded();
      const details = await image.evaluate(async (el) => {
        await el.decode();
        return {
          src: el.currentSrc,
          alt: el.alt.trim(),
          width: el.naturalWidth,
          height: el.naturalHeight,
        };
      });
      assert(
        details.alt.length > 0 &&
          details.width > 0 &&
          details.height > details.width,
      );
      images.add(details.src);
      const description = (
        await gallery.locator("[data-screen-description]:visible").innerText()
      ).trim();
      assert(description.length > 0);
      descriptions.add(description);
    }
    assert.equal(images.size, count, "每个界面要有对应的实机截图");
    assert.equal(descriptions.size, count, "切换界面时说明也应更新");
  } finally {
    await page.close();
  }
});

test("从小屏到桌面均可浏览完整首页", async () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 400, height: 830 },
    { width: 768, height: 900 },
    { width: 1024, height: 600 },
    { width: 1440, height: 1000 },
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    try {
      await page.goto(base, { waitUntil: "networkidle" });
      for (const control of [
        page.getByRole("heading", { level: 1 }),
        page.locator('main a[href="#features"]').first(),
        page.locator("#features").getByRole("tab").last(),
        page.locator("#screens button[aria-pressed]").last(),
        page.locator('footer a[href="/privacy"]'),
      ]) {
        await control.scrollIntoViewIfNeeded();
        assert(await control.isVisible());
        const bounds = await control.boundingBox();
        assert(
          bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1,
          `首页控件在 ${viewport.width}px 宽度下必须可见`,
        );
      }
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `首页在 ${viewport.width}px 横向溢出`,
      );
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({
        path: `artifacts/product-home-${viewport.width}.png`,
        fullPage: true,
      });
    } finally {
      await page.close();
    }
  }
});

test("功能分组可用键盘逐项阅读，减少动态效果时仍可浏览问答", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    const features = page.locator("#features");
    const tabs = features.getByRole("tab"),
      count = await tabs.count();
    assert(count >= 5);
    const content = new Set();
    await tabs.first().focus();
    await page.keyboard.press("Home");
    for (let index = 0; index < count; index++) {
      if (index) await page.keyboard.press("ArrowRight");
      const tab = tabs.nth(index);
      await tab.and(features.locator('[aria-selected="true"]')).waitFor();
      assert(await tab.evaluate((el) => document.activeElement === el));
      const panel = features.getByRole("tabpanel");
      assert(await panel.isVisible());
      const value = (await panel.innerText()).trim();
      assert(value.length > 0);
      content.add(value);
    }
    assert.equal(content.size, count, "各分组展示对应的功能介绍");
    const question = page.locator("#questions details").first();
    const original = await question.evaluate((el) => el.open);
    await question.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await question.evaluate((el) => el.open), !original);
    assert.equal(
      await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.effect?.getTiming().iterations === Infinity,
            ).length,
      ),
      0,
    );
  } finally {
    await page.close();
  }
});

test("关闭 JavaScript 仍能阅读产品内容、截图、常见问题和法律文件", async () => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(base);
    assert(await page.getByRole("heading", { level: 1 }).isVisible());
    const shot = page
      .locator("#screens img[data-screen-image]:visible")
      .first();
    await shot.scrollIntoViewIfNeeded();
    assert(
      await shot.evaluate(async (el) => {
        await el.decode();
        return el.naturalWidth > 0;
      }),
    );
    await page.locator('main a[href="#features"]').first().click();
    await page.waitForURL(base + "/#features");
    assert(await page.locator("#features h2").isVisible());
    const directory = page.locator('#features [aria-label="完整功能目录"]');
    const groups = directory.locator("article");
    assert((await groups.count()) >= 5);
    for (const group of await groups.all()) {
      assert(await group.getByRole("heading").isVisible());
      assert(await group.locator("dd").first().isVisible());
    }
    const question = page.locator("#questions details:not([open])").first();
    await question.locator("summary").click();
    assert((await page.locator("#questions details[open]").count()) > 0);
    for (const path of ["/privacy", "/terms"]) {
      await page.locator(`footer a[href="${path}"]`).click();
      await page.waitForURL(base + path);
      assert(await page.getByRole("heading", { level: 1 }).isVisible());
      await page.locator('header a[href="/"]').first().click();
      await page.waitForURL(base + "/");
    }
  } finally {
    await context.close();
  }
});

test("下载提示支持键盘、Esc 关闭和重复触发计时", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    const trigger = page
      .locator(".site-header")
      .getByRole("button", { name: "下载 App" });
    const notice = page
      .getByRole("status")
      .filter({ hasText: "官网暂未开放下载" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await notice.waitFor();
    const bounds = await notice.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    assert(
      await trigger.evaluate((element) => document.activeElement === element),
    );
    await page.keyboard.press("Escape");
    await notice.waitFor({ state: "hidden" });
    await page.clock.install();
    await trigger.click();
    await page.clock.fastForward(2000);
    await trigger.click();
    await page.clock.fastForward(2000);
    assert(await notice.isVisible());
    await page.clock.fastForward(1100);
    await notice.waitFor({ state: "hidden" });
  } finally {
    await page.close();
  }
});
