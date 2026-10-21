import { NextRequest } from "next/server";
import { exchangeChallenge, failure } from "@/lib/auth-server";
export async function POST(request: NextRequest) {
  try {
    return await exchangeChallenge(request);
  } catch (error) {
    return failure(error);
  }
}
