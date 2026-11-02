"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./resume-guest-review.module.css";

type Row = Record<string, unknown>;
type RecordItem = {
  id: number;
  field_path: string;
  field_value: string;
  selected_text: string;
  suggestion: string;
  replacement: string;
  reviewer_id: number;
  reviewer_name: string;
  moderation_status: string;
  status: string;
  parent_id?: number;
};
type Review = {
  title: string;
  snapshot: Record<string, Row | Row[]>;
  can_review: boolean;
};
type Selection = {
  path: string;
  original: string;
  selected: string;
  replacement: boolean;
  parent?: number;
};
const sections = [
  [
    "job_expectation",
    "求职意向",
    ["position", "city", "industry", "salary", "preference"],
  ],
  [
    "work_experiences",
    "工作经历",
    ["position", "industry", "start_date", "end_date", "description"],
  ],
  [
    "projects",
    "项目经历",
    ["role", "start_date", "end_date", "description", "achievements"],
  ],
  [
    "educations",
    "教育经历",
    [
      "degree",
      "field_of_study",
      "start_date",
      "end_date",
      "campus_experience",
      "thesis_title",
      "thesis_description",
    ],
  ],
  ["skills", "专业技能", ["name", "description"]],
  ["certifications", "证书荣誉", ["name", "date"]],
] as const;
const statusText = (item: RecordItem) =>
  item.moderation_status === "REJECTED"
    ? "未通过审核"
    : ["PENDING", "QUEUED"].includes(item.moderation_status)
      ? "审核中"
      : item.status === "ACCEPTED"
        ? "已采纳"
        : item.status === "REJECTED"
          ? "未采纳"
          : "已提交";

export function ResumeGuestReview({ token }: { token: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [guest, setGuest] = useState<{
    id: number;
    display_name: string;
  } | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [composer, setComposer] = useState<Selection | null>(null);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [comparing, setComparing] = useState<number | null>(null);
  const lastSubmission = useRef({ body: "", key: "" });
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(false);
  const sessionRequest = useRef<Promise<{
    id: number;
    display_name: string;
  }> | null>(null);
  const api = useCallback(
    async (suffix = "", body?: unknown, key?: string) => {
      const response = await fetch(`/web-api/resume-links/${token}${suffix}`, {
        method: body === undefined ? "GET" : "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if ([404, 410].includes(response.status)) {
          setFatal(true);
          setReview(null);
          setRecords([]);
          setSelection(null);
          setComposer(null);
        }
        throw new Error(payload.error?.message || "暂时无法加载，请重试");
      }
      return payload.data;
    },
    [token],
  );
  const refresh = useCallback(async () => {
    const [value, annotations] = await Promise.all([
      api(),
      api("/annotations"),
    ]);
    if (!mounted.current) return;
    setReview(value);
    setRecords(annotations.items || []);
  }, [api]);
  const load = useCallback(async () => {
    setError("");
    try {
      const visitor = await (sessionRequest.current ??= api(
        "/session",
        {},
      ).finally(() => {
        sessionRequest.current = null;
      }));
      if (!mounted.current) return;
      setGuest(visitor);
      await refresh();
    } catch (reason) {
      if (mounted.current) setError((reason as Error).message);
    }
  }, [api, refresh]);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  useEffect(() => {
    if (!review || fatal) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh().catch((reason) => setError(reason.message));
    }, 10000);
    return () => clearInterval(timer);
  }, [!!review, fatal, refresh]);
  useEffect(() => {
    if (composer) dialog.current?.showModal();
    else dialog.current?.close();
  }, [composer]);

  function selectText() {
    if (!review?.can_review || composer) return;
    const selected = window.getSelection();
    if (!selected || selected.isCollapsed || !selected.rangeCount) return;
    const range = selected.getRangeAt(0);
    const element = (
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement
    )?.closest<HTMLElement>("[data-field]");
    if (!element || !element.contains(range.endContainer)) {
      setSelection(null);
      return;
    }
    const original = element.dataset.original || "";
    const quote = selected.toString().trim();
    if (!quote || original.split(quote).length !== 2) {
      setSelection(null);
      return;
    }
    setSelection({
      path: element.dataset.field!,
      original,
      selected: quote,
      replacement: false,
    });
  }
  function compose(value: Selection) {
    setComposer(value);
    setText(value.replacement ? value.selected : "");
    setMessage("");
  }
  async function submit() {
    if (!composer || busy || !text.trim()) return;
    const body = {
      field_path: composer.path,
      field_value: composer.original,
      selected_text: composer.selected,
      suggestion: composer.replacement ? "" : text.trim(),
      replacement: composer.replacement ? text.trim() : "",
      ...(composer.parent ? { parent_id: composer.parent } : {}),
    };
    const encoded = JSON.stringify(body);
    if (lastSubmission.current.body !== encoded)
      lastSubmission.current = { body: encoded, key: crypto.randomUUID() };
    setBusy(true);
    setMessage("");
    try {
      await api("/annotations", body, lastSubmission.current.key);
      setComposer(null);
      setSelection(null);
      setText("");
      setMessage("已提交，审核通过后作者即可查看");
      await refresh();
    } catch (reason) {
      setMessage((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function field(path: string, original: unknown) {
    if (typeof original !== "string" || !original.trim()) return null;
    const items = records.filter((item) => item.field_path === path);
    const rewrite = items.find(
      (item) =>
        item.reviewer_id === guest?.id &&
        item.replacement &&
        item.moderation_status === "VISIBLE" &&
        item.status !== "REJECTED" &&
        original.split(item.selected_text).length === 2,
    );
    const shown =
      rewrite && comparing !== rewrite.id
        ? original.replace(rewrite.selected_text, rewrite.replacement)
        : original;
    return (
      <div className={styles.field} key={path}>
        <p
          data-field={path}
          data-original={original}
          className={rewrite ? styles.rewritten : ""}
          tabIndex={0}
          role="button"
          aria-label={`选择这段内容：${original.slice(0, 20)}`}
          onClick={() => {
            if (window.getSelection()?.isCollapsed !== false)
              setSelection({
                path,
                original,
                selected: original,
                replacement: false,
              });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelection({
                path,
                original,
                selected: original,
                replacement: false,
              });
            }
          }}
        >
          {shown}
        </p>
        {rewrite && (
          <button
            type="button"
            onPointerDown={() => setComparing(rewrite.id)}
            onPointerUp={() => setComparing(null)}
            onPointerCancel={() => setComparing(null)}
            onPointerLeave={() => setComparing(null)}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter")
                setComparing(rewrite.id);
            }}
            onKeyUp={() => setComparing(null)}
            onBlur={() => setComparing(null)}
          >
            按住对照原文
          </button>
        )}
        {items.length > 0 && (
          <details className={styles.notes}>
            <summary>{items.length} 条评论与改写</summary>
            {items.map((item) => (
              <div key={item.id} className={styles.note}>
                <div>
                  <strong>{item.reviewer_name}</strong>
                  <span>{statusText(item)}</span>
                </div>
                <blockquote>{item.selected_text}</blockquote>
                <p>{item.replacement || item.suggestion}</p>
                {!item.replacement && item.moderation_status === "VISIBLE" && (
                  <button
                    onClick={() =>
                      compose({
                        path,
                        original,
                        selected: item.selected_text,
                        replacement: false,
                        parent: item.id,
                      })
                    }
                  >
                    回复
                  </button>
                )}
              </div>
            ))}
          </details>
        )}
      </div>
    );
  }

  return (
    <main id="main" className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.brand}>博简</span>
          <h1>{review?.title || "简历指点"}</h1>
        </div>
        {guest && <span className={styles.guest}>{guest.display_name}</span>}
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          {!fatal && <button onClick={() => void load()}>重试</button>}
        </div>
      )}
      {!review && !error && <p className={styles.loading}>正在打开简历…</p>}
      {review && (
        <>
          <p className={styles.hint}>
            点选或选中文字可评论、改写，修改由作者确认采用。
          </p>
          <article
            className={styles.paper}
            onMouseUp={selectText}
            onTouchEnd={() => window.setTimeout(selectText, 100)}
            onKeyUp={selectText}
          >
            <div className={styles.identity} aria-label="个人信息已隐藏">
              <span />
              <i />
            </div>
            {sections.map(([key, title, fields]) => {
              const source = review.snapshot[key];
              if (!source) return null;
              const entries = Array.isArray(source) ? source : [source];
              if (
                !entries.some((row) =>
                  fields.some(
                    (name) =>
                      typeof row[name] === "string" &&
                      (row[name] as string).trim(),
                  ),
                )
              )
                return null;
              return (
                <section key={key}>
                  <h2>{title}</h2>
                  {entries.map((row, index) => (
                    <div className={styles.entry} key={index}>
                      {fields.map((name) =>
                        field(
                          `${key}${Array.isArray(source) ? `.${index}` : ""}.${name}`,
                          row[name],
                        ),
                      )}
                    </div>
                  ))}
                </section>
              );
            })}
          </article>
          {selection && (
            <aside className={styles.selection} aria-label="选中文字操作">
              <span>{selection.selected}</span>
              <button
                onClick={() => compose({ ...selection, replacement: false })}
              >
                评论
              </button>
              <button
                onClick={() => compose({ ...selection, replacement: true })}
              >
                改写
              </button>
              <button aria-label="取消选择" onClick={() => setSelection(null)}>
                ×
              </button>
            </aside>
          )}
        </>
      )}
      {message && !composer && (
        <p role="status" className={styles.message}>
          {message}
        </p>
      )}
      <dialog
        ref={dialog}
        className={styles.dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setComposer(null);
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h2>
            {composer?.replacement
              ? "改写内容"
              : composer?.parent
                ? "回复评论"
                : "添加评论"}
          </h2>
          <blockquote>{composer?.selected}</blockquote>
          <textarea
            aria-label={composer?.replacement ? "改写内容" : "评论内容"}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={composer?.replacement ? 20000 : 10000}
            disabled={busy}
            rows={6}
            autoFocus
            placeholder={
              composer?.replacement ? "写下修改后的内容" : "写下你的建议"
            }
          />
          {message && <p role="alert">{message}</p>}
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setComposer(null)}
            >
              取消
            </button>
            <button type="submit" disabled={busy || !text.trim()}>
              {busy ? "提交中…" : "提交"}
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
