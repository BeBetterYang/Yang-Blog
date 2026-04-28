import { assertMethod, queryParam, sendCachedJson, sendError } from "../lib/http.js";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "GET");
    const { searchPublishedPosts } = await import("../lib/notion.js");
    const query = queryParam(request.query?.q);
    const posts = await searchPublishedPosts(query);
    sendCachedJson(response, posts);
  } catch (error) {
    sendError(response, error);
  }
}
