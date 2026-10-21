export class AuthRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function authRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 35000);
  try {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw new AuthRequestError(
        typeof data.error?.code === "string" ? data.error.code : "AUTH_NETWORK",
        typeof data.error?.message === "string"
          ? data.error.message
          : "连接暂时中断，请稍后重试。",
      );
    return data as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof AuthRequestError) throw error;
    throw new AuthRequestError("AUTH_NETWORK", "连接暂时中断，请稍后重试。");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
