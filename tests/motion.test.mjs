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

test("山湖首页加载指定背景，主文案可见且不加载旧建筑图", async () => {
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
    const background = page.locator(".landscape-image");
    assert(
      await background.evaluate(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    assert((await background.getAttribute("src")).includes("moraine-lake"));
    assert.deepEqual(backgroundRequests, []);
    assert.equal(
      await page.getByRole("heading", { level: 1 }).innerText(),
      "助力失业者找到好的归属",
    );
    assert.equal(
      await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgb(255, 255, 255)",
    );
    assert(!/bojian/i.test(await page.locator("body").innerText()));
    assert.equal(await page.locator(".sphere-body").count(), 0);
    assert.equal(await page.locator("main button, main a, main p").count(), 0);
    assert.equal(
      await page.getByRole("button", { name: "下载 App" }).count(),
      1,
    );
    assert.equal(
      await page.getByRole("link", { name: "登录博简", exact: true }).count(),
      1,
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("各种尺寸背景铺满视口，仅顶部保留操作入口", async () => {
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
        () => document.documentElement.scrollWidth <= innerWidth,
      );
      assert(
        fits,
        `Homepage must not overflow horizontally at ${viewport.width}x${viewport.height}`,
      );
      const background = await page
        .locator(".landscape-background")
        .boundingBox();
      assert.deepEqual(background, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      );
      for (const selector of [".site-header", ".site-footer"]) {
        assert.equal(
          await page
            .locator(selector)
            .evaluate((el) => getComputedStyle(el).backgroundColor),
          "rgba(0, 0, 0, 0)",
        );
      }
      const hero = await page.locator(".brand-stage").boundingBox();
      const main = await page.locator("main").boundingBox();
      assert(hero.x >= main.x && hero.x + hero.width <= main.x + main.width);
      assert(hero.y >= main.y && hero.y + hero.height <= main.y + main.height);
      assert(
        await page
          .getByText("助力失业者找到好的归属", { exact: true })
          .isVisible(),
      );
      const login = page
        .locator("header")
        .getByRole("link", { name: "登录博简", exact: true });
      assert(await login.isVisible());
      assert.equal(await login.getAttribute("href"), "/login");
      const download = page
        .locator("header")
        .getByRole("button", { name: "下载 App" });
      assert(await download.isVisible());
      const downloadBounds = await download.boundingBox();
      const loginBounds = await login.boundingBox();
      assert(
        downloadBounds.x + downloadBounds.width < loginBounds.x,
        "Download must be left of login",
      );
      await download.click();
      await page.getByRole("status").filter({ hasText: "暂未上线" }).waitFor();
      const notification = await page.getByRole("status").boundingBox();
      assert(
        notification.x >= 12 &&
          notification.x + notification.width <= viewport.width - 12,
      );
      await page.keyboard.press("Escape");
      await page.getByRole("status").waitFor({ state: "hidden" });
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

test("下载通知支持键盘、Esc关闭、自动消失和重复点击计时", async () => {
  const page = await browser.newPage();
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    const trigger = page
      .locator("header")
      .getByRole("button", { name: "下载 App" });
    const notification = page.getByRole("status");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await notification.waitFor();
    assert.equal(await notification.innerText(), "暂未上线");
    assert.equal(await page.locator(".download-popover").count(), 0);
    assert(
      await trigger.evaluate((element) => document.activeElement === element),
    );
    await page.keyboard.press("Escape");
    await notification.waitFor({ state: "hidden" });
    await page.clock.install();
    await trigger.click();
    await page.clock.fastForward(2000);
    await page
      .locator("header")
      .getByRole("button", { name: "下载 App" })
      .click();
    assert.equal(await notification.count(), 1);
    await page.clock.fastForward(2000);
    assert(await notification.isVisible());
    await page.clock.fastForward(1100);
    await notification.waitFor({ state: "hidden" });
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
        .getByRole("heading", {
          level: 1,
          name: "助力失业者找到好的归属",
          exact: true,
        })
        .isVisible(),
    );
    await page
      .locator("header")
      .getByRole("link", { name: "登录博简", exact: true })
      .click();
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
        .locator("header")
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
    await page
      .locator("header")
      .getByRole("link", { name: "登录博简", exact: true })
      .click();
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
