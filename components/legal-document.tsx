import documents from "../app/legal-documents.json";

// 文本由 app/tool/export_legal_documents.dart 从 App 内置协议导出，保证官网与 App 一致。
type Block =
  | { type: "paragraph"; text: string; emphasized: boolean }
  | { type: "subheading"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

type LegalDocumentData = {
  title: string;
  metadata: string[];
  introduction: Block[];
  sections: { id: string; title: string; blocks: Block[] }[];
};

function renderBlock(block: Block, key: number) {
  switch (block.type) {
    case "subheading":
      return <h3 key={key}>{block.text}</h3>;
    case "table":
      return (
        <div className="legal-table" key={key}>
          <table>
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return (
        <p key={key}>{block.emphasized ? <strong>{block.text}</strong> : block.text}</p>
      );
  }
}

export function LegalDocument({
  kind,
  eyebrow,
}: {
  kind: "terms" | "privacy";
  eyebrow: string;
}) {
  const document = documents[kind] as LegalDocumentData;
  return (
    <main id="main" className="legal-page">
      <header className="legal-hero">
        <p className="eyebrow">
          <span /> {eyebrow}
        </p>
        <h1>{document.title}</h1>
        <p>{document.metadata.join("　")}</p>
      </header>
      <article className="legal-content">
        <div className="lead">{document.introduction.map(renderBlock)}</div>
        {document.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.title}</h2>
            {section.blocks.map(renderBlock)}
          </section>
        ))}
      </article>
    </main>
  );
}
