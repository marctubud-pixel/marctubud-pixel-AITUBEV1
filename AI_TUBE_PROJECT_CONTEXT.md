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

🚀 六、 开发进度追踪 (Current Progress) - [2025-12-29 23:10 更新]
🔭 当前阶段：Phase 3.0 - 智能一致性与深度编辑 (Smart Consistency & Deep Editing)

核心目标：从“能画图”进化为“画得准”，解决 AI 视频创作中最大的痛点——角色与场景的不连续性。

✅ 已完成 (Completed) [2025-12-29 深夜战果 - 角色一致性核心 (Character Consistency Core)]

[CineFlow 后端大脑改造]：

[x] 升级 generateShotImage Server Action，新增 characterId 参数支持。

[x] 实现 Prompt Injection (提示词注入) 逻辑：自动查表获取角色 description，并将其权重置于 Prompt 首位，强制 AI 锁定角色特征。

[x] 预埋 avatar_url 逻辑，为未来升级 Image-to-Image (图生图) 做好数据准备。

[CineFlow 前端交互升级]：

[x] 实现 StoryboardPage 动态加载 Supabase 角色列表。

[x] 新增“主角选择”下拉菜单，实现前后端数据流打通。

[2025-12-29 晚间战果 - 角色资产库]

[x] 角色库 CRUD、鉴权修复、存储桶隔离、图片域名白名单 (已归档)。

☀️ 下一步行动指南 (Next Action Plan)

核心任务 A：[CineFlow] 场景锁 (Scene Lock / Background Consistency)

痛点：现在角色长得一样了，但第一张图在“赛博城市”，第二张图可能突然跑到“森林”里去了，因为 AI 对环境的想象太发散。

方案：允许用户先生成一张“空镜”或“概念图”作为基准，后续所有镜头强制参考这张图的色调和结构 (使用 Image-to-Image 或 Style Reference)。

核心任务 B：[Editor] 单镜重绘与微调 (Regenerate & Refine)

痛点：目前是“一锤子买卖”，如果 10 张图里有 1 张画崩了（比如多只手），用户无法只重画这一张。

方案：点击生成后的图片 -> 弹出编辑框 -> 修改 Prompt -> 点击“单张重绘”。