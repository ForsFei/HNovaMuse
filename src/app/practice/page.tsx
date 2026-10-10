"use client";
import { useState } from "react";
import { Headphones, RefreshCw, Play } from "lucide-react";
import { InteractivePiano, playNotes } from "@/components/interactive-piano";

type Mode = "notes" | "interval" | "chord";
const names = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
function newQuestion(mode: Mode) {
  if (mode === "notes") { const note = names[Math.floor(Math.random() * names.length)]; return { notes: [note], answer: note[0], options: ["C", "D", "E", "F", "G", "A", "B"], question: "亮起的是哪个音？" }; }
  if (mode === "interval") { const a = Math.floor(Math.random() * names.length), b = Math.floor(Math.random() * names.length); return { notes: [names[a], names[b]], answer: a === b ? "相同" : b > a ? "更高" : "更低", options: ["更高", "更低", "相同"], question: "第二个声音比第一个？" }; }
  const minor = Math.random() > 0.5; return { notes: minor ? ["C4", "D#4", "G4"] : ["C4", "E4", "G4"], answer: minor ? "暗一些" : "明亮", options: ["明亮", "暗一些"], question: "这个和弦听起来？" };
}
export default function PracticePage() {
  const [mode, setMode] = useState<Mode>("notes");
  const [question, setQuestion] = useState(() => newQuestion("notes"));
  const [answer, setAnswer] = useState<string | null>(null);
  function changeMode(next: Mode) { setMode(next); setQuestion(newQuestion(next)); setAnswer(null); }
  function next() { setQuestion(newQuestion(mode)); setAnswer(null); }
  return <section><div className="page-heading"><div><span className="eyebrow">A LITTLE PRACTICE</span><h1>用耳朵试一试</h1><p>几道轻松的小练习，帮助你把听到的声音和概念连起来。</p></div></div><div className="practice-tabs"><button className={mode === "notes" ? "selected" : ""} onClick={() => changeMode("notes")}>认识音名</button><button className={mode === "interval" ? "selected" : ""} onClick={() => changeMode("interval")}>比较高低</button><button className={mode === "chord" ? "selected" : ""} onClick={() => changeMode("chord")}>感受和弦</button></div><div className="practice-card"><div className="practice-symbol"><Headphones size={32}/></div><span className="eyebrow">LISTEN & ANSWER</span><h2>{question.question}</h2><button className="primary-button" onClick={() => playNotes(question.notes, mode === "chord")}><Play size={17}/> 播放声音</button>{mode === "notes" && <div className="practice-piano"><InteractivePiano highlighted={[question.notes[0]]}/></div>}<div className="quiz-choices practice-choices">{question.options.map((option) => <button key={option} className={answer === option ? option === question.answer ? "correct" : "incorrect" : ""} onClick={() => setAnswer(option)}>{option}</button>)}</div>{answer && <div className="practice-feedback"><strong>{answer === question.answer ? "答对了！" : `再听听，正确答案是 ${question.answer}。`}</strong><button className="secondary-button" onClick={next}><RefreshCw size={16}/> 下一题</button></div>}</div></section>;
}
