/** Sample local font glyphs into particle destinations; no image or remote font. */
export function particleText(text: string, count: number): Float32Array | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 256;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const fontSize = 160;
  context.font = `500 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const samples: number[] = [];
  let minX = canvas.width,
    maxX = 0,
    minY = canvas.height,
    maxY = 0;
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (pixels[(y * canvas.width + x) * 4 + 3] < 140) continue;
      samples.push(x, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!samples.length) return null;
  const targets = new Float32Array(count * 3);
  let seed = 617;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    const point = Math.floor(random() * (samples.length / 2)) * 2;
    targets[i * 3] =
      (samples[point] - (minX + maxX) / 2 + (random() - 0.5) * 1.5) / fontSize;
    targets[i * 3 + 1] =
      ((minY + maxY) / 2 - samples[point + 1] + (random() - 0.5) * 1.5) /
      fontSize;
    targets[i * 3 + 2] = (random() - 0.5) * 0.035;
  }
  return targets;
}
