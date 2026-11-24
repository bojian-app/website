import type { Metadata } from "next";
import { DownloadNoticeProvider } from "@/components/download-menu";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bojian.kelance.cn"),
  title: {
    default: "拾页｜AI 简历创作与求职交流",
    template: "%s｜拾页",
  },
  description:
    "用拾页整理经历、导入简历、对照 AI 优化建议，邀请朋友逐段批注，再导出 PDF 或 Word。",
  openGraph: {
    title: "拾页 — 简历编辑与交流社区",
    description: "从整理经历到投递前的修改，在手机上完成简历创作。",
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
        <DownloadNoticeProvider>
          <a className="skip-link" href="#main">
            跳转到正文
          </a>
          <SiteHeader />
          {children}
          <SiteFooter year={new Date().getFullYear()} />
        </DownloadNoticeProvider>
      </body>
    </html>
  );
}
