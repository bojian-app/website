import type { Metadata } from "next";

import { LegalDocument } from "../../components/legal-document";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "最优简隐私政策",
};

export default function Privacy() {
  return <LegalDocument kind="privacy" eyebrow="法律与隐私" />;
}
