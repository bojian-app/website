import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { templateGuideMarkdown } from "@/lib/template-guide-content";

export const metadata: Metadata = {
  title: "模板制作规则",
  description:
    "博简 V2 HTML 简历模板完整制作规范、字段、模块排序、富文本和导出规则。",
  robots: { index: false, follow: false },
};

// Render only the maintained documentation syntax; HTML examples remain text.
function inline(text: string): ReactNode {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("`") ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
}
function blocks(source: string): ReactNode[] {
  const lines = source.split("\n"),
    result: ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```"))
        code.push(lines[i++]);
      i++;
      result.push(
        <figure className="guide-example" key={i}>
          <pre>
            <code>{code.join("\n")}</code>
          </pre>
        </figure>,
      );
      continue;
    }
    if (line.startsWith("### ")) {
      result.push(<h3 key={i}>{inline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const row = lines[i++];
        if (/^\|[\s|:-]+$/.test(row)) continue;
        rows.push(
          row
            .slice(1, -1)
            .split("|")
            .map((cell) => cell.trim()),
        );
      }
      result.push(
        <div
          className="guide-table-scroll"
          role="region"
          aria-label={rows[0]?.join("、")}
          tabIndex={0}
          key={i}
        >
          <table>
            <thead>
              <tr>
                {rows[0]?.map((cell, j) => (
                  <th key={j} scope="col">
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td key={k}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d/.test(line),
        items: string[] = [];
      while (i < lines.length && (ordered ? /^\d+\. / : /^- /).test(lines[i]))
        items.push(lines[i++].replace(/^(?:- |\d+\. )/, ""));
      const children = items.map((item, j) => <li key={j}>{inline(item)}</li>);
      result.push(
        ordered ? <ol key={i}>{children}</ol> : <ul key={i}>{children}</ul>,
      );
      continue;
    }
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(```|### |\||- |\d+\. )/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    result.push(<p key={i}>{inline(paragraph.join(" "))}</p>);
  }
  return result;
}
const chapters = templateGuideMarkdown
  .split(/^## /m)
  .slice(1)
  .map((chapter, index) => {
    const split = chapter.indexOf("\n");
    return {
      id: `chapter-${index + 1}`,
      title: chapter.slice(0, split),
      body: chapter.slice(split + 1),
    };
  });
export default function TemplateGuidePage() {
  return (
    <main id="main" className="console-page template-guide-page">
      <div className="console-shell">
        <div className="console-breadcrumb">
          <Link href="/console">控制台</Link>
          <span>/</span>
          <span>模板制作规则</span>
        </div>
        <header className="guide-heading">
          <h1>模板制作规则</h1>
          <p>
            V2 · 仅支持 HTML / HTM 源文件，最大 8
            MB。完整支持模块排序、富文本与连续正文导出。
          </p>
          <p>
            <a href="/templates/standard-v2.html" download>
              下载 HTML 示例模板
            </a>
            　
            <a href="/template-guide-v2.md" download>
              下载完整 Markdown 规范
            </a>
          </p>
        </header>
        <div className="guide-layout">
          <nav className="guide-navigation" aria-label="模板规则目录">
            {chapters.map((chapter) => (
              <a key={chapter.id} href={`#${chapter.id}`}>
                {chapter.title}
              </a>
            ))}
          </nav>
          <div className="guide-content">
            {chapters.map((chapter) => (
              <section
                key={chapter.id}
                className="guide-section"
                id={chapter.id}
              >
                <h2>{chapter.title}</h2>
                {blocks(chapter.body)}
              </section>
            ))}
            <Link href="/console">返回控制台上传模板 ↗</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
