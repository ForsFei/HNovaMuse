"use client";
import Link from "next/link";
import { Play } from "lucide-react";
import { usePlayer } from "./player-provider";
import type { Song } from "@/lib/types";

export function SongCard({ song, queue }: { song: Song; queue: Song[] }) {
  const { play } = usePlayer();
  return <article className="song-card"><div className="artwork"><Link href={`/songs/${song.id}`} aria-label={`查看 ${song.title}`} className="artwork-link">{song.coverPath ? <img src={`/api/cover/${song.id}`} alt=""/> : <span className="artwork-symbol">♪</span>}</Link>{song.audioPath && !song.fileMissing && <button className="card-play" title="播放" onClick={() => play(song, queue)}><Play size={20} fill="currentColor"/></button>}</div><div className="song-meta"><Link href={`/songs/${song.id}`} className="song-title">{song.title}</Link><p>{song.artist || "未知艺术家"}</p><small>{[song.album, song.year].filter(Boolean).join(" · ") || "独立歌曲"}</small></div></article>;
}
