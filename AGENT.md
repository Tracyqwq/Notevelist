# AGENT.md — Notevelist 项目开发指引

> 给 AI 助手 / 协作者看的项目说明。接手任务前先读这里。

## 项目定位

Notevelist 是一个「碎片化创作管理系统」，服务于文字游戏 / 互动小说内容创作者。核心解决三件事：

1. 零散灵感、设定、场景片段的整理与拼接（碎片）
2. 角色跨故事复用，防止设定自相矛盾（防「吃书」）
3. 云端 + 本地双存，长期安全保存

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

## 当前完成度（2026-10）

**已跑通**：世界观树、角色卡 + 发展线 + 关系、故事富文本编辑、碎片增删 + 贴入、GitHub 同步、导入导出、全局错误处理。

**半成品 / 待做**：
- 碎片贴入是「点击插入静态引用」，非拖拽，且贴入后无法点回原碎片溯源
- 脑图是手写 SVG（环形固定布局），不能拖拽/增删连线
- **吃书检测未实现**（只有关联图谱 + 发展线数据基础）
- 搜索、README 更新、PWA 离线未做
