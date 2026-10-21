"use client";
import { useDismissibleDetails } from "./use-dismissible-details";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v11m-4-4 4 4 4-4M5 16v4h14v-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DownloadMenu() {
  const menu = useDismissibleDetails();
  return (
    <details className="download-menu" name="header-menu" ref={menu}>
      <summary className="landing-download">
        <DownloadIcon />
        <span>下载 App</span>
      </summary>
      <div className="download-popover">
        <div className="download-popover-heading">
          <span className="download-popover-icon">
            <DownloadIcon />
          </span>
          <div>
            <strong>博简 App</strong>
            <span className="download-availability">
              <i /> 即将开放下载
            </span>
          </div>
        </div>
        <p>App 暂未上架，开放后会在这里更新下载入口。</p>
      </div>
    </details>
  );
}
