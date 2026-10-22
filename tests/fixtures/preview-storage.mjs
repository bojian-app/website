import assert from "node:assert/strict";

// Loaded only in the isolated test website process. Simulate storage that
// forces downloads, without sending any test requests to an external host.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== "https://assets.example.test")
    return originalFetch(input, options);
  const headers = new Headers(options?.headers);
  assert.equal(headers.get("cookie"), null);
  assert.equal(headers.get("authorization"), null);
  assert.equal(options.credentials, "omit");
  assert.equal(options.redirect, "error");
  if (url.searchParams.has("unavailable"))
    return new Response("Unavailable", { status: 503 });

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += "xref\n0 4\n0000000000 65535 f \n";
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="preview.pdf"',
    },
  });
};
