import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthProvider } from "@/components/auth-provider";
import { AccountButton } from "@/components/account-button";
import { DownloadMenu } from "@/components/download-menu";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bojian.kelance.cn"),
  title: {
    default: "博简",
    template: "%s｜博简",
  },
  description:
    "博简，手机端简历工具与求职交流社区。支持简历导入、编辑、导出、简历求指点和经验分享。App 即将开放下载。",
  openGraph: {
    title: "博简 — 简历编辑与交流社区",
    description: "手机端简历工具与求职交流社区。",
    locale: "zh_CN",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/brand/app-icon.png", apple: "/brand/app-icon.png" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser translation extensions can add attributes before hydration.
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <a className="skip-link" href="#main">
            跳转到正文
          </a>
          <header className="site-header">
            <div className="header-inner">
              <Link className="brand" href="/" aria-label="博简首页">
                <Image
                  src="/brand/app-icon.png"
                  width={38}
                  height={38}
                  alt=""
                />
                <span>博简</span>
              </Link>
              <div className="header-actions landing-actions">
                <DownloadMenu />
                <AccountButton />
              </div>
            </div>
          </header>
          {children}
          <footer className="site-footer wrap">
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} 博简</span>
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
        </AuthProvider>
      </body>
    </html>
  );
}
