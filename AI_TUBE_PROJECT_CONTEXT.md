🛰️ AI.Tube 项目 Master 开发规划与真理文档 (2025-12-30 00:30 更新版)

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
🔭 当前阶段：Phase 3.3 - 视觉闭环与导出交付 (Visual Loop & Delivery)

核心目标：从“数据打通”迈向“算法打通”，让 AI 真正参考图片绘图；同时实现分镜的商业交付（PDF 导出）。

✅ 已完成 (Completed) [2025-12-30 凌晨战果 - 视觉锚点集成]

[CineFlow 前端交互]：

[x] 参考图选择器：在 Storyboard 页面实现了基于角色的参考图加载与点选交互。

[x] 视觉反馈：选中图片高亮，支持“无参考”与“有参考”状态切换。

[CineFlow 后端逻辑]：

[x] API 升级：generateShotImage 函数增加 referenceImageUrl 参数。

[x] 数据流打通：成功将前端选中的图片 URL 传递至后端（目前用于日志/Prompt 辅助）。

[角色资产库 2.0]：

[x] 多图管理：支持上传三视图、表情包等多维参考图。

☀️ 下一步行动指南 (Next Action Plan)

核心任务 A：[Engine] 真·图生图 (True Image-to-Image) [🔥 攻坚重点]

痛点：目前参考图仅作为 Prompt 的心理暗示，AI 并没有真正读取像素。导致服装细节不一致。

方案：

调研火山引擎接口：寻找支持 image_url 输入的 img2img 或 controlnet 端点。

后端改造：如果 API 变化，需要重写 generateShotImage 的 payload 组装逻辑。

强度控制：前端增加“参考强度 (Strength)”滑杆（0.1 ~ 1.0），控制 AI 听话的程度。

核心任务 B：[Export] 商业级 PDF 导出 (Deliverable)

痛点：分镜画好了，用户无法拿去给剧组或客户看。

方案：

PDF 生成：使用 jspdf 或 react-pdf。

排版布局：生成标准的影视分镜表（左图右文，包含景别、运镜、时长）。