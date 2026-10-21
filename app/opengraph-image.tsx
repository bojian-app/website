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
        background: "#ffffff",
        color: "#172235",
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
        <span style={{ fontSize: 16, color: "#69758a" }}>简历与求职交流</span>
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
        <span>博简</span>
        <span style={{ color: "#3268ea" }}>简历编辑与交流社区</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          color: "#69758a",
        }}
      >
        <span>简历编辑 · 简历求指点 · 经验交流</span>
        <span>App 即将开放</span>
      </div>
    </div>,
    size,
  );
}
