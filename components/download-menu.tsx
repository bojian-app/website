"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const DownloadNotice = createContext<() => void>(() => {});

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

export function DownloadNoticeProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const notify = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), 3000);
  }, []);
  return (
    <DownloadNotice.Provider value={notify}>
      {children}
      <div
        className="notification-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {visible && (
          <div className="download-notification">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle
                cx="10"
                cy="10"
                r="8"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 9v5m0-8v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            暂未上线
          </div>
        )}
      </div>
    </DownloadNotice.Provider>
  );
}

export function DownloadMenu() {
  const notify = useContext(DownloadNotice);
  return (
    <div className="download-action">
      <button
        type="button"
        className="landing-download"
        onClick={notify}
        aria-label="下载 App"
      >
        <DownloadIcon />
        <span>下载 App</span>
      </button>
    </div>
  );
}
