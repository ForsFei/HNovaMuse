"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disc3, Music2, Save } from "lucide-react";
import { api, json, type Catalog, type Song } from "@/lib/types";
import { SongCard } from "./song-card";

export function CatalogPage({ kind, selectedId }: { kind: "artists" | "albums"; selectedId: number | null }) {
  const [catalog, setCatalog] = useState<Catalog>({ artists: [], albums: [] });
  const [songs, setSongs] = useState<Song[]>([]);
  const [draft, setDraft] = useState({ id: null as number | null, description: "", year: "" });
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => {
    Promise.all([api<Catalog>("/api/catalog"), api<Song[]>("/api/songs")])
      .then(([data, songList]) => { setCatalog(data); setSongs(songList); })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);
  const entries = kind === "artists" ? catalog.artists : catalog.albums;
  const selected = entries.find((entry) => entry.id === selectedId);
  const selectedDescription = selected?.description || "";
  const selectedYear = selected && "year" in selected ? String(selected.year ?? "") : "";
  const description = draft.id === selectedId ? draft.description : selectedDescription;
  const year = draft.id === selectedId ? draft.year : selectedYear;
  const setDescription = (value: string) => setDraft({ id: selectedId, description: value, year });
  const setYear = (value: string) => setDraft({ id: selectedId, description, year: value });
  const visible = selected ? songs.filter((song) => kind === "artists" ? song.artistId === selected.id : song.albumId === selected.id) : [];
  const artistAlbums = kind === "artists" && selected ? catalog.albums.filter((album) => album.artistId === selected.id) : [];
  async function save() {
    if (!selected) return;
    try {
      const updated = await api<Catalog>("/api/catalog", json("PATCH", { kind: kind === "artists" ? "artist" : "album", id: selected.id, description, year }));
      setCatalog(updated); setMessage("资料已保存");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  return <section>
    <div className="page-heading"><div><span className="eyebrow">EXPLORE YOUR LIBRARY</span><h1>{kind === "artists" ? "艺术家" : "专辑"}</h1><p>{kind === "artists" ? "从创作者出发，重新发现熟悉的声音。" : "按专辑整理你的音乐记忆。"}</p></div></div>
    {message && <div className="alert">{message}</div>}
    {!selected ? entries.length ? <div className="catalog-grid">{entries.map((entry) => {
      const name = "name" in entry ? entry.name : entry.title;
      return <button className="catalog-card" key={entry.id} onClick={() => router.push(`/${kind}?selected=${entry.id}`)}><div className="catalog-art">{entry.coverSongId ? <img src={`/api/cover/${entry.coverSongId}`} alt=""/> : kind === "artists" ? <Music2 size={42}/> : <Disc3 size={42}/>}</div><h2>{name}</h2><p>{entry.songCount} 首歌曲{"artistName" in entry && entry.artistName ? ` · ${entry.artistName}` : ""}</p></button>;
    })}</div> : <div className="empty-state">扫描音乐后，艺术家和专辑会自动出现在这里。</div> : <>
      <button className="back-link" onClick={() => router.push(`/${kind}`)}>← 返回{kind === "artists" ? "艺术家" : "专辑"}</button>
      <div className="catalog-title"><div><h2>{"name" in selected ? selected.name : selected.title}</h2><p>{visible.length} 首歌曲{"albumCount" in selected ? ` · ${selected.albumCount} 张专辑` : ""}{"artistName" in selected && selected.artistName ? ` · ${selected.artistName}` : ""}</p></div></div>
      <section className="panel catalog-editor"><h3>{kind === "artists" ? "艺术家资料" : "专辑资料"}</h3>{kind === "albums" && <label>发行年份<input type="number" value={year} onChange={(event) => setYear(event.target.value)}/></label>}<label>简介<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="添加自己的整理说明…"/></label><button className="secondary-button" onClick={save}><Save size={16}/> 保存资料</button></section>
      {artistAlbums.length > 0 && <><h3 className="catalog-subheading">专辑</h3><div className="catalog-grid">{artistAlbums.map((album) => <Link className="catalog-card" href={`/albums?selected=${album.id}`} key={album.id}><div className="catalog-art">{album.coverSongId ? <img src={`/api/cover/${album.coverSongId}`} alt=""/> : <Disc3 size={42}/>}</div><h2>{album.title}</h2><p>{album.songCount} 首歌曲</p></Link>)}</div></>}
      <h3 className="catalog-subheading">歌曲</h3><div className="song-grid">{visible.map((song) => <SongCard key={song.id} song={song} queue={visible}/>)}</div>
    </>}
  </section>;
}
