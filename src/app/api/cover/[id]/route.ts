import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, coverDir } from "@/lib/db";
import { songs } from "@/lib/schema";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: Context) {
  const song = db.select().from(songs).where(eq(songs.id, Number((await params).id))).get();
  const file = song?.coverPath;
  if (!file || !path.resolve(file).startsWith(path.resolve(coverDir) + path.sep) || !fs.existsSync(file)) return new Response(null, { status: 404 });
  const bytes = await fs.promises.readFile(file);
  return new Response(bytes, { headers: { "Content-Type": file.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}
