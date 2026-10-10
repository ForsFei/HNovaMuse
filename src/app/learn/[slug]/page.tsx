"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Play } from "lucide-react";
import { lessons } from "@/lib/lessons";
import { api, json } from "@/lib/types";
import { InteractivePiano, playNotes } from "@/components/interactive-piano";

export default function LessonPage() {
  const { slug } = useParams<{ slug: string }>();
  const lesson = lessons.find((item) => item.slug === slug);
  const [answer, setAnswer] = useState<number | null>(null);
  const [pitch, setPitch] = useState(50);
  const [completed, setCompleted] = useState(false);
  if (!lesson) return <div className="empty-state">课程不存在</div>;
  const index = lessons.indexOf(lesson);
  async function playPitch(value: number) { const Tone = await import("tone"); await Tone.start(); const synth = new Tone.Synth().toDestination(); synth.triggerAttackRelease(110 * 2 ** (value / 33), "4n"); setTimeout(() => synth.dispose(), 1200); }
  async function choose(index: number) { setAnswer(index); if (index === lesson!.correct) { await api("/api/lessons", json("POST", { slug })); setCompleted(true); } }
  return <div className="lesson-page"><Link href="/learn" className="back-link"><ArrowLeft size={17}/> 返回课程</Link><div className="lesson-header"><span className="eyebrow">LESSON {lesson.number}</span><h1>{lesson.title}</h1><p>{lesson.question}</p></div><div className="lesson-flow"><div className="lesson-step"><span className="step-label">01 · 想一想</span><p>{lesson.explanation}</p></div><div className="lesson-step"><span className="step-label">02 · 听一听</span><p>{lesson.example}</p>{slug === "pitch" ? <div className="pitch-slider"><span>低</span><input type="range" min="0" max="100" value={pitch} onChange={(e) => { setPitch(Number(e.target.value)); void playPitch(Number(e.target.value)); }}/><span>高</span></div> : <button className="secondary-button" onClick={() => playNotes(lesson.notes, slug === "chords")}><Play size={16}/> 听示例</button>}</div><div className="lesson-step"><span className="step-label">03 · 动手试</span><InteractivePiano highlighted={lesson.notes}/></div><div className="lesson-step"><span className="step-label">04 · 认识名字</span><div className="term-card">{lesson.term}</div></div><div className="lesson-step"><span className="step-label">05 · 小问题</span><h2>{lesson.prompt}</h2><div className="quiz-choices">{lesson.choices.map((choice, index) => <button key={choice} className={answer === index ? index === lesson.correct ? "correct" : "incorrect" : ""} onClick={() => choose(index)}>{choice}{answer === index && index === lesson.correct && <Check size={17}/>}</button>)}</div>{answer !== null && <p className={answer === lesson.correct ? "quiz-success" : "quiz-error"}>{answer === lesson.correct ? "答对了！你已经理解这个概念。" : "再听一次，然后重新试试。"}</p>}</div></div><div className="lesson-footer">{completed && index + 1 < lessons.length && <Link className="primary-button" href={`/learn/${lessons[index + 1].slug}`}>下一课 <ArrowRight size={17}/></Link>}</div></div>;
}
