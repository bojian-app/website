"use client";

import Image from "next/image";
import { useRef } from "react";
import styles from "./site-chrome.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DownloadMenu } from "./download-menu";

const sections = [
  { href: "/#story", label: "流程" },
  { href: "/#features", label: "功能" },
  { href: "/#community", label: "社区" },
  { href: "/#questions", label: "问答" },
];

// Shared resume pages show only the document and their own compact header.
const documentPage = (pathname: string) =>
  pathname.startsWith("/resume-review/") || pathname.startsWith("/resume/");

export function SiteHeader() {
  const menu = useRef<HTMLDetailsElement>(null);
  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }
  const pathname = usePathname();
  if (documentPage(pathname)) return null;
  return (
    <header className={`site-header ${styles.header}`}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Z优简首页">
          <Image src="/brand/app-icon.png" width={38} height={38} alt="" />
          <span>Z优简</span>
        </Link>
        <nav className={styles.nav} aria-label="官网导航">
          {sections.map(({ href, label }) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <DownloadMenu />
          <details
            ref={menu}
            className={styles.mobileMenu}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeMenu();
                menu.current?.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="官网导航菜单">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </summary>
            <nav aria-label="移动端官网导航">
              {sections.map(({ href, label }) => (
                <Link key={href} href={href} onClick={closeMenu}>
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ year }: { year: number }) {
  const pathname = usePathname();
  if (documentPage(pathname)) return null;
  return (
    <footer className={`site-footer wrap ${styles.footer}`}>
      <div className="footer-bottom">
        <span className={styles.imprint}>
          <b>Z优简</b>
          <span>© {year}</span>
        </span>
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
