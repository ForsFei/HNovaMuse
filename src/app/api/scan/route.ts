import { NextRequest, NextResponse } from "next/server";
import { scanDirectory } from "@/lib/library";
import fs from "node:fs";
import path from "node:path";
import { scanResources } from "@/lib/resources";
import { allowedMusicPath, allowedResourcePath, musicRoots, resourceRoots } from "@/lib/paths";
import { fail, mutationAllowed } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScanStatus = { running: boolean; total: number; added: number; updated: number; duplicate: number; unchanged: number; lyrics: number; scores: number; unmatched: number; ambiguous: number; errors: string[]; startedAt: number | null; finishedAt: number | null };
const globalScan = globalThis as typeof globalThis & { museScan?: ScanStatus };
const empty = (): ScanStatus => ({ running: false, total: 0, added: 0, updated: 0, duplicate: 0, unchanged: 0, lyrics: 0, scores: 0, unmatched: 0, ambiguous: 0, errors: [], startedAt: null, finishedAt: null });

export function GET() { return NextResponse.json({ roots: musicRoots(), resourceRoots: resourceRoots(), status: globalScan.museScan || empty() }); }

export async function POST(request: NextRequest) {
  if (!mutationAllowed(request)) return fail("非法来源", 403);
  if (globalScan.museScan?.running) return fail("扫描正在进行", 409);
  try {
    const body = await request.json();
    const resourceOnly = body.type === "resources";
    const root = resourceOnly ? allowedResourcePath(String(body.path || "")) : allowedMusicPath(String(body.path || ""));
    const status: ScanStatus = { ...empty(), running: true, startedAt: Date.now() };
    globalScan.museScan = status;
    const record = (result: string, file: string) => {
      status.total++;
      if (result.startsWith("error:")) status.errors.push(`${file}: ${result.slice(7)}`);
      else if (result === "score") status.scores++;
      else status[result as "added" | "updated" | "duplicate" | "unchanged" | "lyrics" | "unmatched" | "ambiguous"]++;
    };
    void (async () => {
      if (!resourceOnly) await scanDirectory(root, record);
      const sharedRoot = !resourceOnly && fs.statSync(root).isFile() ? path.dirname(root) : root;
      const roots = resourceOnly ? [root] : [sharedRoot, ...resourceRoots().filter(fs.existsSync)];
      for (const item of new Set(roots)) await scanResources(item, record);
    })().catch((error) => { status.errors.push(error instanceof Error ? error.message : String(error)); })
      .finally(() => { status.running = false; status.finishedAt = Date.now(); });
    return NextResponse.json(status, { status: 202 });
  } catch (error) { return fail(error); }
}
