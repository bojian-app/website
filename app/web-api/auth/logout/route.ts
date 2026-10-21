import { NextRequest } from "next/server";
import { logout, failure } from "@/lib/auth-server";
export async function POST(request: NextRequest) {
  try {
    return await logout(request);
  } catch (error) {
    return failure(error);
  }
}
