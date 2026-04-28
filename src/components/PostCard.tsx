import { ArrowRight, LockKeyhole } from "lucide-react";
import { motion } from "motion/react";
import { type Post } from "../types";
import { IconMark } from "./ContentBlocks";

interface PostCardProps {
  post: Post;
  onClick: (slug: string) => void;
}

export default function PostCard({ post, onClick }: PostCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="group flex h-full flex-col rounded-xl border border-[rgba(0,0,0,0.1)] bg-white p-4 shadow-[rgba(0,0,0,0.035)_0px_3px_14px,rgba(0,0,0,0.02)_0px_0.8px_2.925px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[rgba(0,0,0,0.05)_0px_7px_22px,rgba(0,0,0,0.02)_0px_1px_3px]"
    >
      <button onClick={() => onClick(post.slug)} className="flex h-full flex-col text-left">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f6f5f4] text-xl">
            <IconMark icon={post.icon} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#a39e98]">
              <span>{post.displayDate}</span>
              <span className="h-1 w-1 rounded-full bg-[#d8d3cd]" />
              <span>{post.category}</span>
            </div>
          </div>
          {post.passwordProtected ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f2f9ff] px-2 py-1 text-xs font-semibold text-[#097fe8]">
              <LockKeyhole className="h-3 w-3" />
              密码
            </span>
          ) : null}
        </div>

        <h2 className="text-[19px] font-bold leading-snug tracking-[-0.2px] text-[rgba(0,0,0,0.95)] transition-colors group-hover:text-[#0075de]">
          {post.title}
        </h2>

        {post.summary ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#615d59]">{post.summary}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-[#f6f5f4] px-2.5 py-1 text-xs font-semibold text-[#615d59]">
              {tag}
            </span>
          ))}
        </div>

        <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-[#0075de]">
          阅读
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </button>
    </motion.article>
  );
}
