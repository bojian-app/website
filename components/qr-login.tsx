"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthRequestError, authRequest } from "@/lib/auth-client";
import type { AuthUser, QrChallenge, QrProgress } from "@/lib/auth-types";
import { useAuth } from "./auth-provider";
import { Arrow } from "./icons";
type Phase =
  | "idle"
  | "loading"
  | "waiting"
  | "scanned"
  | "confirming"
  | "expired"
  | "cancelled"
  | "used"
  | "unavailable"
  | "error";
const terminal = new Set<Phase>(["cancelled", "used", "unavailable", "error"]);
function ScanIcon({ success = false }: { success?: boolean }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {success ? (
        <path
          d="m12 24 8 8 16-18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M6 17V7h10M32 7h10v10M42 31v10H32M16 41H6V31M10 24h28"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M17 16h14v16H17z"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity=".4"
          />
        </>
      )}
    </svg>
  );
}
export function QrLogin({ returnTo = "/" }: { returnTo?: "/" | "/console" }) {
  const router = useRouter();
  const {
    user,
    checking,
    error: sessionError,
    refresh,
    authenticated,
  } = useAuth();
  const [agreed, setAgreed] = useState(false),
    [phase, setPhase] = useState<Phase>("idle"),
    [error, setError] = useState("");
  const [challenge, setChallenge] = useState<QrChallenge | null>(null);
  const creation = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      creation.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (user) {
      generation.current++;
      creation.current?.abort();
      setChallenge(null);
      setPhase("idle");
      router.replace(returnTo);
    }
  }, [user, router, returnTo]);
  const start = useCallback(async () => {
    if (!agreed || checking || sessionError || user) return;
    const version = ++generation.current;
    creation.current?.abort();
    const controller = new AbortController();
    creation.current = controller;
    setChallenge(null);
    setError("");
    setPhase("loading");
    try {
      const data = await authRequest<QrChallenge>(
        "/web-api/auth/qr",
        { agreementAccepted: true },
        controller.signal,
      );
      if (version !== generation.current || controller.signal.aborted) return;
      setChallenge(data);
      setPhase("waiting");
    } catch (error) {
      if (controller.signal.aborted || version !== generation.current) return;
      setError(
        error instanceof Error ? error.message : "连接暂时中断，请稍后重试。",
      );
      setPhase(
        error instanceof AuthRequestError && error.code === "AUTH_UNAVAILABLE"
          ? "unavailable"
          : "error",
      );
    }
  }, [agreed, checking, sessionError, user]);
  useEffect(() => {
    if (phase === "idle" || phase === "expired") void start();
  }, [phase, start]);
  useEffect(() => {
    if (!challenge || user) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = setTimeout(
      () => {
        controller.abort();
        clearTimeout(timer);
        setPhase("expired");
      },
      Math.max(0, Date.parse(challenge.expiresAt) - Date.now()),
    );
    const stopTimers = () => {
      clearTimeout(timer);
      clearTimeout(deadline);
    };
    async function poll() {
      if (controller.signal.aborted) return;
      if (document.hidden) {
        timer = setTimeout(poll, 2000);
        return;
      }
      try {
        const data = await authRequest<QrProgress>(
          `/web-api/auth/qr?attempt=${encodeURIComponent(challenge!.attempt)}`,
          undefined,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (
          data.status === "expired" ||
          data.status === "cancelled" ||
          data.status === "used"
        ) {
          stopTimers();
          setPhase(data.status);
          return;
        }
        if (data.status === "confirmed") {
          clearTimeout(deadline);
          setPhase("confirming");
          const result = await authRequest<{ user: AuthUser }>(
            "/web-api/auth/qr/exchange",
            { attempt: challenge!.attempt },
            controller.signal,
          );
          if (!controller.signal.aborted) {
            authenticated(result.user);
            setChallenge(null);
            setPhase("idle");
          }
          return;
        }
        setPhase((previous) =>
          data.status === "scanned" || previous === "scanned"
            ? "scanned"
            : "waiting",
        );
        timer = setTimeout(poll, challenge!.pollAfterSeconds * 1000);
      } catch (error) {
        if (controller.signal.aborted) return;
        stopTimers();
        setError(
          error instanceof Error ? error.message : "连接暂时中断，请稍后重试。",
        );
        setPhase(
          error instanceof AuthRequestError &&
            ["QR_EXPIRED", "AUTH_INVALID", "QR_STATE_INVALID"].includes(
              error.code,
            )
            ? "expired"
            : error instanceof AuthRequestError &&
                error.code === "AUTH_UNAVAILABLE"
              ? "unavailable"
              : "error",
        );
      }
    }
    void poll();
    return () => {
      controller.abort();
      stopTimers();
    };
  }, [challenge, user, authenticated]);
  const messages: Record<Phase, string> = {
    idle: "",
    loading: "正在获取二维码…",
    waiting: "",
    scanned: "已扫码，请在 App 中确认",
    confirming: "正在登录…",
    expired: "",
    cancelled: "已取消登录",
    used: "二维码已使用，请刷新",
    unavailable: "扫码登录暂不可用",
    error: error || "连接失败，请重试",
  };
  if (user) return null;
  const canScan = phase === "waiting" && challenge && !sessionError;
  const showCheck = phase === "scanned" || phase === "confirming";
  return (
    <section className="login-card" aria-labelledby="login-card-title">
      <span className="login-scan-symbol" aria-hidden="true">
        <ScanIcon />
      </span>
      <h1 id="login-card-title" className="login-card-intro">
        使用博简 App 扫一扫
      </h1>
      <p className="login-card-description">在 App 中确认，即可安全登录</p>
      <div
        className={`qr-stage ${canScan ? "qr-stage-ready" : ""}`}
        aria-busy={phase === "loading" || phase === "confirming"}
      >
        <span className="qr-corner qr-tl" aria-hidden="true" />
        <span className="qr-corner qr-tr" aria-hidden="true" />
        <span className="qr-corner qr-bl" aria-hidden="true" />
        <span className="qr-corner qr-br" aria-hidden="true" />
        {canScan ? (
          <img
            className="qr-image"
            src={challenge.qrDataUrl}
            width="240"
            height="240"
            alt="登录二维码，请使用博简 App 扫描"
          />
        ) : (
          <div
            className={`qr-stage-message ${showCheck ? "qr-stage-checked" : ""}`}
          >
            <span
              className={
                phase === "loading" || phase === "confirming"
                  ? "qr-spinner"
                  : ""
              }
            >
              {showCheck ? <ScanIcon success /> : <ScanIcon />}
            </span>
            {phase === "idle" && !checking && !sessionError && (
              <p className="qr-idle-hint">勾选下方协议后显示二维码</p>
            )}
            {(checking ||
              sessionError ||
              !["idle", "waiting", "expired"].includes(phase)) && (
              <div className="qr-status" role="status" aria-live="polite">
                <p>{checking ? "加载中…" : sessionError || messages[phase]}</p>
              </div>
            )}
            {sessionError ? (
              <button
                className="button login-submit login-retry"
                type="button"
                disabled={checking}
                onClick={() => void refresh()}
              >
                重新连接 <Arrow />
              </button>
            ) : terminal.has(phase) ? (
              <button
                className="button button-dark login-submit"
                type="button"
                disabled={!agreed || checking}
                onClick={() => void start()}
              >
                {phase === "used" ? "刷新二维码" : "重新获取二维码"}
                <Arrow diagonal />
              </button>
            ) : null}
          </div>
        )}
      </div>
      <label className="login-consent">
        <input
          type="checkbox"
          checked={agreed}
          disabled={phase === "loading" || phase === "confirming"}
          onChange={(e) => {
            setAgreed(e.target.checked);
            if (!e.target.checked) {
              generation.current++;
              creation.current?.abort();
              setChallenge(null);
              setPhase("idle");
              setError("");
            }
          }}
        />
        <span>
          我已阅读并同意{" "}
          <Link href="/terms" target="_blank" rel="noopener noreferrer">
            《用户协议》
          </Link>
          和
          <Link href="/privacy" target="_blank" rel="noopener noreferrer">
            《隐私政策》
          </Link>
        </span>
      </label>
      <noscript>
        <p className="login-noscript">
          请启用 JavaScript，以获取二维码并接收登录确认。
        </p>
      </noscript>
    </section>
  );
}
