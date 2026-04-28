import { APIErrorCode, ClientErrorCode, isNotionClientError } from "@notionhq/client";

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
    const error = new Error("请求方法不支持。") as Error & { status: number; code: string };
    error.status = 405;
    error.code = "METHOD_NOT_ALLOWED";
    throw error;
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

function toPublicError(error: unknown) {
  if (isStatusError(error)) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code },
    };
  }

  if (isNotionClientError(error)) {
    switch (error.code) {
      case APIErrorCode.Unauthorized:
        return {
          status: 500,
          body: {
            error: "NOTION_TOKEN 无效。请检查 Vercel 环境变量是否填入了正确的 integration token，且不要带引号。",
            code: "NOTION_UNAUTHORIZED",
          },
        };
      case APIErrorCode.RestrictedResource:
      case APIErrorCode.ObjectNotFound:
        return {
          status: 500,
          body: {
            error: "NOTION_DATABASE_ID 不正确，或该数据库还没有共享给 Notion integration。",
            code: "NOTION_DATABASE_ACCESS_ERROR",
          },
        };
      case APIErrorCode.ValidationError:
      case APIErrorCode.InvalidRequest:
      case APIErrorCode.InvalidRequestURL:
        return {
          status: 500,
          body: {
            error: "Notion 配置格式不正确。请检查 NOTION_DATABASE_ID 是否为数据库 ID 或数据源 ID，而不是错误的页面地址。",
            code: "NOTION_CONFIG_INVALID",
          },
        };
      case APIErrorCode.GatewayTimeout:
      case APIErrorCode.ServiceUnavailable:
      case ClientErrorCode.RequestTimeout:
        return {
          status: 504,
          body: { error: "Notion API 请求超时，请稍后重试。", code: "NOTION_TIMEOUT" },
        };
    }
  }

  console.error(error);
  return {
    status: 500,
    body: {
      error: "服务器暂时无法读取 Notion 数据。",
      code: "INTERNAL_ERROR",
      detail: extractErrorMessage(error),
    },
  };
}

function isStatusError(
  error: unknown,
): error is { status: number; code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { status?: unknown }).status === "number" &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}
