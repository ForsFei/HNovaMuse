import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listSongs } from "@/lib/library";
import { albums, artists, collections, tags } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().toLocaleLowerCase();
  if (!query) return NextResponse.json({ songs: [], artists: [], albums: [], tags: [], collections: [] });
  const contains = (value: string | null | undefined) => Boolean(value?.toLocaleLowerCase().includes(query));
  const songResults = listSongs().filter((song) => contains(song.title) || contains(song.artist) || contains(song.album) || song.tags.some(contains))
    .slice(0, 8).map((song) => ({ id: song.id, title: song.title, subtitle: [song.artist, song.album].filter(Boolean).join(" · "), href: `/songs/${song.id}` }));
  const allArtists = db.select().from(artists).all();
  const artistResults = allArtists.filter((artist) => contains(artist.name))
    .slice(0, 6).map((artist) => ({ id: artist.id, title: artist.name, href: `/artists?selected=${artist.id}` }));
  const albumResults = db.select().from(albums).all().filter((album) => contains(album.title))
    .slice(0, 6).map((album) => ({ id: album.id, title: album.title, subtitle: allArtists.find((artist) => artist.id === album.artistId)?.name || "", href: `/albums?selected=${album.id}` }));
  const tagResults = db.select().from(tags).all().filter((tag) => contains(tag.name))
    .slice(0, 6).map((tag) => ({ id: tag.id, title: tag.name, href: `/library?q=${encodeURIComponent(tag.name)}` }));
  const collectionResults = db.select().from(collections).all().filter((collection) => contains(collection.name) || contains(collection.description))
    .slice(0, 6).map((collection) => ({ id: collection.id, title: collection.name, subtitle: collection.description || "", href: `/collections?selected=${collection.id}` }));
  return NextResponse.json({ songs: songResults, artists: artistResults, albums: albumResults, tags: tagResults, collections: collectionResults });
}
