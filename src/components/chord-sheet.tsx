"use client";
import { useState } from "react";
import { Chord } from "@tonaljs/tonal";
import { Play } from "lucide-react";
import Link from "next/link";

export function ChordSheet({ text }: { text: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const chord = selected ? Chord.get(selected) : null;
  async function sound() {
    if (!chord?.notes.length) return;
    const Tone = await import("tone");
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.triggerAttackRelease(chord.notes.map((note) => `${note}4`), "2n");
    setTimeout(() => synth.dispose(), 2000);
  }
  return <div><div className="chord-sheet">{text.split("\n").map((line, index) => <div key={index}>{line.split(/(\[[A-G][^\]]*\]|\b[A-G](?:#|b)?(?:m|maj|dim|aug|sus)?\d*\b)/g).map((part, piece) => { const name = part.startsWith("[") ? part.slice(1, -1) : part; return Chord.get(name).notes.length ? <button key={piece} className="chord-token" onClick={() => setSelected(name)}>{name}</button> : <span key={piece}>{part}</span>; })}</div>)}</div>{selected && chord && <div className="chord-popover"><button className="close-inline" onClick={() => setSelected(null)}>×</button><strong>{chord.name || selected}</strong><p>{chord.notes.join(" · ")}</p><button className="secondary-button" onClick={sound}><Play size={15}/> 听和弦</button><Link href="/learn/chords">了解和弦 →</Link></div>}</div>;
}
