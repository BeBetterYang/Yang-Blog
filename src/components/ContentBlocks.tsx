import { Check } from "lucide-react";
import type { BlogIcon, ContentBlock } from "../types";

interface ContentBlocksProps {
  blocks?: ContentBlock[];
}

export function IconMark({ icon, fallback = "✦" }: { icon?: BlogIcon; fallback?: string }) {
  if (icon?.type === "url") {
    return <img src={icon.value} alt="" className="h-full w-full rounded object-cover" />;
  }

  return <span>{icon?.value ?? fallback}</span>;
}

export default function ContentBlocks({ blocks = [] }: ContentBlocksProps) {
  if (blocks.length === 0) {
    return <p className="text-base leading-7 text-[#615d59]">这里还没有正文内容。</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {blocks.map((block, index) => (
        <BlockRenderer key={block.id} block={block} index={index} />
      ))}
    </div>
  );
}

function BlockRenderer({ block, index }: { block: ContentBlock; index: number }) {
  const children = block.children?.length ? (
    <div className="mt-3 pl-5">
      <ContentBlocks blocks={block.children} />
    </div>
  ) : null;

  switch (block.type) {
    case "heading_1":
      return (
        <section className={index === 0 ? "" : "pt-8"}>
          <h1 className="text-4xl font-bold leading-tight tracking-[-1.25px] text-[rgba(0,0,0,0.95)]">
            {block.text}
          </h1>
          {children}
        </section>
      );
    case "heading_2":
      return (
        <section className="pt-8">
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.75px] text-[rgba(0,0,0,0.95)]">
            {block.text}
          </h2>
          {children}
        </section>
      );
    case "heading_3":
      return (
        <section className="pt-5">
          <h3 className="text-2xl font-bold leading-snug tracking-[-0.25px] text-[rgba(0,0,0,0.95)]">
            {block.text}
          </h3>
          {children}
        </section>
      );
    case "paragraph":
      return (
        <div>
          {block.text ? <p className="text-base leading-7 text-[#31302e]">{block.text}</p> : <div className="h-4" />}
          {children}
        </div>
      );
    case "quote":
      return (
        <blockquote className="my-8 border-l-2 border-[rgba(0,0,0,0.1)] pl-5 text-xl font-medium leading-8 text-[rgba(0,0,0,0.95)]">
          {block.text}
          {children}
        </blockquote>
      );
    case "bulleted_list_item":
      return (
        <div>
          <div className="flex gap-3 text-base leading-7 text-[#31302e]">
            <span className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#a39e98]" />
            <span>{block.text}</span>
          </div>
          {children}
        </div>
      );
    case "numbered_list_item":
      return (
        <div>
          <div className="flex gap-3 text-base leading-7 text-[#31302e]">
            <span className="min-w-5 shrink-0 text-sm font-medium text-[#a39e98]">{index + 1}.</span>
            <span>{block.text}</span>
          </div>
          {children}
        </div>
      );
    case "to_do":
      return (
        <div>
          <div className="flex gap-3 text-base leading-7 text-[#31302e]">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[rgba(0,0,0,0.1)] bg-white">
              {block.checked ? <Check className="h-3.5 w-3.5 text-[#0075de]" /> : null}
            </span>
            <span className={block.checked ? "text-[#a39e98] line-through" : ""}>{block.text}</span>
          </div>
          {children}
        </div>
      );
    case "callout":
      return (
        <aside className="my-6 flex gap-3 rounded-xl border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] p-4 text-base leading-7 text-[#31302e]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-lg">
            <IconMark icon={block.icon} fallback="i" />
          </span>
          <div>
            {block.text}
            {children}
          </div>
        </aside>
      );
    case "code":
      return (
        <pre className="my-6 overflow-x-auto rounded-xl border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] p-4 text-sm leading-6 text-[#31302e]">
          <code>{block.text}</code>
        </pre>
      );
    case "image":
      if (!block.url) {
        return null;
      }

      return (
        <figure className="my-10">
          <img src={block.url} alt={block.caption ?? ""} className="w-full rounded-xl border border-[rgba(0,0,0,0.1)]" />
          {block.caption ? <figcaption className="mt-2 text-center text-sm text-[#a39e98]">{block.caption}</figcaption> : null}
        </figure>
      );
    case "divider":
      return <hr className="my-10 border-[rgba(0,0,0,0.1)]" />;
    case "unsupported":
      return null;
    default:
      return null;
  }
}
