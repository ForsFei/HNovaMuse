import fs from "node:fs";
import path from "node:path";

function roots(value: string) {
  return value
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

export function musicRoots() { return roots(process.env.MUSE_MUSIC_ROOTS || ""); }
export function resourceRoots() { return roots(process.env.MUSE_RESOURCE_ROOTS || ""); }

function allowedPath(input: string, configuredRoots: string[]) {
  const resolved = fs.realpathSync(input);
  const allowedRoots = configuredRoots.filter(fs.existsSync).map((root) => fs.realpathSync(root));
  if (!allowedRoots.some((root) => resolved === root || resolved.startsWith(root + path.sep))) {
    throw new Error("路径不在已配置的允许目录中");
  }
  return resolved;
}

export function allowedMusicPath(input: string) {
  return allowedPath(input, musicRoots());
}

export function allowedResourcePath(input: string) {
  return allowedPath(input, [...musicRoots(), ...resourceRoots()]);
}

export function scoreKind(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if ([".xml", ".musicxml", ".mxl"].includes(extension)) return "musicxml";
  if (extension === ".pdf") return "pdf";
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) return "image";
  throw new Error("不支持的乐谱格式");
}
