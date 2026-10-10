"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Album, BookOpen, Disc3, FolderHeart, GraduationCap, Home, ListMusic, Menu, Search, Settings2, X } from "lucide-react";
import { PlayerProvider } from "./player-provider";

const groups = [
  [{ href: "/", label: "首页", icon: Home }, { href: "/library", label: "资料库", icon: Disc3 }, { href: "/artists", label: "艺术家", icon: ListMusic }, { href: "/albums", label: "专辑", icon: Album }, { href: "/collections", label: "歌单", icon: FolderHeart }],
  [{ href: "/learn", label: "学习", icon: BookOpen }, { href: "/practice", label: "练习", icon: GraduationCap }],
  [{ href: "/settings", label: "设置", icon: Settings2 }],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem("muse-theme") || "system";
    const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } if (event.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <PlayerProvider><div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark">◈</span><div><strong>HNova <em>Muse</em></strong><small>YOUR MUSIC SPACE</small></div></div>
      <div className="nav-groups">{groups.map((group, index) => <nav key={index}>{group.map(({ href, label, icon: Icon }) => <Link onClick={() => setMobileOpen(false)} className={pathname === href || (href === "/library" && pathname.startsWith("/songs/")) ? "active" : ""} href={href} key={href}><Icon size={18}/>{label}</Link>)}</nav>)}</div>
      <div className="sidebar-bottom"><span className="pulse"/> LOCAL LIBRARY <small>自托管 · 私人空间</small></div>
    </aside>
    <div className="main-wrap"><header className="topbar"><button className="mobile-toggle icon-button" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={21}/></button><div className="breadcrumb">HNova Muse <span>/</span> {pathname === "/" ? "首页" : pathname.split("/")[1] === "songs" ? "歌曲详情" : pathname.split("/")[1]}</div><button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17}/><span>搜索歌曲、艺术家、专辑…</span><kbd>Ctrl K</kbd></button></header><main>{children}</main></div>
    {searchOpen && <div className="modal-backdrop" onClick={() => setSearchOpen(false)}><div className="search-modal" onClick={(event) => event.stopPropagation()}><div className="search-input-wrap"><Search size={20}/><input autoFocus placeholder="搜索你的音乐资料…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { router.push(`/library?q=${encodeURIComponent(query)}`); setSearchOpen(false); } }}/><button onClick={() => setSearchOpen(false)}><X size={18}/></button></div><p>按 Enter 查看搜索结果 · Esc 关闭</p></div></div>}
  </div></PlayerProvider>;
}
