import { JSDOM } from "jsdom";
import QRCodeStyling from "qr-code-styling";

export async function createQrDataUrl(content: string): Promise<string> {
  const qr = new QRCodeStyling({
    jsdom: JSDOM,
    data: content,
    type: "svg",
    width: 600,
    height: 600,
    margin: 44,
    qrOptions: { errorCorrectionLevel: "H", mode: "Byte" },
    dotsOptions: {
      type: "dots",
      gradient: {
        type: "linear",
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: "#1688a5" },
          { offset: 0.5, color: "#2469ad" },
          { offset: 1, color: "#243d99" },
        ],
      },
    },
    cornersSquareOptions: { type: "extra-rounded" },
    cornersDotOptions: { type: "dot" },
    backgroundOptions: { color: "#ffffff" },
  });
  try {
    const svg = await qr.getRawData("svg");
    if (!Buffer.isBuffer(svg)) throw new Error("QR image generation failed");
    return `data:image/svg+xml;base64,${svg.toString("base64")}`;
  } finally {
    // Each render owns a DOM window; release it after serializing the SVG.
    qr._window.close();
  }
}
