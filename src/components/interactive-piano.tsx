"use client";
import { useCallback, useEffect, useState } from "react";

const keys = ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"];
const whiteKeys = keys.filter((key) => !key.includes("#"));
const keyboard: Record<string, string> = { a: "C4", w: "C#4", s: "D4", e: "D#4", d: "E4", f: "F4", t: "F#4", g: "G4", y: "G#4", h: "A4", u: "A#4", j: "B4", k: "C5" };
export async function playNotes(notes: string[], together = false) {
  const Tone = await import("tone");
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  if (together) synth.triggerAttackRelease(notes, "2n");
  else notes.forEach((note, index) => synth.triggerAttackRelease(note, "8n", Tone.now() + index * 0.42));
  setTimeout(() => synth.dispose(), Math.max(2000, notes.length * 450 + 800));
}
export function InteractivePiano({ highlighted = [], onNote }: { highlighted?: string[]; onNote?: (note: string) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const trigger = useCallback((note: string) => { setActive(note); onNote?.(note); void playNotes([note]); setTimeout(() => setActive(null), 350); }, [onNote]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const note = keyboard[event.key.toLowerCase()]; if (note) trigger(note);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [trigger]);
  return <div><div className="piano" role="group" aria-label="互动钢琴键盘">{whiteKeys.map((note) => <button key={note} className={`white-key ${highlighted.includes(note) ? "highlighted" : ""} ${active === note ? "active" : ""}`} onClick={() => trigger(note)}><span>{note.replace("4", "").replace("5", "")}</span></button>)}{keys.filter((key) => key.includes("#")).map((note) => { const position: Record<string, number> = { "C#4": 1, "D#4": 2, "F#4": 4, "G#4": 5, "A#4": 6 }; return <button key={note} aria-label={note} className={`black-key ${highlighted.includes(note) ? "highlighted" : ""} ${active === note ? "active" : ""}`} style={{ left: `${(position[note] / whiteKeys.length) * 100}%` }} onClick={() => trigger(note)}/>; })}</div><p className="piano-hint">点击琴键，或按键盘 A–K / W E T Y U</p></div>;
}
