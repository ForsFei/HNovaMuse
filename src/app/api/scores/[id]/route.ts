import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scores } from "@/lib/schema";
import { allowedResourcePath } from "@/lib/paths";
import { mutationAllowed } from "@/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(_request: NextRequest, { params }: Context) {
  const score = db.select().from(scores).where(eq(scores.id, Number((await params).id))).get();
  if (!score) return new Response(null, { status: 404 });
  try {
    const file = allowedResourcePath(score.filePath);
    const mime = score.kind === "pdf" ? "application/pdf" : score.kind === "musicxml" ? (file.toLowerCase().endsWith(".mxl") ? "application/vnd.recordare.musicxml" : "application/xml") : ({ ".png": "image/png", ".webp": "image/webp" }[path.extname(file).toLowerCase()] || "image/jpeg");
    const bytes = await fs.promises.readFile(file);
    return new Response(bytes, { headers: { "Content-Type": mime, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`, "Cache-Control": "private, no-store" } });
  } catch { return new Response(null, { status: 404 }); }
}
export async function DELETE(request: NextRequest, { params }: Context) {
  if (!mutationAllowed(request)) return NextResponse.json({ error: "非法来源" }, { status: 403 });
  db.delete(scores).where(eq(scores.id, Number((await params).id))).run();
  return NextResponse.json({ ok: true });
}
