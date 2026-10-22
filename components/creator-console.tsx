"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "./auth-provider";
import { AuthRequestError } from "@/lib/auth-client";
import {
  creatorRequest,
  uploadTemplate,
  validateTemplateFile,
} from "@/lib/creator-client";
import {
  DOCX_MIME,
  type CreatorTemplate,
  type CreatorWorkspace,
  type TemplateInput,
} from "@/lib/creator-types";

function TemplatePreview({ id, version }: { id: string; version: number }) {
  return (
    <a
      href={`/web-api/auth/creator/templates/${id}/preview/pdf?version=${version}`}
      target="_blank"
      rel="noopener noreferrer"
      className="console-button preview"
    >
      <Icon kind="eye" />
      查看预览
    </a>
  );
}

function Icon({
  kind = "document",
}: {
  kind?:
    | "document"
    | "upload"
    | "plus"
    | "arrow"
    | "refresh"
    | "close"
    | "grid"
    | "book"
    | "check"
    | "clock"
    | "eye";
}) {
  const paths = {
    document:
      "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9m-6-6 6 6h-6V3ZM8 13h8M8 17h5",
    upload: "M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5",
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    refresh:
      "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1",
    close: "m6 6 12 12M6 18 18 6",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    book: "M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z",
    check: "m8 12 3 3 5-6M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z",
    clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths[kind]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const statuses: Record<string, string> = {
  DRAFT: "草稿",
  SUBMITTED: "审核中",
  PUBLISHED: "已上架",
  REJECTED: "需修改",
  UNPUBLISH_REQUESTED: "下架审核中",
  UNPUBLISHED: "已下架",
};
const filters = [
  { id: "ALL", label: "全部模板" },
  { id: "DRAFT", label: "草稿" },
  { id: "SUBMITTED", label: "审核中" },
  { id: "PUBLISHED", label: "已上架" },
  { id: "REJECTED", label: "需修改" },
  { id: "UNPUBLISH_REQUESTED", label: "下架审核中" },
  { id: "UNPUBLISHED", label: "已下架" },
];
function message(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。";
}

export function CreatorConsole() {
  const { user, checking, error, refresh } = useAuth();
  if (!user)
    return (
      <section className="console-gate">
        <span className="console-gate-icon">
          <Icon />
        </span>
        <h1>{checking ? "正在打开控制台…" : "你的模板，从这里出发"}</h1>
        {!checking && (
          <>
            <p>{error || "登录博简，上传并管理你的简历模板。"}</p>
            {error ? (
              <button
                className="console-button primary"
                onClick={() => void refresh()}
              >
                重新连接
              </button>
            ) : (
              <Link
                className="console-button primary"
                href="/login?next=/console"
              >
                登录并进入控制台
                <Icon kind="arrow" />
              </Link>
            )}
          </>
        )}
      </section>
    );
  return <Workspace key={user.id} />;
}

function Workspace() {
  const { refresh } = useAuth();
  const [data, setData] = useState<CreatorWorkspace | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [notice, setNotice] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [busy, setBusy] = useState("");
  const [editor, setEditor] = useState<{ template?: CreatorTemplate } | null>(
    null,
  );
  const loadingRequest = useRef<AbortController | null>(null),
    operation = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    loadingRequest.current?.abort();
    const controller = new AbortController();
    loadingRequest.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await creatorRequest<CreatorWorkspace>(
        "workspace",
        undefined,
        controller.signal,
      );
      if (!controller.signal.aborted) setData(result);
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(message(error));
        if (error instanceof AuthRequestError && error.code === "AUTH_INVALID")
          void refresh();
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [refresh]);
  useEffect(() => {
    void load();
    return () => {
      loadingRequest.current?.abort();
      operation.current?.abort();
    };
  }, [load]);
  async function mutateTemplate(
    template: CreatorTemplate,
    action: "submit" | "unpublish",
  ) {
    if (
      operation.current ||
      loading ||
      (action === "submit" && !data?.verified)
    )
      return;
    if (
      action === "unpublish" &&
      !window.confirm(
        `确认申请下架「${template.name}」？提交后将进入下架审核。`,
      )
    )
      return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(template.id);
    setError("");
    setNotice("");
    try {
      await creatorRequest(
        `templates/${template.id}/${action}`,
        action === "submit" ? { resubmit: template.status === "REJECTED" } : {},
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setNotice(
          action === "unpublish"
            ? `「${template.name}」已申请下架，等待平台审核。`
            : `「${template.name}」已提交审核，通过后将上架。`,
        );
        await load();
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(message(error));
        if (error instanceof AuthRequestError && error.code === "AUTH_INVALID")
          void refresh();
      }
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy("");
    }
  }
  const items = data?.items || [],
    visible = items.filter((t) => filter === "ALL" || t.status === filter);
  const published = items.filter(
    (template) => template.status === "PUBLISHED",
  ).length;
  return (
    <div className="console-shell console-workspace">
      <div className="console-dashboard">
        <aside className="console-left-stack">
          <section
            className="console-panel console-overview-panel"
            aria-label="模板概览"
          >
            <div className="console-panel-heading">
              <h2>作品概览</h2>
              <span className="console-panel-icon">
                <Icon kind="grid" />
              </span>
            </div>
            <div className="console-total">
              <strong>{data ? items.length : "—"}</strong>
              <span>份模板</span>
            </div>
            <p className="console-overview-caption">你的创作，都在这里。</p>
            <div className="console-stat-grid">
              <div>
                <span>已上架</span>
                <strong>{data ? published : "—"}</strong>
              </div>
              <div>
                <span>草稿</span>
                <strong>
                  {data
                    ? items.filter((t) => t.status === "DRAFT").length
                    : "—"}
                </strong>
              </div>
              <div>
                <span>审核中</span>
                <strong>
                  {data
                    ? items.filter((t) => t.status === "SUBMITTED").length
                    : "—"}
                </strong>
              </div>
            </div>
            <button
              className="console-button primary"
              onClick={() => setEditor({})}
              disabled={Boolean(busy)}
            >
              <Icon kind="plus" />
              上传模板
            </button>
            <div className="console-progress-caption">
              <span>上架占比</span>
              <strong>
                {data && items.length
                  ? Math.round((published / items.length) * 100)
                  : 0}
                %
              </strong>
            </div>
            <div className="console-progress" aria-hidden="true">
              <span
                style={{
                  width: `${items.length ? (published / items.length) * 100 : 0}%`,
                }}
              />
            </div>
          </section>
          <section className="console-panel console-publish-panel">
            <div className="console-panel-heading">
              <h2>从草稿到上架</h2>
              <Icon kind="arrow" />
            </div>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <strong>上传源文件</strong>
                  <p>HTML 或 DOCX，最大 8 MB</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>检查预览效果</strong>
                  <p>确认排版与模板字段</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>提交上架审核</strong>
                  <p>审核通过后在 App 发布</p>
                </div>
              </li>
            </ol>
            <Link href="/console/template-guide">
              查看制作要求
              <Icon kind="arrow" />
            </Link>
          </section>
        </aside>
        <div className="console-center">
          {notice && (
            <p className="console-notice" role="status">
              ✓ {notice}
            </p>
          )}
          {error && (
            <div className="console-error" role="alert">
              <p>{error}</p>
              <button
                onClick={() => void load()}
                disabled={loading || Boolean(busy)}
              >
                刷新列表
              </button>
            </div>
          )}
          <section
            className="console-panel console-library"
            aria-labelledby="library-heading"
            aria-busy={loading}
          >
            <div className="console-library-heading">
              <h1 id="library-heading">模板库</h1>
              <span>
                {data ? `${visible.length} / ${items.length} 份` : "正在读取…"}
              </span>
              <button
                className="console-icon-button"
                aria-label="刷新模板列表"
                disabled={loading || Boolean(busy)}
                onClick={() => void load()}
              >
                <Icon kind="refresh" />
              </button>
            </div>
            <div className="console-library-toolbar">
              <div className="console-filters" aria-label="按模板状态筛选">
                {filters.map((tab) => (
                  <button
                    key={tab.id}
                    aria-pressed={filter === tab.id}
                    onClick={() => setFilter(tab.id)}
                  >
                    {tab.label}
                    {data && (
                      <span>
                        {tab.id === "ALL"
                          ? items.length
                          : items.filter((t) => t.status === tab.id).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {loading && !data ? (
              <div className="console-empty" role="status">
                <span className="console-loader" />
                <p>正在读取你的模板…</p>
              </div>
            ) : !data ? (
              <div className="console-empty">
                <Icon />
                <h3>暂时无法读取模板</h3>
                <p>请检查网络后刷新列表。</p>
                <button
                  className="console-button secondary"
                  onClick={() => void load()}
                >
                  重新加载
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="console-empty">
                <span className="console-empty-symbol" aria-hidden="true">
                  <Icon kind="document" />
                </span>
                <h3>
                  {items.length ? "这里暂时还没有模板" : "上传你的第一份模板"}
                </h3>
                <p>
                  {items.length
                    ? "试试其他状态，或上传一份新模板。"
                    : "保存草稿，确认预览，再提交上架审核。"}
                </p>
                <button
                  className="console-button secondary"
                  onClick={() => setEditor({})}
                >
                  <Icon kind="plus" />
                  {items.length ? "上传新模板" : "上传第一份模板"}
                </button>
                <span className="console-file-hint">
                  支持 .html / .docx · 最大 8 MB
                </span>
              </div>
            ) : (
              <>
                <div className="console-table-heading" aria-hidden="true">
                  <span>模板名称</span>
                  <span>状态</span>
                  <span>定价</span>
                  <span>发布日期</span>
                  <span>使用人数</span>
                  <span>操作</span>
                </div>
                <div className="console-template-list">
                  {visible.map((template) => (
                    <article className="console-template" key={template.id}>
                      <div className="console-template-info">
                        <span className="console-file-icon">
                          <Icon kind="document" />
                        </span>
                        <div>
                          <h3>{template.name}</h3>
                          <p>
                            V{template.version} ·{" "}
                            {template.description || "暂无模板介绍"}
                          </p>
                          {template.status === "REJECTED" && (
                            <p className="console-review-reason">
                              审核意见：
                              {template.reviewReason ||
                                "请修改后重新提交审核。"}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`console-status status-${template.status.toLowerCase()}`}
                      >
                        {statuses[template.status] || "状态待确认"}
                      </span>
                      <span className="console-template-price">
                        <span className="console-meta-label">定价</span>
                        {template.pricingType === "FREE"
                          ? "免费"
                          : `${template.pricePoints} 积分`}
                      </span>
                      <div
                        className="console-template-date"
                        aria-label="发布日期"
                      >
                        <span className="console-meta-label">发布日期</span>
                        {template.publishedAt ? (
                          <time
                            dateTime={template.publishedAt}
                            title={new Intl.DateTimeFormat("zh-CN", {
                              dateStyle: "full",
                              timeStyle: "short",
                              timeZone: "Asia/Shanghai",
                            }).format(new Date(template.publishedAt))}
                          >
                            {new Intl.DateTimeFormat("en-CA", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              timeZone: "Asia/Shanghai",
                            }).format(new Date(template.publishedAt))}
                          </time>
                        ) : (
                          <span>
                            {["DRAFT", "SUBMITTED", "REJECTED"].includes(
                              template.status,
                            )
                              ? "未发布"
                              : "—"}
                          </span>
                        )}
                      </div>
                      <div
                        className="console-template-usage"
                        aria-label="使用人数"
                        title="使用此模板创建有效简历的去重用户数"
                      >
                        <span className="console-meta-label">使用人数</span>
                        <span>
                          {template.usageCount === null
                            ? "—"
                            : `${template.usageCount.toLocaleString("zh-CN")} 人`}
                        </span>
                      </div>
                      <div className="console-template-actions">
                        <TemplatePreview
                          id={template.id}
                          version={template.version}
                        />
                        {template.status === "PUBLISHED" && (
                          <button
                            className="console-button quiet"
                            onClick={() =>
                              void mutateTemplate(template, "unpublish")
                            }
                            disabled={Boolean(busy) || loading}
                          >
                            {busy === template.id ? "正在申请…" : "申请下架"}
                          </button>
                        )}
                        {(template.status === "DRAFT" ||
                          template.status === "REJECTED") && (
                          <>
                            <button
                              className="console-button quiet"
                              onClick={() => setEditor({ template })}
                              disabled={Boolean(busy)}
                            >
                              编辑
                            </button>
                            <button
                              className="console-button secondary"
                              onClick={() =>
                                void mutateTemplate(template, "submit")
                              }
                              disabled={
                                Boolean(busy) || loading || !data.verified
                              }
                              title={
                                !data.verified
                                  ? "请先在博简 App 完成实名认证"
                                  : undefined
                              }
                            >
                              {busy === template.id
                                ? "正在检查并提交…"
                                : template.status === "REJECTED"
                                  ? "重新提交审核"
                                  : "提交审核"}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
        <aside className="console-right-stack">
          {data && (
            <section
              className={`console-panel console-verification ${data.verified ? "verified" : ""}`}
            >
              <div className="console-panel-heading">
                <h2>创作者状态</h2>
                <Icon kind="check" />
              </div>
              <strong className="console-identity-status">
                <i />
                {data.verified ? "已完成实名认证" : "待完成实名认证"}
              </strong>
              <p>
                {data.verified
                  ? "已完成实名认证，可以提交模板上架审核。"
                  : "上架前，请先在博简 App 完成实名认证。现在也可以上传并保存草稿。"}
              </p>
              <button
                onClick={() => void load()}
                disabled={loading || Boolean(busy)}
              >
                <Icon kind="refresh" />
                {loading ? "更新中…" : "刷新状态"}
              </button>
            </section>
          )}
          <section className="console-panel console-todos">
            <div className="console-panel-heading">
              <h2>工作提醒</h2>
              <Icon kind="clock" />
            </div>
            {[
              { id: "DRAFT", label: "待完善草稿" },
              { id: "REJECTED", label: "需要修改" },
              { id: "SUBMITTED", label: "等待审核" },
            ].map((todo) => (
              <button
                key={todo.id}
                onClick={() => setFilter(todo.id)}
                aria-label={`查看${todo.label}`}
              >
                <span
                  className={`console-todo-dot status-${todo.id.toLowerCase()}`}
                />
                <span>{todo.label}</span>
                <strong>
                  {data
                    ? items.filter((t) => t.status === todo.id).length
                    : "—"}
                </strong>
                <Icon kind="arrow" />
              </button>
            ))}
          </section>
        </aside>
      </div>
      {editor && (
        <TemplateEditor
          template={editor.template}
          onClose={() => setEditor(null)}
          onSaved={(name) => {
            setEditor(null);
            setFilter("ALL");
            setNotice(`「${name}」已保存，可在列表中提交审核。`);
            void load();
          }}
          onUnauthorized={() => void refresh()}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
  onUnauthorized,
}: {
  template?: CreatorTemplate;
  onClose: () => void;
  onSaved: (name: string) => void;
  onUnauthorized: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    controller = useRef<AbortController | null>(null),
    uploaded = useRef<{ file: File; id: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(template?.name || ""),
    [description, setDescription] = useState(template?.description || "");
  const [pricing, setPricing] = useState<"FREE" | "PAID">(
      template?.pricingType || "FREE",
    ),
    [points, setPoints] = useState(
      template?.pricePoints ? String(template.pricePoints) : "",
    );
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [stage, setStage] = useState(""),
    [dragging, setDragging] = useState(false);
  useEffect(() => {
    const element = dialog.current,
      previous = document.activeElement;
    element?.showModal();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      controller.current?.abort();
      element?.close();
      document.body.style.overflow = originalOverflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  function selectFile(selected?: File) {
    if (!selected || stage) return;
    const error = validateTemplateFile(selected);
    setError(error);
    if (error) return;
    setFile(selected);
    uploaded.current = null;
    if (!name)
      setName(selected.name.replace(/\.(docx|html|htm)$/i, "").slice(0, 160));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controller.current) return;
    if (!name.trim()) return setError("请输入模板名称。");
    if (!template && !file) return setError("请先上传一份 DOCX 模板。");
    if (
      pricing === "PAID" &&
      (!/^\d+$/.test(points) ||
        !Number.isSafeInteger(Number(points)) ||
        Number(points) <= 0)
    )
      return setError("请输入大于 0 的整数积分。");
    const current = new AbortController();
    controller.current = current;
    setError("");
    try {
      let source: number | undefined;
      if (file) {
        if (uploaded.current?.file === file) source = uploaded.current.id;
        else {
          source = await uploadTemplate(file, current.signal, setStage);
          uploaded.current = { file, id: source };
        }
      }
      setStage(file ? "正在转换并保存模板，请稍候…" : "正在保存模板…");
      const body: TemplateInput = {
        name: name.trim(),
        description: description.trim(),
        pricing_type: pricing,
        price_points: pricing === "FREE" ? 0 : Number(points),
        ...(source ? { source_file_id: source } : {}),
      };
      await creatorRequest(
        template ? `templates/${template.id}` : "templates",
        body,
        current.signal,
        template ? "PATCH" : "POST",
      );
      if (!current.signal.aborted) onSaved(name.trim());
    } catch (error) {
      if (!current.signal.aborted) {
        setError(message(error));
        if (error instanceof AuthRequestError && error.code === "AUTH_INVALID")
          onUnauthorized();
      }
    } finally {
      controller.current = null;
      if (!current.signal.aborted) setStage("");
    }
  }
  return (
    <dialog
      ref={dialog}
      className="template-editor"
      aria-labelledby="editor-title"
      aria-describedby="editor-description"
      onCancel={(e) => {
        e.preventDefault();
        if (!stage) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !stage) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <form onSubmit={(e) => void save(e)}>
        <div className="editor-heading">
          <div>
            <span className="console-eyebrow">你的下一份创作</span>
            <h2 id="editor-title">{template ? "编辑模板" : "上传简历模板"}</h2>
            <p id="editor-description">
              {template
                ? "完善模板资料，或替换 DOCX 源文件。"
                : "先保存为草稿，确认后再提交上架审核。"}
            </p>
          </div>
          <button
            type="button"
            className="console-icon-button"
            aria-label="关闭上传窗口"
            disabled={Boolean(stage)}
            onClick={onClose}
          >
            <Icon kind="close" />
          </button>
        </div>
        <fieldset disabled={Boolean(stage)}>
          <div
            className={`editor-dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!stage) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length !== 1)
                setError("每次请选择一个 HTML 或 DOCX 文件。");
              else selectFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={fileInput}
              id="template-file"
              type="file"
              accept={`.html,.htm,text/html,.docx,${DOCX_MIME}`}
              className="sr-only"
              aria-label={template ? "替换模板文件（可选）" : "选择模板文件"}
              onChange={(e) => {
                selectFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Icon kind={file ? "document" : "upload"} />
            <label htmlFor="template-file">
              {file
                ? file.name
                : template
                  ? "点击替换文件，或拖放到这里"
                  : "点击选择文件，或拖放到这里"}
            </label>
            <p>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB · 点击文件名重新选择`
                : template
                  ? "可保留原文件 · 支持 HTML / DOCX，最大 8 MB"
                  : "支持 HTML / DOCX 格式 · 最大 8 MB"}
            </p>
          </div>
          <label className="editor-field" htmlFor="template-name">
            <span>
              模板名称<em>必填</em>
            </span>
            <input
              id="template-name"
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：留白 · 简约单栏简历"
            />
          </label>
          <label className="editor-field" htmlFor="template-description">
            <span>
              模板介绍<em>选填</em>
            </span>
            <textarea
              id="template-description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="介绍适合的岗位、排版特点，或使用建议"
            />
          </label>
          <div className="editor-pricing">
            <span>模板定价</span>
            <div className="editor-pricing-options">
              <label>
                <input
                  type="radio"
                  name="pricing"
                  value="FREE"
                  checked={pricing === "FREE"}
                  onChange={() => setPricing("FREE")}
                />
                <span>
                  免费分享<small>所有人都可以免费使用</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="pricing"
                  value="PAID"
                  checked={pricing === "PAID"}
                  onChange={() => setPricing("PAID")}
                />
                <span>
                  积分解锁<small>设置使用所需的积分</small>
                </span>
              </label>
            </div>
            {pricing === "PAID" && (
              <label className="editor-points" htmlFor="template-points">
                <input
                  id="template-points"
                  type="number"
                  min="1"
                  step="1"
                  required
                  inputMode="numeric"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="请输入积分"
                />
                <span>积分</span>
              </label>
            )}
          </div>
        </fieldset>
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        {stage && (
          <p className="editor-progress" role="status">
            <span className="console-loader" />
            {stage}
          </p>
        )}
        <div className="editor-footer">
          <p>
            请确保模板为你的原创，或已获得发布授权。
            <Link
              href="/console/template-guide"
              target="_blank"
              rel="noopener noreferrer"
            >
              在新标签页查看完整规则 ↗
            </Link>
          </p>
          <div>
            <button
              type="button"
              className="console-button quiet"
              onClick={onClose}
              disabled={Boolean(stage)}
            >
              取消
            </button>
            <button
              className="console-button primary"
              type="submit"
              disabled={Boolean(stage)}
            >
              {stage ? "正在处理…" : template ? "保存修改" : "保存草稿"}
              <Icon kind="arrow" />
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
