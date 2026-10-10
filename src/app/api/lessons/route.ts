import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessonProgress } from "@/lib/schema";
import { lessons } from "@/lib/lessons";
import { fail, mutationAllowed } from "@/lib/http";
export const runtime = "nodejs";
export function GET() { return NextResponse.json(db.select().from(lessonProgress).all()); }
export async function POST(request: NextRequest) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  const { slug } = await request.json();
  if (!lessons.some((lesson) => lesson.slug === slug)) return fail("课程不存在", 404);
  db.insert(lessonProgress).values({ slug, completedAt: Date.now() }).onConflictDoUpdate({ target: lessonProgress.slug, set: { completedAt: Date.now() } }).run();
  return NextResponse.json({ ok: true });
}
