import { assertMethod, sendCachedJson, sendError, sendJson } from "../lib/http";
import { getHomePage } from "../lib/notion";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "GET");
    const home = await getHomePage();

    if (!home) {
      sendJson(response, 404, { error: "首页配置不存在。", code: "HOME_NOT_FOUND" });
      return;
    }

    sendCachedJson(response, home);
  } catch (error) {
    sendError(response, error);
  }
}
