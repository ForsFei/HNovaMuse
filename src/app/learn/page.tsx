"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Headphones, Piano } from "lucide-react";
import { lessons } from "@/lib/lessons";
import { api } from "@/lib/types";

export default function LearnPage() {
  const [completed, setCompleted] = useState<string[]>([]);
  useEffect(() => { api<{ slug: string }[]>("/api/lessons").then((rows) => setCompleted(rows.map((row) => row.slug))).catch(() => {}); }, []);
  return <section><div className="page-heading"><div><span className="eyebrow">LEARN BY LISTENING</span><h1>从声音开始</h1><p>听一听、看一看、动手试，再认识乐理的名字。</p></div></div><div className="learn-banner"><div className="learn-banner-icon"><Headphones size={34}/></div><div><span>你的学习路线</span><h2>音乐，从好奇的第一声开始。</h2><p>每节课只认识一个概念，没有复杂的术语和压力。</p><div className="progress-track"><div style={{ width: `${completed.length / lessons.length * 100}%` }}/></div><small>{completed.length} / {lessons.length} 节已完成</small></div></div><div className="section-caption"><h2>基础课程</h2><p>按照自己的节奏，一课一课往前走。</p></div><div className="lesson-grid">{lessons.map((lesson) => <Link href={`/learn/${lesson.slug}`} className={`lesson-card ${lesson.color}`} key={lesson.slug}><span className="lesson-number">{lesson.number}</span><div className="lesson-icon">{completed.includes(lesson.slug) ? <Check size={22}/> : <Piano size={22}/>}</div><h3>{lesson.title}</h3><p>{lesson.question}</p><span className="lesson-link">{completed.includes(lesson.slug) ? "再次体验" : "开始学习"} <ArrowRight size={16}/></span></Link>)}</div></section>;
}
