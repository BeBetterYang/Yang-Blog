import { assertMethod, sendCachedJson, sendError, sendJson } from "../lib/http";

export default async function handler(request: any, response: any) {
  try {
    assertMethod(request.method, "GET");
    const { getAboutPage } = await import("../lib/notion");
    const about = await getAboutPage();

    if (!about) {
      sendJson(response, 404, { error: "关于页面不存在。", code: "ABOUT_NOT_FOUND" });
      return;
    }

    sendCachedJson(response, about);
  } catch (error) {
    sendError(response, error);
  }
}
