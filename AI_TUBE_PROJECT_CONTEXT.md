🛰️ AI.Tube 项目 Master 开发规划与真理文档 (2025-12-28 22:15 更新版)
🛠️ 一、 协作铁律 (The Iron Rules) - 永不动摇
单文件修改：必须由用户发送完整代码 -> AI 确认后回复修改后的完整代码。

多文件联动：采取**“分步接力式”**修改（A -> B -> C），避免一次性抛出多个文件。

同步机制：每日重大修改完结，AI 必须主动提醒用户同步此文档。

Git 指令跟进：AI 必须在回复末尾附上 Git 同步指令。

验收归档闭环：

Step 1: AI 提供代码 -> 用户实测通过。

Step 2: 用户确认“测试无误”。

Step 3: AI 更新本文档的进度状态 (Progress)。

Step 4: 只有完成上述步骤，才可进入下一个功能开发。

🎯 二、 核心愿景与战略 (Core Vision)
定位：全球领先的 AI 原生视频创作社区。

目标：集“创作灵感、商业对接、深度学习”于一体的综合性生态平台。

三大支柱：

灵感 (Inspiration)：CineFlow 引擎、提示词词典、4K 工程原片下载。

商业 (Business)：合作中心商单撮合、创作者激励体系、版权授权。

学习 (Academy)：系统化 AI 教程、案例复盘、所见即所得的实战笔记。

🏗️ 三、 板块布局与逻辑架构 (System Architecture)
路由与功能分布

/ : 首页。5列瀑布流，含 Banner 轮播、多维度筛选、可拖拽 AI 助手。

/academy : AI 学院 (列表页)。Grid 12列布局，像素级对齐。

/academy/[id] : 文章详情。三栏布局，支持日夜间模式。

/video/[id] : 播放页。混合播放器，含 VIP 评论区皇冠标识、分镜下载。

/tools : 工具库。提示词词典、分镜生成。

/vip : 会员专区。黑金视觉体系。

/collaboration : 合作中心。

/upload : 投稿中心。

/admin : 管理后台。

技术栈核心

Frontend: Next.js 15 (App Router) + Tailwind CSS + Lucide React。

Backend: Supabase (Auth, DB, Storage)。

State Management: React Context (UserContext) 全局状态管理。

Spider Engine: Client-side Fetching (AllOrigins) + DOMParser + Admin Batch Processor。

📊 四、 数据库 Schema 核心 (Database Snapshot)
videos: is_vip, price, storyboard_url, prompt, category, duration (text), bilibili_source_id (新增)。

articles: description, content, difficulty, tags (text[]), link_url, video_id (关联), author, is_authorized, reading_time。

profiles: points, is_vip, free_quota, avatar_url, username, last_check_in。

comments: content, video_id, user_id, user_email (关联 profiles 获取 VIP 状态)。

📈 五、 营销推广与商业化策略 (Marketing)
内容获客：SEO 文章引流；B站同步。

社区驱动：创作者合伙人，积分激励。

变现模型：VIP 订阅、积分充值、商单抽佣。

🚀 六、 开发进度追踪 (Current Progress) - [2025-12-29 01:55 更新]
🔭 当前阶段：Phase 2.4 - 商业化与生态闭环 (Business & Ecosystem)
核心目标：构建“灵感工具”与“商业化”模块，验证平台盈利能力。

✅ 已完成 (Completed)
[2025-12-29 凌晨战果 - CineFlow 核心引擎交付]

[CineFlow 分镜生成器 (MVP 版)]：

[x] 全链路跑通：用户输入剧本 -> AI 自动拆解分镜 (JSON) -> 批量生成线稿/渲染图 -> 自动入库。

[x] 双模引擎切换：成功从 Google/Replicate 迁移至 国产火山引擎 (Volcengine)，实现“豆包大模型”拆解剧本 + “即梦/Seedream”生成画面。

[x] 前端交互升级：实现了 StoryboardPage (新建向导) 与 ProjectEditor (精细编辑) 的分离与衔接。

[x] 基础设施：打通了 Supabase Storage images 存储桶的自动上传与权限配置。

[2025-12-28 历史战果]

[x] [Admin] B 站批量抓取工具 (内容填充核武器)。

[x] [User] 全局用户状态管理 & VIP 视觉体系。

☀️ 下一步行动指南 (Next Action Plan)
核心任务：[CineFlow] 角色一致性与场景替换 (进阶功能)

背景：目前生成的分镜是“单张独立”的，角色长相会变。商业级分镜需要角色固定。

任务拆解：

角色库 (Character Bank)：允许用户上传/生成一个“主角”，并固定其特征 (LoRA 或 Reference)。

场景锁 (Scene Lock)：确认一张场景图后，后续镜头保持背景不变，只动人物。

编辑器优化：在 ProjectEditor 中增加“替换角色”和“重绘背景”的按钮。
[x] 后端 API：突破 B 站防盗链，实现封面/视频源自动转存 Supabase Storage。

[x] 前端交互：Admin 面板新增“批量抓取” Tab，实现 关键词搜索 -> 预览 -> 勾选 -> 一键入库 的丝滑流程。

[x] 数据清洗：自动提取 Tag、简介、时长，并清洗为平台标准格式。

[2025-12-28 日间战果 - 用户体系与交互重构]

[架构升级] 全局用户状态管理：

[x] 创建 contexts/user-context.tsx，消除数据孤岛。

[x] 重构 Profile, Navbar, VideoDetail 接入全局状态。

[UI 升级] VIP 尊贵标识体系：

[x] 头像金色流光边框 + 皇冠角标 + 评论区高层级显示。

[学院内容生态]：

[x] 文章后台增加作者/授权/阅读时长字段。

[x] 实现文章与视频库的智能关联与信息同步。