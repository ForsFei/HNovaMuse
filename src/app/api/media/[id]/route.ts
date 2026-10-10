import fs from "node:fs";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { songs } from "@/lib/schema";
import { allowedMusicPath } from "@/lib/paths";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: Context) {
  const song = db.select().from(songs).where(eq(songs.id, Number((await params).id))).get();
  if (!song?.audioPath) return new Response("Not found", { status: 404 });
  try {
    const file = allowedMusicPath(song.audioPath);
    const size = fs.statSync(file).size;
    const range = request.headers.get("range");
    const mime: Record<string, string> = { mp3: "audio/mpeg", flac: "audio/flac", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg" };
    const type = mime[file.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream";
    let start = 0, end = size - 1, status = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      if (!match[1] && match[2]) {
        start = Math.max(0, size - Number(match[2]));
      } else {
        start = Number(match[1] || 0);
        end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
      }
      if (start > end || start >= size || !Number.isFinite(start) || !Number.isFinite(end)) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      status = 206;
    }
    const stream = fs.createReadStream(file, { start, end });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
        stream.on("end", () => controller.close());
        stream.on("error", (error) => controller.error(error));
      },
      cancel() { stream.destroy(); },
    });
    return new Response(body, { status, headers: {
      "Content-Type": type, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store", ...(status === 206 ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    } });
  } catch { return new Response("File missing", { status: 404 }); }
}
