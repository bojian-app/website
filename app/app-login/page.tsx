import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppLoginNotice } from "@/components/app-login-notice";
export const metadata: Metadata = {
  title: "使用博简 App 扫码",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function AppLoginLanding() {
  return (
    <main id="main" className="login-page wrap">
      <AppLoginNotice />
      <section className="login-card app-login-notice">
        <Image src="/brand/app-icon.png" width={50} height={50} alt="博简" />
        <h1>请使用博简 App 扫码</h1>
        <p>在 App 内打开“扫一扫”，扫描原二维码。</p>
        <Link className="button button-dark login-submit" href="/">
          返回官网 <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
