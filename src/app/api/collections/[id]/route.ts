import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { collections, collectionSongs, songs } from "@/lib/schema";
import { fail, mutationAllowed } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function PATCH(request: NextRequest, { params }: Context) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  try {
    const id = Number((await params).id);
    const body = await request.json();
    if (typeof body.songId === "number") {
      if (!db.select().from(songs).where(eq(songs.id, body.songId)).get()) return fail("歌曲不存在", 404);
      if (body.remove) db.delete(collectionSongs).where(and(eq(collectionSongs.collectionId, id), eq(collectionSongs.songId, body.songId))).run();
      else db.insert(collectionSongs).values({ collectionId: id, songId: body.songId }).onConflictDoNothing().run();
    } else {
      const update: { name?: string; description?: string } = {};
      if (typeof body.name === "string") update.name = body.name.trim();
      if (typeof body.description === "string") update.description = body.description;
      db.update(collections).set(update).where(eq(collections.id, id)).run();
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}
export async function DELETE(request: NextRequest, { params }: Context) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  db.delete(collections).where(eq(collections.id, Number((await params).id))).run();
  return NextResponse.json({ ok: true });
}
