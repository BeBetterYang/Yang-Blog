import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import PostCard from "./components/PostCard";
import PostDetail from "./components/PostDetail";
import ContentBlocks, { IconMark } from "./components/ContentBlocks";
import { fetchAbout, fetchHome, fetchPost, fetchPosts, searchPosts, unlockPost } from "./lib/api";
import { type AboutPage, type FilterState, type HomePage, type Post, type PostDetail as PostDetailType } from "./types";

const pageSize = 15;

const siteMeta = {
  title: "Yang‘s Blog",
  description: import.meta.env.VITE_BLOG_DESCRIPTION || "以 Notion 为内容源的极简博客。",
};

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [home, setHome] = useState<HomePage | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [filter, setFilter] = useState<FilterState>({ type: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState<"posts" | "about">("posts");
  const [selectedPost, setSelectedPost] = useState<PostDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [about, setAbout] = useState<AboutPage | null>(null);
  const [aboutLoading, setAboutLoading] = useState(false);
  const [aboutError, setAboutError] = useState("");

  useEffect(() => {
    Promise.allSettled([fetchPosts(), fetchHome()])
      .then(([postsResult, homeResult]) => {
        if (postsResult.status === "fulfilled") {
          setPosts(postsResult.value);
          setPostsError("");
        } else {
          setPostsError(postsResult.reason instanceof Error ? postsResult.reason.message : "文章读取失败。");
        }

        if (homeResult.status === "fulfilled") {
          setHome(homeResult.value);
        }
      })
      .finally(() => {
        setPostsLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = searchInput.trim();
      if (nextQuery === searchQuery) {
        setSearchLoading(false);
        return;
      }
      setSearchLoading(Boolean(nextQuery));
      setSearchQuery(nextQuery);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    let canceled = false;
    setSearchLoading(true);
    setSearchError("");

    searchPosts(searchQuery)
      .then((data) => {
        if (!canceled) {
          setSearchResults(data);
        }
      })
      .catch((error: Error) => {
        if (!canceled) {
          setSearchError(error.message);
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (!canceled) {
          setSearchLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [searchQuery]);

  const categories = useMemo(() => uniqueSorted(posts.map((post) => post.category).filter(Boolean)), [posts]);
  const tags = useMemo(() => uniqueSorted(posts.flatMap((post) => post.tags)), [posts]);
  const sourcePosts = searchQuery ? searchResults : posts;
  const visiblePosts = useMemo(() => {
    if (filter.type === "category") {
      return sourcePosts.filter((post) => post.category === filter.value);
    }

    if (filter.type === "tag") {
      return sourcePosts.filter((post) => post.tags.includes(filter.value));
    }

    return sourcePosts;
  }, [filter, sourcePosts]);
  const pageCount = Math.max(1, Math.ceil(visiblePosts.length / pageSize));
  const pagedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visiblePosts.slice(start, start + pageSize);
  }, [currentPage, visiblePosts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const openHome = () => {
    setSelectedPost(null);
    setView("posts");
    scrollToTop();
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setSelectedPost(null);
    setView("posts");
    setCurrentPage(1);
    scrollToTop();
  };

  const applyFilter = (nextFilter: FilterState) => {
    setSelectedPost(null);
    setView("posts");
    setFilter(nextFilter);
    scrollToTop();
  };

  const openPost = async (slug: string) => {
    const summary = sourcePosts.find((post) => post.slug === slug) ?? posts.find((post) => post.slug === slug);
    setSelectedPost(summary ? { ...summary, locked: summary.passwordProtected } : null);
    setDetailLoading(true);
    setDetailError("");
    setUnlockError("");
    setView("posts");
    scrollToTop();

    try {
      setSelectedPost(await fetchPost(slug));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "文章读取失败。");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUnlock = async (password: string) => {
    if (!selectedPost) {
      return;
    }

    setUnlocking(true);
    setUnlockError("");

    try {
      setSelectedPost(await unlockPost(selectedPost.slug, password));
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : "密码验证失败。");
    } finally {
      setUnlocking(false);
    }
  };

  const openAbout = async () => {
    setSelectedPost(null);
    setView("about");
    scrollToTop();

    if (about || aboutLoading) {
      return;
    }

    setAboutLoading(true);
    setAboutError("");

    try {
      setAbout(await fetchAbout());
    } catch (error) {
      setAboutError(error instanceof Error ? error.message : "关于页面读取失败。");
    } finally {
      setAboutLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[rgba(0,0,0,0.95)]">
      <Navbar
        title={siteMeta.title}
        icon={home?.icon}
        categories={categories}
        tags={tags}
        activeFilter={filter}
        activeView={view}
        searchValue={searchInput}
        onHome={openHome}
        onFilter={applyFilter}
        onAbout={openAbout}
        onSearchChange={handleSearchChange}
      />

      <main className="mx-auto w-full max-w-6xl flex-grow px-6 pb-12 pt-32 md:pb-16 md:pt-28">
        <AnimatePresence mode="wait">
          {selectedPost ? (
            <PostDetail
              key={selectedPost.slug}
              post={selectedPost}
              loading={detailLoading}
              error={detailError}
              unlocking={unlocking}
              unlockError={unlockError}
              onBack={() => {
                setSelectedPost(null);
                scrollToTop();
              }}
              onUnlock={handleUnlock}
            />
          ) : view === "about" ? (
            <AboutView key="about" about={about} loading={aboutLoading} error={aboutError} />
          ) : (
            <PostList
              key="posts"
              posts={pagedPosts}
              loading={postsLoading || searchLoading || searchInput.trim() !== searchQuery}
              error={postsError || searchError}
              filter={filter}
              searchQuery={searchQuery}
              home={home}
              totalCount={sourcePosts.length}
              resultCount={visiblePosts.length}
              currentPage={currentPage}
              pageCount={pageCount}
              onOpenPost={openPost}
              onPageChange={(page) => {
                setCurrentPage(page);
                scrollToTop();
              }}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer title={siteMeta.title} />
    </div>
  );
}

function PostList({
  posts,
  loading,
  error,
  filter,
  searchQuery,
  home,
  totalCount,
  resultCount,
  currentPage,
  pageCount,
  onOpenPost,
  onPageChange,
}: {
  posts: Post[];
  loading: boolean;
  error: string;
  filter: FilterState;
  searchQuery: string;
  home: HomePage | null;
  totalCount: number;
  resultCount: number;
  currentPage: number;
  pageCount: number;
  onOpenPost: (slug: string) => void;
  onPageChange: (page: number) => void;
}) {
  const heading = searchQuery ? `搜索：${searchQuery}` : filter.type === "all" ? home?.title || "首页" : filter.value;
  const eyebrow = searchQuery ? "搜索" : filter.type === "category" ? "分类" : filter.type === "tag" ? "标签" : "";
  const isHomeHeading = !searchQuery && filter.type === "all";
  const subheading = loading
    ? "正在读取 Notion 内容。"
    : searchQuery
      ? `找到 ${resultCount} 篇匹配文章。`
      : filter.type === "all"
        ? `${totalCount} 篇来自 Notion 的已发布文章。`
        : `筛选结果：${resultCount} 篇文章。`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <header className="mb-10 max-w-2xl">
        <div className="mb-3 text-sm font-semibold text-[#0075de]">{eyebrow}</div>
        <h1
          className={`text-[rgba(0,0,0,0.95)] ${
            isHomeHeading
              ? "font-serif text-[31px] font-medium leading-[1.12] tracking-[0.02em] md:text-[42px]"
              : "text-[32px] font-bold leading-none tracking-[-2px] md:text-[38px]"
          }`}
        >
          {heading}
        </h1>
        <p className="mt-4 text-lg leading-7 text-[#615d59]">
          {!loading && !searchQuery && filter.type === "all" && home?.summary ? home.summary : subheading}
        </p>
      </header>

      {loading ? <PostSkeleton /> : null}
      {error ? <StateMessage title="无法读取 Notion 数据" body={error} /> : null}
      {!loading && !error && posts.length === 0 ? <StateMessage title="暂无文章" body="当前筛选没有可显示的已发布文章。" /> : null}
      {!loading && !error && posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onClick={onOpenPost} />
            ))}
          </div>
          <Pagination currentPage={currentPage} pageCount={pageCount} onPageChange={onPageChange} />
        </>
      ) : null}
    </motion.div>
  );
}

function Pagination({
  currentPage,
  pageCount,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = buildPageNumbers(currentPage, pageCount);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="文章分页">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded-md border border-[rgba(0,0,0,0.1)] px-3 py-2 text-sm font-medium text-[#615d59] transition hover:bg-[#f6f5f4] disabled:cursor-not-allowed disabled:opacity-40"
      >
        上一页
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`h-9 min-w-9 rounded-md border px-3 text-sm font-semibold transition ${
            page === currentPage
              ? "border-[#0075de] bg-[#0075de] text-white"
              : "border-[rgba(0,0,0,0.1)] text-[#615d59] hover:bg-[#f6f5f4]"
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
        disabled={currentPage === pageCount}
        className="rounded-md border border-[rgba(0,0,0,0.1)] px-3 py-2 text-sm font-medium text-[#615d59] transition hover:bg-[#f6f5f4] disabled:cursor-not-allowed disabled:opacity-40"
      >
        下一页
      </button>
    </nav>
  );
}

function AboutView({ about, loading, error }: { about: AboutPage | null; loading: boolean; error: string }) {
  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mx-auto max-w-4xl">
      <header className="mb-12 border-b border-[rgba(0,0,0,0.1)] pb-10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f6f5f4] text-2xl">
          <IconMark icon={about?.icon} fallback="@" />
        </div>
        <h1 className="text-5xl font-bold leading-none tracking-[-2px] text-[rgba(0,0,0,0.95)] md:text-[40px]">
          {about?.title ?? "关于"}
        </h1>
        {about?.summary ? <p className="mt-4 max-w-2xl text-lg leading-7 text-[#615d59]">{about.summary}</p> : null}
      </header>

      {loading ? <PostSkeleton /> : null}
      {error ? <StateMessage title="无法读取关于页面" body={error} /> : null}
      {!loading && !error && about ? <ContentBlocks blocks={about.content} /> : null}
    </motion.article>
  );
}

function PostSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-64 animate-pulse rounded-xl border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4]" />
      ))}
    </div>
  );
}

function StateMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] p-5">
      <h2 className="text-base font-semibold text-[rgba(0,0,0,0.95)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#615d59]">{body}</p>
    </div>
  );
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function buildPageNumbers(currentPage: number, pageCount: number) {
  const start = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
