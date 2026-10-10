export type LrcLine = { time: number; text: string };
export function parseLrc(source: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, "").trim();
    for (const match of stamps) {
      const fraction = match[3] ? Number(match[3]) / 10 ** match[3].length : 0;
      lines.push({ time: Number(match[1]) * 60 + Number(match[2]) + fraction, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
export function activeLrcIndex(lines: LrcLine[], time: number) {
  for (let index = lines.length - 1; index >= 0; index--) if (time >= lines[index].time) return index;
  return -1;
}
