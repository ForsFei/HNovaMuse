import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSong, upsertNamedAlbum, upsertNamedArtist } from "@/lib/library";
import { songs, songTags, tags } from "@/lib/schema";
import { fail, mutationAllowed } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: Context) {
  const song = getSong(Number((await params).id));
  return song ? NextResponse.json(song) : fail("歌曲不存在", 404);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  try {
    const id = Number((await params).id);
    if (!getSong(id)) return fail("歌曲不存在", 404);
    const body = await request.json();
    const textFields = ["title", "musicalKey", "description", "lyrics", "lyricsType", "chords", "notes", "learningStatus"] as const;
    const numberFields = ["bpm", "year", "trackNumber", "discNumber"] as const;
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    for (const key of textFields) if (key in body) {
      if (body[key] !== null && typeof body[key] !== "string") throw new Error(`${key} 格式无效`);
      update[key] = body[key];
    }
    for (const key of numberFields) if (key in body) {
      const value = body[key];
      if (value !== null && (!Number.isInteger(value) || value < 0)) throw new Error(`${key} 格式无效`);
      update[key] = value;
    }
    if (typeof body.title === "string" && !body.title.trim()) throw new Error("歌名不能为空");
    if ("favorite" in body) update.favorite = Boolean(body.favorite);
    if ("artist" in body) {
      if (typeof body.artist !== "string") throw new Error("艺术家格式无效");
      update.artistId = upsertNamedArtist(body.artist);
    }
    if ("album" in body) {
      if (typeof body.album !== "string") throw new Error("专辑格式无效");
      update.albumId = upsertNamedAlbum(body.album, (update.artistId as number | null | undefined) ?? getSong(id)?.artistId ?? null);
    }
    db.update(songs).set(update).where(eq(songs.id, id)).run();
    if (Array.isArray(body.tags)) {
      db.delete(songTags).where(eq(songTags.songId, id)).run();
      for (const name of [...new Set<string>((body.tags as unknown[]).map((item) => String(item).trim()).filter(Boolean))]) {
        db.insert(tags).values({ name }).onConflictDoNothing().run();
        const tag = db.select().from(tags).where(eq(tags.name, name)).get();
        if (tag) db.insert(songTags).values({ songId: id, tagId: tag.id }).run();
      }
    }
    return NextResponse.json(getSong(id));
  } catch (error) { return fail(error); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  const id = Number((await params).id);
  db.delete(songs).where(eq(songs.id, id)).run();
  return NextResponse.json({ ok: true });
}
