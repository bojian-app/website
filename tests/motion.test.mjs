import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
let server, browser, base;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
before(async () => {
  assert(existsSync(".next/BUILD_ID"), "Run pnpm build first");
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
      if ((await fetch(base + "/web-api/auth/session")).ok) {
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

test("纯排版首页不加载旧背景，品牌可见且页面底色为白色", async () => {
  const page = await browser.newPage();
  const errors = [];
  const backgroundRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("white-architecture"))
      backgroundRequests.push(request.url());
  });
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".site-background").count(), 0);
    assert.deepEqual(backgroundRequests, []);
    assert.equal(
      await page.getByRole("heading", { level: 1 }).innerText(),
      "博简",
    );
    assert.equal(
      await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgb(255, 255, 255)",
    );
    assert(!/bojian/i.test(await page.locator("body").innerText()));
    assert.equal(await page.locator(".sphere-body").count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("各种尺寸品牌排版完整显示，登录与下载入口保持单屏", async () => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 600 },
    { width: 1440, height: 1000 },
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    try {
      await page.goto(base, { waitUntil: "networkidle" });
      const fits = await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      );
      assert(
        fits,
        `Homepage must fit one viewport at ${viewport.width}x${viewport.height}`,
      );
      assert.equal(await page.locator("main section, main h2").count(), 0);
      const hero = await page.locator(".brand-stage").boundingBox();
      const main = await page.locator("main").boundingBox();
      assert(hero.x >= main.x && hero.x + hero.width <= main.x + main.width);
      assert(hero.y >= main.y && hero.y + hero.height <= main.y + main.height);
      assert(
        await page
          .getByText("把经历，写成新的可能。", { exact: true })
          .isVisible(),
      );
      const login = page.getByRole("link", { name: "登录博简", exact: true });
      assert(await login.isVisible());
      assert.equal(await login.getAttribute("href"), "/login");
      const download = page.locator(".download-menu > summary");
      assert(await download.isVisible());
      const downloadBounds = await download.boundingBox();
      const loginBounds = await login.boundingBox();
      assert(
        downloadBounds.x + downloadBounds.width < loginBounds.x,
        "Download must be left of login",
      );
      await download.click();
      await page.getByText("即将开放下载", { exact: true }).waitFor();
      const popover = await page.locator(".download-popover").boundingBox();
      assert(
        popover.x >= 12 && popover.x + popover.width <= viewport.width - 12,
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator(".download-menu").getAttribute("open"),
        null,
      );
      const actionBounds = await page.locator(".landing-actions").boundingBox();
      assert(
        actionBounds.y >= 0 &&
          actionBounds.y + actionBounds.height < 100 &&
          actionBounds.x + actionBounds.width <= viewport.width - 12,
      );
      await page.screenshot({
        path: `artifacts/type-home-${viewport.width}.png`,
        fullPage: true,
      });
    } finally {
      await page.close();
    }
  }
});

test("下载状态支持键盘、外部点击和Esc关闭", async () => {
  const page = await browser.newPage();
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    const trigger = page.locator(".download-menu > summary");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.getByText("即将开放下载", { exact: true }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(".download-menu").getAttribute("open"),
      null,
    );
    assert(
      await trigger.evaluate((element) => document.activeElement === element),
    );
    await trigger.click();
    await page.locator("main").click({ position: { x: 300, y: 300 } });
    assert.equal(
      await page.locator(".download-menu").getAttribute("open"),
      null,
    );
  } finally {
    await page.close();
  }
});

test("减少动态效果与页面往返保持可操作，不残留重复场景", async () => {
  const page = await browser.newPage();
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    assert(
      await page
        .getByRole("heading", { level: 1, name: "博简", exact: true })
        .isVisible(),
    );
    await page.getByRole("link", { name: "登录博简", exact: true }).click();
    await page.waitForURL(base + "/login");
    await page.locator(".login-back").click();
    await page.waitForURL(base + "/");
    assert.equal(
      await page.locator("main .landing-actions, .landing-title").count(),
      0,
    );
    assert.equal(await page.locator(".site-atmosphere").count(), 0);
    assert.equal(await page.locator(".brand-stage").count(), 1);
    assert(
      await page
        .getByRole("link", { name: "登录博简", exact: true })
        .isVisible(),
    );
  } finally {
    await page.close();
  }
});

test("关闭JavaScript仍能打开登录页与法律文件", async () => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(base);
    assert(await page.getByRole("heading", { level: 1 }).isVisible());
    await page.getByRole("link", { name: "登录博简", exact: true }).click();
    await page.waitForURL(base + "/login");
    assert(await page.getByRole("checkbox").isVisible());
    await page.locator(".login-back").click();
    await page
      .locator(".site-footer")
      .getByRole("link", { name: "隐私政策", exact: true })
      .click();
    await page.waitForURL(base + "/privacy");
    assert(await page.getByRole("heading", { level: 1 }).isVisible());
  } finally {
    await context.close();
  }
});
