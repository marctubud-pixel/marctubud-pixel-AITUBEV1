🛰️ AI.Tube 项目 Master 开发规划与真理文档 (2025-12-30 00:30 更新版)

🛠️ 一、 协作铁律 (The Iron Rules) - 永不动摇
单文件修改：必须由用户发送完整代码 -> AI 确认后回复修改后的完整代码。

多文件联动：采取**“分步接力式”**修改（A -> B -> C），避免一次性抛出多个文件。

同步机制：每日重大修改完结，AI 必须主动提醒用户同步此文档。

Git 指令跟进：AI 必须在回复末尾附上 Git 同步指令。

Git 指令跟进 (中文化标准)：AI 必须在回复末尾附上 Git 同步指令，并根据实际分支名（如 main）提供中文注释说明。

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
✅ 今日完成工作 (Milestones)
存储与权限优化 (Storage & RLS)：

通过 SQL 策略修复了 images 存储桶的 Row-Level Security (RLS) 拦截问题，实现了公开上传与访问。

重构了上传逻辑，引入 时间戳+纯英文命名策略，彻底解决了中文路径导致的 Invalid Key 上传失败问题。

即梦 (Jimeng) Img2Img 深度集成：

接入 Doubao-Seedream-3.0-t2i 绘图模型，通过服务器端 Base64 转换 实现了稳定的参考图传输。

针对高清 Pro 级模型，将全局分辨率映射（RATIO_MAP）升级至 2K 标准 (2560x1440)，解决了像素点不足导致的 API 报错。

多模态智能工作流 (Smart Workflow)：

引入 Doubao-Seedream-4.5 视觉大模型，实现了“先分析参考图、后决定生图策略”的感知逻辑。

构建了 动态重绘强度 (Strength) 引擎：自动根据“参考图景别”与“目标分镜景别”的差异调整重绘幅度（如 Full Shot 转 Close-up 时自动提升至 0.85）。

分镜控制补丁 (Storyboard Patches)：

新增 动态负面提示词 (Negative Prompt) 注入，针对特写镜头强制屏蔽 legs, lower body 等构图元素。

引入 风格锁 (Style Lock) 机制，通过正面权重加持 (photorealistic:1.4) 确保高强度重绘下写实风格不向动漫偏移。

🚩 待解决与后续计划 (To-Dos)
[明日重点] 构图固化问题深挖：

目前在“全身参考图 -> 特写镜头”时，AI 仍有保留原图腿部结构的倾向。

计划：尝试在 vision.ts 中提取更细致的“人体比例坐标”，或者研究通过 ControlNet (Depth/Canny) 进行构图引导（如果 API 支持）。

一致性优化：

进一步调优角色特征在 Prompt 中的权重比例，平衡参考图与文字描述的竞争关系。