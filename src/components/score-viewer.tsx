"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Printer } from "lucide-react";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { Score } from "@/lib/types";

export function ScoreViewer({ score }: { score: Score }) {
  const container = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<{ id: number; message: string } | null>(null);
  useEffect(() => {
    if (score.kind !== "musicxml" || !container.current) return;
    let cancelled = false;
    const target = container.current;
    target.innerHTML = "";
    osmdRef.current = null;
    (async () => {
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled) return;
        const osmd = new OpenSheetMusicDisplay(target, { autoResize: true, drawTitle: true });
        await osmd.load(`/api/scores/${score.id}`);
        if (cancelled) return;
        osmd.zoom = zoomRef.current;
        osmd.render();
        osmdRef.current = osmd;
        setPages(Math.max(1, target.querySelectorAll(".osmdPage").length));
        setPage(1);
      } catch (err) { if (!cancelled) setError({ id: score.id, message: err instanceof Error ? err.message : String(err) }); }
    })();
    return () => { cancelled = true; osmdRef.current = null; };
  }, [score.id, score.kind]);
  useEffect(() => {
    zoomRef.current = zoom;
    const osmd = osmdRef.current;
    if (!osmd || !container.current) return;
    osmd.zoom = zoom;
    osmd.render();
    setPages(Math.max(1, container.current.querySelectorAll(".osmdPage").length));
  }, [zoom]);
  const fitWidth = () => {
    const target = container.current;
    const rendered = target?.querySelector(".osmdPage svg") || target?.querySelector("svg");
    const width = rendered?.getBoundingClientRect().width || 0;
    if (!target || !width) return;
    setZoom(Math.min(2, Math.max(0.4, zoom * (target.clientWidth - 24) / width)));
  };
  const goPage = (next: number) => { setPage(next); container.current?.querySelectorAll(".osmdPage")[next - 1]?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  if (score.kind === "pdf") return <iframe className="score-frame" title={score.title} src={`/api/scores/${score.id}`}/>;
  if (score.kind === "image") return <div className="score-image"><img src={`/api/scores/${score.id}`} alt={score.title}/></div>;
  return <div className="score-shell score-print"><div className="score-toolbar"><button onClick={() => setZoom(Math.max(0.4, zoom - 0.15))} title="缩小"><Minus size={17}/></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(2, zoom + 0.15))} title="放大"><Plus size={17}/></button><button onClick={fitWidth} title="适合宽度"><Maximize2 size={17}/></button><span className="toolbar-gap"/><button disabled={page <= 1} onClick={() => goPage(page - 1)} title="上一页"><ChevronLeft size={17}/></button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => goPage(page + 1)} title="下一页"><ChevronRight size={17}/></button><button onClick={() => window.print()} title="打印乐谱"><Printer size={17}/></button></div>{error?.id === score.id && <div className="alert">乐谱加载失败：{error.message}</div>}<div ref={container} className="osmd-container"/></div>;
}
