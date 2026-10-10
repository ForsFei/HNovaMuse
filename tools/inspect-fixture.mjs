#!/usr/bin/env node
/**
 * 检查生成的测试素材：用 music-metadata 解析 MP3 标签与内嵌封面，
 * 与生成器写入的内容对照，并统计各文件体积。
 *
 * 用法：node tools/inspect-fixture.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data", "music", "HNova Studio", "First Light");
const MP3 = path.join(DIR, "First Light.mp3");

// 裸包名：Node 会从 tools/ 向上找到项目根目录的 node_modules
const { parseFile } = await import("music-metadata");

console.log("── 文件清单 ──");
for (const name of fs.readdirSync(DIR).sort()) {
  const stat = fs.statSync(path.join(DIR, name));
  console.log(`  ${name.padEnd(26)} ${(stat.size / 1024).toFixed(1).padStart(8)} KB`);
}

console.log("\n── music-metadata 解析结果 ──");
const meta = await parseFile(MP3, { duration: true, skipCovers: false });
const c = meta.common;
console.log(`  container   ${meta.format.container} / ${meta.format.codec}`);
console.log(`  duration    ${meta.format.duration?.toFixed(2)} s`);
console.log(`  bitrate     ${Math.round((meta.format.bitrate ?? 0) / 1000)} kbps`);
console.log(`  sampleRate  ${meta.format.sampleRate} Hz · ${meta.format.numberOfChannels} ch`);
console.log(`  title       ${c.title}`);
console.log(`  artist      ${c.artist}`);
console.log(`  albumartist ${c.albumartist}`);
console.log(`  album       ${c.album}`);
console.log(`  track       ${c.track?.no}`);
console.log(`  year        ${c.year}`);
console.log(`  genre       ${c.genre?.join(", ")}`);
const picture = c.picture?.[0];
console.log(`  cover       ${picture ? `${picture.format}, ${(picture.data.length / 1024).toFixed(1)} KB` : "（无）"}`);

console.log("\n── 对照检查 ──");
const checks = [
  ["标题可读", c.title === "First Light"],
  ["艺术家可读", c.artist === "HNova Studio"],
  ["专辑可读", c.album === "First Light"],
  ["音轨号可读", c.track?.no === 1],
  ["年份可读", c.year === 2026],
  ["时长 30–32.5 秒（含尾音）", (meta.format.duration ?? 0) >= 30 && (meta.format.duration ?? 0) <= 32.5],
  ["内嵌封面存在", Boolean(picture)],
  ["封面为 PNG", picture?.format === "image/png"],
];
let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
}

// 校验内嵌封面与独立导出的封面是否一致
const preview = path.join(ROOT, "tools", "test-song-cover.png");
if (picture && fs.existsSync(preview)) {
  const same = Buffer.compare(Buffer.from(picture.data), fs.readFileSync(preview)) === 0;
  console.log(`  ${same ? "✓" : "✗"} 内嵌封面与预览图字节一致`);
  if (!same) failed += 1;
}

// ── 用应用自身的解析器验证 LRC（Node 24 可直接导入 .ts） ──
console.log("\n── LRC 解析（直接调用 src/lib/lrc.ts）──");
try {
  const { parseLrc, activeLrcIndex } = await import(pathToFileURL(path.join(ROOT, "src", "lib", "lrc.ts")).href);
  const lrcText = fs.readFileSync(path.join(DIR, "First Light.lrc"), "utf8");
  const lines = parseLrc(lrcText);
  for (const line of lines) {
    console.log(`  t=${line.time.toFixed(2)}s  ${line.text}`);
  }
  const times = lines.map((line) => line.time);
  const ascending = times.every((t, i) => i === 0 || t > times[i - 1]);
  const lrcChecks = [
    ["解析出 8 行歌词", lines.length === 8],
    ["时间戳升序且无重复", ascending],
    ["首行 2.50 秒（一小节前奏）", Math.abs(times[0] - 2.5) < 1e-6],
    ["每行间隔一小节 = 2.50 秒", times.every((t, i) => Math.abs(t - (2.5 + i * 2.5)) < 1e-6)],
    ["未把 [ti:]/[ar:] 等标签当歌词", lines.every((line) => !line.text.startsWith("["))],
    ["播放到 0 秒时无高亮行", activeLrcIndex(lines, 0) === -1],
    ["播放到 10.5 秒时高亮第 4 行", activeLrcIndex(lines, 10.5) === 3],
    ["播放到末尾时高亮最后一行", activeLrcIndex(lines, 99) === 7],
  ];
  for (const [label, ok] of lrcChecks) {
    if (!ok) failed += 1;
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  }
} catch (error) {
  failed += 1;
  console.log(`  ✗ 无法导入解析器：${error.message}`);
}

console.log(failed === 0 ? "\n全部通过。\n" : `\n${failed} 项未通过。\n`);
process.exit(failed === 0 ? 0 : 1);
