# 🛰️ AI.Tube 项目 Master 开发规划与真理文档 (2025-12-27 更新版)

## 🛠️ 一、 协作铁律 (The Iron Rules) - 永不动摇
1.  **单文件修改**：必须由用户发送**完整代码** -> AI 确认后回复**修改后的完整代码**。
2.  **多文件联动**：采取**“分步接力式”**修改（A -> B -> C）。
3.  **同步机制**：每日重大修改完结，AI 必须主动提醒用户同步此文档。
4.  **Git 指令跟进**：AI 必须在回复末尾附上 Git 同步指令。
5.  **验收归档闭环 (NEW)**：
    * **Step 1**: AI 提供代码 -> 用户实测通过。
    * **Step 2**: 用户确认“测试无误”。
    * **Step 3**: AI 更新本文档的进度状态 (Progress) 并写入代码文件。
    * **Step 4**: 只有完成上述步骤，才可进入下一个功能开发。

---

## 🎯 二、 核心愿景与战略 (Core Vision)
* **定位**：全球领先的 AI 原生视频创作社区。
* **目标**：集“创作灵感、商业对接、深度学习”于一体的综合性生态平台。
* **三大支柱**：
    * **灵感 (Inspiration)**：CineFlow 引擎、提示词词典、4K 工程原片下载。
    * **商业 (Business)**：合作中心商单撮合、创作者激励体系、版权授权。
    * **学习 (Academy)**：系统化 AI 教程、案例复盘、所见即所得的实战笔记。

---

## 🏗️ 三、 板块布局与逻辑架构 (System Architecture)

### 1. 路由与功能分布
* `/` : **首页**。5列瀑布流，含 Banner 轮播、多维度筛选、可拖拽 AI 助手（Bot）。
* `/academy` : **AI 学院**。Markdown 教程列表与详情，支持关联视频。
* `/video/[id]` : **播放页**。混合播放器（B站/MP4），含人气值算法、分镜下载权限控制。
* `/tools` : **工具库**。提示词词典（可用）、分镜生成（VIP）、视频拆解（规划中）。
* `/vip` : **会员专区**。黑金视觉体系，展示 `is_vip=true` 的高价值资产。
* `/collaboration` : **合作中心**。商单广场，含预算管理、投递状态追踪。
* `/upload` : **投稿中心**。UGC 录入，自带 +50 积分奖励逻辑。
* `/admin` : **管理后台**。视频/文章/Banner/卡密/需求的 CRUD，含 B 站单体抓取。

### 2. 技术栈核心
* **Frontend**: Next.js 15 (App Router) + Tailwind CSS + Lucide React。
* **Backend**: Supabase (Auth, DB, Storage)。
* **AI Engine**: Gemini 2.0 Flash (逻辑/清洗) + Pollinations/Replicate (多媒体)。
* **Auth**: 调试期硬编码 UUID (`cec386b5-e80a-4105-aa80-d8d5b8b0a9bf`)。

---

## 📊 四、 数据库 Schema 核心 (Database Snapshot)
* `videos`: `is_vip`, `price`, `storyboard_url`, `prompt`, `category`, `duration` (text)。
* `articles`: `description`, `content`, `difficulty`, `tags` (text[]), `link_url`, `video_id` (关联)。
* `profiles`: `points`, `is_vip`, `free_quota`, `avatar_url`, `username`, `last_check_in`。
* `jobs`: `budget`, `company`, `deadline`, `status` (urgent/open/closed), `tags` (ARRAY)。
* `saved_prompts`: `prompt_text`, `video_id`, `user_id` (关联视频与灵感收藏)。

---

## 📈 五、 营销推广与商业化策略 (Marketing)
* **内容获客**：利用 `/academy` 的高质 SEO 文章从搜索引流；B站/小红书同步发布精选视频。
* **社区驱动**：创作者合伙人计划，通过积分奖励激励 UGC 投稿，沉淀私域。
* **变现模型**：VIP 订阅（4K/工程文件）、积分充值（下载资源）、B端商单抽佣或发布费。

---

## 🚀 六、 开发进度追踪 (Current Progress) - **[2025-12-27 20:00 更新]**

### ⏳ 待处理 (Pending)
1.  **[Admin提效]**：实现 B 站热点视频批量抓取前端界面（对接已写好的 `/api/admin/search-bilibili`）。
2.  **[Admin提效]**：实现“多选一键入库”交互逻辑。
3.  **[Bug修复]**：修复充值/投稿成功后，`/profile` 页面积分显示不刷新的问题。

### 🚧 进行中 (In Progress)
* **Phase 2.2 (效能工具)**：正在开发后台“关键词搜索 B 站视频”的功能入口。

### ✅ 已完成 (Completed)
* **[核心修复] 全站图片系统重构**：
    * [x] **防盗链破解**：全站（后台/列表页/详情页）添加 `referrerPolicy="no-referrer"`，彻底解决 B 站外链图片 403 裂图问题。
    * [x] **上传稳定性**：后台实现文件名强制清洗（时间戳重命名），解决特殊字符导致的 `Invalid Key` 报错。
    * [x] **存储分流**：实现 `articles` (文章图) 与 `banners` (轮播图) 存储桶自动分流。
* **[Phase 2.1] 学院内容生态 (已完结)**：
    * [x] **详情页重构**：实现“左文右侧栏”双栏布局，优化排版字号 (15px)。
    * [x] **侧边栏组件**：实现“图文推荐卡片”与“极简 AI 助手”按钮（含动画交互）。
    * [x] **列表页优化**：增加了分类筛选的高亮逻辑与搜索框样式优化。
* **[后端基础]**：完成 B 站搜索 API (`/api/admin/search-bilibili`) 开发。