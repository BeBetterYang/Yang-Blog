import { assertMethod, sendCachedJson, sendError } from "../lib/http";
import { getPublishedPosts } from "../lib/notion";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "GET");
    const posts = await getPublishedPosts();
    sendCachedJson(response, posts);
  } catch (error) {
    sendError(response, error);
  }
}
