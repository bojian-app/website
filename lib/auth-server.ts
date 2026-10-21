import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import type { AuthUser, QrStatus } from "./auth-types";
const FLOW = "bojian_web_qr",
  ACCESS = "bojian_web_session",
  REFRESH = "bojian_web_refresh",
  DEVICE = "bojian_web_device";
const QR_PATH = "/api/v1/auth/app-qr-sessions";
const SECRET = /^[A-Za-z0-9_-]{43}$/;
const DEVICE_ID = /^web:[A-Za-z0-9_-]{16,96}$/;
const OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/web-api/auth",
};
const STATUS: Record<string, QrStatus> = {
  WAITING: "waiting",
  SCANNED: "scanned",
  CONFIRMED: "confirmed",
  CANCELED: "cancelled",
  EXPIRED: "expired",
  EXCHANGED: "used",
};
type Json = Record<string, unknown>;
type Flow = {
  id: string;
  token: string;
  attempt: string;
  expiresAt: string;
  device: string;
};
type Tokens = {
  access: string;
  accessLifetime: number;
  refresh: string;
  refreshExpiresAt: number;
};
export class AuthFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const invalidResponse = () =>
  new AuthFailure("INVALID_RESPONSE", "登录服务暂时不可用，请重试。", 502);
function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalidResponse();
  return value as Json;
}
function text(value: unknown, limit = 256): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > limit ||
    /[\x00-\x1f]/.test(value)
  )
    throw invalidResponse();
  return value;
}
function origin() {
  const configured = process.env.BOJIAN_APP_AUTH_ORIGIN;
  if (!configured)
    throw new AuthFailure(
      "AUTH_UNAVAILABLE",
      "扫码登录暂不可用，请稍后重试。",
      503,
    );
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw invalidResponse();
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw invalidResponse();
  return url.origin;
}
function device(request: NextRequest, create = false): string {
  const current = request.cookies.get(DEVICE)?.value;
  if (current && DEVICE_ID.test(current)) return current;
  if (create) return "web:" + randomBytes(32).toString("base64url");
  throw new AuthFailure("AUTH_INVALID", "登录已失效，请重新扫码。", 401);
}
function browserHeaders(request: NextRequest, browserDevice = device(request)) {
  return {
    "X-Device-Id": browserDevice,
    "X-Platform": "WEB",
    "X-App-Version": "1.0.0",
    "User-Agent": (request.headers.get("user-agent") || "Bojian Website")
      .replace(/[\x00-\x1f]/g, "")
      .slice(0, 512),
  };
}
async function upstream(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const base = origin();
  let response: Response;
  try {
    response = await fetch(base + path, {
      ...options,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new AuthFailure("AUTH_NETWORK", "连接中断，请重试。", 502);
  }
  let payload: Json = {};
  if (response.status !== 204) {
    try {
      payload = object(await response.json());
    } catch {
      if (response.ok) throw invalidResponse();
    }
  }
  const code =
    payload.error && typeof payload.error === "object"
      ? (payload.error as Json).code
      : "";
  if (!response.ok || payload.error) {
    if (
      ["APP_QR_NOT_FOUND", "APP_QR_EXPIRED"].includes(String(code)) ||
      response.status === 410
    )
      throw new AuthFailure("QR_EXPIRED", "二维码已失效，请刷新。", 410);
    if (code === "APP_QR_STATE_INVALID" || response.status === 409)
      throw new AuthFailure(
        "QR_STATE_INVALID",
        "二维码已使用、已取消或尚未确认。",
        409,
      );
    if (
      code === "APP_QR_SOURCE_INVALID" ||
      [401, 403].includes(response.status)
    )
      throw new AuthFailure("AUTH_INVALID", "登录已失效，请重新扫码。", 401);
    if (response.status === 429)
      throw new AuthFailure("RATE_LIMITED", "操作频繁，请稍后重试。", 429);
    if ([404, 501, 503].includes(response.status))
      throw new AuthFailure(
        "AUTH_UNAVAILABLE",
        "扫码登录暂不可用，请稍后重试。",
        503,
      );
    throw new AuthFailure("AUTH_NETWORK", "登录服务暂时不可用，请重试。", 502);
  }
  return response.status === 204 ? null : payload.data;
}
export function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(error: unknown) {
  const known = error instanceof AuthFailure ? error : invalidResponse();
  return reply(
    { error: { code: known.code, message: known.message } },
    known.status,
  );
}
export function protectMutation(request: NextRequest) {
  const host = request.headers.get("host"),
    expected =
      process.env.BOJIAN_WEBSITE_ORIGIN ||
      `${request.nextUrl.protocol}//${host}`;
  if (
    !host ||
    request.headers.get("origin") !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AuthFailure("INVALID_ORIGIN", "请求已失效，请刷新页面。", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AuthFailure("INVALID_REQUEST", "请求格式无效。", 400);
}
async function readInput(request: NextRequest): Promise<Json> {
  // Bound the stream as well as the declared length; do not buffer arbitrary bodies.
  const reader = request.body?.getReader();
  if (!reader) throw new AuthFailure("INVALID_REQUEST", "请求格式无效。", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        throw new Error("too large");
      }
      chunks.push(chunk.value);
    }
    return object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    throw new AuthFailure("INVALID_REQUEST", "请求格式无效。", 400);
  }
}
function flow(request: NextRequest, attempt: unknown): Flow {
  let value: Json;
  try {
    value = object(JSON.parse(request.cookies.get(FLOW)?.value || "null"));
  } catch {
    throw new AuthFailure("QR_EXPIRED", "二维码已失效，请刷新。", 410);
  }
  if (
    typeof value.id !== "string" ||
    !SECRET.test(value.id) ||
    typeof value.token !== "string" ||
    !SECRET.test(value.token) ||
    value.attempt !== attempt ||
    typeof value.attempt !== "string" ||
    value.device !== device(request) ||
    typeof value.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    Date.parse(value.expiresAt) <= Date.now()
  )
    throw new AuthFailure("QR_EXPIRED", "二维码已失效，请刷新。", 410);
  return value as Flow;
}
function clear(response: NextResponse, name: string) {
  response.cookies.set(name, "", { ...OPTIONS, maxAge: 0 });
}
function clearSession(response: NextResponse) {
  clear(response, ACCESS);
  clear(response, REFRESH);
  clear(response, FLOW);
}
function validQr(content: string, id: string, browserToken: string) {
  try {
    const url = new URL(content),
      fragment = new URLSearchParams(url.hash.slice(1));
    return (
      url.origin === "https://bojian.kelance.cn" &&
      url.pathname === "/app-login" &&
      !url.search &&
      !url.username &&
      !url.password &&
      [...fragment.keys()].sort().join(",") === "session,token,v" &&
      fragment.get("v") === "1" &&
      fragment.get("session") === id &&
      SECRET.test(fragment.get("token") || "") &&
      fragment.get("token") !== browserToken &&
      !content.includes(browserToken)
    );
  } catch {
    return false;
  }
}
export async function createChallenge(request: NextRequest) {
  protectMutation(request);
  const input = await readInput(request);
  if (input.agreementAccepted !== true)
    throw new AuthFailure(
      "AGREEMENT_REQUIRED",
      "请先同意用户协议和隐私政策。",
      400,
    );
  const browserDevice = device(request, true);
  const data = object(
    await upstream(QR_PATH, {
      method: "POST",
      headers: browserHeaders(request, browserDevice),
      body: JSON.stringify({
        agreement_versions: { terms: "1.0", privacy: "1.0" },
      }),
    }),
  );
  const id = text(data.session_id, 43),
    token = text(data.browser_token, 43),
    content = text(data.qr_content, 1024),
    expiresAt = text(data.expires_at, 40),
    lifetime = Date.parse(expiresAt) - Date.now();
  if (
    !SECRET.test(id) ||
    !SECRET.test(token) ||
    data.status !== "WAITING" ||
    !validQr(content, id, token) ||
    !Number.isFinite(lifetime) ||
    lifetime < 1000 ||
    lifetime > 180000
  )
    throw invalidResponse();
  const attempt = randomUUID(),
    qrDataUrl = await QRCode.toDataURL(content, {
      errorCorrectionLevel: "H",
      width: 600,
      margin: 4,
      color: { dark: "#10131aff", light: "#ffffffff" },
    });
  const response = reply(
    { attempt, qrDataUrl, expiresAt, pollAfterSeconds: 2 },
    201,
  );
  response.cookies.set(
    FLOW,
    JSON.stringify({ id, token, attempt, expiresAt, device: browserDevice }),
    { ...OPTIONS, maxAge: Math.ceil(lifetime / 1000) },
  );
  response.cookies.set(DEVICE, browserDevice, {
    ...OPTIONS,
    maxAge: 365 * 86400,
  });
  return response;
}
async function browserAction(
  request: NextRequest,
  current: Flow,
  action: "status" | "exchange",
) {
  return object(
    await upstream(`${QR_PATH}/${current.id}/${action}`, {
      method: "POST",
      headers: browserHeaders(request, current.device),
      body: JSON.stringify({ browser_token: current.token }),
    }),
  );
}
export async function challengeStatus(request: NextRequest) {
  const current = flow(request, request.nextUrl.searchParams.get("attempt"));
  const data = await browserAction(request, current, "status"),
    status = typeof data.status === "string" ? STATUS[data.status] : undefined;
  if (data.session_id !== current.id || !status) throw invalidResponse();
  const response = reply({ status });
  if (["expired", "cancelled", "used"].includes(status)) clear(response, FLOW);
  return response;
}
function parseTokens(data: Json): Tokens {
  const access = text(data.access_token, 3000),
    refresh = text(data.refresh_token, 512),
    accessLifetime = Number(data.access_expires_in_seconds),
    refreshExpiresAt = Date.parse(text(data.refresh_expires_at, 40));
  if (
    /\s/.test(access) ||
    /\s/.test(refresh) ||
    !Number.isInteger(accessLifetime) ||
    accessLifetime < 1 ||
    accessLifetime > 86400 ||
    !Number.isFinite(refreshExpiresAt) ||
    refreshExpiresAt <= Date.now() ||
    refreshExpiresAt > Date.now() + 366 * 86400000
  )
    throw invalidResponse();
  return { access, refresh, accessLifetime, refreshExpiresAt };
}
function saveTokens(response: NextResponse, tokens: Tokens) {
  response.cookies.set(ACCESS, tokens.access, {
    ...OPTIONS,
    maxAge: tokens.accessLifetime,
  });
  response.cookies.set(REFRESH, tokens.refresh, {
    ...OPTIONS,
    maxAge: Math.max(
      1,
      Math.floor((tokens.refreshExpiresAt - Date.now()) / 1000),
    ),
  });
}
function avatarUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 4096) return "";
  const source = value.trim();
  try {
    const url = new URL(source);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol === "https:" || (url.protocol === "http:" && loopback)) &&
      !url.username &&
      !url.password
    )
      return source;
  } catch {}
  return "";
}
async function profile(
  request: NextRequest,
  access: string,
): Promise<AuthUser> {
  const data = object(
    await upstream("/api/v1/me", {
      headers: {
        ...browserHeaders(request),
        Authorization: `Bearer ${text(access, 3000)}`,
      },
    }),
  );
  const id =
    typeof data.id === "number" && Number.isSafeInteger(data.id)
      ? String(data.id)
      : text(data.id, 128);
  return {
    id,
    nickname:
      typeof data.nickname === "string"
        ? data.nickname.slice(0, 80) || "博简用户"
        : "博简用户",
    publicId:
      typeof data.public_id === "string" ? data.public_id.slice(0, 80) : "",
    avatarUrl: avatarUrl(data.avatar_url),
  };
}
// Coalesce rotating refresh tokens for simultaneous requests in this single Next.js instance.
// Entries are per credential and device, bounded, and discarded after a five-second grace period.
const refreshes = new Map<string, Promise<Tokens>>();
function refreshTokens(request: NextRequest, refresh: string): Promise<Tokens> {
  const headers = browserHeaders(request),
    key = createHash("sha256")
      .update(`${origin()}|${headers["X-Device-Id"]}|${refresh}`)
      .digest("hex");
  const existing = refreshes.get(key);
  if (existing) return existing;
  if (refreshes.size >= 1024)
    return Promise.reject(
      new AuthFailure("AUTH_NETWORK", "登录服务繁忙，请稍后重试。", 503),
    );
  const pending = upstream("/api/v1/auth/token/refresh", {
    method: "POST",
    headers,
    body: JSON.stringify({ refresh_token: text(refresh, 512) }),
  }).then((data) => parseTokens(object(data)));
  refreshes.set(key, pending);
  void pending.then(
    () => {
      setTimeout(() => {
        if (refreshes.get(key) === pending) refreshes.delete(key);
      }, 5000).unref();
    },
    () => {
      refreshes.delete(key);
    },
  );
  return pending;
}
export async function exchangeChallenge(request: NextRequest) {
  protectMutation(request);
  const input = await readInput(request),
    current = flow(request, input.attempt);
  const tokens = parseTokens(await browserAction(request, current, "exchange"));
  try {
    const user = await profile(request, tokens.access),
      response = reply({ user });
    saveTokens(response, tokens);
    clear(response, FLOW);
    return response;
  } catch (error) {
    const response = failure(error);
    if (!(error instanceof AuthFailure && error.status === 401))
      saveTokens(response, tokens);
    clear(response, FLOW);
    return response;
  }
}
async function activeSession(
  request: NextRequest,
): Promise<{ user: AuthUser; access: string; rotated?: Tokens } | null> {
  const access = request.cookies.get(ACCESS)?.value,
    refresh = request.cookies.get(REFRESH)?.value;
  if (!access && !refresh) return null;
  if (access) {
    try {
      return { user: await profile(request, access), access };
    } catch (error) {
      if (!(error instanceof AuthFailure && error.status === 401)) throw error;
    }
  }
  if (!refresh) return null;
  const rotated = await refreshTokens(request, refresh);
  try {
    return {
      user: await profile(request, rotated.access),
      access: rotated.access,
      rotated,
    };
  } catch (error) {
    if (error instanceof AuthFailure && error.status === 401) throw error;
    const response = failure(error);
    saveTokens(response, rotated);
    throw new RotatedFailure(response);
  }
}
class RotatedFailure {
  constructor(readonly response: NextResponse) {}
}

// Server-only authenticated calls. Credentials stay in scoped HttpOnly cookies;
// rotated cookies are retained even when a subsequent business operation fails.
export async function withAuthenticatedApi(
  request: NextRequest,
  run: (
    api: (path: string, method?: string, body?: unknown) => Promise<unknown>,
  ) => Promise<NextResponse>,
) {
  let session: Awaited<ReturnType<typeof activeSession>> = null;
  try {
    session = await activeSession(request);
    if (!session)
      throw new AuthFailure("AUTH_INVALID", "登录已失效，请重新登录。", 401);
    const access = session.access;
    const response = await run(async (path, method = "GET", body) => {
      let response: Response;
      try {
        response = await fetch(origin() + path, {
          method,
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(90000)]),
          headers: {
            ...browserHeaders(request),
            Authorization: `Bearer ${access}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        throw new AuthFailure(
          "CREATOR_NETWORK",
          "连接中断或处理超时，请刷新模板列表确认结果后再试。",
          502,
        );
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const code = payload?.error?.code,
          message = payload?.error?.message;
        throw new AuthFailure(
          response.status === 401
            ? "AUTH_INVALID"
            : typeof code === "string"
              ? code.slice(0, 100)
              : "CREATOR_UNAVAILABLE",
          typeof message === "string"
            ? message.slice(0, 500)
            : "模板服务暂不可用，请稍后重试。",
          response.status >= 400 && response.status < 500
            ? response.status
            : 502,
        );
      }
      if (!payload || typeof payload !== "object" || !("data" in payload))
        throw new AuthFailure(
          "CREATOR_RESPONSE",
          "模板服务返回异常，请稍后重试。",
          502,
        );
      return payload.data;
    });
    if (session.rotated) saveTokens(response, session.rotated);
    return response;
  } catch (error) {
    if (error instanceof RotatedFailure) return error.response;
    const response = failure(error);
    if (error instanceof AuthFailure && error.status === 401)
      clearSession(response);
    else if (session?.rotated) saveTokens(response, session.rotated);
    return response;
  }
}
export async function currentSession(request: NextRequest) {
  if (!request.cookies.has(ACCESS) && !request.cookies.has(REFRESH))
    return reply({ user: null });
  try {
    const session = await activeSession(request),
      response = reply({ user: session?.user || null });
    if (session?.rotated) saveTokens(response, session.rotated);
    if (!session) clearSession(response);
    return response;
  } catch (error) {
    if (error instanceof RotatedFailure) return error.response;
    if (error instanceof AuthFailure && error.status === 401) {
      const response = reply({ user: null });
      clearSession(response);
      return response;
    }
    throw error;
  }
}
export async function logout(request: NextRequest) {
  protectMutation(request);
  let session: Awaited<ReturnType<typeof activeSession>>;
  try {
    session = await activeSession(request);
  } catch (error) {
    if (error instanceof RotatedFailure) return error.response;
    if (error instanceof AuthFailure && error.status === 401) session = null;
    else throw error;
  }
  if (session) {
    try {
      await upstream("/api/v1/auth/logout", {
        method: "POST",
        headers: {
          ...browserHeaders(request),
          Authorization: `Bearer ${session.access}`,
        },
        body: "{}",
      });
    } catch (error) {
      if (!(error instanceof AuthFailure && error.status === 401)) {
        const response = failure(error);
        if (session.rotated) saveTokens(response, session.rotated);
        return response;
      }
    }
  }
  const response = reply({ user: null });
  clearSession(response);
  return response;
}
