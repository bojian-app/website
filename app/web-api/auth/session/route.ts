import { NextRequest } from "next/server";
import { currentSession, failure } from "@/lib/auth-server";
export async function GET(request: NextRequest) {
  try {
    return await currentSession(request);
  } catch (error) {
    return failure(error);
  }
}
