import type { NextRequest } from "next/server";
import { creatorRoute } from "@/lib/creator-server";
export const runtime = "nodejs";
export const maxDuration = 120;
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return creatorRoute(request, (await context.params).path);
}
export { handle as GET, handle as POST, handle as PATCH };
