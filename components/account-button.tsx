"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { useDismissibleDetails } from "./use-dismissible-details";

function AccountAvatar({ url, nickname }: { url: string; nickname: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="account-avatar" aria-hidden="true">
      {url && !failed ? (
        <Image
          src={url}
          width={28}
          height={28}
          alt=""
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        Array.from(nickname.trim())[0] || "博"
      )}
    </span>
  );
}
export function AccountButton() {
  const menu = useDismissibleDetails();
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!user)
    return (
      <Link className="login-entry" href="/login">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 9V5h4m6 0h4v4m0 6v4h-4M9 19H5v-4M9 12h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        登录博简
      </Link>
    );
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (error) {
      setError(error instanceof Error ? error.message : "退出失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="account-menu" name="header-menu" ref={menu}>
      <summary aria-label={`账号：${user.nickname}`}>
        <AccountAvatar
          key={`${user.id}:${user.avatarUrl}`}
          url={user.avatarUrl}
          nickname={user.nickname}
        />
        <span className="account-name">{user.nickname}</span>
        <span className="account-caret" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>
      <div className="account-popover">
        <Link
          href="/console"
          onClick={() => {
            if (menu.current) menu.current.open = false;
          }}
        >
          控制台<span aria-hidden="true">↗</span>
        </Link>
        <button type="button" disabled={busy} onClick={() => void signOut()}>
          {busy ? "正在退出…" : "退出登录"}
          <span aria-hidden="true">↗</span>
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
