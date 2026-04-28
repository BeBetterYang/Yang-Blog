import { BlogApiError, toPublicError } from "./notion";

type JsonResponse = {
  status: (code: number) => JsonResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

export function sendJson(response: JsonResponse, status: number, body: unknown) {
  response.status(status).json(body);
}

export function sendCachedJson(response: JsonResponse, body: unknown) {
  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  sendJson(response, 200, body);
}

export function sendError(response: JsonResponse, error: unknown) {
  const publicError = toPublicError(error);
  sendJson(response, publicError.status, publicError.body);
}

export function assertMethod(method: string | undefined, allowedMethod: string) {
  if (method !== allowedMethod) {
    throw new BlogApiError(405, "请求方法不支持。", "METHOD_NOT_ALLOWED");
  }
}

export async function readJsonBody(request: any) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

export function queryParam(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }

  return String(value ?? "");
}
