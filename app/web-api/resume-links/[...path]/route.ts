import { NextRequest } from "next/server";
import { resumeLinkRoute } from "@/lib/resume-link-server";
export const runtime = "nodejs";
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return resumeLinkRoute(request, (await context.params).path);
}
export { handle as GET, handle as POST };
