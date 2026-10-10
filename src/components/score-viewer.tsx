"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Printer } from "lucide-react";
import type { Score } from "@/lib/types";

export function ScoreViewer({ score }: { score: Score }) {
  const container = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    if (score.kind !== "musicxml" || !container.current) return;
    let cancelled = false;
    container.current.innerHTML = "";
    (async () => {
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled || !container.current) return;
        const osmd = new OpenSheetMusicDisplay(container.current, { autoResize: true, drawTitle: true });
        await osmd.load(`/api/scores/${score.id}`);
        if (cancelled) return;
        osmd.zoom = zoom;
        osmd.render();
        setPages(Math.max(1, container.current?.querySelectorAll(".osmdPage").length || 1));
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); }
    })();
    return () => { cancelled = true; };
  }, [score.id, score.kind, zoom]);
  const goPage = (next: number) => { setPage(next); const pageNode = container.current?.querySelectorAll(".osmdPage")[next - 1]; pageNode?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  if (score.kind === "pdf") return <iframe className="score-frame" title={score.title} src={`/api/scores/${score.id}`}/>;
  if (score.kind === "image") return <div className="score-image"><img src={`/api/scores/${score.id}`} alt={score.title}/></div>;
  return <div className="score-shell"><div className="score-toolbar"><button onClick={() => setZoom(Math.max(0.5, zoom - 0.15))} title="缩小"><Minus size={17}/></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(2, zoom + 0.15))} title="放大"><Plus size={17}/></button><button onClick={() => setZoom(1)} title="适合宽度"><Maximize2 size={17}/></button><span className="toolbar-gap"/><button disabled={page <= 1} onClick={() => goPage(page - 1)} title="上一页"><ChevronLeft size={17}/></button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => goPage(page + 1)} title="下一页"><ChevronRight size={17}/></button><button onClick={() => window.print()} title="打印"><Printer size={17}/></button></div>{error && <div className="alert">乐谱加载失败：{error}</div>}<div ref={container} className="osmd-container"/></div>;
}
