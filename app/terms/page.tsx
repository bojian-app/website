import type { Metadata } from "next";

import { LegalDocument } from "../../components/legal-document";

export const metadata: Metadata = {
  title: "用户协议",
  description: "拾页用户协议",
};

export default function Terms() {
  return <LegalDocument kind="terms" eyebrow="服务规则" />;
}
