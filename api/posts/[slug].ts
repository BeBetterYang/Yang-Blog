import { assertMethod, queryParam, sendCachedJson, sendError, sendJson } from "../../lib/http";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "GET");
    const { getPostBySlug } = await import("../../lib/notion");
    const slug = queryParam(request.query?.slug);
    const post = await getPostBySlug(slug);

    if (!post) {
      sendJson(response, 404, { error: "文章不存在。", code: "POST_NOT_FOUND" });
      return;
    }

    sendCachedJson(response, post);
  } catch (error) {
    sendError(response, error);
  }
}
