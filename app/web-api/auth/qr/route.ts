import { NextRequest } from "next/server";
import { createChallenge, challengeStatus, failure } from "@/lib/auth-server";
export async function POST(request: NextRequest) {
  try {
    return await createChallenge(request);
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: NextRequest) {
  try {
    return await challengeStatus(request);
  } catch (error) {
    return failure(error);
  }
}
