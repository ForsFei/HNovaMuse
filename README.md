# HNova Muse

个人音乐资料库与互动入门学习网站。第一版按本地单体应用设计：音乐文件保留在原目录，SQLite 保存资料和关联信息，不依赖在线音乐或歌词服务。

## 运行

需要 Node.js 20.9 或更新版本。当前开发环境使用 Node.js 24。

Windows：双击项目根目录的 **`start-muse.cmd`** 即可启动；首次运行会安装依赖，服务就绪后自动打开浏览器。关闭命令行窗口或按 `Ctrl+C` 停止服务。首选地址为 <http://127.0.0.1:43120>。如果该端口已被占用，一键脚本会依次尝试 `43121` 至 `43129`，并显示实际地址。

```powershell
cd F:\HNova\02HNovaMuse
Copy-Item .env.example .env.local
```

编辑 `.env.local`，将 `MUSE_MUSIC_ROOTS` 改为本机音乐目录的绝对路径。例如：

```dotenv
MUSE_DATA_DIR=./data
MUSE_MUSIC_ROOTS=D:\Music
MUSE_RESOURCE_ROOTS=D:\MusicResources
```

Windows 上多个根目录用分号分隔；Linux/macOS 用冒号分隔。`MUSE_RESOURCE_ROOTS` 是可选的歌词与乐谱目录；资源与音频同目录时不用配置。修改 `.env.local` 后重启应用。然后执行：

```powershell
npm install
npm run dev
```

打开 <http://127.0.0.1:43120>。正式运行使用 `npm run build`、`npm run start`。开发和正式启动脚本都使用端口 `43120`，且只监听本机回环地址。

## 使用

1. 在「设置」中选择音乐目录，点击「扫描音频及关联文件」。支持递归扫描 MP3、FLAC、M4A、WAV、OGG，也可输入单个音频文件的完整路径。实际播放能力取决于浏览器支持的编码格式。
2. 扫描在后台进行，页面会显示进度。再次扫描时，文件大小与修改时间未变化的文件会跳过；内容哈希相同的文件视为重复。
3. 将同名歌词或乐谱与音频放在一起，可在音乐扫描时自动匹配；分开放时设置 `MUSE_RESOURCE_ROOTS`，音乐扫描也会检查这些目录，或在设置页单独扫描资源目录。推荐 `艺术家/专辑/歌名.mp3`、`艺术家/专辑/歌名.lrc`、`艺术家/专辑/歌名.pdf`；分开存放时在两个根目录下保持相同的相对路径。文件名也可用 `艺术家 - 歌名`。优先导入 LRC；已有歌词不会被覆盖；同名歌曲无法唯一匹配时会跳过。
4. 在「资料库」打开歌曲，可手工补充艺术家、专辑、标签、学习状态、歌词、和弦、笔记和乐谱。歌词可导入 `.txt`、`.lrc`；LRC 可随播放高亮，点击歌词可跳转。PDF、图片和 MusicXML/MXL 乐谱也可从歌曲的「乐谱」标签输入完整路径关联。资源文件不会被复制。歌曲音频丢失时，可在详情页重新定位，或从资料库移除记录；移除不会删除原始文件。
5. 「学习」提供九节零基础互动课程；「练习」提供音名、高低和和弦听辨。课程进度保存在 SQLite。

## 架构

| 层 | 实现 |
|---|---|
| Web | Next.js App Router、React、TypeScript、Tailwind CSS、设计变量 |
| 数据 | SQLite、Drizzle ORM、better-sqlite3 |
| 导入 | `music-metadata` 读取标签与封面；SHA-256 识别内容重复 |
| 播放 | HTML5 Audio + 支持 HTTP Range 的 Node 路由 |
| 歌词 | 独立 LRC 解析器，按播放器时间同步 |
| 乐谱 | OpenSheetMusicDisplay 查看 MusicXML/MXL；浏览器 PDF/图片查看器 |
| 教学 | Tone.js 发声，Tonal 解析和弦，复用的互动钢琴组件 |

主要目录：

```text
src/app/             页面与 API 路由
src/components/      全局播放器、资料库、乐谱和互动钢琴
src/lib/             数据模型、扫描、路径校验、LRC 和课程内容
data/                运行时数据库与提取的封面（已加入 .gitignore）
```

`MUSE_MUSIC_ROOTS` 是音频文件访问白名单；乐谱还可从 `MUSE_RESOURCE_ROOTS` 访问。服务端会将请求路径解析为真实路径，再验证它位于允许的根目录内。请保持应用仅在受信任的本机使用；如果以后开放到局域网或公网，需先增加身份验证、访问控制和 HTTPS。

## 当前边界

- 音频导入使用引用模式，没有文件复制、重命名或自动在线匹配。
- 扫描需要手动触发；单进程后台任务的进度保存在内存中，重启后可重新扫描。
- 乐谱只查看，不编辑；不提供乐谱跟随光标。
- 教学内容目前以类型化数据保存，课程与资料库独立。没有在线歌词抓取、AI、MIDI 和高级耳训。
- 数据库表在首次运行时自动创建；后续需要变更结构时应增加正式迁移。

## 验证

```powershell
npm run typecheck
npm run lint
npm run build
```

参考文档：[Next.js 自托管](https://nextjs.org/docs/app/guides/self-hosting)、[Drizzle SQLite](https://orm.drizzle.team/docs/sqlite/get-started-sqlite)、[music-metadata](https://github.com/Borewit/music-metadata)、[OpenSheetMusicDisplay](https://opensheetmusicdisplay.github.io/)。
