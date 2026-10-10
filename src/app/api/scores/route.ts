import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scores, songs } from "@/lib/schema";
import { allowedResourcePath, scoreKind } from "@/lib/paths";
import { fail, mutationAllowed } from "@/lib/http";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  try {
    const body = await request.json();
    const songId = Number(body.songId);
    if (!db.select().from(songs).where(eq(songs.id, songId)).get()) return fail("歌曲不存在", 404);
    const filePath = allowedResourcePath(String(body.path));
    if (!fs.statSync(filePath).isFile()) throw new Error("乐谱必须是文件");
    const kind = scoreKind(filePath);
    const inserted = db.insert(scores).values({ songId, title: String(body.title || path.basename(filePath)), filePath, kind }).run();
    return NextResponse.json({ id: Number(inserted.lastInsertRowid) }, { status: 201 });
  } catch (error) { return fail(error); }
}
