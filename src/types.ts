export interface BlogIcon {
  type: "emoji" | "url";
  value: string;
}

export interface ContentBlock {
  id: string;
  type:
    | "paragraph"
    | "heading_1"
    | "heading_2"
    | "heading_3"
    | "bulleted_list_item"
    | "numbered_list_item"
    | "quote"
    | "callout"
    | "code"
    | "image"
    | "divider"
    | "to_do"
    | "unsupported";
  text?: string;
  caption?: string;
  url?: string;
  language?: string;
  checked?: boolean;
  icon?: BlogIcon;
  children?: ContentBlock[];
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  date: string;
  displayDate: string;
  icon?: BlogIcon;
  passwordProtected: boolean;
}

export interface PostDetail extends Post {
  content?: ContentBlock[];
  locked?: boolean;
}

export interface AboutPage {
  id: string;
  title: string;
  summary: string;
  icon?: BlogIcon;
  content: ContentBlock[];
}

export interface HomePage {
  id: string;
  title: string;
  summary: string;
  icon?: BlogIcon;
}

export interface BlogMeta {
  title: string;
  description: string;
}

export type FilterState =
  | { type: "all" }
  | { type: "category"; value: string }
  | { type: "tag"; value: string };
