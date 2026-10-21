import "server-only";
import { NextRequest } from "next/server";
import {
  AuthFailure,
  failure,
  protectMutation,
  reply,
  withAuthenticatedApi,
} from "./auth-server";
import {
  templateMime,
  MAX_TEMPLATE_BYTES,
  type CreatorTemplate,
} from "./creator-types";

type Json = Record<string, unknown>;
function invalid(message = "请求格式无效。") {
  return new AuthFailure("INVALID_REQUEST", message, 400);
}
function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid();
  return value as Json;
}
function positive(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw invalid();
  return value;
}
function string(value: unknown, max: number, required = false) {
  if (
    typeof value !== "string" ||
    Array.from(value).length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value) ||
    (required && !value.trim())
  )
    throw invalid();
  return value.trim();
}
async function input(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        throw invalid("内容过长，请精简后重试。");
      }
      chunks.push(chunk.value);
    }
    return object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch (error) {
    if (error instanceof AuthFailure) throw error;
    throw invalid();
  }
}
function templateInput(data: Json, creating: boolean) {
  const pricing = data.pricing_type;
  if (pricing !== "FREE" && pricing !== "PAID")
    throw invalid("请选择模板定价方式。");
  const points = pricing === "FREE" ? 0 : positive(data.price_points);
  const file =
    data.source_file_id === undefined && !creating
      ? undefined
      : positive(data.source_file_id);
  return {
    name: string(data.name, 160, true),
    description: string(data.description, 2000),
    pricing_type: pricing,
    price_points: points,
    ...(file ? { source_file_id: file } : {}),
  };
}
function projectTemplate(value: unknown): CreatorTemplate {
  const data = object(value);
  return {
    id: String(positive(data.id)),
    version: positive(data.version ?? 1),
    name: string(data.name, 160, true),
    description:
      typeof data.description === "string"
        ? data.description.slice(0, 2000)
        : "",
    status:
      typeof data.status === "string" ? data.status.slice(0, 50) : "UNKNOWN",
    pricingType: data.pricing_type === "PAID" ? "PAID" : "FREE",
    pricePoints:
      typeof data.price_points === "number" &&
      Number.isSafeInteger(data.price_points)
        ? Math.max(0, data.price_points)
        : 0,
    reviewReason:
      typeof data.review_reason === "string"
        ? data.review_reason.slice(0, 2000)
        : "",
  };
}
export async function creatorRoute(request: NextRequest, path: string[]) {
  try {
    if (request.method !== "GET") protectMutation(request);
    const route = path.join("/");
    const preview = /^templates\/([1-9]\d{0,15})\/preview$/.exec(route);
    const complete = /^uploads\/([1-9]\d{0,15})\/complete$/.exec(route);
    const edit = /^templates\/([1-9]\d{0,15})$/.exec(route);
    const submit = /^templates\/([1-9]\d{0,15})\/submit$/.exec(route);
    if (
      !(request.method === "GET" && (route === "workspace" || preview)) &&
      !(
        request.method === "POST" &&
        (route === "uploads" || route === "templates" || complete || submit)
      ) &&
      !(request.method === "PATCH" && edit)
    )
      return reply(
        { error: { code: "NOT_FOUND", message: "页面不存在。" } },
        404,
      );
    const data = request.method === "GET" ? {} : await input(request);
    return await withAuthenticatedApi(request, async (api) => {
      if (route === "workspace") {
        const [templates, identity] = await Promise.all([
          api("/api/v1/me/templates"),
          api("/api/v1/me/identity-verification"),
        ]);
        const list = object(templates),
          verification = object(identity);
        if (!Array.isArray(list.items)) throw invalid();
        const today = new Date(Date.now() + 8 * 3600000)
          .toISOString()
          .slice(0, 10);
        return reply({
          items: list.items
            .filter((t) => object(t).source === "PUBLISHED_BY_ME")
            .map(projectTemplate),
          verified:
            verification.status === "VERIFIED" &&
            typeof verification.valid_until === "string" &&
            verification.valid_until >= today,
        });
      }
      if (preview) {
        positive(Number(preview[1]));
        const result = object(
          await api(
            `/api/v1/templates/${preview[1]}/preview-assets?version=${positive(Number(request.nextUrl.searchParams.get("version")))}`,
          ),
        );
        const safe: Json = {
          status: result.preview_status,
          version: result.version,
        };
        for (const key of ["preview_pdf_url", "thumbnail_url"]) {
          if (typeof result[key] === "string") {
            const url = new URL(result[key] as string);
            if (url.protocol !== "https:" || url.username || url.password)
              throw invalid("预览地址无效。");
            safe[key] = url.href;
          }
        }
        return reply(safe);
      }
      if (route === "uploads") {
        const filename = string(data.filename, 240, true),
          size = positive(data.size_bytes);
        if (
          !/\.(docx|html|htm)$/i.test(filename) ||
          /[\/\\]/.test(filename) ||
          size > MAX_TEMPLATE_BYTES
        )
          throw invalid("请上传不超过 8 MB 的 HTML 或 DOCX 文件。");
        const ticket = object(
          await api("/api/v1/files/uploads", "POST", {
            purpose: "TEMPLATE_SOURCE",
            filename,
            size_bytes: size,
            content_type: templateMime(filename),
          }),
        );
        const url = new URL(String(ticket.upload_url)),
          fields = object(ticket.fields);
        if (
          (url.protocol !== "https:" &&
            !(
              url.protocol === "http:" &&
              ["127.0.0.1", "localhost"].includes(url.hostname)
            )) ||
          url.username ||
          url.password ||
          ticket.method !== "POST" ||
          !Object.keys(fields).length ||
          Object.entries(fields).some(
            ([k, v]) => k === "file" || typeof v !== "string",
          )
        )
          throw invalid("上传服务返回异常，请稍后重试。");
        return reply(
          {
            id: positive(ticket.id),
            method: "POST",
            upload_url: url.href,
            fields,
          },
          201,
        );
      }
      if (complete) {
        positive(Number(complete[1]));
        const result = object(
          await api(
            `/api/v1/files/uploads/${complete[1]}/complete`,
            "POST",
            {},
          ),
        );
        if (result.status !== "READY")
          throw invalid("文件还未上传完成，请重试。");
        return reply({ id: positive(result.id), status: "READY" });
      }
      if (route === "templates" || edit) {
        if (edit) positive(Number(edit[1]));
        const result = object(
          await api(
            edit
              ? `/api/v1/creator/templates/${edit[1]}`
              : "/api/v1/creator/templates",
            edit ? "PATCH" : "POST",
            templateInput(data, !edit),
          ),
        );
        return reply(
          { id: positive(result.id), status: result.status },
          edit ? 200 : 201,
        );
      }
      if (submit) {
        positive(Number(submit[1]));
        const check = object(
          await api(
            `/api/v1/creator/templates/${submit[1]}/checks`,
            "POST",
            {},
          ),
        );
        if (check.status !== "READY")
          throw new AuthFailure(
            "TEMPLATE_CHECK_FAILED",
            typeof check.message === "string"
              ? check.message.slice(0, 500)
              : "模板实际渲染未通过，请修改源文件后重新上传。",
            422,
          );
        const result = object(
          await api(
            `/api/v1/creator/templates/${submit[1]}/${data.resubmit === true ? "resubmit" : "submit"}`,
            "POST",
            {},
          ),
        );
        return reply({ id: positive(result.id), status: result.status }, 202);
      }
      throw invalid();
    });
  } catch (error) {
    return failure(error);
  }
}
