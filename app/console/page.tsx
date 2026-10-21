import type { Metadata } from "next";
import { CreatorConsole } from "@/components/creator-console";
export const metadata: Metadata = {
  title: "控制台",
  description: "管理并上架你的简历模板。",
  robots: { index: false, follow: false },
};
export default function ConsolePage() {
  return (
    <main id="main" className="console-page">
      <CreatorConsole />
    </main>
  );
}
