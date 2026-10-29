"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderHeart, Plus, Trash2 } from "lucide-react";
import { api, json, type Collection, type Song } from "@/lib/types";
import { SongCard } from "@/components/song-card";

function CollectionsContent() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = Number(searchParams.get("selected")) || null;
  const [message, setMessage] = useState("");
  const load = () => { void api<Collection[]>("/api/collections").then(setCollections); void api<Song[]>("/api/songs").then(setSongs); };
  useEffect(load, []);
  async function add() { const name = prompt("新歌单名称"); if (!name?.trim()) return; try { await api("/api/collections", json("POST", { name })); load(); } catch (err) { setMessage(err instanceof Error ? err.message : String(err)); } }
  async function remove(id: number) { if (!confirm("删除歌单？歌曲仍会保留。")) return; await api(`/api/collections/${id}`, { method: "DELETE" }); router.push("/collections"); load(); }
  const active = collections.find((item) => item.id === selected);
  const activeSongs = songs.filter((song) => active?.songIds.includes(song.id));
  return <section><div className="page-heading"><div><span className="eyebrow">CURATED BY YOU</span><h1>歌单</h1><p>按心情、乐器或学习计划，自由整理歌曲。</p></div><button className="primary-button" onClick={add}><Plus size={17}/> 新建歌单</button></div>{message && <div className="alert">{message}</div>}{!active ? collections.length ? <div className="catalog-grid">{collections.map((item) => <button key={item.id} className="catalog-card" onClick={() => router.push(`/collections?selected=${item.id}`)}><div className="catalog-art collection-art"><FolderHeart size={46}/></div><h2>{item.name}</h2><p>{item.songIds.length} 首歌曲</p></button>)}</div> : <div className="empty-state"><FolderHeart size={38}/><h3>还没有歌单</h3><p>创建一个歌单，再从歌曲详情页添加歌曲。</p><button className="secondary-button" onClick={add}>创建歌单</button></div> : <><button className="back-link" onClick={() => router.push("/collections")}>← 返回歌单</button><div className="catalog-title"><h2>{active.name}</h2><button className="danger-link" onClick={() => remove(active.id)}><Trash2 size={16}/> 删除歌单</button></div>{activeSongs.length ? <div className="song-grid">{activeSongs.map((song) => <SongCard key={song.id} song={song} queue={activeSongs}/>)}</div> : <div className="empty-state">这个歌单还没有歌曲。</div>}</>}</section>;
}

export default function CollectionsPage() { return <Suspense fallback={<div className="empty-state">正在读取歌单…</div>}><CollectionsContent/></Suspense>; }
