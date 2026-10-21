import type { Metadata } from "next";
import Link from "next/link";
import {
  basicTemplateFields,
  templateCollections,
  templateItemFields,
  guideExamples,
} from "@/lib/template-guide";

export const metadata: Metadata = {
  title: "模板制作规则",
  description: "博简 HTML 与 DOCX 简历模板字段、循环、条件和审核规则。",
  robots: { index: false, follow: false },
};
const chapters = [
  ["fields", "完整字段表"],
  ["loops", "经历与循环"],
  ["conditions", "条件显示"],
  ["photos", "照片设置"],
  ["layout", "排版与文件限制"],
] as const;
function FieldTable({
  label,
  headings,
  rows,
  tokens = true,
}: {
  label: string;
  headings: readonly string[];
  rows: readonly (readonly string[])[];
  tokens?: boolean;
}) {
  return (
    <div
      className="guide-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th scope="col" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th scope="row" key={i}>
                    <code>{tokens ? `{{${cell}}}` : cell}</code>
                  </th>
                ) : (
                  <td key={i}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Example({ title, children }: { title: string; children: string }) {
  return (
    <figure className="guide-example">
      <figcaption>{title}</figcaption>
      <pre>
        <code>{children}</code>
      </pre>
    </figure>
  );
}
export default function TemplateGuidePage() {
  return (
    <main id="main" className="console-page template-guide-page">
      <div className="console-shell">
        <div className="console-breadcrumb">
          <Link href="/console">控制台</Link>
          <span>/</span>
          <span>模板制作规则</span>
        </div>
        <header className="guide-hero">
          <h1>模板制作规则</h1>
          <p>
            支持 HTML 与 DOCX 源文件，使用与博简 App 一致的字段填充与分页规则。
          </p>
        </header>
        <div className="guide-layout">
          <nav className="guide-navigation" aria-label="模板规则目录">
            {chapters.map(([id, title]) => (
              <a href={"#" + id} key={id}>
                {title}
              </a>
            ))}
          </nav>
          <div className="guide-content">
            <section className="guide-section" id="fields">
              <h2>完整字段表</h2>
              <p>
                推荐上传自包含 HTML：CSS 写在 style
                标签中，不依赖外部脚本、字体或图片。DOCX 会转换为
                HTML，复杂浮动对象可能改变排版，提交前务必查看实际预览。
              </p>
              <FieldTable
                label="基本字段"
                headings={["字段", "含义", "说明"]}
                rows={basicTemplateFields}
              />
              <Example title="基本信息">{guideExamples.basic}</Example>
            </section>
            <section className="guide-section" id="loops">
              <h2>经历与循环</h2>
              <FieldTable
                label="经历集合"
                headings={["集合", "栏目", "内容"]}
                rows={templateCollections}
              />
              <FieldTable
                label="循环条目字段"
                headings={["字段", "含义", "说明"]}
                rows={templateItemFields}
              />
              <p>
                循环标记各占一个独立元素，开始与结束必须是同一父容器下的兄弟元素。DOCX
                中使用独立段落。不要跨单元格或嵌套循环；经历描述放在 p 元素内。
              </p>
              <p>
                循环外的 name 是本人姓名，skills 循环内的 name
                是技能名称。空集合不生成条目，循环外的栏目标题仍然保留。
              </p>
              <Example title="工作经历">{guideExamples.experience}</Example>
              <Example title="技能">{guideExamples.skills}</Example>
            </section>
            <section className="guide-section" id="conditions">
              <h2>条件显示</h2>
              <p>
                使用 <code>{"{{#if phone}}"}</code> 开始，以{" "}
                <code>{"{{/if}}"}</code>{" "}
                结束。条件中的文字或集合有内容时显示，空数组和空白条目视为无内容。行内条件必须在同一段落内；整块条件的起止元素必须互为兄弟节点。
              </p>
              <Example title="行内条件">{guideExamples.inline}</Example>
              <Example title="整块条件">{guideExamples.block}</Example>
              <p>
                可使用 {"{{#if phone|email}}"} 表示任一字段有内容。已有 DOCX
                的问号条件同样兼容；不支持比较运算和 else。
              </p>
            </section>
            <section className="guide-section" id="photos">
              <h2>照片设置</h2>
              <p>
                HTML 可用独立段落 <code>{"<p>{{photo}}</p>"}</code>{" "}
                插入简历照片，或将嵌入图片的 alt 设置为{" "}
                <code>{"{{photo}}"}</code>。用户未上传照片时占位图片会移除。
              </p>
              <p>
                图片必须内嵌为 data
                地址，不能使用本地路径或远程图片链接。无需照片时可完全省略。DOCX
                图片经转换后的尺寸和位置以实际预览为准。
              </p>
            </section>
            <section className="guide-section" id="layout">
              <h2>排版与文件限制</h2>
              <ul>
                <li>
                  接受 .html、.htm、.docx，最大 8
                  MB。至少包含一个支持的模板字段。
                </li>
                <li>
                  推荐 A4 单栏。HTML 使用 @page
                  指定四边页边距，为多条经历和长描述留出自然分页空间。
                </li>
                <li>
                  使用常见中文字体；避免固定高度正文、复杂浮动、过宽表格和不可拆分的大块内容。
                </li>
                <li>
                  脚本和交互元素会被移除；外部资源不会加载。简历文字、图片和排版应具有使用授权。
                </li>
              </ul>
              <p>
                保存草稿只代表源文件转换成功。提交时会实际填充示例内容、分页并生成
                PDF；管理后台只允许检查与预览均通过的当前版本发布。字段错误、未闭合标记、图片不可用或渲染失败时，需修改后重新上传。
              </p>
              <Link href="/console">返回控制台上传模板 ↗</Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
