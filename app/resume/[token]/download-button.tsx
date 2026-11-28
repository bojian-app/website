"use client";

import { useEffect, useState } from "react";
import styles from "./share.module.css";

// The first download after an edit typesets the PDF, which takes a few seconds
// before the browser shows any progress of its own.
export function DownloadButton({
  href,
  fileName,
}: {
  href: string;
  fileName: string;
}) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setBusy(false), 8000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  return (
    <a
      className={styles.download}
      href={href}
      download={fileName}
      rel="nofollow"
      aria-busy={busy}
      onClick={() => setBusy(true)}
    >
      {busy ? "正在生成 PDF…" : "下载 PDF"}
    </a>
  );
}
