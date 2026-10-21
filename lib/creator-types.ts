export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
// PDF rendering and preview generation both limit source DOCX files to 8 MiB.
export const MAX_TEMPLATE_BYTES = 8 * 1024 * 1024;
export type CreatorTemplate = {
  id: string;
  name: string;
  description: string;
  status: string;
  pricingType: "FREE" | "PAID";
  pricePoints: number;
  reviewReason: string;
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
