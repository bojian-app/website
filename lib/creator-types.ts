export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const HTML_MIME = "text/html";
export function templateMime(filename: string) {
  return /\.docx$/i.test(filename) ? DOCX_MIME : HTML_MIME;
}
// Both source formats use the same 8 MiB limit.
export const MAX_TEMPLATE_BYTES = 8 * 1024 * 1024;
export type CreatorTemplate = {
  id: string;
  version: number;
  name: string;
  description: string;
  status: string;
  pricingType: "FREE" | "PAID";
  pricePoints: number;
  reviewReason: string;
  publishedAt: string | null;
  usageCount: number | null;
};
export type CreatorWorkspace = { items: CreatorTemplate[]; verified: boolean };
export type TemplateInput = {
  name: string;
  description: string;
  source_file_id?: number;
  pricing_type: "FREE" | "PAID";
  price_points: number;
};
export type UploadTicket = {
  id: number;
  method: "POST";
  upload_url: string;
  fields: Record<string, string>;
};
