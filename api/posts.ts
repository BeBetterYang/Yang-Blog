import { assertMethod, sendCachedJson, sendError } from "../lib/http";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "GET");
    const { getPublishedPosts } = await import("../lib/notion");
    const posts = await getPublishedPosts();
    sendCachedJson(response, posts);
  } catch (error) {
    sendError(response, error);
  }
}
