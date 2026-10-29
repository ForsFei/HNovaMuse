import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listSongs } from "@/lib/library";
import { albums, artists } from "@/lib/schema";
import { fail, mutationAllowed } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const songs = listSongs();
  const artistRows = db.select().from(artists).all().map((artist) => ({
    ...artist,
    songCount: songs.filter((song) => song.artistId === artist.id).length,
    albumCount: new Set(songs.filter((song) => song.artistId === artist.id).map((song) => song.albumId).filter(Boolean)).size,
    coverSongId: songs.find((song) => song.artistId === artist.id && song.coverPath)?.id ?? null,
  }));
  const albumRows = db.select().from(albums).all().map((album) => ({
    ...album,
    artistName: artistRows.find((artist) => artist.id === album.artistId)?.name ?? null,
    songCount: songs.filter((song) => song.albumId === album.id).length,
    coverSongId: songs.find((song) => song.albumId === album.id && song.coverPath)?.id ?? null,
  }));
  return NextResponse.json({ artists: artistRows, albums: albumRows });
}

export async function PATCH(request: NextRequest) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("无效的 ID");
    if (typeof body.description !== "string") throw new Error("简介格式无效");
    if (body.kind === "artist") {
      if (!db.select().from(artists).where(eq(artists.id, id)).get()) return fail("艺术家不存在", 404);
      db.update(artists).set({ description: body.description.trim() }).where(eq(artists.id, id)).run();
    } else if (body.kind === "album") {
      if (!db.select().from(albums).where(eq(albums.id, id)).get()) return fail("专辑不存在", 404);
      const year = body.year === null || body.year === "" ? null : Number(body.year);
      if (year !== null && (!Number.isInteger(year) || year < 0)) throw new Error("年份格式无效");
      db.update(albums).set({ description: body.description.trim(), year }).where(eq(albums.id, id)).run();
    } else throw new Error("类型无效");
    return GET();
  } catch (error) { return fail(error); }
}
