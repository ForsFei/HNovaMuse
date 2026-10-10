import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listSongs } from "@/lib/library";
import { songs } from "@/lib/schema";
import { fail, mutationAllowed } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return NextResponse.json(listSongs(request.nextUrl.searchParams.get("q") || ""));
}

export async function POST(request: NextRequest) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  try {
    const body = await request.json();
    if (typeof body.title !== "string" || !body.title.trim()) throw new Error("请填写歌名");
    const now = Date.now();
    const inserted = db.insert(songs).values({ title: body.title.trim(), dateAdded: now, updatedAt: now }).run();
    return NextResponse.json({ id: Number(inserted.lastInsertRowid) }, { status: 201 });
  } catch (error) { return fail(error); }
}
