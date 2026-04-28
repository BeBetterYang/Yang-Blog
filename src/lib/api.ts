import type { AboutPage, HomePage, Post, PostDetail } from "../types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "请求失败。");
  }

  return data as T;
}

export function fetchPosts() {
  return requestJson<Post[]>("/api/posts");
}

export function fetchHome() {
  return requestJson<HomePage>("/api/home");
}

export function fetchPost(slug: string) {
  return requestJson<PostDetail>(`/api/posts/${encodeURIComponent(slug)}`);
}

export function searchPosts(query: string) {
  const searchParams = new URLSearchParams({ q: query });
  return requestJson<Post[]>(`/api/search?${searchParams.toString()}`);
}

export function unlockPost(slug: string, password: string) {
  return requestJson<PostDetail>(`/api/posts/${encodeURIComponent(slug)}/unlock`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function fetchAbout() {
  return requestJson<AboutPage>("/api/about");
}
