import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const source = readFileSync("public/templates/standard-v2.html", "utf8");
const runtime = readFileSync(
  "../app/assets/templates/market_renderer.js",
  "utf8",
);
const long = "维护页面与用户交互，确保内容在编辑后自然换行。".repeat(120);
const fields = {
  name: "示例用户",
  phone: "13800000000",
  email: "test@example.com",
  birth_date: "25 岁",
  birth_date_label: "年龄",
  position: "前端开发",
  city: "广州",
  section_order: ["projects", "work_experiences"],
  preference: "",
  educations: [],
  skills: [],
  certifications: [],
  projects: [
    {
      title: "项目甲",
      subtitle: "开发",
      auxiliary: "https://example.test",
      start_date: "2024-01-01",
      end_date: "2025-01-01",
      detail: long,
      secondary_detail: "成果结尾",
      secondary_detail_rich: {
        blocks: [
          {
            kind: "numbered",
            spans: [
              {
                text: "成果结尾",
                bold: true,
                italic: true,
                underline: true,
                strikethrough: true,
              },
            ],
          },
        ],
      },
    },
  ],
  work_experiences: [{ title: "公司甲", detail: "职责一\n职责二" }],
};
async function render(page, values, version = 2, template = source) {
  await page.goto("about:blank");
  const css = template.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
  const html = template.match(/<body>([\s\S]*?)<\/body>/)?.[1] || template;
  await page.setContent(
    `<style>${css}</style><style>body{margin:0}#flow,.flow{position:absolute;left:0;top:0;column-gap:32px;column-fill:auto}#flow{left:-100000px}.paper{width:794px;height:1123px;position:relative;overflow:hidden}.inner{position:absolute;overflow:hidden}</style><div id="flow"></div><div id="pages"></div><script>window.messages=[];window.BojianPages={postMessage:x=>messages.push(JSON.parse(x))};const payload=${JSON.stringify({ html, fields: values, protocol_version: version, photo: "" }).replaceAll("<", "\\u003c")};</script>`,
  );
  await page.addScriptTag({
    path: "../app/assets/templates/html2canvas.min.js",
  });
  await page.addScriptTag({ content: runtime });
  await page.waitForFunction(() =>
    messages.some((m) => m.type === "ready" || m.type === "error"),
  );
  assert.equal(
    await page.evaluate(() => messages.find((m) => m.type === "error")),
    undefined,
  );
  await page.evaluate(() => exportNativeLayout(1));
  await page.waitForFunction(() =>
    messages.some((m) => m.type === "native-layout" || m.type === "error"),
  );
  const result = await page.evaluate(() =>
    messages.find((m) => m.type === "native-layout"),
  );
  assert.ok(result, JSON.stringify(await page.evaluate(() => messages)));
  return result;
}
test("V2 browser preserves module order, rich text and source paragraphs; V1 remains compatible", async () => {
  assert.equal(
    runtime,
    readFileSync(
      "../app-server/internal/render/assets/market_renderer.js",
      "utf8",
    ),
  );
  assert.equal(
    runtime,
    readFileSync(
      "../admin-server/internal/render/assets/market_renderer.js",
      "utf8",
    ),
  );
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const result = await render(page, fields);
    assert.ok(result.pages.length > 1);
    const model = result.word_model;
    const lines = model.lines.map((l) => l.spans.map((s) => s.text).join(""));
    assert.ok(lines.indexOf("项目经历") < lines.indexOf("工作经历"));
    assert.equal(
      lines.filter((t) => t === long).length,
      1,
      "Source paragraph stays whole across pages",
    );
    assert.equal(
      lines.some((t) => t === "教育经历"),
      false,
    );
    assert.equal(
      lines.some((t) => t.includes("年龄：25 岁")),
      true,
    );
    const body = model.lines.filter(
      (l) => l.paragraph_field === "projects.0.body",
    );
    assert.equal(
      body.length,
      2,
      "Project detail and achievements share one field",
    );
    assert.ok(
      body[1].spans.some(
        (s) => s.weight >= 700 && s.italic && s.underline && s.strike,
      ),
    );
    assert.ok(
      lines.some(
        (t) => t.includes("开发") && t.includes("https://example.test"),
      ),
      "Same-row metadata stays together",
    );
    if (process.env.BOJIAN_V2_CAPTURE)
      writeFileSync(process.env.BOJIAN_V2_CAPTURE, JSON.stringify(result));
    const empty = await render(page, {
      name: "仅姓名",
      projects: [{}],
      work_experiences: [],
      educations: [],
      skills: [],
      certifications: [],
    });
    assert.deepEqual(
      empty.word_model.lines.map((l) => l.spans.map((s) => s.text).join("")),
      ["仅姓名"],
    );
    const legacy = await render(
      page,
      { name: "历史模板" },
      1,
      "<p>{{name}}</p>",
    );
    assert.equal(legacy.word_model, null);
    assert.ok(
      legacy.pages[0].lines.some((l) =>
        l.spans.some((s) => s.text.includes("历史模板")),
      ),
    );
  } finally {
    await browser.close();
  }
});
