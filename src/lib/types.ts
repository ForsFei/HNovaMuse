export type Song = {
  id: number; title: string; artist: string | null; album: string | null; artistId: number | null; albumId: number | null;
  audioPath: string | null; coverPath: string | null; fileMissing: boolean; musicalKey: string | null; bpm: number | null;
  year: number | null; favorite: boolean; learningStatus: string; tags: string[]; lyrics: string | null;
  lyricsType: string; chords: string | null; notes: string | null; description: string | null;
  scores?: Score[]; collections?: { id: number; name: string }[];
};
export type Score = { id: number; songId: number; title: string; kind: "musicxml" | "pdf" | "image" };
export type Collection = { id: number; name: string; description: string | null; songIds: number[] };

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data as T;
}

export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
