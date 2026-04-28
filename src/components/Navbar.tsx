import { useState } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import type { BlogIcon, FilterState } from "../types";
import { IconMark } from "./ContentBlocks";

interface NavbarProps {
  title: string;
  icon?: BlogIcon;
  categories: string[];
  tags: string[];
  activeFilter: FilterState;
  activeView: "posts" | "about";
  searchValue: string;
  onHome: () => void;
  onFilter: (filter: FilterState) => void;
  onAbout: () => void;
  onSearchChange: (value: string) => void;
}

export default function Navbar({
  title,
  icon,
  categories,
  tags,
  activeFilter,
  activeView,
  searchValue,
  onHome,
  onFilter,
  onAbout,
  onSearchChange,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeLabel = activeFilter.type === "all" ? "" : activeFilter.value;

  const handleAction = (action: () => void) => {
    action();
    setMobileOpen(false);
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[rgba(0,0,0,0.1)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-nowrap items-center gap-3 px-6 py-2 md:min-h-16 md:grid md:grid-cols-[minmax(160px,1fr)_minmax(220px,320px)_minmax(300px,1fr)] md:gap-4 md:py-0">
        <button
          onClick={() => handleAction(onHome)}
          className="flex min-w-0 items-center gap-2 whitespace-nowrap text-left text-[15px] font-semibold text-[rgba(0,0,0,0.95)] transition-colors hover:text-[#0075de]"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f6f5f4] text-base">
            <IconMark icon={icon} fallback="Y" />
          </span>
          {title}
        </button>

        <SearchBox value={searchValue} onChange={onSearchChange} className="flex min-w-0 flex-1 md:max-w-xs md:flex" />

        <div className="hidden items-center justify-self-end gap-1 md:flex">
          <NavButton active={activeView === "posts" && activeFilter.type === "all"} onClick={() => onFilter({ type: "all" })}>
            文章
          </NavButton>
          <MenuGroup label="分类" values={categories} activeValue={activeFilter.type === "category" ? activeLabel : ""} onSelect={(value) => onFilter({ type: "category", value })} />
          <MenuGroup label="标签" values={tags} activeValue={activeFilter.type === "tag" ? activeLabel : ""} onSelect={(value) => onFilter({ type: "tag", value })} />
          <NavButton active={activeView === "about"} onClick={onAbout}>
            关于
          </NavButton>
        </div>

        <button
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-md border border-[rgba(0,0,0,0.1)] text-[#31302e] md:hidden"
          aria-label="打开菜单"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[rgba(0,0,0,0.1)] bg-white px-6 py-4 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <MobileButton active={activeView === "posts" && activeFilter.type === "all"} onClick={() => handleAction(() => onFilter({ type: "all" }))}>
              文章
            </MobileButton>
            <MobileSection label="分类" values={categories} activeValue={activeFilter.type === "category" ? activeLabel : ""} onSelect={(value) => handleAction(() => onFilter({ type: "category", value }))} />
            <MobileSection label="标签" values={tags} activeValue={activeFilter.type === "tag" ? activeLabel : ""} onSelect={(value) => handleAction(() => onFilter({ type: "tag", value }))} />
            <MobileButton active={activeView === "about"} onClick={() => handleAction(onAbout)}>
              关于
            </MobileButton>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

function SearchBox({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`relative min-w-0 w-full ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a39e98]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索文章"
        className="h-10 w-full rounded-md border border-[rgba(0,0,0,0.1)] bg-white pl-9 pr-8 text-[16px] text-[#31302e] outline-none transition focus:border-[#097fe8] focus:ring-2 focus:ring-[#097fe8]/15 md:h-9 md:text-sm"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#a39e98] transition-colors hover:bg-[#f6f5f4] hover:text-[#31302e]"
          aria-label="清除搜索"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </label>
  );
}

function NavButton({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
        active ? "bg-[#f6f5f4] text-[rgba(0,0,0,0.95)]" : "text-[#615d59] hover:bg-[#f6f5f4] hover:text-[rgba(0,0,0,0.95)]"
      }`}
    >
      {children}
    </button>
  );
}

function MenuGroup({
  label,
  values,
  activeValue,
  onSelect,
}: {
  label: string;
  values: string[];
  activeValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="group relative">
      <button
        className={`flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
          activeValue ? "bg-[#f6f5f4] text-[rgba(0,0,0,0.95)]" : "text-[#615d59] hover:bg-[#f6f5f4] hover:text-[rgba(0,0,0,0.95)]"
        }`}
      >
        {activeValue || label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <div className="invisible absolute right-0 top-full z-20 min-w-44 translate-y-1 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white p-1 opacity-0 shadow-[rgba(0,0,0,0.04)_0px_4px_18px] transition-all group-hover:visible group-hover:translate-y-2 group-hover:opacity-100">
        {values.length ? (
          values.map((value) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                value === activeValue ? "bg-[#f2f9ff] text-[#097fe8]" : "text-[#31302e] hover:bg-[#f6f5f4]"
              }`}
            >
              {value}
            </button>
          ))
        ) : (
          <span className="block px-3 py-2 text-sm text-[#a39e98]">暂无内容</span>
        )}
      </div>
    </div>
  );
}

function MobileButton({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-left text-[15px] font-medium ${
        active ? "bg-[#f6f5f4] text-[rgba(0,0,0,0.95)]" : "text-[#615d59]"
      }`}
    >
      {children}
    </button>
  );
}

function MobileSection({
  label,
  values,
  activeValue,
  onSelect,
}: {
  label: string;
  values: string[];
  activeValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.1)] p-2">
      <div className="px-1 pb-2 text-xs font-semibold text-[#a39e98]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.length ? (
          values.map((value) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                value === activeValue ? "bg-[#f2f9ff] text-[#097fe8]" : "bg-[#f6f5f4] text-[#615d59]"
              }`}
            >
              {value}
            </button>
          ))
        ) : (
          <span className="px-1 text-sm text-[#a39e98]">暂无内容</span>
        )}
      </div>
    </div>
  );
}
