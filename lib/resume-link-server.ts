import "server-only";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const tokenPattern = /^[a-f0-9]{64}$/;
const credentialPattern = /^[A-Za-z0-9_-]{43}$/;
const cookieName = "bojian_resume_guest";

export async function resumeLinkRoute(request: NextRequest, path: string[]) {
  const [token, operation = ""] = path;
  const headers = {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };
  const failure = (message: string, status: number) =>
    NextResponse.json({ error: { message } }, { status, headers });
  if (
    path.length > 2 ||
    !tokenPattern.test(token ?? "") ||
    !["", "session", "annotations"].includes(operation)
  )
    return failure("链接不存在或已停用", 404);
  if (
    (operation === "session" && request.method !== "POST") ||
    (operation === "" && request.method !== "GET")
  )
    return failure("不支持此操作", 405);
  if (request.method !== "GET") {
    const expected =
      process.env.BOJIAN_WEBSITE_ORIGIN || request.nextUrl.origin;
    if (request.headers.get("origin") !== expected)
      return failure("请求来源无效，请重新打开链接", 403);
    if (Number(request.headers.get("content-length") || 0) > 131072)
      return failure("内容过长", 413);
  }
  let credential = request.cookies.get(cookieName)?.value ?? "";
  if (!credentialPattern.test(credential)) {
    if (operation !== "session") return failure("请重新打开分享链接", 401);
    credential = randomBytes(32).toString("base64url");
  }
  let body: string | undefined;
  if (request.method === "POST" && operation === "annotations") {
    body = await request.text();
    if (Buffer.byteLength(body) > 131072) return failure("内容过长", 413);
    try {
      const value = JSON.parse(body);
      if (!value || typeof value !== "object" || Array.isArray(value))
        return failure("内容格式无效", 422);
    } catch {
      return failure("内容格式无效", 422);
    }
  }
  try {
    const base = new URL(process.env.BOJIAN_APP_AUTH_ORIGIN || "");
    if (
      base.username ||
      base.password ||
      base.pathname !== "/" ||
      base.search ||
      base.hash ||
      (base.protocol !== "https:" &&
        !(
          base.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
        ))
    )
      return failure("分享服务暂不可用", 503);
    const upstream = await fetch(
      `${base.origin}/api/v1/public/resume-links/${token}${operation ? `/${operation}` : ""}`,
      {
        method: request.method,
        body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": "application/json",
          "X-Resume-Guest": credential,
          "Idempotency-Key": (
            request.headers.get("idempotency-key") || ""
          ).slice(0, 96),
        },
      },
    );
    const payload = await upstream.json();
    const response = NextResponse.json(payload, {
      status: upstream.status,
      headers,
    });
    if (operation === "session" && upstream.ok) {
      response.cookies.set(cookieName, credential, {
        httpOnly: true,
        secure:
          request.nextUrl.protocol === "https:" ||
          process.env.BOJIAN_WEBSITE_ORIGIN?.startsWith("https:") === true,
        sameSite: "lax",
        path: `/web-api/resume-links/${token}`,
        maxAge: 365 * 24 * 60 * 60,
      });
    }
    return response;
  } catch {
    return failure("连接中断，请重试", 502);
  }
}
