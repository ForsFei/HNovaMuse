import fs from "node:fs";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { audioExtensions } from "@/lib/library";
import { allowedMusicPath } from "@/lib/paths";
import { songs } from "@/lib/schema";
import { fail, mutationAllowed } from "@/lib/http";
import path from "node:path";

export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  try {
    const id = Number((await params).id);
    const song = db.select().from(songs).where(eq(songs.id, id)).get();
    if (!song) return fail("歌曲不存在", 404);
    const { path: input } = await request.json();
    const file = allowedMusicPath(String(input));
    if (!audioExtensions.has(path.extname(file).toLowerCase())) throw new Error("不支持的音频格式");
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) throw new Error("请选择音频文件");
    if (db.select().from(songs).where(and(eq(songs.audioPath, file), ne(songs.id, id))).get()) throw new Error("该文件已关联其他歌曲");
    const hash = await new Promise<string>((resolve, reject) => { const digester = createHash("sha256"); fs.createReadStream(file).on("data", (chunk) => digester.update(chunk)).on("end", () => resolve(digester.digest("hex"))).on("error", reject); });
    if (song.fileHash && song.fileHash !== hash) throw new Error("新文件内容与原音频不同；请作为新歌曲导入");
    db.update(songs).set({ audioPath: file, fileHash: hash, fileSize: stat.size, fileMtime: Math.floor(stat.mtimeMs), updatedAt: Date.now() }).where(eq(songs.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}
