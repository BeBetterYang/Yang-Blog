import { assertMethod, queryParam, readJsonBody, sendError, sendJson } from "../../../lib/http";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "POST");
    const { unlockPost } = await import("../../../lib/notion");
    const slug = queryParam(request.query?.slug);
    const body = await readJsonBody(request);
    const post = await unlockPost(slug, String(body.password ?? ""));

    sendJson(response, 200, post);
  } catch (error) {
    sendError(response, error);
  }
}
