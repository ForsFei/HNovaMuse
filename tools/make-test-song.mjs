#!/usr/bin/env node
/**
 * HNova Muse 离线测试素材生成器
 *
 * 生成一首完整的测试歌曲，用于验证扫描、元数据、封面提取、歌词导入和乐谱渲染：
 *   - *.mp3       带 ID3v2.3 标签与内嵌封面（music-metadata 读取 + 封面提取）
 *   - *.lrc       时间轴歌词，时间戳与音频逐小节对齐（LRC 高亮同步）
 *   - *.txt       纯文本歌词（用于验证「LRC 优先、TXT 不覆盖」）
 *   - *.musicxml  五线谱（OpenSheetMusicDisplay 渲染），带和弦标记
 *
 * 音频、歌词和乐谱都由下面同一份 SONG 数据推导，因此时间轴严格一致。
 * 旋律与歌词为本项目原创，不涉及任何第三方版权内容。
 *
 * 用法：node tools/make-test-song.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ─────────────────────────────────────────────────────────────
// 一、歌曲定义（唯一数据源）
// ─────────────────────────────────────────────────────────────

const SONG = {
  title: "First Light",
  artist: "HNova Studio",
  album: "First Light",
  albumArtist: "HNova Studio",
  year: 2026,
  track: 1,
  genre: "Test Fixture",
  bpm: 96,
  key: "C Major",
  timeSignature: [4, 4],
};

const BEAT = 60 / SONG.bpm; // 一拍的秒数
const BAR = BEAT * SONG.timeSignature[0]; // 一小节的秒数

/** 和弦音（三和弦），用于 pad 声部与乐谱和弦标记。 */
const CHORDS = {
  C: { symbol: "C", tones: ["C4", "E4", "G4"], bass: "C2", fifths: 0 },
  G: { symbol: "G/B", tones: ["B3", "D4", "G4"], bass: "G2", fifths: 1 },
  Am: { symbol: "Am", tones: ["A3", "C4", "E4"], bass: "A2", fifths: 0 },
  F: { symbol: "F", tones: ["A3", "C4", "F4"], bass: "F2", fifths: -1 },
};

/**
 * 12 小节，每小节 4 拍。
 *   第 1 小节       前奏，只有伴奏
 *   第 2–9 小节     主旋律，每小节对应一行歌词
 *   第 10–12 小节   尾奏，长音和弦
 */
const BARS = [
  { chord: "C", melody: null },
  { chord: "C", melody: [["E4", 1], ["G4", 1], ["C5", 2]] },
  { chord: "G", melody: [["D5", 1], ["B4", 1], ["G4", 2]] },
  { chord: "Am", melody: [["A4", 1], ["C5", 1], ["E5", 2]] },
  { chord: "F", melody: [["D5", 2], ["C5", 1], ["A4", 1]] },
  { chord: "C", melody: [["E4", 1], ["G4", 1], ["C5", 1.5], ["D5", 0.5]] },
  { chord: "G", melody: [["B4", 2], ["G4", 2]] },
  { chord: "F", melody: [["A4", 1], ["F4", 1], ["A4", 2]] },
  { chord: "C", melody: [["G4", 2], ["C5", 2]] },
  { chord: "F", melody: null },
  { chord: "G", melody: null },
  { chord: "C", melody: null },
];

/** 原创歌词，每行对应第 2–9 小节中的一小节。 */
const LYRICS = [
  "天边亮起第一道光",
  "风把清晨轻轻推醒",
  "我把昨夜的梦收好",
  "放进今天的口袋里",
  "一步一步走过街角",
  "影子在身后慢慢拉长",
  "只要还在往前走",
  "总会有光落在肩上",
];

const MELODY_START_BAR = 1; // 0 基：第 2 小节开始唱歌词
const TOTAL_BARS = BARS.length;
const DURATION = TOTAL_BARS * BAR;

// ─────────────────────────────────────────────────────────────
// 二、音高工具
// ─────────────────────────────────────────────────────────────

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" / "Bb3" → MIDI 音高编号。 */
function midi(note) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`无法解析音名: ${note}`);
  const [, step, accidental, octave] = match;
  const alter = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return (Number(octave) + 1) * 12 + SEMITONES[step] + alter;
}

const frequency = (note) => 440 * 2 ** ((midi(note) - 69) / 12);

// ─────────────────────────────────────────────────────────────
// 三、音频合成
// ─────────────────────────────────────────────────────────────

const SAMPLE_RATE = 44100;

/** 每个声部一套音色参数：谐波权重 + ADSR 包络。 */
const VOICES = {
  melody: { gain: 0.30, pan: -0.12, harmonics: [1, 0.42, 0.22, 0.11, 0.06], attack: 0.008, decay: 0.42, sustain: 0.52, release: 0.22 },
  pad: { gain: 0.085, pan: 0.20, harmonics: [1, 0.28, 0.13], attack: 0.10, decay: 2.4, sustain: 0.72, release: 0.45 },
  bass: { gain: 0.24, pan: 0.0, harmonics: [1, 0.22, 0.07], attack: 0.012, decay: 1.1, sustain: 0.38, release: 0.28 },
};

const length = Math.ceil((DURATION + 1.5) * SAMPLE_RATE);
const left = new Float32Array(length);
const right = new Float32Array(length);

/** 把一个音叠加到左右声道缓冲区。 */
function renderNote(voice, note, startSec, durSec) {
  const preset = VOICES[voice];
  const f0 = frequency(note);
  const start = Math.max(0, Math.floor(startSec * SAMPLE_RATE));
  const holdEnd = Math.floor((startSec + durSec) * SAMPLE_RATE);
  const end = Math.min(length, Math.floor((startSec + durSec + preset.release) * SAMPLE_RATE));
  const panLeft = preset.pan <= 0 ? 1 : 1 - preset.pan;
  const panRight = preset.pan >= 0 ? 1 : 1 + preset.pan;

  for (let i = start; i < end; i += 1) {
    const t = (i - start) / SAMPLE_RATE;
    // 起音
    let envelope = t < preset.attack ? t / preset.attack : preset.sustain + (1 - preset.sustain) * Math.exp(-(t - preset.attack) / preset.decay);
    // 释音
    const released = (i - holdEnd) / SAMPLE_RATE;
    if (released > 0) envelope *= Math.exp(-released / (preset.release * 0.4));
    if (envelope < 1e-4) continue;

    let wave = 0;
    for (let h = 0; h < preset.harmonics.length; h += 1) {
      wave += preset.harmonics[h] * Math.sin(2 * Math.PI * f0 * (h + 1) * t);
    }
    const value = wave * envelope * preset.gain;
    left[i] += value * panLeft;
    right[i] += value * panRight;
  }
}

// 逐小节合成
BARS.forEach((bar, index) => {
  const barStart = index * BAR;
  const chord = CHORDS[bar.chord];
  const isOutro = index >= TOTAL_BARS - 3;

  // 伴奏：每小节两个二分和弦，尾奏改为整小节长音
  const padHits = isOutro ? [[0, 4]] : [[0, 2], [2, 2]];
  for (const [offsetBeats, beats] of padHits) {
    for (const tone of chord.tones) {
      renderNote("pad", tone, barStart + offsetBeats * BEAT, beats * BEAT);
    }
  }
  // 低音：每小节的根音
  renderNote("bass", chord.bass, barStart, BAR);

  // 主旋律
  if (bar.melody) {
    let cursor = barStart;
    for (const [note, beats] of bar.melody) {
      renderNote("melody", note, cursor, beats * BEAT);
      cursor += beats * BEAT;
    }
  }
});

// 归一化，留出 1 dB 余量
let peak = 0;
for (let i = 0; i < length; i += 1) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
const scale = peak > 0 ? 0.89 / peak : 1;

const pcmLeft = new Int16Array(length);
const pcmRight = new Int16Array(length);
for (let i = 0; i < length; i += 1) {
  pcmLeft[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * scale * 32767)));
  pcmRight[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * scale * 32767)));
}

// ─────────────────────────────────────────────────────────────
// 四、MP3 编码（lamejs）
// ─────────────────────────────────────────────────────────────

const BLOCK = 1152;

async function encodeMp3() {
  let lame;
  try {
    lame = await import("@breezystack/lamejs");
  } catch {
    throw new Error("缺少依赖 @breezystack/lamejs，请先在 tools/ 目录执行 npm install");
  }
  const Lame = lame.default ?? lame;
  const Mp3Encoder = Lame.Mp3Encoder ?? lame.Mp3Encoder;
  if (!Mp3Encoder) throw new Error("无法从 @breezystack/lamejs 取到 Mp3Encoder");

  const encoder = new Mp3Encoder(2, SAMPLE_RATE, 192);
  const chunks = [];
  for (let offset = 0; offset < length; offset += BLOCK) {
    // 末块补齐到整块长度，避免部分编码器拒绝尾块
    const l = new Int16Array(BLOCK);
    const r = new Int16Array(BLOCK);
    l.set(pcmLeft.subarray(offset, offset + BLOCK));
    r.set(pcmRight.subarray(offset, offset + BLOCK));
    const buffer = encoder.encodeBuffer(l, r);
    if (buffer.length > 0) chunks.push(Buffer.from(buffer));
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

// ─────────────────────────────────────────────────────────────
// 五、ID3v2.3 标签
// ─────────────────────────────────────────────────────────────

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

/** ID3v2.3 帧：4 字节 ID + 4 字节大端长度 + 2 字节标志。 */
function id3Frame(id, data) {
  const header = Buffer.alloc(10);
  header.write(id, 0, 4, "latin1");
  header.writeUInt32BE(data.length, 4);
  return Buffer.concat([header, data]);
}

/** 文本帧，使用 UTF-16LE + BOM，可安全承载中文。 */
function id3Text(id, text) {
  const data = Buffer.concat([Buffer.from([0x01]), Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
  return id3Frame(id, data);
}

/** 封面帧（APIC），图片类型 0x03 = 正面封面。 */
function id3Apic(png) {
  const data = Buffer.concat([
    Buffer.from([0x00]), // 描述文本用 ISO-8859-1
    Buffer.from("image/png", "latin1"),
    Buffer.from([0x00]),
    Buffer.from([0x03]),
    Buffer.from([0x00]), // 空描述
    png,
  ]);
  return id3Frame("APIC", data);
}

function synchsafe(value) {
  return Buffer.from([(value >>> 21) & 0x7f, (value >>> 14) & 0x7f, (value >>> 7) & 0x7f, value & 0x7f]);
}

function wrapId3(frames) {
  const header = Buffer.concat([Buffer.from("ID3", "latin1"), Buffer.from([0x03, 0x00, 0x00]), synchsafe(frames.length)]);
  return Buffer.concat([header, frames]);
}

// ─────────────────────────────────────────────────────────────
// 六、封面 PNG（纯 Node 手写编码器，无外部依赖）
// ─────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([size, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // 过滤器类型 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // 颜色类型 RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** 生成一张深蓝紫渐变封面：辉光 + 五线谱 + 圆环。 */
function makeCover(size = 640) {
  const rgba = Buffer.alloc(size * size * 4);
  const top = [11, 13, 27];
  const bottom = [40, 27, 76];
  const glow = [124, 92, 255];
  const cx = size * 0.5;
  const cy = size * 0.40;
  const glowR = size * 0.46;
  const ringR = size * 0.17;

  // 五线谱位置
  const staffTop = size * 0.665;
  const staffGap = size * 0.038;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = y / (size - 1);
      let r = top[0] + (bottom[0] - top[0]) * t;
      let g = top[1] + (bottom[1] - top[1]) * t;
      let b = top[2] + (bottom[2] - top[2]) * t;

      // 中心辉光
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < glowR) {
        const falloff = (1 - dist / glowR) ** 2.4;
        r += glow[0] * falloff * 0.5;
        g += glow[1] * falloff * 0.5;
        b += glow[2] * falloff * 0.5;
      }

      // 圆环
      const ringDist = Math.abs(dist - ringR);
      if (ringDist < 2.2) {
        const alpha = (1 - ringDist / 2.2) * 0.55;
        r += 255 * alpha;
        g += 255 * alpha;
        b += 255 * alpha;
      } else if (dist < ringR) {
        // 圆环内部轻微提亮
        r += 18;
        g += 14;
        b += 34;
      }

      // 五线谱
      for (let line = 0; line < 5; line += 1) {
        const lineY = staffTop + line * staffGap;
        const delta = Math.abs(y - lineY);
        if (delta < 1.4 && x > size * 0.13 && x < size * 0.87) {
          const alpha = (1 - delta / 1.4) * 0.26;
          r += 236 * alpha;
          g += 236 * alpha;
          b += 255 * alpha;
        }
      }

      const offset = (y * size + x) * 4;
      rgba[offset] = Math.max(0, Math.min(255, Math.round(r)));
      rgba[offset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      rgba[offset + 2] = Math.max(0, Math.min(255, Math.round(b)));
      rgba[offset + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

// ─────────────────────────────────────────────────────────────
// 七、歌词文件
// ─────────────────────────────────────────────────────────────

/** 秒 → [mm:ss.xx] */
function lrcStamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `[${String(minutes).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}]`;
}

function buildLrc() {
  const header = [
    `[ti:${SONG.title}]`,
    `[ar:${SONG.artist}]`,
    `[al:${SONG.album}]`,
    `[by:HNova Muse 测试素材]`,
    "[offset:0]",
  ];
  const body = LYRICS.map((line, index) => `${lrcStamp((MELODY_START_BAR + index) * BAR)}${line}`);
  return `${[...header, ...body].join("\n")}\n`;
}

function buildTxt() {
  return `${LYRICS.join("\n")}\n`;
}

// ─────────────────────────────────────────────────────────────
// 八、MusicXML 乐谱
// ─────────────────────────────────────────────────────────────

const DIVISIONS = 4; // 每四分音符 4 个 division

/** 拍数 → MusicXML duration（以 division 计）。 */
const toDuration = (beats) => Math.round(beats * DIVISIONS);

/** 拍数 → 音符时值标签。 */
function noteType(beats) {
  const table = { 4: "whole", 3: "half", 2: "half", 1.5: "quarter", 1: "quarter", 0.75: "eighth", 0.5: "eighth", 0.25: "16th" };
  return table[beats] ?? "quarter";
}

/** 附点音符需要额外一个 <dot/>。 */
const isDotted = (beats) => [3, 1.5, 0.75].includes(beats);

function pitchXml(note) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  const [, step, accidental, octave] = match;
  const alter = accidental === "#" ? "<alter>1</alter>" : accidental === "b" ? "<alter>-1</alter>" : "";
  return `<pitch><step>${step}</step>${alter}<octave>${octave}</octave></pitch>`;
}

function noteXml(note, beats, { chord = false } = {}) {
  if (note === null) {
    return `<note><rest/><duration>${toDuration(beats)}</duration><voice>1</voice><type>${noteType(beats)}</type></note>`;
  }
  const chordTag = chord ? "<chord/>" : "";
  const dot = isDotted(beats) ? "<dot/>" : "";
  return `<note>${chordTag}${pitchXml(note)}<duration>${toDuration(beats)}</duration><voice>1</voice><type>${noteType(beats)}</type>${dot}</note>`;
}

function buildMusicXml() {
  const measures = BARS.map((bar, index) => {
    const chord = CHORDS[bar.chord];
    const parts = [];

    if (index === 0) {
      parts.push(
        `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>${chord.fifths}</fifths></key>` +
          `<time><beats>${SONG.timeSignature[0]}</beats><beat-type>${SONG.timeSignature[1]}</beat-type></time>` +
          `<clef><sign>G</sign><line>2</line></clef></attributes>`,
      );
    }

    // 和弦标记
    parts.push(
      `<harmony><root><root-step>${chord.symbol[0]}</root-step></root>` +
        `<kind>${chord.symbol.includes("m") && !chord.symbol.startsWith("C") ? "minor" : "major"}</kind></harmony>`,
    );

    if (bar.melody) {
      let cursor = 0;
      for (const [note, beats] of bar.melody) {
        parts.push(noteXml(note, beats));
        cursor += beats;
      }
      if (cursor < 4) parts.push(noteXml(null, 4 - cursor));
    } else if (index === 0) {
      parts.push(noteXml(null, 4));
    } else {
      // 尾奏：整小节柱式和弦
      chord.tones.forEach((tone, toneIndex) => {
        parts.push(noteXml(tone, 4, { chord: toneIndex > 0 }));
      });
    }

    return `<measure number="${index + 1}">${parts.join("")}</measure>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>${SONG.title}</work-title></work>
  <identification>
    <creator type="composer">${SONG.artist}</creator>
    <encoding><software>HNova Muse make-test-song.mjs</software></encoding>
  </identification>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
${measures.map((measure) => `    ${measure}`).join("\n")}
  </part>
</score-partwise>
`;
}

// ─────────────────────────────────────────────────────────────
// 九、写出文件
// ─────────────────────────────────────────────────────────────

const mp3 = await encodeMp3();
const cover = makeCover();
const tagged = Buffer.concat([
  wrapId3(
    Buffer.concat([
      id3Text("TIT2", SONG.title),
      id3Text("TPE1", SONG.artist),
      id3Text("TPE2", SONG.albumArtist),
      id3Text("TALB", SONG.album),
      id3Text("TRCK", String(SONG.track)),
      id3Text("TYER", String(SONG.year)),
      id3Text("TCON", SONG.genre),
      id3Apic(cover),
    ]),
  ),
  mp3,
]);

const outputDir = path.join(ROOT, "data", "music", SONG.artist, SONG.album);
fs.mkdirSync(outputDir, { recursive: true });

const files = [
  [`${SONG.title}.mp3`, tagged],
  [`${SONG.title}.lrc`, Buffer.from(buildLrc(), "utf8")],
  [`${SONG.title}.txt`, Buffer.from(buildTxt(), "utf8")],
  [`${SONG.title}.musicxml`, Buffer.from(buildMusicXml(), "utf8")],
];

for (const [name, content] of files) {
  fs.writeFileSync(path.join(outputDir, name), content);
}

// 同时导出一份封面，方便肉眼确认设计
const coverPreview = path.join(ROOT, "tools", "test-song-cover.png");
fs.writeFileSync(coverPreview, cover);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`输出目录：${outputDir}`);
for (const [name, content] of files) console.log(`  ${name.padEnd(24)} ${kb(content.length)}`);
console.log(`  ${path.relative(ROOT, coverPreview).padEnd(24)} ${kb(cover.length)}`);
console.log(`\n歌曲信息：${SONG.artist} — ${SONG.title}（${SONG.album}, ${SONG.year}）`);
console.log(`调性 ${SONG.key} · ${SONG.bpm} BPM · ${SONG.timeSignature.join("/")} · 共 ${TOTAL_BARS} 小节`);
console.log(`时长约 ${DURATION.toFixed(1)} 秒，歌词 ${LYRICS.length} 行，首行时间 ${(MELODY_START_BAR * BAR).toFixed(2)} 秒`);
