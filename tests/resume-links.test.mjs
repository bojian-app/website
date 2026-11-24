import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const token = "a".repeat(64),
  visitors = new Map(),
  submissions = [];
let backend,
  website,
  browser,
  base,
  revoked = false,
  failNext = false;
function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}
async function port() {
  const server = createServer();
  const value = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return value;
}
before(async () => {
  backend = createServer(async (req, res) => {
    if (!req.url.startsWith(`/api/v1/public/resume-links/${token}`) || revoked)
      return json(res, 410, { error: { message: "链接不存在或已停用" } });
    const credential = req.headers["x-resume-guest"];
    if (!/^[A-Za-z0-9_-]{43}$/.test(credential || ""))
      return json(res, 401, { error: { message: "缺少游客凭据" } });
    if (req.url.endsWith("/session")) {
      if (!visitors.has(credential)) {
        const id = visitors.size + 10;
        visitors.set(credential, {
          id,
          display_name: `游客 ${id.toString(16).toUpperCase().padStart(6, "0")}`,
          items: [],
        });
      }
      const visitor = visitors.get(credential);
      return json(res, 200, {
        data: {
          id: visitor.id,
          role: "GUEST",
          display_name: visitor.display_name,
        },
      });
    }
    const visitor = visitors.get(credential);
    if (!visitor)
      return json(res, 401, { error: { message: "请重新打开分享链接" } });
    if (req.url.endsWith("/annotations")) {
      if (req.method === "GET")
        return json(res, 200, { data: { items: visitor.items } });
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      const key = req.headers["idempotency-key"];
      submissions.push({ body, key, credential });
      if (failNext) {
        failNext = false;
        return json(res, 503, { error: { message: "连接中断，请重试" } });
      }
      const item = {
        ...body,
        id: visitor.items.length + 1,
        reviewer_id: visitor.id,
        reviewer_name: visitor.display_name,
        status: "PENDING",
        moderation_status: "VISIBLE",
      };
      visitor.items.unshift(item);
      return json(res, 200, { data: { id: item.id, status: "QUEUED" } });
    }
    return json(res, 200, {
      data: {
        title: "测试简历",
        can_review: true,
        snapshot: {
          job_expectation: {
            position: "前端工程师",
            city: "广州市、深圳市",
            industry: "软件开发服务",
            salary: "15000",
          },
          work_experiences: [
            {
              position: "前端开发",
              start_date: "2022-07",
              end_date: "2024-06",
              description: "负责开发网站，提升页面性能。",
            },
          ],
          projects: [
            {
              name: "协作项目名称",
              role: "项目负责人",
              start_date: "2023-01",
              end_date: "2024-06",
              description: "设计并交付移动应用。",
            },
          ],
          educations: [
            {
              field_of_study: "计算机科学与技术",
              degree: "本科",
              start_date: "2018-09",
              end_date: "2022-06",
            },
          ],
          skills: [
            { name: "TypeScript", description: "熟悉 React 与自动化测试" },
          ],
        },
      },
    });
  });
  const backendPort = await listen(backend),
    websitePort = await port();
  base = `http://127.0.0.1:${websitePort}`;
  website = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(websitePort),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        BOJIAN_APP_AUTH_ORIGIN: `http://127.0.0.1:${backendPort}`,
        BOJIAN_WEBSITE_ORIGIN: base,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let log = "";
  website.stdout.on("data", (v) => (log += v));
  website.stderr.on("data", (v) => (log += v));
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (website.exitCode !== null) throw new Error(log);
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  mkdirSync("artifacts/resume-link-validation", { recursive: true });
});
after(async () => {
  await browser?.close();
  website?.kill("SIGTERM");
  await new Promise((resolve) => backend?.close(resolve));
});

test("External link assigns private guest cookie, supports rewrite/retry/comparison and has no site navigation", async () => {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${base}/resume-review/${token}`);
  assert.match(response.headers()["x-robots-tag"], /noindex/);
  assert.equal(response.headers()["referrer-policy"], "no-referrer");
  await page
    .getByText("负责开发网站，提升页面性能。", { exact: true })
    .waitFor();
  await page
    .locator('[data-field="projects.0.name"]')
    .getByText("协作项目名称", { exact: true })
    .waitFor();
  assert.deepEqual(
    await page.locator('[aria-label="个人信息已隐藏"] span').allTextContents(),
    ["***", "***"],
  );
  assert.equal(
    await page.locator('[aria-label="隐私信息已隐藏"]').first().innerText(),
    "***",
  );
  assert.equal(
    await page
      .locator('[aria-label="个人信息已隐藏"] span')
      .first()
      .evaluate((el) => getComputedStyle(el).filter),
    "none",
  );
  assert.equal(await page.locator(".site-header,.site-footer").count(), 0);
  assert.equal(await page.getByRole("link", { name: "登录" }).count(), 0);
  const cookies = await context.cookies();
  const guest = cookies.find((v) => v.name === "bojian_resume_guest");
  assert.ok(guest.httpOnly);
  assert.equal(guest.path, `/web-api/resume-links/${token}`);
  assert.equal(
    await page.evaluate(() => document.cookie.includes("bojian_resume_guest")),
    false,
  );
  const before = visitors.size;
  await page.reload();
  await page
    .getByText("负责开发网站，提升页面性能。", { exact: true })
    .waitFor();
  assert.equal(visitors.size, before);
  await page
    .getByRole("button", { name: "选择这段内容：负责开发网站，提升页面性能。" })
    .click();
  await page
    .getByRole("complementary", { name: "选中文字操作" })
    .getByRole("button", { name: "改写", exact: true })
    .click();
  const input = page.getByRole("textbox", { name: "改写内容" });
  await input.fill("负责网站架构设计，首屏加载时间缩短 30%。");
  failNext = true;
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "连接中断" }).waitFor();
  assert.equal(
    await input.inputValue(),
    "负责网站架构设计，首屏加载时间缩短 30%。",
  );
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  assert.equal(submissions.at(-1).key, submissions.at(-2).key);
  assert.equal(
    submissions.at(-1).body.field_path,
    "work_experiences.0.description",
  );
  await page
    .locator('[data-field="work_experiences.0.description"]')
    .filter({ hasText: "首屏加载时间缩短" })
    .waitFor();
  const compare = page.getByRole("button", { name: "按住对照原文" });
  await compare.hover();
  await page.mouse.down();
  assert.equal(
    await page
      .locator('[data-field="work_experiences.0.description"]')
      .innerText(),
    "负责开发网站，提升页面性能。",
  );
  await page.mouse.up();
  const denied = await page.evaluate(async (token) => {
    const result = await fetch(`/web-api/resume-links/${token}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return result.status;
  }, "b".repeat(64));
  assert.equal(denied, 401);
  await page.screenshot({
    path: "artifacts/resume-link-validation/desktop.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await context.close();
});

test("Guest number persists on reload and differs across browser cookie stores", async () => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  async function readGuest(page) {
    const label = page.locator("main header").getByText(/^游客 /);
    await label.waitFor();
    const { value } = (await page.context().cookies()).find(
      (cookie) => cookie.name === "bojian_resume_guest",
    );
    const name = await label.innerText();
    assert.equal(name, visitors.get(value).display_name);
    return { credential: value, name };
  }
  try {
    const pages = await Promise.all([first.newPage(), second.newPage()]);
    await Promise.all(
      pages.map((page) => page.goto(`${base}/resume-review/${token}`)),
    );
    const [a, b] = await Promise.all(pages.map(readGuest));
    assert.notEqual(a.credential, b.credential);
    assert.notEqual(a.name, b.name);
    await pages[0].reload();
    assert.deepEqual(await readGuest(pages[0]), a);
    await first.clearCookies();
    await pages[0].reload();
    const fresh = await readGuest(pages[0]);
    assert.notEqual(fresh.credential, a.credential);
    assert.notEqual(fresh.name, a.name);
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});

test("Mobile supports selected text comments and rejects cross-origin writes", async () => {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    }),
    page = await context.newPage();
  await page.goto(`${base}/resume-review/${token}`);
  await page.locator('[data-field="projects.0.description"]').waitFor();
  const details = page.locator(
    '[data-field="job_expectation.city"], [data-field="job_expectation.industry"], [data-field="job_expectation.salary"]',
  );
  assert.equal(await details.locator('svg[aria-hidden="true"]').count(), 3);
  const rowTops = () =>
    details.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top),
    );
  const wide = await rowTops();
  assert.deepEqual(wide, [wide[0], wide[0], wide[0]]);
  await page.setViewportSize({ width: 320, height: 844 });
  const narrow = await rowTops();
  assert.ok(narrow[2] > narrow[0]);
  await details.last().click();
  const selectionBar = page.getByRole("complementary", {
    name: "选中文字操作",
  });
  await selectionBar.getByText("15000", { exact: true }).waitFor();
  await selectionBar.getByRole("button", { name: "取消选择" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.match(
    await page.locator("main header").innerText(),
    /^最优简\s+游客 [0-9A-F]{6}$/,
  );
  await page.evaluate(() => {
    const element = document.querySelector(
      '[data-field="projects.0.description"]',
    );
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page
    .getByRole("complementary", { name: "选中文字操作" })
    .getByRole("button", { name: "评论", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "评论内容" })
    .fill("建议补充项目成果和负责范围。");
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  assert.equal(
    submissions.at(-1).body.suggestion,
    "建议补充项目成果和负责范围。",
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  const csrf = await context.request.post(
    `${base}/web-api/resume-links/${token}/annotations`,
    { headers: { Origin: "https://other.invalid" }, data: {} },
  );
  assert.equal(csrf.status(), 403);
  const denied = await context.request.post(
    `${base}/web-api/resume-links/${token}/decision`,
    { headers: { Origin: base }, data: { status: "ACCEPTED" } },
  );
  assert.equal(denied.status(), 404);
  await page.screenshot({
    path: "artifacts/resume-link-validation/mobile.png",
    fullPage: true,
  });
  revoked = true;
  await page.reload();
  await page
    .getByRole("alert")
    .filter({ hasText: "链接不存在或已停用" })
    .waitFor();
  assert.equal(await page.locator("article").count(), 0);
  revoked = false;
  await context.close();
});

test("No public website entry or sitemap listing; crawlers excluded", async () => {
  const html = await (await fetch(base)).text();
  assert.ok(!html.includes("/resume-review/"));
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.ok(!sitemap.includes("resume-review"));
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  assert.match(robots, /Disallow: \/resume-review\//);
});
