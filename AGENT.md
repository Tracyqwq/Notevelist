# AGENT.md — Notevelist 项目开发指引

> 给 AI 助手 / 协作者看的项目说明。接手任务前先读这里。

## 项目定位

Notevelist 是一个「碎片化创作管理系统」，服务于文字游戏 / 互动小说内容创作者。核心解决三件事：

1. 零散灵感、设定、场景片段的整理与拼接（碎片）
2. 角色跨故事复用，防止设定自相矛盾（防「吃书」）
3. 云端 + 本地双存，长期安全保存

### 核心产品理念（2026-11 确定）

**灵感集市**：作者首先需要的是一块「电子草稿」——像手机备忘录、可随手记/画的地方。灵感刚诞生时，往往既不「属于角色」也不「属于世界观」（如从某个意象、定理中感悟到的东西），它只是一个**无归属的意象**，应进入「灵感集市」。

**收录转正**：灵感集市里的内容通过「收录」动作转正为结构化实体（角色 / 世界观 / 故事 / 碎片）。收录后**保留原灵感并建立「来源于此」的溯源关联**（不删除，防止灵感被遗忘后无法复用）。

**自由与结构的调和**：用「时间维度」解决自由 vs 结构的矛盾——灵感阶段要自由（随手记、不填字段、无归属），成熟阶段要结构（收录、归档、可检索、防吃书）。程序的真正价值不是替代纸笔的「画」，而是让画出来的东西「活起来」：可检索、可联动（改一处处处更新）、连线承载语义（师徒/敌对/参与）。

## 技术栈

- Vue 3（`<script setup>` SFC）+ Vite + TypeScript
- UI：Naive UI（**暗色主题**，全局在 `App.vue` 用 `NConfigProvider :theme="darkTheme"`）
- 状态：Pinia
- 路由：Vue Router（`createWebHistory(import.meta.env.BASE_URL)`）
- 本地存储：Dexie（IndexedDB）
- 富文本：Tiptap（`@tiptap/vue-3` + `@tiptap/starter-kit`）
- 工具库：`@vueuse/core`

## 目录结构

```
src/
├── App.vue                     # 根部：NConfigProvider + NMessageProvider + NDialogProvider
├── main.ts                     # 入口，注册 pinia/router/naive
├── db/
│   └── database.ts             # Dexie 数据库定义 + 类型 + exportAll/importAll
├── stores/                     # Pinia store
│   ├── world.ts                # 世界观（文件夹树）
│   ├── story.ts                # 故事（文档）
│   ├── fragment.ts             # 碎片（便签）
│   ├── character.ts            # 角色 + 发展线 + 关系
│   └── error.ts                # 全局错误提示中心
├── router/index.ts             # 路由 + 首次加载时预取数据
├── styles/dark-theme.css       # 暗色主题 CSS 变量
├── components/layouts/
│   └── MainLayout.vue          # 侧边栏（世界观树）+ 底栏（随手记碎片）
└── views/
    ├── HomeView.vue            # 首页
    ├── WorldView.vue           # 世界观详情（故事列表 + 碎片列表）
    ├── StoryView.vue           # 故事编辑器（Tiptap + 右侧碎片面板）
    ├── FragmentWallView.vue    # 碎片墙（便签布局）
    ├── MindMapView.vue         # 脑图（手写 SVG 节点图）
    ├── CharactersView.vue      # 角色库
    ├── CharacterDetailView.vue # 角色详情（发展线 + 关系）
    └── SettingsView.vue        # 设置（GitHub 同步 + 导入导出）
```

## 数据模型（IndexedDB，Dexie 库名 `NotevelistDB`）

| 表 | 关键字段 |
|---|---|
| `worlds` | id, title, description, parentId(nullable), order, createdAt, updatedAt |
| `characters` | id, name, avatar, description, traits[], createdAt, updatedAt |
| `characterArcs` | id, characterId, storyId, worldId, summary, changes, order |
| `stories` | id, worldId, title, content, status(draft/writing/done), order |
| `fragments` | id, worldId, storyId(nullable), title, content, tags[], linkedCharacterIds[], linkedFragmentIds[], status(loose/pasted), color, order |
| `characterRelations` | id, characterAId, characterBId, relationType, description, worldId(nullable) |

**核心关系**：世界观是容器（收纳碎片和故事）；角色独立存在，通过 `characterArcs` 关联到具体故事/世界观（跨故事复用）；碎片通过 `storyId` 挂到故事（贴入）。

## 已确立的约定 / 坑点（务必遵守）

1. **Dexie 不能查 null 索引**：`.where('parentId').equals(null)` 会抛 `TypeError: Invalid key provided`（IndexedDB 不索引 null，Dexie 不接受 null 作 key）。**解决方案**：用内存数组 filter（如 `worlds.value.filter(w => w.parentId === null)`）代替 DB 查询。
2. **错误处理模式**：所有 store 写操作（create/update/delete）包 try/catch，失败时调 `errorStore.reportError('XX失败', e)`；create 失败返回空字符串 `''`；View 层 create 后 `if (!id) return` 防止假成功提示。MainLayout 监听 `errorStore.errorId` 弹 `message.error`。
3. **本地开发环境 npm**：WorkBuddy 的 safe-delete shim 会导致 `npm install` 超时，需 `export CODEBUDDY_SAFE_DELETE_ENABLED=0` 再跑；且 npm 超时后部分包可能「已安装但缺 package.json」，需删除后重装。
4. **GitHub Pages 路径**：`vite.config.ts` 里 `base: '/Notevelist/'`；router 用 `createWebHistory(import.meta.env.BASE_URL)` 对齐子路径，否则白屏。

## 常用命令

```bash
npm run dev       # 本地开发
npm run build     # 类型检查(vue-tsc) + 构建
npm run preview   # 预览构建产物
```

## 部署信息

- 仓库：`https://github.com/Tracyqwq/Notevelist`（小号），大号 `Teanightqwq` 是 Collaborator
- 本地 clone：`C:\Users\newqwq\Documents\GitHub\Notevelist`（用 GitHub Desktop 推送）
- 线上：`https://tracyqwq.github.io/Notevelist/`
- 部署：GitHub Actions（`.github/workflows/deploy.yml`），push 到 main 自动构建部署
- 数据同步：设置页填 GitHub Token，把 IndexedDB 全量导出 JSON 推到仓库 `data/store.json`

## 产品设计决策（已拍板，2026-11）

1. **随手画形态分两步**：先做 A 类「富文本卡片」（能写字/换行/贴图，先跑通「灵感集市 → 收录」链路）；跑通后再在此基础上做 B 类「卡片内嵌涂鸦画板」（可手绘线条）。暂不做 C 类「整块自由画布」。
2. **灵感集市缩略图**：卡片缩略图可自定义；无图时只展示重要文本。
3. **收录语义**：收录时保留原灵感 + 建立「来源于此灵感」的溯源关联，而非删除。
4. **灵感连线**：先做轻量级「灵感间连线」（表示「一起想到的」）；不在灵感系统与世界观系统里重复做同一套连线逻辑。

## 当前完成度（2026-11）

**已跑通**：世界观树、角色卡 + 发展线 + 关系、故事富文本编辑、碎片增删 + 贴入、GitHub 同步、导入导出、全局错误处理。

**半成品 / 待做**：
- 碎片贴入是「点击插入静态引用」，非拖拽，且贴入后无法点回原碎片溯源
- 脑图是手写 SVG（环形固定布局），不能拖拽/增删连线
- **吃书检测未实现**（只有关联图谱 + 发展线数据基础）
- 搜索、README 更新、PWA 离线未做

**下一步方向（已拍板，见「产品设计决策」）**：
1. 「灵感集市」——无归属的意象池（新实体/状态，承接随手记）
2. 灵感卡片「收录转正」→ 角色/世界观/故事/碎片 + 溯源关联
3. 灵感间轻量连线
4. UI 视觉改版（参考 frontend-design 设计原则，去模板化）
