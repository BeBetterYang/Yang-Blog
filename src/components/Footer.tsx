export default function Footer({ title }: { title: string }) {
  return (
    <footer className="mt-20 w-full border-t border-[rgba(0,0,0,0.1)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-sm text-[#615d59] md:flex-row md:items-center">
        <p>© {new Date().getFullYear()} {title}</p>
        <div className="flex gap-6">
          <a href="#" className="transition-colors hover:text-[rgba(0,0,0,0.95)]">
            ⛰️
          </a>
          <a href="#" className="transition-colors hover:text-[rgba(0,0,0,0.95)]">
            讲的什么故事呢？
          </a>
        </div>
      </div>
    </footer>
  );
}
