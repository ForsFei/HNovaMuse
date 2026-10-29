"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid2X2, List, Music2, Plus, Search, Play } from "lucide-react";
import { api, json, type Song } from "@/lib/types";
import { SongCard } from "./song-card";
import { usePlayer } from "./player-provider";

export function LibraryView({ initialQuery = "", compact = false }: { initialQuery?: string; compact?: boolean }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const { play } = usePlayer();
  useEffect(() => { api<Song[]>("/api/songs").then(setSongs).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => songs.filter((song) => {
    const text = `${song.title} ${song.artist || ""} ${song.album || ""} ${song.tags.join(" ")}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "all" || (status === "favorites" ? song.favorite : song.learningStatus === "learning"));
  }), [songs, query, status]);
  async function addSong() {
    const title = prompt("歌曲名称");
    if (!title?.trim()) return;
    try { const result = await api<{ id: number }>("/api/songs", json("POST", { title })); router.push(`/songs/${result.id}`); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }
  return <section><div className="page-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h1>{compact ? "最近添加" : "音乐资料库"}</h1><p>{compact ? "继续探索你的音乐世界" : "所有歌曲、歌词、乐谱与学习笔记，都在这里。"}</p></div><div className="heading-actions">{compact ? <Link className="text-link" href="/library">查看全部 →</Link> : <button className="primary-button" onClick={addSong}><Plus size={17}/> 添加歌曲</button>}</div></div>
    {!compact && <div className="library-toolbar"><div className="inline-search"><Search size={18}/><input placeholder="搜索歌曲、艺术家、专辑或标签" value={query} onChange={(event) => setQuery(event.target.value)}/></div><select aria-label="筛选歌曲" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部歌曲</option><option value="favorites">收藏</option><option value="learning">正在学习</option></select><div className="view-switch"><button className={view === "grid" ? "selected" : ""} aria-label="网格视图" onClick={() => setView("grid")}><Grid2X2 size={17}/></button><button className={view === "list" ? "selected" : ""} aria-label="列表视图" onClick={() => setView("list")}><List size={18}/></button></div></div>}
    {error && <div className="alert">{error}</div>}
    {loading ? <div className="empty-state">正在读取资料库…</div> : filtered.length === 0 ? <div className="empty-state"><Music2 size={38}/><h3>{songs.length ? "没有匹配的歌曲" : "你的音乐空间从这里开始"}</h3><p>{songs.length ? "试试其他搜索词或筛选条件。" : "在设置中配置音乐文件夹并扫描，或者手动添加一首歌曲。"}</p><Link className="secondary-button" href="/settings">前往设置</Link></div> : view === "grid" || compact ? <div className="song-grid">{filtered.slice(0, compact ? 8 : undefined).map((song) => <SongCard key={song.id} song={song} queue={filtered}/>)}</div> : <div className="song-list"><div className="song-row song-row-head"><span>歌曲</span><span>专辑</span><span>调</span><span>BPM</span><span>标签</span><span>资源</span><span></span></div>{filtered.map((song) => <div className="song-row" key={song.id}><div className="row-song"><div className="row-cover">{song.coverPath ? <img src={`/api/cover/${song.id}`} alt=""/> : "♪"}</div><div><Link href={`/songs/${song.id}`}>{song.title}</Link><small>{song.artist || "未知艺术家"}</small></div></div><span>{song.album || "—"}</span><span>{song.musicalKey || "—"}</span><span>{song.bpm ?? "—"}</span><span>{song.tags.join(", ") || "—"}</span><span className="resource-pills">{song.audioPath && <span title="音频">♫</span>} {song.lyrics && <span title="歌词">≡</span>} {song.scoreCount > 0 && <span title={`${song.scoreCount} 份乐谱`}>♬</span>} {song.chords && <span title="和弦">C</span>}</span><button disabled={!song.audioPath || song.fileMissing} onClick={() => play(song, filtered)} aria-label="播放"><Play size={17}/></button></div>)}</div>}
  </section>;
}
