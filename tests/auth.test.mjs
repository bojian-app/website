import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import jsQR from "jsqr";
import { PNG } from "pngjs";

// Test-only upstream. It is not imported by application code and has no public control endpoint.
const sessions = new Map();
let backend, browser, website, unconfigured, base, offlineBase;
let status = "waiting",
  ttl = 120000,
  logoutFails = false,
  profileInvalid = false,
  invalidChallenge = false;
const children = [];
const tokens = new Map(),
  refreshTokens = new Map();
let refreshCalls = 0;
const creatorTemplates = new Map(),
  creatorUploads = new Map();
let creatorVerified = false,
  creatorCheckFails = false,
  storageFails = false;
const creatorCalls = [];
const testAvatarUrl =
  "https://avatars.example.test/profile.png?signature=avatar-fixture";
const testAvatarImage = readFileSync("public/brand/app-icon.png");
const secret = () => randomBytes(32).toString("base64url");
function issueTokens(device) {
  const access = "test-access-" + randomUUID(),
    refresh = "test-refresh-" + randomUUID();
  const entry = { access, refresh, device, active: true };
  tokens.set(access, entry);
  refreshTokens.set(refresh, entry);
  return {
    access_token: access,
    access_expires_in_seconds: 900,
    refresh_token: refresh,
    refresh_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
}
function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}
async function freePort() {
  const s = createServer();
  const port = await listen(s);
  await new Promise((resolve) => s.close(resolve));
  return port;
}
async function startWebsite(authOrigin) {
  const port = await freePort(),
    url = `http://127.0.0.1:${port}`;
  const env = { ...process.env, NODE_ENV: "production" };
  env.BOJIAN_APP_AUTH_ORIGIN = authOrigin || "";
  env.BOJIAN_WEBSITE_ORIGIN = url;
  if (authOrigin) env.BOJIAN_APP_AUTH_ORIGIN = authOrigin;
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  children.push(child);
  let log = "";
  child.stdout.on("data", (x) => (log += x));
  child.stderr.on("data", (x) => (log += x));
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(log);
    try {
      if ((await fetch(url + "/web-api/auth/session")).ok)
        return { child, url };
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Website failed to start: " + log);
}
function mergeCookies(...values) {
  const result = new Map();
  for (const input of values)
    for (const item of input.split("; ")) {
      const split = item.indexOf("=");
      if (split > 0) result.set(item.slice(0, split), item.slice(split + 1));
    }
  return [...result].map(([k, v]) => `${k}=${v}`).join("; ");
}
function cookieHeader(response) {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
async function request(path, { cookies, body, origin = base, method } = {}) {
  return fetch(base + path, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: {
      ...(cookies ? { Cookie: cookies } : {}),
      ...(body !== undefined
        ? { "Content-Type": "application/json", Origin: origin }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function challenge(cookies) {
  const response = await request("/web-api/auth/qr", {
    body: { agreementAccepted: true },
    cookies,
  });
  assert.equal(response.status, 201);
  return {
    response,
    cookies: cookieHeader(response),
    data: await response.json(),
  };
}
const reset = () => {
  status = "waiting";
  ttl = 120000;
  logoutFails = false;
  profileInvalid = false;
  invalidChallenge = false;
  refreshCalls = 0;
  creatorTemplates.clear();
  creatorUploads.clear();
  creatorVerified = false;
  creatorCheckFails = false;
  storageFails = false;
  creatorCalls.length = 0;
};
before(async () => {
  assert(existsSync(".next/BUILD_ID"), "Run pnpm build before pnpm test:auth");
  backend = createServer(async (req, res) => {
    const url = new URL(req.url, "http://fixture");
    if (url.pathname === "/storage-upload") {
      assert.equal(
        req.headers.cookie,
        undefined,
        "No session cookies sent to object storage",
      );
      assert.equal(req.headers.authorization, undefined);
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const content = Buffer.concat(chunks).toString("latin1");
      const file = [...creatorUploads.values()].find((f) =>
        content.includes(f.key),
      );
      if (storageFails || !file) return json(res, 503, {});
      file.uploaded = true;
      return json(res, 200, { key: file.key });
    }
    let body = {};
    if (req.method === "POST" || req.method === "PATCH") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      try {
        body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
      } catch {
        return json(res, 400, { error: { code: "INVALID_JSON" } });
      }
    }
    const device = req.headers["x-device-id"];
    if (
      !/^web:[A-Za-z0-9_-]{16,96}$/.test(device || "") ||
      req.headers["x-platform"] !== "WEB" ||
      req.headers["x-app-version"] !== "1.0.0"
    )
      return json(res, 400, { error: { code: "CLIENT_HEADERS_REQUIRED" } });
    if (
      url.pathname === "/api/v1/auth/app-qr-sessions" &&
      req.method === "POST"
    ) {
      if (
        JSON.stringify(body) !==
        JSON.stringify({ agreement_versions: { terms: "1.0", privacy: "1.0" } })
      )
        return json(res, 422, { error: { code: "AGREEMENT_REQUIRED" } });
      const id = secret(),
        browser_token = secret(),
        scan_token = secret();
      sessions.set(id, {
        browser_token,
        device,
        scan_token,
        consumed: false,
        agent: req.headers["user-agent"],
      });
      return json(res, 201, {
        data: {
          session_id: id,
          status: "WAITING",
          browser_token,
          qr_content: invalidChallenge
            ? browser_token
            : `https://bojian.kelance.cn/app-login#session=${id}&token=${scan_token}&v=1`,
          expires_at: new Date(Date.now() + ttl).toISOString(),
          poll_after_seconds: 2,
        },
      });
    }
    const match = url.pathname.match(
      /^\/api\/v1\/auth\/app-qr-sessions\/([A-Za-z0-9_-]{43})\/(status|exchange)$/,
    );
    if (match && req.method === "POST") {
      const entry = sessions.get(match[1]);
      if (
        !entry ||
        body.browser_token !== entry.browser_token ||
        device !== entry.device
      )
        return json(res, 404, { error: { code: "APP_QR_NOT_FOUND" } });
      if (match[2] === "exchange") {
        if (status !== "confirmed" || entry.consumed)
          return json(res, 409, { error: { code: "APP_QR_STATE_INVALID" } });
        entry.consumed = true;
        return json(res, 200, {
          data: {
            ...issueTokens(device),
            user: { id: 123, public_id: "DEMO-123" },
          },
        });
      }
      const states = {
        waiting: "WAITING",
        scanned: "SCANNED",
        confirmed: "CONFIRMED",
        cancelled: "CANCELED",
        expired: "EXPIRED",
        used: "EXCHANGED",
      };
      return json(res, 200, {
        data: {
          session_id: match[1],
          status: entry.consumed ? "EXCHANGED" : states[status],
          expires_at: new Date(Date.now() + ttl).toISOString(),
          poll_after_seconds: 2,
        },
      });
    }
    if (url.pathname === "/api/v1/auth/token/refresh") {
      refreshCalls++;
      const entry = refreshTokens.get(body.refresh_token);
      if (!entry || !entry.active || entry.device !== device || profileInvalid)
        return json(res, 401, { error: { code: "SESSION_INVALID" } });
      entry.active = false;
      await new Promise((r) => setTimeout(r, 40));
      return json(res, 200, { data: issueTokens(device) });
    }
    const entry = tokens.get(
      req.headers.authorization?.replace(/^Bearer /, ""),
    );
    if (url.pathname === "/api/v1/me")
      return entry?.active && entry.device === device && !profileInvalid
        ? json(res, 200, {
            data: {
              id: 123,
              nickname: "博简体验官",
              public_id: "DEMO-123",
              avatar_url: testAvatarUrl,
              phone_masked: "never-return-this-field",
            },
          })
        : json(res, 401, { error: { code: "SESSION_INVALID" } });
    if (url.pathname === "/api/v1/auth/logout") {
      if (logoutFails) return json(res, 503, {});
      if (entry) entry.active = false;
      res.writeHead(204);
      return res.end();
    }
    if (
      url.pathname.startsWith("/api/v1/creator/") ||
      url.pathname.startsWith("/api/v1/files/") ||
      ["/api/v1/me/templates", "/api/v1/me/identity-verification"].includes(
        url.pathname,
      )
    ) {
      if (!entry?.active || entry.device !== device || profileInvalid)
        return json(res, 401, { error: { code: "SESSION_INVALID" } });
      creatorCalls.push(req.method + " " + url.pathname);
      if (url.pathname === "/api/v1/me/identity-verification")
        return json(res, 200, {
          data: {
            status: creatorVerified ? "VERIFIED" : "NOT_VERIFIED",
            valid_until: "2099-12-31",
            holder_id_masked: "NEVER_EXPOSE_IDENTITY",
          },
        });
      if (url.pathname === "/api/v1/me/templates")
        return json(res, 200, {
          data: {
            items: [...creatorTemplates.values()]
              .filter((t) => t.device === device)
              .map(({ device, ...t }) => t)
              .concat([{ id: 999, name: "购买的模板", source: "ACQUIRED" }]),
          },
        });
      if (url.pathname === "/api/v1/files/uploads") {
        assert.equal(body.purpose, "TEMPLATE_SOURCE");
        assert.equal(
          body.content_type,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        const id = creatorUploads.size + 1,
          key = `fixture-template-${id}.docx`;
        creatorUploads.set(id, {
          id,
          device,
          key,
          uploaded: false,
          ready: false,
        });
        return json(res, 201, {
          data: {
            id,
            method: "POST",
            upload_url: `http://127.0.0.1:${backend.address().port}/storage-upload`,
            fields: { token: "storage-upload-only-fixture", key },
          },
        });
      }
      const complete = url.pathname.match(
        /^\/api\/v1\/files\/uploads\/(\d+)\/complete$/,
      );
      if (complete) {
        const file = creatorUploads.get(Number(complete[1]));
        if (!file || file.device !== device || !file.uploaded)
          return json(res, 409, {
            error: { code: "FILE_NOT_READY", message: "文件未上传" },
          });
        file.ready = true;
        return json(res, 200, { data: { id: file.id, status: "READY" } });
      }
      const target = url.pathname.match(
        /^\/api\/v1\/creator\/templates\/(\d+)(?:\/(checks|submit|resubmit))?$/,
      );
      if (
        url.pathname === "/api/v1/creator/templates" ||
        (target && !target[2])
      ) {
        const previous = target
          ? creatorTemplates.get(Number(target[1]))
          : null;
        if (target && (!previous || previous.device !== device))
          return json(res, 404, {
            error: { code: "TEMPLATE_NOT_FOUND", message: "模板不存在" },
          });
        if (body.source_file_id) {
          const file = creatorUploads.get(body.source_file_id);
          if (!file?.ready || file.device !== device)
            return json(res, 409, {
              error: { code: "FILE_NOT_READY", message: "文件尚未就绪" },
            });
        } else if (!target)
          return json(res, 422, { error: { code: "FILE_REQUIRED" } });
        const id = previous?.id || creatorTemplates.size + 1;
        const template = {
          ...previous,
          ...body,
          id,
          device,
          source: "PUBLISHED_BY_ME",
          status: previous?.status || "DRAFT",
          review_reason: previous?.review_reason || "",
        };
        creatorTemplates.set(id, template);
        return json(res, target ? 200 : 201, {
          data: {
            id,
            status: template.status,
            render_status: "READY",
            dom: { html: "DO_NOT_FORWARD_TEMPLATE_HTML" },
          },
        });
      }
      if (target) {
        const template = creatorTemplates.get(Number(target[1]));
        if (!template || template.device !== device)
          return json(res, 404, {
            error: { code: "TEMPLATE_NOT_FOUND", message: "模板不存在" },
          });
        if (target[2] === "checks")
          return json(res, 202, {
            data: {
              id: 5,
              template_id: template.id,
              status: creatorCheckFails ? "FAILED" : "READY",
            },
          });
        if (!creatorVerified)
          return json(res, 403, {
            error: {
              code: "IDENTITY_VERIFICATION_REQUIRED",
              message: "请先完成实名认证后再提交审核",
            },
          });
        if (
          template.status !== (target[2] === "resubmit" ? "REJECTED" : "DRAFT")
        )
          return json(res, 409, {
            error: {
              code: "TEMPLATE_STATE_CONFLICT",
              message: "模板状态已变化，请刷新",
            },
          });
        template.status = "SUBMITTED";
        return json(res, 202, {
          data: { id: template.id, status: template.status },
        });
      }
    }
    json(res, 404, {});
  });
  const port = await listen(backend);
  website = await startWebsite(`http://127.0.0.1:${port}`);
  base = website.url;
  unconfigured = await startWebsite();
  offlineBase = unconfigured.url;
  const executablePath =
    process.env.BOJIAN_TEST_BROWSER ||
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined);
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
});
after(async () => {
  await browser?.close();
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await Promise.race([
        once(child, "exit"),
        new Promise((resolve) =>
          setTimeout(() => {
            child.kill("SIGKILL");
            resolve();
          }, 1500).unref(),
        ),
      ]);
    }),
  );
  if (backend) await new Promise((resolve) => backend.close(resolve));
});
test("未配置服务不生成假二维码；状态读取匿名且不可缓存", async () => {
  const session = await fetch(offlineBase + "/web-api/auth/session");
  assert.deepEqual(await session.json(), { user: null });
  assert.match(session.headers.get("cache-control"), /no-store/);
  const response = await fetch(offlineBase + "/web-api/auth/qr", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: offlineBase },
    body: JSON.stringify({ agreementAccepted: true }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "AUTH_UNAVAILABLE");
  assert.equal(response.headers.getSetCookie().length, 0);
});
test("同源与同意检查；敏感轮询凭据不出现在 JSON 或 QR 内容里", async () => {
  reset();
  assert.equal(
    (
      await request("/web-api/auth/qr", {
        body: { agreementAccepted: true },
        origin: "https://untrusted.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("/web-api/auth/qr", { body: { agreementAccepted: false } }))
      .status,
    400,
  );
  const { response, cookies, data } = await challenge();
  assert.match(data.qrDataUrl, /^data:image\/png;base64,/);
  assert(data.attempt);
  assert.match(cookies, /bojian_web_qr=/);
  const value = decodeURIComponent(
    cookies
      .split("; ")
      .find((c) => c.startsWith("bojian_web_qr="))
      .slice("bojian_web_qr=".length),
  );
  const flow = JSON.parse(value);
  assert(!JSON.stringify(data).includes(flow.token));
  assert(!JSON.stringify(data).includes("browser_token"));
  for (const setCookie of response.headers.getSetCookie()) {
    assert(/HttpOnly/i.test(setCookie), "Cookie is HttpOnly");
    assert(/SameSite=strict/i.test(setCookie), "Cookie is SameSite Strict");
    assert(/Secure/i.test(setCookie), "Cookie is Secure");
    assert(
      /Path=\/web-api\/auth/i.test(setCookie),
      "Cookie is scoped to website authentication",
    );
  }
  assert.equal(
    (await request(`/web-api/auth/qr?attempt=${data.attempt}`)).status,
    410,
  );
  invalidChallenge = true;
  const malformed = await request("/web-api/auth/qr", {
    body: { agreementAccepted: true },
  });
  assert.equal(malformed.status, 502);
  assert.equal(malformed.headers.getSetCookie().length, 0);
  reset();
});
test("等待→扫码→App确认才能换取会话；刷新使旧二维码失效", async () => {
  reset();
  const first = await challenge(),
    second = await challenge(first.cookies);
  assert.equal(
    (
      await request(`/web-api/auth/qr?attempt=${first.data.attempt}`, {
        cookies: second.cookies,
      })
    ).status,
    410,
  );
  assert.deepEqual(
    await (
      await request(`/web-api/auth/qr?attempt=${second.data.attempt}`, {
        cookies: second.cookies,
      })
    ).json(),
    { status: "waiting" },
  );
  const early = await request("/web-api/auth/qr/exchange", {
    cookies: second.cookies,
    body: { attempt: second.data.attempt },
  });
  assert.equal(early.status, 409);
  assert.equal(early.headers.getSetCookie().length, 0);
  status = "scanned";
  assert.equal(
    (
      await (
        await request(`/web-api/auth/qr?attempt=${second.data.attempt}`, {
          cookies: second.cookies,
        })
      ).json()
    ).status,
    "scanned",
  );
  status = "confirmed";
  const complete = await request("/web-api/auth/qr/exchange", {
    cookies: second.cookies,
    body: { attempt: second.data.attempt },
  });
  assert.equal(complete.status, 200);
  const result = await complete.json();
  assert.deepEqual(result, {
    user: {
      id: "123",
      nickname: "博简体验官",
      publicId: "DEMO-123",
      avatarUrl: testAvatarUrl,
    },
  });
  assert(!JSON.stringify(result).includes("test-access-"));
  assert(!JSON.stringify(result).includes("test-refresh-"));
  assert(!JSON.stringify(result).includes("phone_masked"));
  assert(
    complete.headers
      .getSetCookie()
      .some((c) => c.startsWith("bojian_web_session=")),
  );
  assert.match(complete.headers.get("cache-control"), /no-store/);
  assert.equal(
    (
      await request("/web-api/auth/qr/exchange", {
        cookies: second.cookies,
        body: { attempt: second.data.attempt },
      })
    ).status,
    409,
  );
});
test("失效会话清理；退出失败保留会话，服务端退出成功后清除", async () => {
  reset();
  status = "confirmed";
  const c = await challenge();
  const complete = await request("/web-api/auth/qr/exchange", {
    cookies: c.cookies,
    body: { attempt: c.data.attempt },
  });
  const cookies = mergeCookies(c.cookies, cookieHeader(complete));
  assert.equal(
    (await (await request("/web-api/auth/session", { cookies })).json()).user
      .nickname,
    "博简体验官",
  );
  logoutFails = true;
  const failed = await request("/web-api/auth/logout", { cookies, body: {} });
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.getSetCookie().length, 0);
  logoutFails = false;
  const logout = await request("/web-api/auth/logout", { cookies, body: {} });
  assert.equal(logout.status, 200);
  assert(
    logout.headers.getSetCookie().filter((c) => /Max-Age=0/i.test(c)).length >=
      2,
  );
  profileInvalid = true;
  const invalid = await request("/web-api/auth/session", { cookies });
  assert.deepEqual(await invalid.json(), { user: null });
  assert(invalid.headers.getSetCookie().some((c) => /Max-Age=0/i.test(c)));
  reset();
});
test("真实浏览器：仅 App 方式、扫码确认、持久登录、退出、过期与取消", async () => {
  reset();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.route("https://avatars.example.test/**", (route) =>
    route.fulfill({ contentType: "image/png", body: testAvatarImage }),
  );
  const page = await context.newPage();
  const errors = [];
  let qrCreations = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/web-api/auth/qr"
    )
      qrCreations++;
  });
  await page.goto(base + "/login");
  await page.getByRole("heading", { name: "使用博简 App 扫一扫" }).waitFor();
  assert.equal(await page.getByRole("textbox").count(), 0);
  assert.equal(
    await page.locator("input[type=password],input[type=tel]").count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "获取二维码", exact: true }).count(),
    0,
  );
  assert.equal(qrCreations, 0, "No QR is requested before consent");
  await page.getByRole("checkbox").check();
  await page.getByAltText("登录二维码，请使用博简 App 扫描").waitFor();
  assert.equal(qrCreations, 1, "Consent automatically requests one QR");
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("heading", { name: "使用博简 App 扫一扫" }).waitFor();
  assert.equal(await page.locator(".qr-image").count(), 0);
  await page.getByRole("checkbox").check();
  await page.getByAltText("登录二维码，请使用博简 App 扫描").waitFor();
  assert.equal(qrCreations, 2, "Renewed consent requests a fresh QR");
  assert(
    !(await page.evaluate(() => document.cookie.includes("bojian_web_qr"))),
  );
  const qrBitmap = PNG.sync.read(await page.locator(".qr-stage").screenshot());
  const decoded = jsQR(
    new Uint8ClampedArray(qrBitmap.data),
    qrBitmap.width,
    qrBitmap.height,
  );
  assert(decoded, "Displayed QR remains decodable with brand overlay");
  assert.match(decoded.data, /^https:\/\/bojian\.kelance\.cn\/app-login#/);

  assert.equal(await page.locator(".qr-status, .qr-expiry").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: "刷新二维码" }).count(),
    0,
  );
  status = "scanned";
  await page
    .locator(".qr-status p")
    .filter({ hasText: "已扫码，请在 App 中确认" })
    .waitFor();
  assert.equal(
    await page.getByAltText("登录二维码，请使用博简 App 扫描").count(),
    0,
  );
  status = "confirmed";
  await page.waitForURL(base + "/");
  await page.locator(".account-menu summary").waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector(".account-avatar img");
    return image?.complete && image.naturalWidth > 0;
  });
  assert.equal(
    await page.locator(".account-avatar img").getAttribute("src"),
    testAvatarUrl,
  );
  assert.equal(
    await page.locator(".account-avatar img").getAttribute("referrerpolicy"),
    "no-referrer",
  );
  assert.equal(await page.locator(".login-success").count(), 0);
  assert(
    !(await page.evaluate(() =>
      document.cookie.includes("bojian_web_session"),
    )),
  );
  const authCookies = await context.cookies();
  assert(
    authCookies.some(
      (c) => c.name === "bojian_web_session" && c.httpOnly && c.secure,
    ),
  );
  await page.reload();
  await page.locator(".account-menu summary").waitFor();
  await page.goto(base + "/login");
  await page.waitForURL(base + "/");
  await page.locator(".account-menu summary").click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".account-menu").getAttribute("open"), null);
  await page.locator(".account-menu summary").click();
  await page
    .locator(".site-header")
    .getByRole("button", { name: "下载 App" })
    .click();
  assert.equal(await page.locator(".account-menu").getAttribute("open"), null);
  await page.locator(".account-menu summary").click();
  assert.equal(await page.getByRole("status").innerText(), "暂未上线");
  await page.getByRole("button", { name: /退出登录/ }).click();
  await page.locator(".account-menu").waitFor({ state: "hidden" });
  await page.goto(base + "/login");
  await page.getByRole("heading", { name: "使用博简 App 扫一扫" }).waitFor();
  assert.equal(await page.locator(".account-menu").count(), 0);
  status = "cancelled";
  await page.getByRole("checkbox").check();
  await page
    .locator(".qr-status p")
    .filter({ hasText: "已取消登录" })
    .waitFor();
  assert.equal(
    await page.getByAltText("登录二维码，请使用博简 App 扫描").count(),
    0,
  );
  status = "waiting";
  ttl = 1800;
  const creationsBeforeExpiry = qrCreations;
  await page.getByRole("button", { name: "重新获取二维码" }).click();
  await page.locator(".qr-image").waitFor();
  const expiredImage = await page.locator(".qr-image").getAttribute("src");
  ttl = 120000;
  await page.waitForFunction((previous) => {
    const image = document.querySelector(".qr-image");
    return image && image.getAttribute("src") !== previous;
  }, expiredImage);
  assert.equal(
    qrCreations,
    creationsBeforeExpiry + 2,
    "Expiry automatically creates one replacement QR",
  );
  assert.equal(await page.locator(".qr-status, .qr-expiry").count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
  reset();
});
test("头像缺失或加载失败回退昵称首字；更新头像后恢复图片", async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  let avatar = "";
  await page.route("**/web-api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "123",
          nickname: "博简体验官",
          publicId: "DEMO-123",
          avatarUrl: avatar,
        },
      },
    }),
  );
  await page.route("https://avatars.example.test/**", (route) =>
    route.request().url().includes("missing")
      ? route.fulfill({ status: 404 })
      : route.fulfill({ contentType: "image/png", body: testAvatarImage }),
  );
  await page.goto(base + "/");
  await page.locator(".account-avatar").waitFor();
  assert.equal(await page.locator(".account-avatar").innerText(), "博");
  avatar = "https://avatars.example.test/missing.png";
  const missingAvatar = page.waitForResponse(
    "https://avatars.example.test/missing.png",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await missingAvatar;
  await page.locator(".account-avatar img").waitFor({ state: "detached" });
  assert.equal(await page.locator(".account-avatar").innerText(), "博");
  avatar = testAvatarUrl;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForFunction(() => {
    const image = document.querySelector(".account-avatar img");
    return image?.complete && image.naturalWidth > 0;
  });
  const bounds = await page.locator(".account-avatar img").boundingBox();
  assert(bounds.width > 0 && bounds.height > 0);
  await page.locator(".account-menu summary").click();
  assert(await page.getByRole("button", { name: /退出登录/ }).isVisible());
  await context.close();
});

test("服务端判定过期自动换码；刷新失败停止重试，撤回同意停止刷新", async () => {
  reset();
  const context = await browser.newContext();
  const page = await context.newPage();
  let expireNext = false,
    rejectNext = false,
    creations = 0;
  await page.route("**/web-api/auth/qr**", async (route) => {
    if (route.request().method() === "POST") {
      creations++;
      if (rejectNext) {
        rejectNext = false;
        return route.fulfill({
          status: 503,
          json: {
            error: { code: "AUTH_UNAVAILABLE", message: "扫码登录暂不可用" },
          },
        });
      }
    } else if (expireNext) {
      expireNext = false;
      return route.fulfill({ json: { status: "expired" } });
    }
    await route.continue();
  });
  await page.goto(base + "/login");
  await page.getByRole("checkbox").check();
  await page.locator(".qr-image").waitFor();
  const firstImage = await page.locator(".qr-image").getAttribute("src");
  expireNext = true;
  await page.waitForFunction((previous) => {
    const image = document.querySelector(".qr-image");
    return image && image.getAttribute("src") !== previous;
  }, firstImage);
  assert.equal(creations, 2);
  assert.equal(await page.locator(".qr-status, .qr-expiry").count(), 0);
  expireNext = true;
  rejectNext = true;
  await page.getByText("扫码登录暂不可用", { exact: true }).waitFor();
  await page.waitForTimeout(2200);
  assert.equal(
    creations,
    3,
    "A failed replacement does not cause a retry loop",
  );
  ttl = 1800;
  await page.getByRole("button", { name: "重新获取二维码" }).click();
  await page.locator(".qr-image").waitFor();
  await page.getByRole("checkbox").uncheck();
  await page.locator(".qr-image").waitFor({ state: "hidden" });
  await page.waitForTimeout(2200);
  assert.equal(
    creations,
    4,
    "Withdrawn consent prevents automatic replacement",
  );
  await context.close();
  reset();
});
test("移动端与未开放状态，页面及页头均无横向溢出", async () => {
  reset();
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(offlineBase + "/login");
    await page.getByRole("checkbox").check();
    await page
      .locator(".qr-status p")
      .filter({ hasText: "扫码登录暂不可用" })
      .waitFor();
    assert.equal(await page.locator(".qr-image").count(), 0);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    );
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: `artifacts/login-${width}-unavailable.png`,
        fullPage: true,
      });
  }
  await page.goto(base + "/login");
  await page.getByRole("checkbox").check();
  await page.getByAltText("登录二维码，请使用博简 App 扫描").waitFor();
  await page.screenshot({
    path: "artifacts/login-1440-test-fixture.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/login-390-test-fixture.png",
    fullPage: true,
  });
  await context.close();
});

test("访问令牌失效后刷新；同时读取同一会话只轮换一次", async () => {
  reset();
  status = "confirmed";
  const c = await challenge();
  const complete = await request("/web-api/auth/qr/exchange", {
    cookies: c.cookies,
    body: { attempt: c.data.attempt },
  });
  assert.equal(complete.status, 200);
  const cookies = mergeCookies(c.cookies, cookieHeader(complete))
    .split("; ")
    .filter((c) => !c.startsWith("bojian_web_session="))
    .join("; ");
  const responses = await Promise.all(
    [1, 2, 3].map(() => request("/web-api/auth/session", { cookies })),
  );
  const bodies = await Promise.all(responses.map((r) => r.json()));
  assert(bodies.every((b) => b.user?.nickname === "博简体验官"));
  assert.equal(refreshCalls, 1);
  const credentials = responses.map((r) =>
    r.headers.getSetCookie().find((c) => c.startsWith("bojian_web_session=")),
  );
  assert(credentials.every((c) => c === credentials[0]));
  const rotated = mergeCookies(cookies, cookieHeader(responses[0]));
  assert.equal(
    (await request("/web-api/auth/logout", { cookies: rotated, body: {} }))
      .status,
    200,
  );
  assert.deepEqual(
    await (await request("/web-api/auth/session", { cookies: rotated })).json(),
    { user: null },
  );
  reset();
});
test("已使用二维码停止轮询；系统浏览器打开扫码链接不会授权", async () => {
  reset();
  const context = await browser.newContext();
  const p = await context.newPage();
  status = "used";
  await p.goto(base + "/login");
  await p.getByRole("checkbox").check();
  await p
    .locator(".qr-status p")
    .filter({ hasText: "二维码已使用，请刷新" })
    .waitFor();
  assert(await p.getByRole("button", { name: "刷新二维码" }).isVisible());
  assert.equal(await p.locator(".qr-image").count(), 0);
  await p.goto(base + "/app-login#session=demo&token=scan-secret&v=1");
  await p.getByRole("heading", { name: "请使用博简 App 扫码" }).waitFor();
  await p.waitForFunction(() => location.hash === "");
  assert.equal(await p.getByRole("button").count(), 0);
  await context.close();
  reset();
});

async function creatorLogin() {
  status = "confirmed";
  const start = await challenge();
  const result = await request("/web-api/auth/qr/exchange", {
    cookies: start.cookies,
    body: { attempt: start.data.attempt },
  });
  assert.equal(result.status, 200);
  return mergeCookies(start.cookies, cookieHeader(result));
}

test("控制台接口：登录与同源保护、上传用途限制、所有权与审核前检查", async () => {
  reset();
  const api = "/web-api/auth/creator/";
  assert.equal((await request(api + "workspace")).status, 401);
  assert.equal((await request(api + "templates", { body: {} })).status, 401);
  const cookies = await creatorLogin();
  assert.equal(
    (
      await request(api + "templates", {
        cookies,
        origin: "https://untrusted.example",
        body: {},
      })
    ).status,
    403,
  );
  assert.equal((await request(api + "admin/users", { cookies })).status, 404);
  assert.equal(
    (
      await request(api + "uploads", {
        cookies,
        body: { filename: "secret.pdf", size_bytes: 20 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(api + "uploads", {
        cookies,
        body: { filename: "resume.docx", size_bytes: 8 * 1024 * 1024 + 1 },
      })
    ).status,
    400,
  );
  assert.equal(creatorUploads.size, 0);
  const ticketResponse = await request(api + "uploads", {
    cookies,
    body: { filename: "template.docx", size_bytes: 4, purpose: "IDENTITY_ID" },
  });
  assert.equal(ticketResponse.status, 201);
  const ticket = await ticketResponse.json();
  const form = new FormData();
  for (const [key, value] of Object.entries(ticket.fields))
    form.append(key, value);
  form.append(
    "file",
    new Blob([new Uint8Array([80, 75, 3, 4])]),
    "template.docx",
  );
  assert((await fetch(ticket.upload_url, { method: "POST", body: form })).ok);
  assert.equal(
    (
      await request(api + `uploads/${ticket.id}/complete`, {
        cookies,
        body: {},
      })
    ).status,
    200,
  );
  const create = await request(api + "templates", {
    cookies,
    body: {
      name: "测试模板",
      description: "示例资料",
      pricing_type: "FREE",
      price_points: 123,
      source_file_id: ticket.id,
    },
  });
  assert.equal(create.status, 201);
  const created = await create.json();
  assert(!JSON.stringify(created).includes("DO_NOT_FORWARD_TEMPLATE_HTML"));
  const workspace = await request(api + "workspace", { cookies });
  const data = await workspace.json();
  assert.equal(data.items.length, 1, "Acquired templates excluded");
  assert.equal(data.items[0].pricePoints, 0);
  assert.equal(data.verified, false);
  assert(!JSON.stringify(data).includes("NEVER_EXPOSE_IDENTITY"));
  assert.match(workspace.headers.get("cache-control"), /no-store/);
  const withoutAccess = cookies
    .split("; ")
    .filter((c) => !c.startsWith("bojian_web_session="))
    .join("; ");
  const denied = await request(api + `templates/${created.id}/submit`, {
    cookies: withoutAccess,
    body: {},
  });
  assert.equal(denied.status, 403);
  assert.equal(
    (await denied.json()).error.code,
    "IDENTITY_VERIFICATION_REQUIRED",
  );
  assert(
    denied.headers
      .getSetCookie()
      .some((c) => c.startsWith("bojian_web_session=")),
    "Rotated credentials survive business errors",
  );
  const rotated = mergeCookies(withoutAccess, cookieHeader(denied));
  assert(
    (await request("/web-api/auth/session", { cookies: rotated })).ok,
    "Verification failure does not log the user out",
  );
  creatorVerified = true;
  creatorCheckFails = true;
  assert.equal(
    (
      await request(api + `templates/${created.id}/submit`, {
        cookies: rotated,
        body: {},
      })
    ).status,
    422,
  );
  assert.equal(creatorTemplates.get(created.id).status, "DRAFT");
  creatorCheckFails = false;
  assert.equal(
    (
      await request(api + `templates/${created.id}/submit`, {
        cookies: rotated,
        body: {},
      })
    ).status,
    202,
  );
  assert.deepEqual(creatorCalls.slice(-2), [
    `POST /api/v1/creator/templates/${created.id}/checks`,
    `POST /api/v1/creator/templates/${created.id}/submit`,
  ]);
  assert.equal(
    creatorTemplates.get(created.id).status,
    "SUBMITTED",
    "Submission awaits review, not published",
  );
  const otherCookies = await creatorLogin();
  assert.equal(
    (await (await request(api + "workspace", { cookies: otherCookies })).json())
      .items.length,
    0,
  );
  assert.equal(
    (
      await request(api + `templates/${created.id}/submit`, {
        cookies: otherCookies,
        body: {},
      })
    ).status,
    404,
  );
  reset();
});

test("真实浏览器：控制台入口、草稿上传、实名认证、驳回编辑和重新提交", async () => {
  reset();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
  });
  const cookies = await creatorLogin();
  await context.addCookies(
    cookies.split("; ").map((cookie) => {
      const split = cookie.indexOf("=");
      return {
        name: cookie.slice(0, split),
        value: cookie.slice(split + 1),
        domain: "127.0.0.1",
        path: "/web-api/auth",
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      };
    }),
  );
  await context.route("https://avatars.example.test/**", (route) =>
    route.fulfill({ contentType: "image/png", body: testAvatarImage }),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/");
  const homeHeader = await page.locator(".header-inner").boundingBox();
  await page.locator(".account-menu summary").click();
  const menuText = await page.locator(".account-popover").innerText();
  assert(menuText.indexOf("控制台") < menuText.indexOf("退出登录"));
  await page.getByRole("link", { name: "控制台", exact: true }).click();
  await page.waitForURL(base + "/console");
  await page.getByRole("heading", { name: "我的简历模板" }).waitFor();
  await page.getByRole("button", { name: "上传第一份模板" }).waitFor();
  assert.deepEqual(
    await page.locator(".header-inner").boundingBox(),
    homeHeader,
  );
  assert(
    await page
      .locator(".site-header")
      .getByRole("button", { name: "下载 App" })
      .isVisible(),
  );
  assert.equal(
    await page
      .locator(".site-header")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(255, 255, 255)",
  );
  await page.screenshot({
    path: "artifacts/console-1440-empty.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "上传模板", exact: true }).click();
  await page.locator("#template-file").setInputFiles({
    name: "示例模板.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from([80, 75, 3, 4, 1, 2, 3, 4]),
  });
  await page.getByLabel("模板名称").fill("留白 · 单栏简历");
  await page.getByLabel("模板介绍").fill("使用示例资料的测试模板");
  const [guide] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "在新标签页查看完整规则" }).click(),
  ]);
  await guide.waitForURL(base + "/console/template-guide");
  await guide
    .getByRole("heading", { name: "完整字段表", exact: true })
    .waitFor();
  await guide.close();
  assert(
    await page.getByRole("dialog").isVisible(),
    "Reading rules keeps upload form open",
  );
  assert.equal(
    await page.getByLabel("模板名称").inputValue(),
    "留白 · 单栏简历",
  );
  assert.equal(
    await page.getByLabel("模板介绍").inputValue(),
    "使用示例资料的测试模板",
  );
  await page.screenshot({
    path: "artifacts/console-1440-upload.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "留白 · 单栏简历" }).waitFor();
  assert(
    await page
      .getByRole("button", { name: "提交审核", exact: true })
      .isDisabled(),
  );
  creatorVerified = true;
  await page.getByRole("button", { name: "刷新状态" }).click();
  await page
    .getByText("已完成实名认证，可以提交模板上架审核。", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "提交审核", exact: true }).click();
  await page.locator(".console-status").filter({ hasText: "审核中" }).waitFor();
  creatorTemplates.get(1).status = "REJECTED";
  creatorTemplates.get(1).review_reason = "请完善模板介绍";
  await page.getByRole("button", { name: "刷新模板列表" }).click();
  await page.getByText("审核意见：请完善模板介绍", { exact: true }).waitFor();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByLabel("模板介绍")
    .fill("已补充：适合应届生和产品岗位的简约排版");
  await page.getByRole("button", { name: "保存修改" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByText("已补充：适合应届生和产品岗位的简约排版", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "重新提交审核", exact: true }).click();
  await page.locator(".console-status").filter({ hasText: "审核中" }).waitFor();
  assert(creatorCalls.includes("POST /api/v1/creator/templates/1/resubmit"));
  storageFails = true;
  const completedBefore = creatorCalls.filter((c) =>
    c.endsWith("/complete"),
  ).length;
  await page.getByRole("button", { name: "上传模板", exact: true }).click();
  await page.locator("#template-file").setInputFiles({
    name: "失败测试.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from([80, 75, 3, 4]),
  });
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "文件上传失败" }).waitFor();
  assert.equal(
    creatorTemplates.size,
    1,
    "Failed object upload never creates a template",
  );
  assert.equal(
    creatorCalls.filter((c) => c.endsWith("/complete")).length,
    completedBefore,
  );
  await page.getByRole("button", { name: "取消", exact: true }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Console overflow at ${width}`,
    );
    if (width === 390)
      await page.screenshot({
        path: "artifacts/console-390-templates.png",
        fullPage: true,
      });
  }
  await page.getByRole("button", { name: "上传模板", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.locator(".account-menu summary").click();
  await page.getByRole("button", { name: "退出登录", exact: false }).click();
  await page.getByRole("link", { name: "登录并进入控制台" }).waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "留白 · 单栏简历" }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  await context.close();
  reset();
});

test("控制台登录返回目标仅允许站内控制台，默认仍返回首页", async () => {
  reset();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base + "/console");
  await page.getByRole("link", { name: "登录并进入控制台" }).click();
  await page.waitForURL(base + "/login?next=/console");
  status = "confirmed";
  await page.getByRole("checkbox").check();
  await page.waitForURL(base + "/console");
  await page.getByRole("heading", { name: "我的简历模板" }).waitFor();
  await page.goto(base + "/login?next=https://untrusted.example");
  await page.waitForURL(base + "/");
  await context.close();
  reset();
});
