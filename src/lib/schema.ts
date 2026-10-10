import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const artists = sqliteTable("artists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const albums = sqliteTable("albums", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  artistId: integer("artist_id").references(() => artists.id),
  year: integer("year"),
  coverPath: text("cover_path"),
  description: text("description"),
}, (t) => [uniqueIndex("albums_title_artist").on(t.title, t.artistId)]);

export const songs = sqliteTable("songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  artistId: integer("artist_id").references(() => artists.id),
  albumId: integer("album_id").references(() => albums.id),
  audioPath: text("audio_path").unique(),
  coverPath: text("cover_path"),
  fileHash: text("file_hash"),
  fileSize: integer("file_size"),
  fileMtime: integer("file_mtime"),
  trackNumber: integer("track_number"),
  discNumber: integer("disc_number"),
  year: integer("year"),
  musicalKey: text("musical_key"),
  bpm: integer("bpm"),
  description: text("description"),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  learningStatus: text("learning_status").notNull().default("not_started"),
  lyrics: text("lyrics"),
  lyricsType: text("lyrics_type").notNull().default("plain"),
  chords: text("chords"),
  notes: text("notes"),
  dateAdded: integer("date_added").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});
export const songTags = sqliteTable("song_tags", {
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.songId, t.tagId] })]);

export const collections = sqliteTable("collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: integer("created_at").notNull(),
});
export const collectionSongs = sqliteTable("collection_songs", {
  collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.collectionId, t.songId] })]);

export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  songId: integer("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  filePath: text("file_path").notNull(),
  kind: text("kind").notNull(),
});

export const lessonProgress = sqliteTable("lesson_progress", {
  slug: text("slug").primaryKey(),
  completedAt: integer("completed_at").notNull(),
});
