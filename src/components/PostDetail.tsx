import { FormEvent, useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { motion } from "motion/react";
import { type PostDetail as PostDetailType } from "../types";
import ContentBlocks, { IconMark } from "./ContentBlocks";

interface PostDetailProps {
  post: PostDetailType;
  loading: boolean;
  error: string;
  unlocking: boolean;
  unlockError: string;
  onBack: () => void;
  onUnlock: (password: string) => Promise<void>;
}

export default function PostDetail({
  post,
  loading,
  error,
  unlocking,
  unlockError,
  onBack,
  onUnlock,
}: PostDetailProps) {
  const [password, setPassword] = useState("");
  const isLocked = post.passwordProtected && post.locked !== false && !post.content;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onUnlock(password);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mx-auto max-w-5xl px-0"
    >
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-[#615d59] transition-colors hover:bg-[#f6f5f4] hover:text-[rgba(0,0,0,0.95)]"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      <header className="mb-8 border-b border-[rgba(0,0,0,0.1)] pb-7">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f5f4] text-xl">
            <IconMark icon={post.icon} />
          </span>
          <div>
            <div className="text-sm font-medium text-[#615d59]">{post.category}</div>
            <div className="text-xs text-[#a39e98]">{post.displayDate}</div>
          </div>
        </div>

        <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-[-0.75px] text-[rgba(0,0,0,0.95)] md:text-5xl">
          {post.title}
        </h1>

        {post.summary ? <p className="mt-4 max-w-3xl text-base leading-7 text-[#615d59] md:text-lg">{post.summary}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#f6f5f4] px-3 py-1.5 text-xs font-semibold text-[#615d59]">
              {tag}
            </span>
          ))}
        </div>
      </header>

      {loading ? <DetailSkeleton /> : null}
      {error ? <Message>{error}</Message> : null}
      {!loading && !error && isLocked ? (
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-md rounded-xl border border-[rgba(0,0,0,0.1)] bg-white p-5 shadow-[rgba(0,0,0,0.04)_0px_4px_18px]"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f2f9ff] text-[#097fe8]">
              <LockKeyhole className="h-4 w-4" />
            </span>
            <div>
              <div className="text-base font-semibold text-[rgba(0,0,0,0.95)]">这篇文章需要密码</div>
              <div className="text-sm text-[#615d59]">请输入文章密码后继续阅读。</div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-[#dddddd] px-3 py-2 text-base outline-none transition focus:border-[#097fe8] focus:ring-2 focus:ring-[#097fe8]/15"
              placeholder="密码"
            />
            <button
              type="submit"
              disabled={unlocking || !password}
              className="rounded-md bg-[#0075de] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#005bab] disabled:cursor-not-allowed disabled:bg-[#a39e98]"
            >
              {unlocking ? "验证中" : "查看"}
            </button>
          </div>

          {unlockError ? <div className="mt-3 text-sm text-[#dd5b00]">{unlockError}</div> : null}
        </form>
      ) : null}
      {!loading && !error && !isLocked ? <ContentBlocks blocks={post.content} /> : null}
    </motion.article>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="h-4 w-11/12 animate-pulse rounded bg-[#f6f5f4]" />
      <div className="h-4 w-full animate-pulse rounded bg-[#f6f5f4]" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-[#f6f5f4]" />
      <div className="h-28 w-full animate-pulse rounded-xl bg-[#f6f5f4]" />
    </div>
  );
}

function Message({ children }: { children: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] p-4 text-sm text-[#615d59]">
      {children}
    </div>
  );
}
