import "server-only";
import { cache } from "react";

export const shareTokenPattern = /^[a-f0-9]{64}$/;

export type ResumeShare = {
  title: string;
  name: string;
  snapshot: Record<string, unknown>;
  has_photo: boolean;
  file_name: string;
  updated_at: string;
};

export type ResumeShareResult =
  | { ok: true; share: ResumeShare }
  | { ok: false; status: number; message: string };

function apiOrigin() {
  const base = new URL(process.env.BOJIAN_APP_AUTH_ORIGIN || "");
  if (
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" &&
      !(
        base.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
      ))
  )
    throw new Error("invalid API origin");
  return base.origin;
}

// One request per page render: metadata and the page share the answer, and
// the API counts the visit once.
export const loadResumeShare = cache(
  async (token: string): Promise<ResumeShareResult> => {
    try {
      const response = await fetch(
        `${apiOrigin()}/api/v1/public/resume-shares/${token}`,
        {
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
      const payload = await response.json();
      if (response.ok && payload?.data?.snapshot)
        return { ok: true, share: payload.data as ResumeShare };
      return {
        ok: false,
        status: response.status,
        message:
          typeof payload?.error?.message === "string"
            ? payload.error.message
            : "简历暂时无法打开，请稍后刷新",
      };
    } catch {
      return { ok: false, status: 502, message: "连接中断，请稍后刷新" };
    }
  },
);
