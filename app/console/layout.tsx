import Link from "next/link";
import { ConsoleNavigation } from "@/components/site-chrome";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="console-application">
      <ConsoleNavigation />
      <div className="console-application-content">
        {children}
        <footer className="console-app-footer">
          <span>© {new Date().getFullYear()} 博简 · 创作者工作台</span>
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
        </footer>
      </div>
    </div>
  );
}
