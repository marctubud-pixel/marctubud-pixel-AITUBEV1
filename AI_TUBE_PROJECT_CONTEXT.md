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

🚀 六、 开发进度追踪 (Current Progress) - [2025-12-29 22:45 更新]
🔭 当前阶段：Phase 2.4 - 核心资产与一致性 (Core Assets & Consistency)

核心目标：建立用户专属的角色库，为 CineFlow 引擎实现“角色一致性”生成提供数据源。

✅ 已完成 (Completed) [2025-12-29 晚间战果 - 角色库与鉴权基建里程碑]

[架构修正] 鉴权与中间件重构 (Critical Fixes)：

[x] Middleware 重写：分离 root/middleware.ts (入口) 与 utils/supabase/middleware.ts (逻辑)，彻底解决 Cookie 无法写入导致的鉴权失败。

[x] Login 逻辑升级：重构 login/page.tsx，摒弃纯 JS Client，改用 ssr Client 以支持 Cookie 自动管理。

[x] 安全配置：配置 next.config.ts 中的 remotePatterns，添加 Supabase 域名白名单，解决跨域图片加载拦截。

[功能模块] 角色资产库 (Character Assets)：

[x] Database：创建 characters 表，配置 RLS (Row Level Security) 策略，确保用户只能操作自己的数据。

[x] Storage：创建 characters 存储桶，实现基于 User ID 的文件路径隔离 (userId/filename)。

[x] Frontend：上线 /tools/characters 页面，实现图片上传、预览、删除及元数据管理。

[x] 诊断工具：在开发过程中构建了 Session 诊断组件，验证了鉴权链路的稳定性。

[2025-12-29 凌晨战果 - CineFlow 核心引擎交付]

[x] 全链路跑通：用户输入剧本 -> AI 拆解分镜 -> 火山引擎/即梦生成图片 -> 入库。

[x] 双模引擎切换：Volcengine (豆包 + Seedream) 集成。

[x] 前端交互：StoryboardPage (向导) + ProjectEditor (编辑器) 分离。

☀️ 下一步行动指南 (Next Action Plan)

核心任务：[Backend] CineFlow 引擎集成角色一致性 (Role Consistency)

背景：角色库已就位，现在需要让分镜生成引擎“学会”读取并使用这些角色。

任务拆解：

Prompt 工程升级：修改 route.ts 中的 Prompt 组装逻辑，将用户选中的 Character 的 description 和 avatar_url (作为 Reference) 注入到绘画 Prompt 中。

API 联调：测试火山引擎的 Image-to-Image (图生图) 或 ControlNet 接口，以实现角色面部固定。