# 🛰️ AI.Tube 项目 Master 开发规划与真理文档 (2025-12-28 01:45 更新版)

## 🛠️ 一、 协作铁律 (The Iron Rules) - 永不动摇

1. **单文件修改**：必须由用户发送**完整代码** -> AI 确认后回复**修改后的完整代码**。
2. **多文件联动**：采取**“分步接力式”**修改（A -> B -> C），避免一次性抛出多个文件。
3. **同步机制**：每日重大修改完结，AI 必须主动提醒用户同步此文档。
4. **Git 指令跟进**：AI 必须在回复末尾附上 Git 同步指令。
5. **验收归档闭环**：
* **Step 1**: AI 提供代码 -> 用户实测通过。
* **Step 2**: 用户确认“测试无误”。
* **Step 3**: AI 更新本文档的进度状态 (Progress)。
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

* `/` : **首页**。5列瀑布流，含 Banner 轮播、多维度筛选、可拖拽 AI 助手。
* `/academy` : **AI 学院 (列表页)**。采用 **Grid 12列布局**，左侧栏 (2列) 与详情页像素级对齐，支持 URL 参数 (`?category=`) 自动定位分类。
* `/academy/[id]` : **文章详情**。三栏布局（左导航+中正文+右工具），支持日夜间模式，左侧导航点击后带参跳转回列表页。
* `/video/[id]` : **播放页**。混合播放器（B站/MP4），含人气值算法、分镜下载权限控制。
* `/tools` : **工具库**。提示词词典（可用）、分镜生成（VIP）。
* `/vip` : **会员专区**。黑金视觉体系，展示 `is_vip=true` 的高价值资产。
* `/collaboration` : **合作中心**。商单广场，含预算管理。
* `/upload` : **投稿中心**。UGC 录入，自带 +50 积分奖励。
* `/admin` : **管理后台**。
* **视频管理**：B 站单体/批量抓取（规划中）。
* **文章管理**：全网文章一键转存（客户端直连+多线路自动切换）、批量配图（自动替换占位符）。



### 2. 技术栈核心

* **Frontend**: Next.js 15 (App Router) + Tailwind CSS + Lucide React。
* **Backend**: Supabase (Auth, DB, Storage)。
* **Spider Engine**:
* **Client-side Fetching**: `AllOrigins` / `CorsProxy` / `CodeTabs` (多线路故障转移)。
* **Parser**: 浏览器原生 `DOMParser` (本地解析 HTML，稳如老狗)。
* **Image Proxy**: `/api/proxy-image` (负责将外链图片转存至 Supabase `articles` 桶)。


* **Auth**: 调试期硬编码 UUID (`cec386b5-e80a-4105-aa80-d8d5b8b0a9bf`)。

---

## 📊 四、 数据库 Schema 核心 (Database Snapshot)

* `videos`: `is_vip`, `price`, `storyboard_url`, `prompt`, `category`, `duration` (text)。
* `articles`: `description`, `content`, `difficulty`, `tags` (text[]), `link_url`, `video_id` (关联)。
* `profiles`: `points`, `is_vip`, `free_quota`, `avatar_url`, `username`, `last_check_in`。
* `jobs`: `budget`, `company`, `deadline`, `status` (urgent/open/closed), `tags` (ARRAY)。

---

## 📈 五、 营销推广与商业化策略 (Marketing)

* **内容获客**：利用 `/academy` 的高质 SEO 文章从搜索引流；B站/小红书同步发布精选视频。
* **社区驱动**：创作者合伙人计划，通过积分奖励激励 UGC 投稿，沉淀私域。
* **变现模型**：VIP 订阅（4K/工程文件）、积分充值（下载资源）、B端商单抽佣或发布费。

---

## 🚀 六、 开发进度追踪 (Current Progress) - **[2025-12-28 01:45 更新]**

### ⏳ 待处理 (Pending)

1. **[Admin提效]**：实现 B 站热点视频**批量抓取**前端界面（对接已写好的 `/api/admin/search-bilibili`）。
2. **[Admin提效]**：实现“多选一键入库”交互逻辑。
3. **[Bug修复]**：修复充值/投稿成功后，`/profile` 页面积分显示不刷新的问题。

### 🚧 进行中 (In Progress)

* **Phase 2.3 (视频库大扩充)**：准备开发 B 站批量抓取与入库功能，解决视频资源匮乏问题。

### ✅ 已完成 (Completed)

* **[Phase 2.1] 学院内容生态 (UI/UX 终极重构)**：
* [x] **布局一致性重构**：将列表页 (`/academy`) 从 Flex 布局重构为 **Grid (12列)** 布局，确保侧边栏在桌面端严格占用 `col-span-2`，与详情页实现像素级视觉对齐。
* [x] **导航逻辑闭环**：详情页侧边栏点击分类后，携带 `?category=xxx` 参数跳转回列表页，列表页自动读取参数并高亮对应板块。
* [x] **视觉统一**：列表页顶部左侧同步改为“⬅️ 回到首页”；侧边栏标题统一样式为大号粗体。
* [x] **详情页优化**：实现三栏布局，增加日夜间模式，去除多余紫色强调色，视觉风格极简纯净。


* **[Phase 2.2] 运营提效工具 (后台升级)**：
* [x] **全网文章一键转存**：前端多线路代理直连 + 本地 DOM 解析 + 自动图片转存。
* [x] **批量配图**：后台支持批量上传图片并自动正则替换 `[img]` 占位符。


* **[基础建设]**：
* [x] 全站图片防盗链 (`referrerPolicy="no-referrer"`)。
* [x] 存储桶分流 (`articles` vs `banners`)。