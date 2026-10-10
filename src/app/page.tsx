"use client";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Disc3, FolderHeart, Music2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Song } from "@/lib/types";
import { LibraryView } from "@/components/library-view";

export default function HomePage() {
  const [songs, setSongs] = useState<Song[]>([]);
  useEffect(() => { api<Song[]>("/api/songs").then(setSongs).catch(() => {}); }, []);
  return <><section className="home-hero"><div className="hero-copy"><span className="eyebrow">PERSONAL MUSIC LIBRARY</span><h1>让每一首歌，<br/><em>都有自己的故事。</em></h1><p>收藏声音，也收藏歌词、乐谱和每一次学习的发现。</p><Link className="primary-button" href="/library">打开资料库 <ArrowUpRight size={18}/></Link></div><div className="hero-art"><span className="hero-orbit orbit-a"/><span className="hero-orbit orbit-b"/><div className="hero-disc"><div className="hero-disc-inner">M</div></div><span className="hero-note note-one">♫</span><span className="hero-note note-two">♪</span></div></section><div className="stat-row"><div><Disc3 size={20}/><strong>{songs.length}</strong><span>首歌曲</span></div><div><Music2 size={20}/><strong>{new Set(songs.map((song) => song.artist).filter(Boolean)).size}</strong><span>位艺术家</span></div><div><FolderHeart size={20}/><strong>{songs.filter((song) => song.favorite).length}</strong><span>首收藏</span></div></div><LibraryView compact/><section className="learn-teaser"><div><BookOpen size={25}/><h2>从听见开始，慢慢理解音乐。</h2><p>零基础互动课程，让音高、节奏与和弦变得直观。</p></div><Link className="secondary-button" href="/learn">探索学习 →</Link></section></>;
}
