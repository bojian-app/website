import type { Metadata } from "next";
import Link from "next/link";
import { QrLogin } from "@/components/qr-login";
export const metadata: Metadata = {
  title: "App 扫码登录",
  description: "使用博简 App 扫码登录。",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return (
    <main id="main" className="login-page login-page-minimal wrap">
      <div className="login-portal">
        <Link className="login-back" href="/">
          <span aria-hidden="true">←</span> 返回官网
        </Link>
        <QrLogin returnTo={next === "/console" ? "/console" : "/"} />
      </div>
    </main>
  );
}
