import { assertMethod, queryParam, readJsonBody, sendError, sendJson } from "../../../lib/http";
import { unlockPost } from "../../../lib/notion";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "POST");
    const slug = queryParam(request.query?.slug);
    const body = await readJsonBody(request);
    const post = await unlockPost(slug, String(body.password ?? ""));

    sendJson(response, 200, post);
  } catch (error) {
    sendError(response, error);
  }
}
