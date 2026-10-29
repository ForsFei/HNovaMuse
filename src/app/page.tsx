"use client";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Disc3, FolderHeart, Music2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Song } from "@/lib/types";
import { LibraryView } from "@/components/library-view";
import { SongCard } from "@/components/song-card";
import { lessons } from "@/lib/lessons";

export default function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [recentIds] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("muse-recent-songs") || "[]") as number[]; } catch { return []; }
  });
  const [completed, setCompleted] = useState<string[]>([]);
  useEffect(() => {
    api<Song[]>("/api/songs").then(setSongs).catch(() => {});
    api<{ slug: string }[]>("/api/lessons").then((rows) => setCompleted(rows.map((row) => row.slug))).catch(() => {});
  }, []);
  const recent = recentIds.map((id) => songs.find((song) => song.id === id)).filter((song): song is Song => Boolean(song)).slice(0, 4);
  const nextLesson = lessons.find((lesson) => !completed.includes(lesson.slug));
  return <><section className="home-hero"><div className="hero-copy"><span className="eyebrow">PERSONAL MUSIC LIBRARY</span><h1>让每一首歌，<br/><em>都有自己的故事。</em></h1><p>收藏声音，也收藏歌词、乐谱和每一次学习的发现。</p><Link className="primary-button" href="/library">打开资料库 <ArrowUpRight size={18}/></Link></div><div className="hero-art"><span className="hero-orbit orbit-a"/><span className="hero-orbit orbit-b"/><div className="hero-disc"><div className="hero-disc-inner">M</div></div><span className="hero-note note-one">♫</span><span className="hero-note note-two">♪</span></div></section><div className="stat-row"><div><Disc3 size={20}/><strong>{songs.length}</strong><span>首歌曲</span></div><div><Music2 size={20}/><strong>{new Set(songs.map((song) => song.artist).filter(Boolean)).size}</strong><span>位艺术家</span></div><div><FolderHeart size={20}/><strong>{songs.filter((song) => song.favorite).length}</strong><span>首收藏</span></div></div><LibraryView compact/>{recent.length > 0 && <section className="home-recent"><div className="section-caption"><h2>最近浏览</h2><p>接着整理这些歌曲。</p></div><div className="song-grid">{recent.map((song) => <SongCard key={song.id} song={song} queue={recent}/>)}</div></section>}<section className="learn-teaser"><div><BookOpen size={25}/><h2>{nextLesson ? "继续学习" : "课程已全部完成"}</h2><p>{nextLesson ? `${completed.length} / ${lessons.length} 节已完成 · 下一课：${nextLesson.title}` : `已完成 ${lessons.length} 节课程，可以随时重温。`}</p></div><Link className="secondary-button" href={nextLesson ? `/learn/${nextLesson.slug}` : "/learn"}>{nextLesson ? "继续 →" : "查看课程 →"}</Link></section></>;
}
