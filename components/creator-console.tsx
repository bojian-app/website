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

function Icon({
  kind = "document",
}: {
  kind?: "document" | "upload" | "plus" | "arrow" | "refresh" | "close";
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
  async function submit(template: CreatorTemplate) {
    if (operation.current || loading || !data?.verified) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(template.id);
    setError("");
    setNotice("");
    try {
      await creatorRequest(
        `templates/${template.id}/submit`,
        { resubmit: template.status === "REJECTED" },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setNotice(`「${template.name}」已提交审核，通过后将上架。`);
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
  return (
    <div className="console-shell">
      <div className="console-breadcrumb">
        <Link href="/">博简</Link>
        <span>/</span>
        <span>创作者控制台</span>
      </div>
      <header className="console-heading">
        <div>
          <span className="console-eyebrow">创作 · 分享</span>
          <h1>
            我的简历模板<span className="console-heading-dot">.</span>
          </h1>
          <p>把你的设计，带给更多正在出发的人。</p>
        </div>
        <button
          className="console-button primary"
          onClick={() => setEditor({})}
          disabled={Boolean(busy)}
        >
          <Icon kind="plus" />
          上传模板
        </button>
      </header>
      <div className="console-overview" aria-label="模板概览">
        {[
          {
            label: "全部模板",
            value: items.length,
            caption: "每一份创作，都在这里",
          },
          {
            label: "已上架",
            value: items.filter((t) => t.status === "PUBLISHED").length,
            caption: "已经与大家见面",
          },
          {
            label: "审核中",
            value: items.filter((t) => t.status === "SUBMITTED").length,
            caption: "好作品，值得期待",
          },
        ].map((stat, i) => (
          <div className="console-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{data ? String(stat.value).padStart(2, "0") : "—"}</strong>
            <p>{stat.caption}</p>
            <span className="console-stat-index" aria-hidden="true">
              0{i + 1}
            </span>
          </div>
        ))}
      </div>
      {data && (
        <div
          className={`console-verification ${data.verified ? "verified" : ""}`}
        >
          <span className="console-verification-mark" aria-hidden="true">
            {data.verified ? "✓" : "i"}
          </span>
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
        </div>
      )}
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
        className="console-library"
        aria-labelledby="library-heading"
        aria-busy={loading}
      >
        <h2 className="sr-only" id="library-heading">
          模板管理
        </h2>
        <div className="console-library-toolbar">
          <div className="console-filters" aria-label="按模板状态筛选">
            {filters.map((tab) => (
              <button
                key={tab.id}
                aria-pressed={filter === tab.id}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
                {tab.id === "ALL" && data && <span>{items.length}</span>}
              </button>
            ))}
          </div>
          <button
            className="console-icon-button"
            aria-label="刷新模板列表"
            disabled={loading || Boolean(busy)}
            onClick={() => void load()}
          >
            <Icon kind="refresh" />
          </button>
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
            <div className="console-empty-art" aria-hidden="true">
              <div className="console-paper back" />
              <div className="console-paper">
                <span />
                <i />
                <i />
                <i />
                <b />
                <i />
                <i />
              </div>
              <span className="console-paper-plus">+</span>
            </div>
            <h3>
              {items.length ? "这里暂时还没有模板" : "第一份好模板，从你开始"}
            </h3>
            <p>
              {items.length
                ? "试试其他状态，或上传一份新模板。"
                : "上传一份 DOCX 简历模板，保存草稿，再提交上架审核。"}
            </p>
            <button
              className="console-button secondary"
              onClick={() => setEditor({})}
            >
              <Icon kind="upload" />
              {items.length ? "上传新模板" : "上传第一份模板"}
            </button>
            <span className="console-file-hint">支持 .docx · 最大 8 MB</span>
          </div>
        ) : (
          <div className="console-template-list">
            {visible.map((template) => (
              <article className="console-template" key={template.id}>
                <span className="console-template-icon">
                  <Icon />
                  <span>DOCX</span>
                </span>
                <div className="console-template-info">
                  <div>
                    <h3>{template.name}</h3>
                    <span
                      className={`console-status status-${template.status.toLowerCase()}`}
                    >
                      {statuses[template.status] || "状态待确认"}
                    </span>
                  </div>
                  <p>{template.description || "暂未添加模板介绍"}</p>
                  <span className="console-template-price">
                    {template.pricingType === "FREE"
                      ? "免费模板"
                      : `${template.pricePoints} 积分`}
                  </span>
                  {template.status === "REJECTED" && (
                    <p className="console-review-reason">
                      审核意见：
                      {template.reviewReason || "请修改后重新提交审核。"}
                    </p>
                  )}
                </div>
                {(template.status === "DRAFT" ||
                  template.status === "REJECTED") && (
                  <div className="console-template-actions">
                    <button
                      className="console-button quiet"
                      onClick={() => setEditor({ template })}
                      disabled={Boolean(busy)}
                    >
                      编辑
                    </button>
                    <button
                      className="console-button secondary"
                      onClick={() => void submit(template)}
                      disabled={Boolean(busy) || loading || !data.verified}
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
                      <Icon kind="arrow" />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="console-library-footer">
          <span>仅展示你创建的模板</span>
          <span>审核通过后，将在博简 App 上架</span>
        </div>
      </section>
      <aside className="console-help">
        <span>
          <Icon />
          准备上传？
        </span>
        <p>
          在 Word 中完成排版，使用 {"{{name}}"}、{"{{phone}}"}{" "}
          等字段作为内容占位符。请使用示例信息，勿上传真实个人简历。
        </p>
        <Link className="console-guide-link" href="/console/template-guide">
          查看完整模板制作规则<span aria-hidden="true">↗</span>
        </Link>
      </aside>
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
    if (!name) setName(selected.name.replace(/\.docx$/i, "").slice(0, 160));
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
                setError("每次请选择一个 DOCX 文件。");
              else selectFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={fileInput}
              id="template-file"
              type="file"
              accept={`.docx,${DOCX_MIME}`}
              className="sr-only"
              aria-label={
                template ? "替换 DOCX 文件（可选）" : "选择 DOCX 文件"
              }
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
                  ? "可保留原文件 · 仅支持 DOCX，最大 8 MB"
                  : "仅支持 DOCX 格式 · 最大 8 MB"}
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
