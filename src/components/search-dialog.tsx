"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { api, type SearchResults } from "@/lib/types";

const empty: SearchResults = { songs: [], artists: [], albums: [], tags: [], collections: [] };
const groups = [
  { key: "songs", label: "歌曲" }, { key: "artists", label: "艺术家" },
  { key: "albums", label: "专辑" }, { key: "tags", label: "标签" },
  { key: "collections", label: "歌单" },
] as const;

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(empty);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(setResults).catch((error) => { if (error?.name !== "AbortError") setResults(empty); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const visibleGroups = groups.filter(({ key }) => results[key].length > 0);
  const first = visibleGroups.length ? results[visibleGroups[0].key][0] : null;
  function change(value: string) { setQuery(value); setResults(empty); setLoading(Boolean(value.trim())); }
  function enter() { router.push(first?.href || `/library?q=${encodeURIComponent(query.trim())}`); onClose(); }
  return <div className="modal-backdrop" onClick={onClose}><div className="search-modal" role="dialog" aria-modal="true" aria-label="全局搜索" onClick={(event) => event.stopPropagation()}>
    <div className="search-input-wrap"><Search size={20}/><input autoFocus placeholder="搜索歌曲、艺术家、专辑、标签或歌单…" value={query} onChange={(event) => change(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) enter(); }}/><button aria-label="关闭搜索" onClick={onClose}><X size={18}/></button></div>
    {query.trim() && <div className="search-results">{visibleGroups.map(({ key, label }) => <div className="search-group" key={key}><strong>{label}</strong>{results[key].map((item) => <Link href={item.href} key={item.id} onClick={onClose}><span>{item.title}</span>{item.subtitle && <small>{item.subtitle}</small>}</Link>)}</div>)}{!loading && !visibleGroups.length && <div className="search-empty">没有找到匹配的资料</div>}{loading && <div className="search-empty">正在搜索…</div>}</div>}
    <p>按 Enter 打开首个结果 · Esc 关闭</p>
  </div></div>;
}
