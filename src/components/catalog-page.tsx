"use client";
import { useEffect, useMemo, useState } from "react";
import { Disc3, Music2 } from "lucide-react";
import { api, type Song } from "@/lib/types";
import { SongCard } from "./song-card";

export function CatalogPage({ kind }: { kind: "artists" | "albums" }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { api<Song[]>("/api/songs").then(setSongs).catch(() => {}); }, []);
  const key = kind === "artists" ? "artist" : "album";
  const groups = useMemo(() => [...new Set(songs.map((song) => song[key]).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "zh-CN")), [songs, key]);
  const visible = selected ? songs.filter((song) => song[key] === selected) : [];
  return <section><div className="page-heading"><div><span className="eyebrow">EXPLORE YOUR LIBRARY</span><h1>{kind === "artists" ? "艺术家" : "专辑"}</h1><p>{kind === "artists" ? "从创作者出发，重新发现熟悉的声音。" : "按专辑整理你的音乐记忆。"}</p></div></div>{!selected ? groups.length ? <div className="catalog-grid">{groups.map((name) => { const count = songs.filter((song) => song[key] === name).length; const cover = songs.find((song) => song[key] === name && song.coverPath); return <button className="catalog-card" key={name} onClick={() => setSelected(name)}><div className="catalog-art">{cover ? <img src={`/api/cover/${cover.id}`} alt=""/> : kind === "artists" ? <Music2 size={42}/> : <Disc3 size={42}/>}</div><h2>{name}</h2><p>{count} 首歌曲</p></button>; })}</div> : <div className="empty-state">扫描音乐后，艺术家和专辑会自动出现在这里。</div> : <><button className="back-link" onClick={() => setSelected(null)}>← 返回{kind === "artists" ? "艺术家" : "专辑"}</button><div className="catalog-title"><h2>{selected}</h2><p>{visible.length} 首歌曲</p></div><div className="song-grid">{visible.map((song) => <SongCard key={song.id} song={song} queue={visible}/>)}</div></>}</section>;
}
