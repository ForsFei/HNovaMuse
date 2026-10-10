import "server-only";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { listSongs } from "./library";
import { allowedResourcePath, scoreKind } from "./paths";
import { scores, songs } from "./schema";

const lyricExtensions = new Set([".lrc", ".txt"]);
const scoreExtensions = new Set([".pdf", ".xml", ".musicxml", ".mxl", ".png", ".jpg", ".jpeg", ".webp"]);
type Result = "lyrics" | "score" | "unchanged" | "unmatched" | "ambiguous";

function normalize(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function matchSong(filePath: string, root: string, catalog: ReturnType<typeof listSongs>) {
  const stem = normalize(path.basename(filePath, path.extname(filePath)));
  const folders = path.relative(root, path.dirname(filePath)).split(path.sep).map(normalize);
  const folderArtists = new Set(catalog.map((song) => normalize(song.artist || "")).filter((artist) => folders.includes(artist)));
  const candidates = catalog.filter((song) => {
    const title = normalize(song.title);
    const artist = normalize(song.artist || "");
    const nameMatches = stem === title || (artist && stem === `${artist} - ${title}`);
    return nameMatches && (folderArtists.size === 0 || folderArtists.has(artist));
  });
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const narrowed = candidates.filter((song) => {
    const artist = normalize(song.artist || "");
    const album = normalize(song.album || "");
    return artist && folders.includes(artist) && (!album || folders.includes(album));
  });
  return narrowed.length === 1 ? narrowed[0] : "ambiguous";
}

async function importResource(filePath: string, root: string, catalog: ReturnType<typeof listSongs>, lyricsHandled: Set<number>): Promise<Result> {
  const song = matchSong(filePath, root, catalog);
  if (!song) return "unmatched";
  if (song === "ambiguous") return "ambiguous";
  const extension = path.extname(filePath).toLowerCase();
  if (lyricExtensions.has(extension)) {
    if (song.lyrics?.trim() || lyricsHandled.has(song.id)) return "unchanged";
    const lyrics = (await fs.promises.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
    if (!lyrics.trim()) return "unmatched";
    db.update(songs).set({ lyrics, lyricsType: extension === ".lrc" ? "lrc" : "plain", updatedAt: Date.now() })
      .where(eq(songs.id, song.id)).run();
    lyricsHandled.add(song.id);
    return "lyrics";
  }
  const existing = db.select().from(scores).where(eq(scores.songId, song.id)).all();
  if (existing.some((score) => score.filePath === filePath)) return "unchanged";
  db.insert(scores).values({ songId: song.id, title: path.basename(filePath, extension), filePath, kind: scoreKind(filePath) }).run();
  return "score";
}

export async function scanResources(rootPath: string, onFile: (result: Result | `error: ${string}`, file: string) => void) {
  const root = allowedResourcePath(rootPath);
  const catalog = listSongs();
  const lyricsHandled = new Set<number>();
  const files: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const extension = path.extname(entry.name).toLowerCase();
        if (lyricExtensions.has(extension) || scoreExtensions.has(extension)) files.push(full);
      }
    }
  }
  if ((await fs.promises.stat(root)).isDirectory()) await walk(root);
  else files.push(root);
  // If both exist, prefer timed lyrics. An existing lyric is never overwritten.
  files.sort((a, b) => Number(path.extname(a).toLowerCase() !== ".lrc") - Number(path.extname(b).toLowerCase() !== ".lrc"));
  for (const file of files) {
    try {
      const resolved = allowedResourcePath(file);
      onFile(await importResource(resolved, root, catalog, lyricsHandled), resolved);
    } catch (error) {
      onFile(`error: ${error instanceof Error ? error.message : String(error)}`, file);
    }
  }
}
