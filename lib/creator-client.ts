import { AuthRequestError } from "./auth-client";
import {
  DOCX_MIME,
  MAX_TEMPLATE_BYTES,
  type UploadTicket,
} from "./creator-types";
export async function creatorRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  try {
    const response = await fetch("/web-api/auth/creator/" + path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(110000)])
        : AbortSignal.timeout(110000),
    });
    const data = await response.json();
    if (!response.ok)
      throw new AuthRequestError(
        data.error?.code || "CREATOR_NETWORK",
        data.error?.message || "操作失败，请稍后重试。",
      );
    return data as T;
  } catch (error) {
    if (signal?.aborted || error instanceof AuthRequestError) throw error;
    throw new AuthRequestError(
      "CREATOR_NETWORK",
      "连接中断，请刷新模板列表确认结果后再试。",
    );
  }
}
export function validateTemplateFile(file: File) {
  if (!/\.docx$/i.test(file.name)) return "请选择 DOCX 格式的 Word 文件。";
  if (!file.size || file.size > MAX_TEMPLATE_BYTES)
    return "文件须大于 0 字节且不超过 8 MB。";
  return "";
}
export async function uploadTemplate(
  file: File,
  signal: AbortSignal,
  stage: (message: string) => void,
) {
  const invalid = validateTemplateFile(file);
  if (invalid) throw new Error(invalid);
  const magic = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (
    magic[0] !== 0x50 ||
    magic[1] !== 0x4b ||
    magic[2] !== 3 ||
    magic[3] !== 4
  )
    throw new Error(
      "文件不是有效的 DOCX 文档，请用 Word 另存为 .docx 后重试。",
    );
  stage("正在上传文件…");
  const ticket = await creatorRequest<UploadTicket>(
    "uploads",
    { filename: file.name, size_bytes: file.size },
    signal,
  );
  const data = new FormData();
  for (const [key, value] of Object.entries(ticket.fields))
    data.append(key, value);
  data.append("file", new Blob([file], { type: DOCX_MIME }), file.name);
  const result = await fetch(ticket.upload_url, {
    method: "POST",
    body: data,
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
  });
  if (!result.ok) throw new Error("文件上传失败，请检查网络后重试。");
  await creatorRequest(`uploads/${ticket.id}/complete`, {}, signal);
  return ticket.id;
}
