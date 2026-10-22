"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountButton } from "./account-button";
import { DownloadMenu } from "./download-menu";

function ChromeIcon({ kind }: { kind: "templates" | "guide" | "home" }) {
  const paths = {
    templates: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    guide:
      "M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z",
    home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths[kind]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const consolePage =
    pathname === "/console" || pathname.startsWith("/console/");
  const guide = pathname === "/console/template-guide";
  return (
    <header className={`site-header${consolePage ? " console-header" : ""}`}>
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="博简首页">
          <Image src="/brand/app-icon.png" width={38} height={38} alt="" />
          <span>博简</span>
        </Link>
        {consolePage && (
          <nav className="console-header-nav" aria-label="控制台页面导航">
            <Link href="/console" aria-current={!guide ? "page" : undefined}>
              <ChromeIcon kind="templates" />
              模板管理
            </Link>
            <Link
              href="/console/template-guide"
              aria-current={guide ? "page" : undefined}
            >
              <ChromeIcon kind="guide" />
              制作指南
            </Link>
          </nav>
        )}
        <div className="header-actions landing-actions">
          <DownloadMenu />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ year }: { year: number }) {
  const pathname = usePathname();
  if (pathname === "/console" || pathname.startsWith("/console/")) return null;
  return (
    <footer className="site-footer wrap">
      <div className="footer-bottom">
        <span>© {year} 博简</span>
        <div>
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">用户协议</Link>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            粤ICP备2026155383号
          </a>
        </div>
      </div>
    </footer>
  );
}

export function ConsoleNavigation() {
  const pathname = usePathname();
  return (
    <nav className="console-rail" aria-label="控制台快捷导航">
      <Link
        href="/console"
        aria-label="我的模板"
        title="我的模板"
        aria-current={pathname === "/console" ? "page" : undefined}
      >
        <ChromeIcon kind="templates" />
      </Link>
      <Link
        href="/console/template-guide"
        aria-label="模板制作指南"
        title="模板制作指南"
        aria-current={
          pathname === "/console/template-guide" ? "page" : undefined
        }
      >
        <ChromeIcon kind="guide" />
      </Link>
      <Link
        className="console-rail-home"
        href="/"
        aria-label="返回博简首页"
        title="返回博简首页"
      >
        <ChromeIcon kind="home" />
      </Link>
    </nav>
  );
}
