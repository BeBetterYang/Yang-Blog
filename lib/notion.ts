import {
  APIErrorCode,
  Client,
  ClientErrorCode,
  isNotionClientError,
} from "@notionhq/client";
import type { AboutPage, BlogIcon, ContentBlock, HomePage, Post, PostDetail } from "../src/types.js";

type NotionPage = Record<string, any>;
type NotionProperty = Record<string, any> | undefined;

interface InternalEntry extends Post {
  pageId: string;
  typeValue: string;
  statusValue: string;
  password: string;
}

interface DatabaseCache {
  expiresAt: number;
  entries: InternalEntry[];
}

const notionToken = normalizeEnvValue(process.env.NOTION_TOKEN || process.env.NOTION_API_KEY);
const notionDatabaseId = normalizeDatabaseId(
  normalizeEnvValue(process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID),
);
const cacheTtlMs = Number(process.env.NOTION_CACHE_TTL_MS ?? 60_000);

let notion: Client | null = null;
let databaseCache: DatabaseCache | null = null;
const pageContentCache = new Map<string, { expiresAt: number; blocks: ContentBlock[] }>();
let resolvedDataSourceId: string | null = null;

export class BlogApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "BLOG_API_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function toPublicError(error: unknown) {
  if (error instanceof BlogApiError) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code },
    };
  }

  if (isNotionClientError(error)) {
    switch (error.code) {
      case APIErrorCode.Unauthorized:
        return {
          status: 500,
          body: {
            error: "NOTION_TOKEN 无效。请检查 Vercel 环境变量是否填入了正确的 integration token，且不要带引号。",
            code: "NOTION_UNAUTHORIZED",
          },
        };
      case APIErrorCode.RestrictedResource:
      case APIErrorCode.ObjectNotFound:
        return {
          status: 500,
          body: {
            error: "NOTION_DATABASE_ID 不正确，或该数据库还没有共享给 Notion integration。",
            code: "NOTION_DATABASE_ACCESS_ERROR",
          },
        };
      case APIErrorCode.ValidationError:
      case APIErrorCode.InvalidRequest:
      case APIErrorCode.InvalidRequestURL:
        return {
          status: 500,
          body: {
            error: "Notion 配置格式不正确。请检查 NOTION_DATABASE_ID 是否为数据库 ID 或数据源 ID，而不是错误的页面地址。",
            code: "NOTION_CONFIG_INVALID",
          },
        };
      case APIErrorCode.GatewayTimeout:
      case APIErrorCode.ServiceUnavailable:
      case ClientErrorCode.RequestTimeout:
        return {
          status: 504,
          body: { error: "Notion API 请求超时，请稍后重试。", code: "NOTION_TIMEOUT" },
        };
    }
  }

  console.error(error);
  return {
    status: 500,
    body: { error: "服务器暂时无法读取 Notion 数据。", code: "INTERNAL_ERROR" },
  };
}

export async function getPublishedPosts(): Promise<Post[]> {
  const entries = await getVisibleEntries("post");
  return entries.map(toPublicPost);
}

export async function getHomePage(): Promise<HomePage | null> {
  const client = getNotionClient();
  const dataSourceId = await getDataSourceId(client);
  const source = (await client.dataSources.retrieve({ data_source_id: dataSourceId })) as any;
  const title = richTextToPlain(source.title) || "首页";
  const summary = richTextToPlain(source.description);

  return {
    id: source.id,
    title,
    summary,
    icon: iconFromNotionIcon(source.icon),
  };
}

export async function searchPublishedPosts(query: string): Promise<Post[]> {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return getPublishedPosts();
  }

  const entries = await getVisibleEntries("post");
  const matchedIds = new Set<string>();
  const contentCandidates: InternalEntry[] = [];

  for (const entry of entries) {
    const publicText = normalizeSearchText(
      [entry.title, entry.summary, entry.category, entry.tags.join(" ")].join(" "),
    );

    if (matchesSearchText(publicText, normalizedQuery)) {
      matchedIds.add(entry.id);
      continue;
    }

    if (entry.passwordProtected) {
      continue;
    }

    contentCandidates.push(entry);
  }

  const contentMatchedIds = await mapWithConcurrency(contentCandidates, 5, async (entry) => {
    const content = await getPageContent(entry.pageId);
    return matchesSearchText(blocksToPlainText(content), normalizedQuery) ? entry.id : "";
  });

  for (const id of contentMatchedIds) {
    if (id) {
      matchedIds.add(id);
    }
  }

  return entries.filter((entry) => matchedIds.has(entry.id)).map(toPublicPost);
}

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  const entry = await findVisiblePost(slug);

  if (!entry) {
    return null;
  }

  if (entry.password) {
    return {
      ...toPublicPost(entry),
      locked: true,
    };
  }

  return {
    ...toPublicPost(entry),
    locked: false,
    content: await getPageContent(entry.pageId),
  };
}

export async function unlockPost(slug: string, password: string): Promise<PostDetail> {
  const entry = await findVisiblePost(slug);

  if (!entry) {
    throw new BlogApiError(404, "文章不存在。", "POST_NOT_FOUND");
  }

  if (!entry.password) {
    return {
      ...toPublicPost(entry),
      locked: false,
      content: await getPageContent(entry.pageId),
    };
  }

  if (entry.password !== password.trim()) {
    throw new BlogApiError(401, "密码不正确。", "INVALID_PASSWORD");
  }

  return {
    ...toPublicPost(entry),
    locked: false,
    content: await getPageContent(entry.pageId),
  };
}

export async function getAboutPage(): Promise<AboutPage | null> {
  const entries = await getDatabaseEntries();
  const visibleEntries = getVisiblePageEntries(entries);
  const entry =
    visibleEntries.find((item) => item.typeValue === "about") ??
    visibleEntries.find((item) => item.typeValue === "page" && item.slug.toLowerCase() === "about") ??
    visibleEntries.find((item) => item.typeValue === "page" && item.title.includes("关于"));

  if (!entry) {
    return null;
  }

  return {
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    icon: entry.icon,
    content: await getPageContent(entry.pageId),
  };
}

function getVisiblePageEntries(entries: InternalEntry[]) {
  return entries.filter(
    (entry) =>
      (entry.typeValue === "page" || entry.typeValue === "about") &&
      (entry.statusValue === "" || entry.statusValue === "published"),
  );
}

function getNotionClient() {
  if (!notionToken || !notionDatabaseId) {
    throw new BlogApiError(
      500,
      "Notion 后端未配置，请设置 NOTION_TOKEN 和 NOTION_DATABASE_ID。",
      "NOTION_ENV_MISSING",
    );
  }

  notion ??= new Client({
    auth: notionToken,
    notionVersion: process.env.NOTION_VERSION,
  });

  return notion;
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function normalizeDatabaseId(value: string) {
  if (!value) {
    return "";
  }

  const exactIdMatch = value.match(/[0-9a-fA-F]{32}|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}/);
  if (exactIdMatch) {
    return exactIdMatch[0];
  }

  return value;
}

async function getVisibleEntries(typeValue: "post" | "about") {
  const entries = await getDatabaseEntries();

  return entries.filter((entry) => {
    if (entry.typeValue !== typeValue) {
      return false;
    }

    if (typeValue === "about") {
      return entry.statusValue === "" || entry.statusValue === "published";
    }

    return entry.statusValue === "published";
  });
}

async function findVisiblePost(slug: string) {
  const normalizedSlug = decodeURIComponent(slug).trim();
  const entries = await getVisibleEntries("post");

  return entries.find((entry) => entry.slug === normalizedSlug) ?? null;
}

async function getDatabaseEntries(): Promise<InternalEntry[]> {
  const now = Date.now();
  if (databaseCache && databaseCache.expiresAt > now) {
    return databaseCache.entries;
  }

  const client = getNotionClient();
  const dataSourceId = await getDataSourceId(client);
  const pages: NotionPage[] = [];
  let startCursor: string | undefined;

  do {
    const response = await client.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: startCursor,
    });

    pages.push(...(response.results as NotionPage[]));
    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);

  const entries = pages
    .map(mapPageToEntry)
    .filter((entry): entry is InternalEntry => Boolean(entry))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  databaseCache = {
    entries,
    expiresAt: now + Math.max(0, cacheTtlMs),
  };

  return entries;
}

async function getDataSourceId(client: Client) {
  if (resolvedDataSourceId) {
    return resolvedDataSourceId;
  }

  let databaseError: unknown;

  try {
    const database = (await client.databases.retrieve({
      database_id: notionDatabaseId!,
    })) as any;
    const dataSourceId = database.data_sources?.[0]?.id;
    if (dataSourceId) {
      resolvedDataSourceId = dataSourceId;
      return resolvedDataSourceId;
    }
  } catch (error) {
    databaseError = error;
  }

  try {
    const source = (await client.dataSources.retrieve({
      data_source_id: notionDatabaseId!,
    })) as any;
    resolvedDataSourceId = source.id;
    return resolvedDataSourceId!;
  } catch {
    if (databaseError) {
      throw databaseError;
    }
    throw new BlogApiError(404, "无法找到 Notion 数据源。", "NOTION_DATA_SOURCE_NOT_FOUND");
  }
}

function mapPageToEntry(page: NotionPage): InternalEntry | null {
  const title = readPropertyText(getProperty(page, "title")) || "Untitled";
  const typeValue = readPropertyText(getProperty(page, "type")).toLowerCase();
  const statusValue = readPropertyText(getProperty(page, "status")).toLowerCase();
  const date = readDate(page, getProperty(page, "date"));
  const slug = readPropertyText(getProperty(page, "slug")) || slugify(title) || page.id;
  const password = readPropertyText(getProperty(page, "password")).trim();

  return {
    id: page.id,
    pageId: page.id,
    slug,
    typeValue,
    statusValue,
    title,
    summary: readPropertyText(getProperty(page, "summary")),
    category: readCategory(getProperty(page, "category")),
    tags: readTags(getProperty(page, "tags")),
    date,
    displayDate: formatDisplayDate(date),
    icon: readIcon(page, getProperty(page, "icon")),
    password,
    passwordProtected: password.length > 0,
  };
}

function toPublicPost(entry: InternalEntry): Post {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    category: entry.category,
    tags: entry.tags,
    date: entry.date,
    displayDate: entry.displayDate,
    icon: entry.icon,
    passwordProtected: entry.passwordProtected,
  };
}

function getProperty(page: NotionPage, name: string): NotionProperty {
  const properties = page.properties ?? {};
  if (properties[name]) {
    return properties[name];
  }

  const propertyName = Object.keys(properties).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );

  return propertyName ? properties[propertyName] : undefined;
}

function readPropertyText(property: NotionProperty): string {
  if (!property) {
    return "";
  }

  switch (property.type) {
    case "title":
      return richTextToPlain(property.title);
    case "rich_text":
      return richTextToPlain(property.rich_text);
    case "select":
      return property.select?.name ?? "";
    case "status":
      return property.status?.name ?? "";
    case "multi_select":
      return property.multi_select?.map((item: any) => item.name).join(", ") ?? "";
    case "date":
      return property.date?.start ?? "";
    case "created_time":
      return property.created_time ?? "";
    case "last_edited_time":
      return property.last_edited_time ?? "";
    case "url":
      return property.url ?? "";
    case "email":
      return property.email ?? "";
    case "phone_number":
      return property.phone_number ?? "";
    case "checkbox":
      return property.checkbox ? "true" : "false";
    case "number":
      return typeof property.number === "number" ? String(property.number) : "";
    case "formula":
      return readFormulaText(property.formula);
    case "files":
      return readFileUrl(property.files?.[0]) ?? "";
    default:
      return "";
  }
}

function readFormulaText(formula: any): string {
  if (!formula) {
    return "";
  }

  switch (formula.type) {
    case "string":
      return formula.string ?? "";
    case "number":
      return typeof formula.number === "number" ? String(formula.number) : "";
    case "boolean":
      return formula.boolean ? "true" : "false";
    case "date":
      return formula.date?.start ?? "";
    default:
      return "";
  }
}

function richTextToPlain(richText: any[] = []) {
  return richText.map((item) => item.plain_text ?? "").join("");
}

function readCategory(property: NotionProperty) {
  if (!property) {
    return "未分类";
  }

  if (property.type === "multi_select") {
    return property.multi_select?.[0]?.name ?? "未分类";
  }

  return readPropertyText(property) || "未分类";
}

function readTags(property: NotionProperty): string[] {
  if (!property) {
    return [];
  }

  if (property.type === "multi_select") {
    return property.multi_select?.map((item: any) => item.name).filter(Boolean) ?? [];
  }

  const raw = readPropertyText(property);
  return raw
    .split(/[,，;；\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readDate(page: NotionPage, property: NotionProperty) {
  const value = readPropertyText(property) || page.created_time || page.last_edited_time;
  return value || new Date().toISOString();
}

function formatDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function readIcon(page: NotionPage, property: NotionProperty): BlogIcon | undefined {
  return iconFromProperty(property) ?? iconFromNotionIcon(page.icon);
}

function iconFromProperty(property: NotionProperty): BlogIcon | undefined {
  if (!property) {
    return undefined;
  }

  if (property.type === "files") {
    const url = readFileUrl(property.files?.[0]);
    return url ? { type: "url", value: url } : undefined;
  }

  const value = readPropertyText(property).trim();
  if (!value) {
    return undefined;
  }

  return normalizeIcon(value);
}

function iconFromNotionIcon(icon: any): BlogIcon | undefined {
  if (!icon) {
    return undefined;
  }

  if (icon.type === "emoji" && icon.emoji) {
    return { type: "emoji", value: icon.emoji };
  }

  const url = icon.type === "external" ? icon.external?.url : icon.file?.url;
  return url ? { type: "url", value: url } : undefined;
}

function normalizeIcon(value: string): BlogIcon | undefined {
  if (/^https?:\/\//i.test(value)) {
    return { type: "url", value };
  }

  if (/^(fa[srbl]?\s+)?fa-/i.test(value)) {
    return iconFromFontAwesomeClass(value);
  }

  return { type: "emoji", value };
}

function iconFromFontAwesomeClass(value: string): BlogIcon | undefined {
  const iconMap: Record<string, string> = {
    home: "🏠",
    house: "🏠",
    smile: "☺️",
    user: "👤",
    pen: "✎",
    book: "📖",
    tag: "🏷️",
    folder: "📁",
  };
  const iconName = value.match(/fa-([a-z0-9-]+)/i)?.[1];
  const emoji = iconName ? iconMap[iconName] : undefined;

  return emoji ? { type: "emoji", value: emoji } : undefined;
}

function readFileUrl(file: any): string | undefined {
  if (!file) {
    return undefined;
  }

  if (file.type === "external") {
    return file.external?.url;
  }

  return file.file?.url;
}

async function getPageContent(pageId: string): Promise<ContentBlock[]> {
  const cached = pageContentCache.get(pageId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.blocks;
  }

  const client = getNotionClient();
  const blocks = await listBlockChildren(client, pageId);
  pageContentCache.set(pageId, {
    blocks,
    expiresAt: Date.now() + Math.max(0, cacheTtlMs),
  });
  return blocks;
}

async function listBlockChildren(client: Client, blockId: string): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [];
  let startCursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: startCursor,
    });

    for (const block of response.results as any[]) {
      const mappedBlock = mapBlock(block);
      if (!mappedBlock) {
        continue;
      }

      if (block.has_children) {
        mappedBlock.children = await listBlockChildren(client, block.id);
      }

      blocks.push(mappedBlock);
    }

    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);

  return blocks;
}

function mapBlock(block: any): ContentBlock | null {
  const type = block.type;
  const value = block[type] ?? {};

  switch (type) {
    case "paragraph":
    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "bulleted_list_item":
    case "numbered_list_item":
    case "quote":
      return {
        id: block.id,
        type,
        text: richTextToPlain(value.rich_text),
      };
    case "callout":
      return {
        id: block.id,
        type,
        text: richTextToPlain(value.rich_text),
        icon: iconFromNotionIcon(value.icon),
      };
    case "code":
      return {
        id: block.id,
        type,
        text: richTextToPlain(value.rich_text),
        language: value.language,
      };
    case "image":
      return {
        id: block.id,
        type,
        url: value.type === "external" ? value.external?.url : value.file?.url,
        caption: richTextToPlain(value.caption),
      };
    case "divider":
      return {
        id: block.id,
        type,
      };
    case "to_do":
      return {
        id: block.id,
        type,
        text: richTextToPlain(value.rich_text),
        checked: Boolean(value.checked),
      };
    default:
      return {
        id: block.id,
        type: "unsupported",
        text: type,
      };
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesSearchText(value: string, normalizedQuery: string) {
  const text = normalizeSearchText(value);
  return normalizedQuery.split(" ").every((keyword) => text.includes(keyword));
}

function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => [block.text, block.caption, block.children ? blocksToPlainText(block.children) : ""].filter(Boolean).join(" "))
    .join(" ");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
