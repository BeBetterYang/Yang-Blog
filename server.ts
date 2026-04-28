import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { sendError } from "./lib/http.js";
import { getAboutPage, getHomePage, getPostBySlug, getPublishedPosts, searchPublishedPosts, unlockPost } from "./lib/notion.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/api/posts", async (_request, response) => {
  try {
    response.setHeader("Cache-Control", "no-store");
    response.json(await getPublishedPosts());
  } catch (error) {
    sendError(response as any, error);
  }
});

app.get("/api/home", async (_request, response) => {
  try {
    response.setHeader("Cache-Control", "no-store");
    const home = await getHomePage();

    if (!home) {
      response.status(404).json({ error: "首页配置不存在。", code: "HOME_NOT_FOUND" });
      return;
    }

    response.json(home);
  } catch (error) {
    sendError(response as any, error);
  }
});

app.get("/api/posts/:slug", async (request, response) => {
  try {
    response.setHeader("Cache-Control", "no-store");
    const post = await getPostBySlug(request.params.slug);

    if (!post) {
      response.status(404).json({ error: "文章不存在。", code: "POST_NOT_FOUND" });
      return;
    }

    response.json(post);
  } catch (error) {
    sendError(response as any, error);
  }
});

app.get("/api/search", async (request, response) => {
  try {
    response.setHeader("Cache-Control", "no-store");
    response.json(await searchPublishedPosts(String(request.query.q ?? "")));
  } catch (error) {
    sendError(response as any, error);
  }
});

app.post("/api/posts/:slug/unlock", async (request, response) => {
  try {
    response.json(await unlockPost(request.params.slug, String(request.body?.password ?? "")));
  } catch (error) {
    sendError(response as any, error);
  }
});

app.get("/api/about", async (_request, response) => {
  try {
    response.setHeader("Cache-Control", "no-store");
    const about = await getAboutPage();

    if (!about) {
      response.status(404).json({ error: "关于页面不存在。", code: "ABOUT_NOT_FOUND" });
      return;
    }

    response.json(about);
  } catch (error) {
    sendError(response as any, error);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_request, response) => {
      response.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
