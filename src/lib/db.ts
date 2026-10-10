import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dataDir = path.resolve(/* turbopackIgnore: true */ process.env.MUSE_DATA_DIR || "./data");
fs.mkdirSync(dataDir, { recursive: true });
export const coverDir = path.join(dataDir, "covers");
fs.mkdirSync(coverDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "muse.sqlite"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.exec(`
CREATE TABLE IF NOT EXISTS artists (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT);
CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, artist_id INTEGER REFERENCES artists(id), year INTEGER, cover_path TEXT, description TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS albums_title_artist ON albums(title, artist_id);
CREATE TABLE IF NOT EXISTS songs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, artist_id INTEGER REFERENCES artists(id), album_id INTEGER REFERENCES albums(id), audio_path TEXT UNIQUE, cover_path TEXT, file_hash TEXT, file_size INTEGER, file_mtime INTEGER, track_number INTEGER, disc_number INTEGER, year INTEGER, musical_key TEXT, bpm INTEGER, description TEXT, favorite INTEGER NOT NULL DEFAULT 0, learning_status TEXT NOT NULL DEFAULT 'not_started', lyrics TEXT, lyrics_type TEXT NOT NULL DEFAULT 'plain', chords TEXT, notes TEXT, date_added INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS songs_hash_idx ON songs(file_hash);
CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS song_tags (song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(song_id, tag_id));
CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS collection_songs (collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE, song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE, PRIMARY KEY(collection_id, song_id));
CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY AUTOINCREMENT, song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE, title TEXT NOT NULL, file_path TEXT NOT NULL, kind TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lesson_progress (slug TEXT PRIMARY KEY, completed_at INTEGER NOT NULL);
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
