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
  description: "博简 DOCX 简历模板完整字段表、条件显示、照片设置与排版限制。",
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
        <header className="guide-heading">
          <span className="console-eyebrow">创作者指南 · DOCX</span>
          <h1>
            让设计，正确地被填充<span className="console-heading-dot">.</span>
          </h1>
          <p>从第一个字段到整份简历，这里是制作博简模板需要的完整规则。</p>
          <div className="guide-badges">
            <span>DOCX 格式</span>
            <span>最大 8 MB</span>
            <span>原创或已获授权</span>
          </div>
        </header>
        <div className="guide-layout">
          <nav className="guide-navigation" aria-label="模板规则目录">
            <span>本页内容</span>
            {chapters.map(([id, title], i) => (
              <a href={`#${id}`} key={id}>
                <span>0{i + 1}</span>
                {title}
              </a>
            ))}
            <Link className="guide-return" href="/console">
              ← 返回控制台
            </Link>
          </nav>
          <div className="guide-content">
            <section
              className="guide-section"
              id="fields"
              aria-labelledby="fields-title"
            >
              <span className="guide-section-index">01 / 字段</span>
              <h2 id="fields-title">完整字段表</h2>
              <p>
                把占位符直接输入 Word
                正文。使用英文半角双花括号和小写字段名，例如{" "}
                <code>{"{{name}}"}</code>。只填写需要展示的字段，无须全部使用。
              </p>
              <FieldTable
                label="基础文字字段表"
                headings={["占位符", "含义", "内容示例 / 说明"]}
                rows={basicTemplateFields}
              />
              <div className="guide-note">
                <strong>样式与空值</strong>
                <p>
                  替换后的文字沿用字段起始位置的字体和样式。字段即使被 Word
                  拆成多个文字片段，也能识别；请保持整个占位符样式一致。字段为空时替换为空字符串；“电话：”等固定标签和分隔符需要配合条件显示。
                </p>
              </div>
              <Example title="基础信息示例">{guideExamples.basic}</Example>
              <p>
                照片使用 <code>{"{{photo}}"}</code>
                ，需放在图片的替代文字“说明”里，具体见
                <a href="#photos">照片设置</a>，不能作为正文中的文字字段使用。
              </p>
            </section>
            <section
              className="guide-section"
              id="loops"
              aria-labelledby="loops-title"
            >
              <span className="guide-section-index">02 / 重复内容</span>
              <h2 id="loops-title">经历与循环</h2>
              <p>
                一段经历只需要排版一次，系统会按用户填写的条目重复生成。以下是全部
                5 个可用集合：
              </p>
              <FieldTable
                label="可用经历集合表"
                headings={["集合名称", "对应栏目", "内容说明"]}
                rows={templateCollections}
                tokens={false}
              />
              <h3>每条经历可以使用的字段</h3>
              <p>
                以下条目字段需放在相应循环内。实际未填写的内容为空；技能使用{" "}
                <code>{"{{name}}"}</code> 和 <code>{"{{detail}}"}</code>
                ，其余经历通常使用 <code>{"{{title}}"}</code> 等字段。
              </p>
              <FieldTable
                label="循环条目字段表"
                headings={["占位符", "含义", "使用说明"]}
                rows={templateItemFields}
              />
              <div className="guide-note">
                <strong>姓名与技能名称的区别</strong>
                <p>
                  循环外的 <code>{"{{name}}"}</code>{" "}
                  是本人姓名；循环内同名字段取当前条目的内容。请把本人姓名放在循环外，避免在经历循环内重复使用。
                </p>
              </div>
              <h3>循环排版规则</h3>
              <ul>
                <li>
                  起始标记 <code>{"{{#work_experiences}}"}</code> 和结束标记{" "}
                  <code>{"{{/work_experiences}}"}</code>{" "}
                  必须各自独占一个段落。请按 Enter 换段，不能只用 Shift + Enter
                  换行。
                </li>
                <li>
                  两个标记必须在同一父容器中：都在正文，或都在同一个表格单元格。可以把一张完整表格放在两个正文标记之间。
                </li>
                <li>
                  不支持跨单元格循环或嵌套循环；每个集合最多 100
                  条，全部为空的经历条目会跳过。
                </li>
                <li>
                  集合为空时循环区域会移除。循环外的“工作经历”等标题仍会保留，要一起隐藏标题，请再用条件块包住栏目。
                </li>
              </ul>
              <Example title="工作经历：有内容时显示整个栏目">
                {guideExamples.experience}
              </Example>
              <Example title="专业技能：使用当前技能的名称与描述">
                {guideExamples.skills}
              </Example>
            </section>
            <section
              className="guide-section"
              id="conditions"
              aria-labelledby="conditions-title"
            >
              <span className="guide-section-index">03 / 按内容显示</span>
              <h2 id="conditions-title">条件显示</h2>
              <p>
                使用 <code>{"{{?字段}}"}</code> 开始，以{" "}
                <code>{"{{/if}}"}</code>{" "}
                结束。有内容才显示中间的文字、段落或表格。条件可使用基础字段、5
                个经历集合、<code>photo</code>，以及循环内的当前条目字段。
              </p>
              <h3>行内条件</h3>
              <p>
                开始和结束标记必须在同一个段落内。适合控制电话标签、分隔符，以及副标题等可选内容。
              </p>
              <Example title="没有电话时，连同“电话：”一起隐藏">
                {guideExamples.inline}
              </Example>
              <h3>整块条件</h3>
              <p>
                起止标记各自独占一个段落，并位于同一父容器内。把栏目标题与循环一起包住，可以在没有内容时隐藏整个栏目。
              </p>
              <Example title="没有证书时，隐藏标题与全部条目">
                {guideExamples.block}
              </Example>
              <h3>任意一个字段有值时显示</h3>
              <p>
                在条件中用 <code>|</code>{" "}
                连接字段，表示“任意一个有内容”。只支持这种“或”关系；不支持{" "}
                <code>&amp;&amp;</code>、<code>!</code>、比较运算或{" "}
                <code>else</code> 分支。
              </p>
              <Example title="求职信息全部未填写时，隐藏整个栏目">
                {guideExamples.any}
              </Example>
              <div className="guide-note">
                <strong>哪些内容算空？</strong>
                <p>
                  空字符串、只有空格的文字、空列表和全部为空的经历列表都算空。条件可以嵌套，也可以在循环内使用；循环本身不能嵌套。被隐藏的分支仍然会检查字段拼写。
                </p>
              </div>
              <p>
                仅含空字段的段落会移除，原本用于排版的空段落会保留。系统不会根据栏目标题自动猜测隐藏规则；旧模板需要加入条件标记后重新上传。
              </p>
            </section>
            <section
              className="guide-section"
              id="photos"
              aria-labelledby="photos-title"
            >
              <span className="guide-section-index">04 / 简历照片</span>
              <h2 id="photos-title">照片设置</h2>
              <ol>
                <li>
                  在 Word 中插入一张<strong>嵌入文档的占位图片</strong>
                  ，先设置好位置、宽高和环绕方式。
                </li>
                <li>
                  选中图片，打开“编辑替代文字”或“设置图片格式 →
                  替代文字”。不同软件的入口名称可能略有差异。
                </li>
                <li>
                  在替代文字的<strong>说明 / 描述</strong>中，只填写{" "}
                  <code>{"{{photo}}"}</code>。不要填在图片标题、文件名或正文中。
                </li>
                <li>
                  保存为
                  DOCX。用户填入简历照片后，系统会替换占位图片；没有照片时会移除该图片。
                </li>
              </ol>
              <div className="guide-photo-setting">
                <span>替代文字 → 说明 / 描述</span>
                <code>{"{{photo}}"}</code>
                <p>请完整填写，勿在标记前后添加说明文字。</p>
              </div>
              <h3>照片如何适配？</h3>
              <p>
                保留原占位框的位置、尺寸与布局，照片等比缩放并居中，比例不同的部分使用白色留边，不拉伸人像。原占位图的裁剪值会重置。建议使用接近证件照比例的矩形占位框，并先检查导出效果。
              </p>
              <ul>
                <li>
                  图片资源必须嵌入 DOCX，不支持外链图片；也不要仅用文字{" "}
                  <code>{"{{photo}}"}</code> 代替图片。
                </li>
                <li>
                  没有照片时只移除图片，不会自动压缩固定宽高的表格单元格。若需连同照片区域标题一起隐藏，可用独占段落的{" "}
                  <code>{"{{?photo}}"}</code> 与 <code>{"{{/if}}"}</code>{" "}
                  包住该区域。
                </li>
                <li>
                  替换照片支持 PNG / JPEG 解码，总像素不超过 2500
                  万；这指用户的简历照片，不要求作者把个人照片上传进模板。
                </li>
              </ul>
            </section>
            <section
              className="guide-section"
              id="layout"
              aria-labelledby="layout-title"
            >
              <span className="guide-section-index">05 / 排版与交付</span>
              <h2 id="layout-title">排版与文件限制</h2>
              <h3>必须遵守</h3>
              <ul>
                <li>
                  源文件仅接受 <strong>.docx</strong>，最大{" "}
                  <strong>8 MB（8 × 1024 × 1024 字节）</strong>。不接受
                  .doc、.docm、PDF 或 HTML。
                </li>
                <li>
                  不支持宏、嵌入的 OLE
                  对象和外链图片等资源；普通文字超链接可以保留。
                </li>
                <li>
                  字段名使用本页清单，标记必须成对闭合。不要使用中文全角花括号、自定义字段、跨段落的行内条件或跨容器循环。
                </li>
                <li>
                  文档需至少包含一个可识别的模板字段。内部文件条目不超过 1000
                  个，解压后的总大小不超过 50 MB；不要嵌入过大的图片或无关附件。
                </li>
                <li>
                  请使用虚构示例信息，并确保对模板排版、图片和其他素材拥有原创或发布授权。
                </li>
              </ul>
              <h3>建议的排版方式</h3>
              <ul>
                <li>
                  建议使用 A4
                  纵向页面，用段落、表格、明确的页边距和段间距组织内容。A4
                  是兼容性建议，不是文件格式校验条件。
                </li>
                <li>
                  为长姓名、多段描述、多条经历与分页留出空间，避免靠连续空格对齐，也不要依赖固定高度的文本框容纳长度变化的内容。
                </li>
                <li>
                  尽量使用常见中文字体。转换环境缺少的字体会被替换，行宽、换行和分页可能变化；软件私有特效与复杂浮动对象也可能存在差异。
                </li>
                <li>
                  文字字段支持正文、页眉和页脚中的段落。循环或整块条件仍需在同一容器内闭合，不能从正文跨到页眉、页脚或另一个单元格。
                </li>
              </ul>
              <div className="guide-note">
                <strong>上传前自查</strong>
                <p>
                  分别检查“信息完整”“可选内容全空”“多条经历和长描述”“有照片 /
                  无照片”的效果。字段填充遇到未知字段、未闭合标记或不支持的结构会报错。草稿保存完成只代表文档转换成功；模板内容、可用性与版权仍须审核。
                </p>
              </div>
              <Link className="console-button primary" href="/console">
                返回控制台，上传模板 <span aria-hidden="true">↗</span>
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
