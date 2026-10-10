"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import Link from "next/link";
import type { Song } from "@/lib/types";

type PlayerContextType = { song: Song | null; currentTime: number; duration: number; playing: boolean; play: (song: Song, queue?: Song[]) => void; seek: (time: number) => void; toggle: () => void };
const PlayerContext = createContext<PlayerContextType | null>(null);
export function usePlayer() { const value = useContext(PlayerContext); if (!value) throw new Error("PlayerProvider missing"); return value; }
const format = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Song[]>([]);
  const [song, setSong] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const play = useCallback((next: Song, nextQueue?: Song[]) => {
    if (!next.audioPath || next.fileMissing) return;
    if (nextQueue) queue.current = nextQueue.filter((item) => item.audioPath && !item.fileMissing);
    if (!audio.current) return;
    if (song?.id !== next.id) { audio.current.src = `/api/media/${next.id}`; setSong(next); }
    void audio.current.play().catch(() => setPlaying(false));
  }, [song]);
  const seek = useCallback((time: number) => { if (audio.current) audio.current.currentTime = time; }, []);
  const toggle = useCallback(() => { if (!audio.current) return; if (audio.current.paused) void audio.current.play(); else audio.current.pause(); }, []);
  const skip = (direction: number) => {
    if (!song) return;
    const index = queue.current.findIndex((item) => item.id === song.id);
    const next = queue.current[index + direction];
    if (next) play(next);
  };
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  return <PlayerContext.Provider value={{ song, currentTime, duration, playing, play, seek, toggle }}>
    {children}
    <audio ref={audio} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => skip(1)} />
    {song && <div className="player">
      <div className="player-track"><div className="player-cover">{song.coverPath ? <img src={`/api/cover/${song.id}`} alt="" /> : <span>♪</span>}</div><div><Link href={`/songs/${song.id}`}>{song.title}</Link><small>{song.artist || "未知艺术家"}</small></div></div>
      <div className="player-main"><div className="player-controls"><button aria-label="上一首" onClick={() => skip(-1)}><SkipBack size={17}/></button><button className="play-round" aria-label={playing ? "暂停" : "播放"} onClick={toggle}>{playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}</button><button aria-label="下一首" onClick={() => skip(1)}><SkipForward size={17}/></button></div><div className="timeline"><span>{format(currentTime)}</span><input aria-label="播放进度" type="range" min={0} max={duration || 1} value={Math.min(currentTime, duration || 1)} onChange={(event) => seek(Number(event.target.value))}/><span>{format(duration)}</span></div></div>
      <div className="volume"><Volume2 size={18}/><input aria-label="音量" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))}/></div>
    </div>}
  </PlayerContext.Provider>;
}
