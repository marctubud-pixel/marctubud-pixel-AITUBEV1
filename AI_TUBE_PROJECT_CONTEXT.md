🛰️ AI.Tube 项目 Master 开发规划与真理文档
(2026-01-04 01:26 封板归档版)

🛠️ 一、 协作铁律 (The Iron Rules)
单文件修改：必须由用户发送完整代码 -> AI 确认后回复修改后的完整代码。

多文件联动：采取**“分步接力式”**修改。

同步机制：每日重大修改完结，AI 必须主动提醒用户同步此文档。

Git 指令跟进 (中文化标准)：AI 必须在回复末尾附上 Git 同步指令，并提供中文注释说明。

验收归档闭环：AI 提供代码 -> 用户实测通过 -> 用户确认 -> AI 更新文档 -> 进入下一阶段。

(新增) 上帝模式优先：在开发 UI 交互或演示流程时，必须优先开启 Mock Mode，避免浪费 API 额度。

(新增) 交付级测试：每次功能更新，必须验证“导出 ZIP”与“拖拽排序”的稳定性。

(新增) 逻辑守恒原则：在代码拆分/重构时，涉及 Prompt 构建与负面词计算的核心函数（如 buildActionPrompt），必须进行 1:1 像素级还原，严禁擅自简化判断逻辑。

（新增）平行宇宙开发法 (Branching Strategy)：触发条件：每当启动一个重大功能（如 InstantID 接入、双人模式、支付系统）或进行架构重构时。 

～执行流程：

～～先拆分：如果当前文件行数 > 500 行，先要求 AI 进行组件拆分。

～～开分支：AI 必须给出创建新分支的具体指令。

～～指令模板：git checkout -b feature/功能名 或 git checkout -b refactor/重构模块名。

～～再合并：只有在 TEST_CASES.md 全部通过后，才允许合并回主分支。

（新增）AI 防呆指令 (The Foolproof Prompt)

～使用场景：

～～当要求 AI 迁移核心算法（如计费、生图 Prompt 拼接、用户权限校验）时。

～～当把一个大文件拆分成多个小文件，但逻辑必须保持不变时。

～～当修复了一个极其隐蔽的 Bug（如“线稿模式防手”），需要再次修改相关代码时。

～～强制指令文案：

“请进行像素级迁移，严禁简化任何判断逻辑，即使它看起来很冗余。必须保留所有针对边缘情况（如空镜、特定模式）的 if/else 判定。”


🎯 二、 核心愿景与战略 (Core Vision)
定位：全球领先的 AI 原生视频创作社区。

核心支柱：灵感 (Inspiration) / 商业 (Business) / 学习 (Academy)。

🏗️ 三、 板块布局与逻辑架构 (System Architecture)
路由与功能分布

/ : 首页 (瀑布流 + 筛选)。

/tools/characters : [已上线] 角色资产库。含角色编辑、Prompt 配置、参考图画廊。

/tools/cineflow : [核心] 分镜生成器 (集成最新 CineFlow 2.0 引擎)。

/tools : 工具库入口。

/vip : 会员专区。

/admin : 管理后台。

技术栈核心

Image Processing: Sharp (Node.js) - 服务端物理裁剪引擎。

AI Engine: Doubao-Seedream-4.5 (Vision) + Seedream-3.0 (T2I) + 智能提示词工程 (Prompt Override Mode)。

🚀 六、 开发进度追踪 (Current Progress)
✅ 今日完成工作 (Milestones - 2026/01/01)
1. CineFlow 核心引擎 V3.1 (The "Hallucination Killer")
我们攻克了 AI 分镜最顽固的两个幻觉问题：

主语清洗 (Subject Scrubbing)：

原理：在 generate.ts 中引入正则清洗，针对非人脸特写（脚部、车轮），物理删除 Prompt 中的“他/她/男人/侦探”等代词。

效果：彻底解决了“脚部特写长出人头”和“车轮里有人脸”的惊悚 Bug。

景别定义分离 (Shot Definitions Split)：

原理：新增 OBJECT_SHOT_PROMPTS。当检测到物体特写时，CLOSE-UP 的定义自动从“聚焦面部”切换为“聚焦物体细节/微距”。

效果：即使在草图模式下，特写镜头也不再强行生成五官。

全景保护 (Panorama Authority)：

原理：在 director.ts 中，一旦检测到“全景/全身/大场景”，强制锁定 ShotType 为 FULL SHOT，压制住“看/拿”等局部动词触发的特写误判。

2. CineFlow V2.0 交互大升级 (The "Editor" Evolution)
从“生成器”进化为真正的“编辑器”：

拖拽排序 (Drag & Drop)：集成 @dnd-kit，实现分镜卡片丝滑拖拽，分镜号（#01, #02...）随位置自动重排。

多格式剧本导入 (Universal Import)：支持直接上传 Word (.docx)、Excel (.xlsx)、TXT 文件，自动提取文本并填充。

一键打包交付 (ZIP Export)：新增 ZIP 导出功能，自动将所有分镜图按 序号_景别_描述.png 规范命名打包，满足商业交付需求。

全局氛围控制 (Global Atmosphere)：前端新增“氛围输入框”，一键将“赛博朋克/宫崎骏风”注入所有分镜，实现整齐划一的影调。

3. 开发者体验优化 (DX)
上帝模式 (Mock Mode)：

后端：generate.ts 支持接收 useMock 参数，跳过 API 调用，返回高清占位图。

前端：UI 新增“MOCK ON/OFF”开关，解决 API 欠费/限流时的开发阻塞问题，同时方便极速演示。

🚩 待解决与后续计划 (To-Dos)
[今日重点] 角色库功能补全 (Character Consistency)
负面提示词 (Negative Prompt)：在角色编辑弹窗中增加此字段，并在生图时自动挂载（例如防止某角色总是生成眼镜）。

画廊联动：CineFlow 编辑器增加“从角色库选择参考图”的弹窗，打通资产库。

[本周目标] 商业化闭环 (Monetization Setup)
基于《执行计划》，开始搭建变现基础设施：

SOP 导出优化：不仅导出图片，还要能一键生成包含“提示词 + 参数”的 PDF 文档（作为 9.9元 引流产品）。

案例库页面：开发 /cases 路由，用于展示我们用 CineFlow 生成的精美视频/分镜案例。

🚀 实时更新、 开发进度追踪 (Progress Tracker)

🚀 六、 开发进度追踪 (Progress Tracker) - V5.3 进化版
✅ 已完成工作 (Milestones - 2026/01/01)
1. 核心引擎升级：Draft Mode 物理去色 (The "Grayscale Lock")

痛点：线稿模式下，换人（Casting）会导致人物带颜色，且背景被角色描述污染（如城堡变城市）。

解决方案：

物理去色：在 repaint.ts 中引入 Sharp，强制将输入的原图和参考图转为灰度 (Grayscale)，从物理层面切断色度信息。

语义清洗：引入 cleanCharacterDescription 函数，在 Draft 模式下自动剔除 Prompt 中的颜色词（Blue, Pink）和环境词（City, Neon），实现“语义隔离”。

成果：线稿换人现在完美保持黑白素描风格，背景零污染。

2. UI/UX 终极精修 (The "Polish" Update)

Step 2 剧本卡片回归：

布局：回归宽幅长方形大卡片，大屏下一行两列 (grid-cols-2)，彻底解决信息拥挤问题。

交互：新增“删除模式” (Minus 按钮触发)，平时隐藏删除键，防止误触。

排版：信息层级重构 -> 文字描述置顶，Prompt 默认折叠，参数栏置底并图标化。

首页 (Landing) 重构：

视觉：主标题字号加大加粗 (text-6xl)，整体内容下移 (pt-40) 增加呼吸感。

细节：按钮样式分级（浅色模式改为白底加边框），调整“上传脚本”与“自动画幅”的按钮顺序。

大图模式 (Lightbox) 2.0：

沉浸式体验：回归全屏沉浸布局，移除侧边栏，信息悬浮于底部。

交互增强：支持键盘左右键 (←/→) 切换图片，Enter/Esc 关闭。

角色替换：按钮固定于右下角，弹窗采用 iOS 风格毛玻璃效果。


✅ 今日完成工作 (Milestones - 2026/01/02)
1. 架构大重构：组件化拆分 (The "Grand Split")
目标：解决 page.tsx 代码量爆炸（1600+行）导致的维护困难问题。

行动：成功将巨型文件拆解为模块化组件（StepInput, StepReview, StepRender, PanelCard, Modals 等），并剥离了 types.ts 和 constants.ts。

成果：主文件瘦身至 400 行，模块职责清晰。

2. 核心逻辑抢救与加固 (The "Logic Rescue")
修复：解决了重构导致的逻辑丢失问题（线稿画手、空镜加人）。

方案：建立了统一的负面词工厂 getSmartNegativePrompt，针对 Draft 模式强制注入权重 2.0 的“防手”咒语，针对空镜强制注入“防人”咒语。

3. UI/UX 优化与全面汉化 (Global Polish)
视觉：优化了全局页面的 UI 细节，统一了深色/浅色模式下的组件阴影与边框质感。

汉化：完成了全站核心交互文案的汉化工作（包括 Prompt 输入提示、按钮状态、报错信息），提升了中文语境下的用户体验。


✅ 今日完成工作 (Milestones - 2026/01/03) 1. 智能分面角色库 (Smart Character Matrix) —— 架构级重构

痛点：旧版逻辑下，AI 无法区分“正面描述”和“背面描述”，导致画背影时经常出现“背上长Logo/领带”的恐怖幻觉（Prompt Contamination）。

解决方案：

数据库升级：characters 表新增 description_map (JSONB) 字段，物理隔离 front、back、side 的文字描述。

智能录入：前端重构，实现“上传即分析”。当用户上传背影图时，Vision AI 自动生成一段“无Logo、无五官”的纯净描述并存入数据库。

效果：从源头切断了语义污染。

2. 视觉桥接技术 (Visual Bridge) —— 解决“瞎画”问题

原理：彻底改造 vision.ts 和 repaint.ts。当检测到特定角度的参考图时，系统会先调用 Vision API “看一眼”参考图，提取“校服/高马尾”等特征，并强制注入到 Prompt 中。

成果：实现了真正的“图生文 + 图生图”闭环。即使剧本里没写“穿校服”，AI 也能通过看图自动补全服装细节。

3. 动态重绘引擎 (Dynamic Repaint Engine) —— 暴力美学

问题：图生图模式下，底图（Draft）的错误像素（如正面的领带）会顽固地残留到最终成品中。

策略：引入 Dynamic Strength 逻辑。

普通模式：Strength 0.55（保持构图稳定性）。

背影模式：Strength 0.95（暴力重绘）。强制 AI 忽略底图的错误结构，完全听从 Prompt 和参考图的指挥。

结果：彻底根治了“衣服前后混在一起”的顽疾，实现了 100% 纯净的背影生成。


🚩 待定任务核心攻坚

1. 魔法编辑 (Magic Edit)

目标：解决“站位无法调整”、“多余物体无法删除”的问题。

行动：在大图模式开发 Inpaint (局部重绘) 和 Pose Control (姿态控制) 功能。

2. 导演辅助 (Director Mode)

目标：解决 Step 2 文字脚本太干瘪的问题。

行动：集成 Unsplash/Pexels API，根据脚本关键词自动推荐参考图。

✅ 今日完成工作 (Milestones - 2026/01/05)
1. 导演参考库 (Director's Reference Library) —— 生产力级实装 我们将原本简陋的“搜图弹窗”升级为了一个专业的导演工作台，支持三种维度的视觉探索：

三模式架构 (Tri-Mode Architecture)：

氛围参考 (Atmosphere)：接入 Unsplash，用于寻找光影、具体动作（如“Running”）和人体姿态。

构图骨架 (Composition)：[预埋] 提供“三分法/中心构图/荷兰角”等结构模版，用于锁定画面几何结构。

电影剧照 (Cinematic)：[PRO 功能] 接入 Google Custom Search API，锁定 Film-Grab、AnimationScreencaps 等 8 大顶级剧照源，提供 4K 级电影截图。

智能翻译大脑 (Movie Database Expert)：

痛点：Film-Grab 等库只收录英文片名，搜“变形金刚”无结果。

解决：重写 translateToEnglish Action，植入“电影资料库专家”人格。实现了从“中文俗名”到“官方英文片名”的精准映射（如：千与千寻 -> Spirited Away），确保 100% 命中英文数据库。

搜图引擎核聚变 (Search Engine Fusion)：

网络突围：后端引入 undici 的 ProxyAgent，配合本地代理端口（7890），彻底解决了 Next.js 后端无法连接 Google API 的 ConnectTimeout 问题。

并发与分页：重构后端逻辑，首屏并行发射 3 个请求（Start Index 1, 11, 21），实现 30张大图霸屏，并支持“加载更多”无限滚动。

画质觉醒：API 强制请求 imgSize=huge，前端 CSS 优化 object-cover 并配合全新的 Lightbox (全屏灯箱)，让导演能确认每一处光影细节。

2. 视觉锚点理论 (Visual Anchor Theory) 在产品逻辑层面，明确了参考图在 IP-Adapter 流程中的权重体系：

70% 光影氛围 (Atmosphere)：吸取参考图的色板、光比和胶片质感。

30% 软构图 (Soft Composition)：提供站位建议，但非硬性骨架锁定。

价值：确立了“剧照即高级滤镜”的产品核心价值，解决了 AI 生图“塑料感”和“光影不统一”的顽疾。

📅 明日开发计划 (Next Steps)
按照您的指示，明天我们将重点攻克以下两个堡垒：

构图骨架 (Composition Skeleton) 实装

目标：将 Tab 2 中的“占位图”替换为真正具有指导意义的结构线稿/深度图。

技术点：接入 ControlNet (Depth/Canny) 的逻辑，让用户选了“三分法”后，生成的图严格遵守该构图。

魔法编辑 (Magic Edit) / 局部重绘

目标：解决“图生成得很好，但这只手画歪了”或者“我想把这把枪换成花”的问题。

技术点：实现 In-painting（局部重绘）交互，让导演可以对分镜进行像素级的微调。