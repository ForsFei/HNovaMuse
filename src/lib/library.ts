import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { db, coverDir } from "./db";
import { albums, artists, collectionSongs, collections, scores, songs, songTags, tags } from "./schema";
import { allowedMusicPath } from "./paths";

export const audioExtensions = new Set([".mp3", ".flac", ".m4a", ".wav", ".ogg"]);

export function listSongs(query = "") {
  const q = query.trim();
  const rows = db.select({ song: songs, artist: artists.name, album: albums.title })
    .from(songs)
    .leftJoin(artists, eq(songs.artistId, artists.id))
    .leftJoin(albums, eq(songs.albumId, albums.id))
    .where(q ? or(like(songs.title, `%${q}%`), like(artists.name, `%${q}%`), like(albums.title, `%${q}%`)) : undefined)
    .orderBy(desc(songs.dateAdded)).all();
  const songIds = rows.map((row) => row.song.id);
  const allTags = songIds.length ? db.select({ songId: songTags.songId, name: tags.name }).from(songTags)
    .innerJoin(tags, eq(songTags.tagId, tags.id)).where(inArray(songTags.songId, songIds)).all() : [];
  return rows.map(({ song, artist, album }) => ({
    ...song, artist, album, tags: allTags.filter((tag) => tag.songId === song.id).map((tag) => tag.name),
    fileMissing: song.audioPath ? !fs.existsSync(song.audioPath) : false,
  }));
}

export function getSong(id: number) {
  const item = listSongs().find((song) => song.id === id);
  if (!item) return null;
  return {
    ...item,
    scores: db.select().from(scores).where(eq(scores.songId, id)).all(),
    collections: db.select({ id: collections.id, name: collections.name }).from(collectionSongs)
      .innerJoin(collections, eq(collectionSongs.collectionId, collections.id))
      .where(eq(collectionSongs.songId, id)).all(),
  };
}

export function upsertNamedArtist(name: string | undefined) {
  if (!name?.trim()) return null;
  const clean = name.trim();
  db.insert(artists).values({ name: clean }).onConflictDoNothing().run();
  return db.select().from(artists).where(eq(artists.name, clean)).get()?.id ?? null;
}

export function upsertNamedAlbum(title: string | undefined, artistId: number | null, year?: number) {
  if (!title?.trim()) return null;
  const clean = title.trim();
  let row = db.select().from(albums).where(and(eq(albums.title, clean), artistId === null ? isNull(albums.artistId) : eq(albums.artistId, artistId))).get();
  if (!row) {
    const inserted = db.insert(albums).values({ title: clean, artistId, year: year || null }).run();
    row = db.select().from(albums).where(eq(albums.id, Number(inserted.lastInsertRowid))).get();
  }
  return row?.id ?? null;
}

export async function importAudio(filePath: string) {
  const resolved = allowedMusicPath(filePath);
  if (!audioExtensions.has(path.extname(resolved).toLowerCase())) throw new Error("不支持的音频格式");
  const stat = await fs.promises.stat(resolved);
  if (!stat.isFile()) throw new Error("请选择音频文件");
  const existing = db.select().from(songs).where(eq(songs.audioPath, resolved)).get();
  if (existing && existing.fileSize === stat.size && existing.fileMtime === Math.floor(stat.mtimeMs)) return "unchanged";

  const { parseFile } = await import("music-metadata");
  const metadata = await parseFile(resolved, { duration: true, skipCovers: false });
  const hash = await new Promise<string>((resolve, reject) => {
    const digester = createHash("sha256");
    fs.createReadStream(resolved).on("data", (chunk) => digester.update(chunk)).on("end", () => resolve(digester.digest("hex"))).on("error", reject);
  });
  const duplicate = db.select().from(songs).where(eq(songs.fileHash, hash)).get();
  if (duplicate && duplicate.id !== existing?.id) return "duplicate";

  const common = metadata.common;
  const artistId = upsertNamedArtist(common.artist);
  const albumId = upsertNamedAlbum(common.album, artistId, common.year);
  let coverPath = existing?.coverPath ?? null;
  const picture = common.picture?.[0];
  if (picture) {
    const ext = picture.format === "image/png" ? "png" : "jpg";
    coverPath = path.join(/* turbopackIgnore: true */ coverDir, `${hash}.${ext}`);
    await fs.promises.writeFile(coverPath, picture.data);
  }
  const now = Date.now();
  const values = {
    title: common.title?.trim() || path.basename(resolved, path.extname(resolved)), artistId, albumId,
    audioPath: resolved, coverPath, fileHash: hash, fileSize: stat.size, fileMtime: Math.floor(stat.mtimeMs),
    trackNumber: common.track.no || null, discNumber: common.disk.no || null, year: common.year || null,
    updatedAt: now,
  };
  if (existing) {
    db.update(songs).set(values).where(eq(songs.id, existing.id)).run();
    return "updated";
  }
  db.insert(songs).values({ ...values, dateAdded: now }).run();
  return "added";
}

export async function scanDirectory(root: string, onFile: (result: string, file: string) => void) {
  const allowed = allowedMusicPath(root);
  const stat = await fs.promises.stat(allowed);
  if (stat.isFile()) {
    onFile(await importAudio(allowed), allowed);
    return;
  }
  async function walk(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase())) {
        try { onFile(await importAudio(full), full); }
        catch (error) { onFile(`error: ${error instanceof Error ? error.message : String(error)}`, full); }
      }
    }
  }
  await walk(allowed);
}
