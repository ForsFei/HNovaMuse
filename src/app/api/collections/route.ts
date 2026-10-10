import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { collections, collectionSongs } from "@/lib/schema";
import { fail, mutationAllowed } from "@/lib/http";

export const runtime = "nodejs";
export function GET() {
  return NextResponse.json(db.select().from(collections).all().map((collection) => ({
    ...collection,
    songIds: db.select({ id: collectionSongs.songId }).from(collectionSongs).where(eq(collectionSongs.collectionId, collection.id)).all().map((row) => row.id),
  })));
}
export async function POST(request: NextRequest) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  try {
    const body = await request.json();
    if (!String(body.name || "").trim()) throw new Error("请填写歌单名称");
    const inserted = db.insert(collections).values({ name: String(body.name).trim(), description: String(body.description || ""), createdAt: Date.now() }).run();
    return NextResponse.json({ id: Number(inserted.lastInsertRowid) }, { status: 201 });
  } catch (error) { return fail(error); }
}
