import { ImageResponse } from "next/og";
export const runtime = "nodejs";
export const alt = "博简，简历编辑与交流社区";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "65px 80px",
        background: "#101322",
        color: "#f5f7ff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 30,
        }}
      >
        <span>博简</span>
        <span style={{ fontSize: 16, color: "#c0cae4" }}>简历与求职交流</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 86,
          lineHeight: 1.25,
          letterSpacing: -3,
        }}
      >
        <span>从经历到简历，</span>
        <span style={{ color: "#aec2ff" }}>一部手机搞定。</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          color: "#c0cae4",
        }}
      >
        <span>AI 起草 · 简历优化 · 好友批注</span>
        <span>BOJIAN</span>
      </div>
    </div>,
    size,
  );
}
