import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResumeGuestReview } from "@/components/resume-guest-review";

export const metadata: Metadata = {
  title: "简历指点",
  description: "通过分享链接查看简历并提交修改建议。",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  return <ResumeGuestReview key={token} token={token} />;
}
