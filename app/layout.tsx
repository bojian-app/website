import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { DownloadNoticeProvider } from "@/components/download-menu";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
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
          <DownloadNoticeProvider>
            <a className="skip-link" href="#main">
              跳转到正文
            </a>
            <SiteHeader />
            {children}
            <SiteFooter year={new Date().getFullYear()} />
          </DownloadNoticeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
