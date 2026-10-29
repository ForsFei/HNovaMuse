"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileMusic, Heart, Music2, Play, Save, Trash2, Upload } from "lucide-react";
import { api, json, type Collection, type Song } from "@/lib/types";
import { activeLrcIndex, parseLrc } from "@/lib/lrc";
import { usePlayer } from "@/components/player-provider";
import { ScoreViewer } from "@/components/score-viewer";
import { ChordSheet } from "@/components/chord-sheet";
import ReactMarkdown from "react-markdown";

const tabs = ["概览", "歌词", "和弦", "乐谱", "笔记"] as const;
type Tab = typeof tabs[number];

export default function SongPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean | null>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tab, setTab] = useState<Tab>("概览");
  const [message, setMessage] = useState("");
  const [scorePath, setScorePath] = useState("");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const { play, song: playingSong, currentTime, seek } = usePlayer();
  const lyrics = String(form.lyrics || "");
  const lrcLines = useMemo(() => form.lyricsType === "lrc" ? parseLrc(lyrics) : [], [lyrics, form.lyricsType]);
  const active = playingSong?.id === song?.id ? activeLrcIndex(lrcLines, currentTime) : -1;
  const load = useCallback(() => { api<Song>(`/api/songs/${id}`).then((data) => { setSong(data); setForm({ title: data.title, artist: data.artist || "", album: data.album || "", year: data.year, musicalKey: data.musicalKey || "", bpm: data.bpm, description: data.description || "", favorite: data.favorite, learningStatus: data.learningStatus, lyrics: data.lyrics || "", lyricsType: data.lyricsType, chords: data.chords || "", notes: data.notes || "", tags: data.tags.join(", ") }); if (data.scores?.length) setSelectedScore(data.scores[0].id); try { const previous = JSON.parse(localStorage.getItem("muse-recent-songs") || "[]") as number[]; localStorage.setItem("muse-recent-songs", JSON.stringify([data.id, ...previous.filter((item) => item !== data.id)].slice(0, 20))); } catch { localStorage.setItem("muse-recent-songs", JSON.stringify([data.id])); } }).catch((err) => setMessage(err.message)); }, [id]);
  useEffect(() => { load(); api<Collection[]>("/api/collections").then(setCollections).catch(() => {}); }, [load]);
  const set = (key: string, value: string | number | boolean | null) => setForm((old) => ({ ...old, [key]: value }));
  async function save() {
    try {
      const payload = { ...form, year: form.year === "" ? null : Number(form.year) || null, bpm: form.bpm === "" ? null : Number(form.bpm) || null, tags: String(form.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean) };
      await api(`/api/songs/${id}`, json("PATCH", payload)); setMessage("已保存"); load(); setTimeout(() => setMessage(""), 2500);
    } catch (err) { setMessage(err instanceof Error ? err.message : String(err)); }
  }
  async function removeSong() {
    if (!confirm("从资料库移除这首歌？原始音频文件不会删除。")) return;
    await api(`/api/songs/${id}`, { method: "DELETE" }); router.push("/library");
  }
  async function attachScore() {
    try { await api("/api/scores", json("POST", { songId: Number(id), path: scorePath })); setScorePath(""); load(); } catch (err) { setMessage(err instanceof Error ? err.message : String(err)); }
  }
  async function toggleCollection(collection: Collection) {
    try { await api(`/api/collections/${collection.id}`, json("PATCH", { songId: Number(id), remove: collection.songIds.includes(Number(id)) })); setCollections(await api<Collection[]>("/api/collections")); load(); } catch (err) { setMessage(err instanceof Error ? err.message : String(err)); }
  }
  async function importLyrics(file: File) { const text = await file.text(); set("lyrics", text); set("lyricsType", file.name.toLowerCase().endsWith(".lrc") ? "lrc" : "plain"); setTab("歌词"); }
  if (!song) return <div className="empty-state">{message || "正在读取歌曲…"}</div>;
  const score = song.scores?.find((item) => item.id === selectedScore) || song.scores?.[0];
  return <div className="detail-page"><Link href="/library" className="back-link"><ArrowLeft size={17}/> 返回资料库</Link><section className="detail-hero"><div className="detail-cover">{song.coverPath ? <img src={`/api/cover/${song.id}`} alt=""/> : <Music2 size={70}/>}</div><div className="detail-intro"><span className="eyebrow">SONG DETAIL</span><h1>{song.title}</h1><p className="detail-artist">{song.artist || "未知艺术家"}</p><p>{[song.album, song.year].filter(Boolean).join(" · ") || "独立歌曲"}</p><div className="detail-badges">{song.musicalKey && <Link href="/learn/key" title="了解歌曲的调">{song.musicalKey} · 了解调性 →</Link>}{song.bpm && <span>{song.bpm} BPM</span>}{song.fileMissing && <span className="missing">文件已丢失</span>}{song.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="detail-actions"><button className="primary-button" disabled={!song.audioPath || song.fileMissing} onClick={() => play(song)}><Play size={17} fill="currentColor"/> 播放歌曲</button><button className="icon-button" title="收藏" onClick={async () => { await api(`/api/songs/${id}`, json("PATCH", { favorite: !song.favorite })); load(); }}><Heart size={20} fill={song.favorite ? "currentColor" : "none"}/></button></div></div></section><div className="detail-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {message && <div className="alert">{message}</div>}
    {tab === "概览" && <div className="detail-grid"><section className="panel"><div className="panel-heading"><h2>歌曲资料</h2><button className="secondary-button" onClick={save}><Save size={16}/> 保存</button></div><div className="form-grid"><label>歌名<input value={String(form.title || "")} onChange={(e) => set("title", e.target.value)}/></label><label>艺术家<input value={String(form.artist || "")} onChange={(e) => set("artist", e.target.value)}/></label><label>专辑<input value={String(form.album || "")} onChange={(e) => set("album", e.target.value)}/></label><label>年份<input type="number" value={String(form.year ?? "")} onChange={(e) => set("year", e.target.value)}/></label><label>调<input value={String(form.musicalKey || "")} onChange={(e) => set("musicalKey", e.target.value)}/></label><label>BPM<input type="number" value={String(form.bpm ?? "")} onChange={(e) => set("bpm", e.target.value)}/></label><label className="span-two">标签（逗号分隔）<input value={String(form.tags || "")} onChange={(e) => set("tags", e.target.value)}/></label><label>学习状态<select value={String(form.learningStatus || "not_started")} onChange={(e) => set("learningStatus", e.target.value)}><option value="not_started">未开始</option><option value="learning">学习中</option><option value="practicing">练习中</option><option value="learned">已学会</option></select></label><label className="span-two">简介<textarea rows={3} value={String(form.description || "")} onChange={(e) => set("description", e.target.value)}/></label></div></section><aside className="panel"><h2>资源与整理</h2><div className="resource-list"><span>♫ 音频</span><strong>{song.audioPath ? song.fileMissing ? "文件丢失" : "已关联" : "未关联"}</strong><span>≡ 歌词</span><strong>{song.lyrics ? "已添加" : "未添加"}</strong><span>♬ 乐谱</span><strong>{song.scores?.length || 0} 份</strong><span>✎ 笔记</span><strong>{song.notes ? "已添加" : "未添加"}</strong></div>{song.audioPath && <p className="file-path">{song.audioPath}</p>}{song.fileMissing && <button className="secondary-button" onClick={() => { const path = prompt("新的音频完整路径"); if (path) { api(`/api/songs/${id}/relocate`, json("POST", { path })).then(() => { setMessage("音频文件已重新定位"); load(); }).catch((err) => setMessage(err.message)); } }}>重新定位提示</button>}<h3>加入歌单</h3><div className="collection-checks">{collections.map((collection) => <label key={collection.id}><input type="checkbox" checked={collection.songIds.includes(song.id)} onChange={() => toggleCollection(collection)}/>{collection.name}</label>)}</div><button className="danger-link" onClick={removeSong}><Trash2 size={15}/> 从资料库移除</button></aside></div>}
    {tab === "歌词" && <section className="panel content-panel"><div className="panel-heading"><div><h2>歌词</h2><p>可直接编辑，或导入你自己的 TXT / LRC 文件。</p></div><div className="panel-actions"><label className="secondary-button upload-label"><Upload size={16}/> 导入文件<input type="file" accept=".txt,.lrc,text/plain" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void importLyrics(file); }}/></label><button className="primary-button" onClick={save}><Save size={16}/> 保存</button></div></div><div className="segmented"><button className={form.lyricsType === "plain" ? "selected" : ""} onClick={() => set("lyricsType", "plain")}>普通歌词</button><button className={form.lyricsType === "lrc" ? "selected" : ""} onClick={() => set("lyricsType", "lrc")}>LRC 同步歌词</button></div><div className="lyrics-layout"><textarea className="lyrics-editor" placeholder={form.lyricsType === "lrc" ? "[00:12.00]第一句歌词" : "在这里输入歌词…"} value={lyrics} onChange={(e) => set("lyrics", e.target.value)}/><div className="lyrics-preview">{form.lyricsType === "lrc" ? lrcLines.length ? lrcLines.map((line, index) => <button key={index} className={index === active ? "active" : ""} onClick={() => seek(line.time)}>{line.text || "♪"}</button>) : <p>输入 LRC 时间标签后，这里会随播放高亮。点击歌词可跳转播放位置。</p> : <div className="plain-lyrics">{lyrics || "歌词预览将显示在这里。"}</div>}</div></div></section>}
    {tab === "和弦" && <section className="panel content-panel"><div className="panel-heading"><div><h2>和弦</h2><p>输入纯文本或用 [C] 标记和弦；点击和弦可查看组成音。</p></div><button className="primary-button" onClick={save}><Save size={16}/> 保存</button></div><div className="lyrics-layout"><textarea className="lyrics-editor" placeholder="[C]第一句歌词…" value={String(form.chords || "")} onChange={(e) => set("chords", e.target.value)}/><div className="chords-preview"><ChordSheet text={String(form.chords || "")} /></div></div></section>}
    {tab === "乐谱" && <section className="panel content-panel"><div className="panel-heading"><div><h2>乐谱</h2><p>支持 MusicXML / MXL、PDF 和图片。</p></div></div><div className="attach-row"><input placeholder="输入允许目录中的乐谱完整路径" value={scorePath} onChange={(e) => setScorePath(e.target.value)}/><button className="secondary-button" onClick={attachScore}><FileMusic size={16}/> 添加乐谱</button></div>{song.scores?.length ? <><div className="score-tabs">{song.scores.map((item) => <button key={item.id} className={score?.id === item.id ? "selected" : ""} onClick={() => setSelectedScore(item.id)}>{item.title}</button>)}</div>{score && <ScoreViewer score={score}/>}</> : <div className="empty-state">尚未添加乐谱</div>}</section>}
    {tab === "笔记" && <section className="panel content-panel"><div className="panel-heading"><div><h2>学习笔记</h2><p>记录练习时的发现和难点。支持 Markdown 文本。</p></div><button className="primary-button" onClick={save}><Save size={16}/> 保存</button></div><div className="lyrics-layout"><textarea className="notes-editor" placeholder="例如：副歌部分的换和弦需要多练习…" value={String(form.notes || "")} onChange={(e) => set("notes", e.target.value)}/><div className="markdown-preview"><ReactMarkdown>{String(form.notes || "_预览会显示在这里。_")}</ReactMarkdown></div></div></section>}
  </div>;
}


