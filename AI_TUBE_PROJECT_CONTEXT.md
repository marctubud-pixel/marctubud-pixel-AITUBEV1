🛰️ AI.Tube 项目 Master 开发规划与真理文档 (2025-12-29 22:45 更新版)
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

灵感 (Inspiration)：CineFlow 引擎、提示词词典、角色资产库。

商业 (Business)：合作中心商单撮合、创作者激励体系、版权授权。

学习 (Academy)：系统化 AI 教程、案例复盘、所见即所得的实战笔记。

🏗️ 三、 板块布局与逻辑架构 (System Architecture)
路由与功能分布

/ : 首页。5列瀑布流，含 Banner 轮播、多维度筛选。

/academy : AI 学院 (列表页)。Grid 12列布局。

/video/[id] : 播放页。混合播放器，含 VIP 标识、分镜下载。

/tools : 工具库入口。

/tools/characters : [新增] 角色资产库。管理一致性角色参考图。

/tools/cineflow : 分镜生成器。

/vip : 会员专区。黑金视觉体系。

/admin : 管理后台。

技术栈核心

Frontend: Next.js 15 (App Router) + Tailwind CSS + Lucide React。

Backend: Supabase (Auth, DB, Storage)。

Auth Infrastructure: [重构] Middleware (Root & Utils分离) + Server/Browser Client 混合鉴权。

Spider Engine: Client-side Fetching (AllOrigins) + DOMParser。

📊 四、 数据库 Schema 核心 (Database Snapshot)
videos: is_vip, price, storyboard_url, prompt, category, duration, bilibili_source_id。

articles: description, content, difficulty, tags, link_url, video_id, author, is_authorized。

profiles: points, is_vip, free_quota, avatar_url, username, last_check_in。

characters (新增): id, user_id (FK), name, description, avatar_url (Storage Link), created_at。

comments: content, video_id, user_id。

📈 五、 营销推广与商业化策略 (Marketing)
内容获客：SEO 文章引流；B站同步。

社区驱动：创作者合伙人，积分激励。

变现模型：VIP 订阅、积分充值、商单抽佣。

🚀 六、 开发进度追踪 (Current Progress)
🔭 当前阶段：Phase 3.1 - 商业级分镜物理 (Commercial Physics)

核心目标：确保分镜生成的“物理属性”（比例、画风、连续性）符合影视行业标准。

✅ 已完成 (Completed) [2025-12-29 深夜战果 - 商业化核心升级]

[CineFlow 画幅与构图]：

[x] 动态分辨率引擎：后端不再硬编码 1024x1024，支持 16:9, 9:16, 2.39:1 (宽银幕) 等多种映射。

[x] UI 自适应布局：分镜卡片根据选择的比例自动调整 CSS (aspect-video, grid-cols), 彻底修复预览裁剪问题。

[CineFlow 风格与模式]：

[x] 双层渲染架构：实现 Turbo (草图) 与 Flux (渲染) 分离。仅在渲染模式下加载风格选项。

[x] 风格预设库：集成 8 种主流商用风格 (Cyberpunk, Anime, Realistic, Noir 等)。

[CineFlow 场记系统]：

[x] 场景锁 (Scene Lock)：新增环境描述字段，强制统一所有分镜的背景设定。

[x] 电影级运镜：扩充 10+ 种专业镜头语言 (Dutch Angle, Overhead, etc.)。

☀️ 下一步行动指南 (Next Action Plan)

核心任务：[Assets] 角色资产 2.0 - 多图/三视图管理 (Multi-Image Assets)

用户痛点：“单张图片太单一，无法商用。需要三视图、表情、动作等多维资产。”

任务拆解：

数据库升级：新建 character_images 表 (一对多关系)，关联 characters 主表。

前端改造：在 /tools/characters 详情页，允许用户上传多张参考图（侧面、背面、表情包）。

生成逻辑升级：在生成分镜时，允许用户指定“引用哪一张图”作为 Reference（为后续图生图做准备）。