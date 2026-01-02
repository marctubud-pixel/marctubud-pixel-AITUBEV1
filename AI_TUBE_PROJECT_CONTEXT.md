🛰️ AI.Tube 项目 Master 开发规划与真理文档
(2026-01-03 03:39 封板归档版)

🛠️ 一、 协作铁律 (The Iron Rules)
单文件修改：必须由用户发送完整代码 -> AI 确认后回复修改后的完整代码。

多文件联动：采取**“分步接力式”**修改。

同步机制：每日重大修改完结，AI 必须主动提醒用户同步此文档。

Git 指令跟进 (中文化标准)：AI 必须在回复末尾附上 Git 同步指令，并提供中文注释说明。

验收归档闭环：AI 提供代码 -> 用户实测通过 -> 用户确认 -> AI 更新文档 -> 进入下一阶段。

(新增) 上帝模式优先：在开发 UI 交互或演示流程时，必须优先开启 Mock Mode，避免浪费 API 额度。

(新增) 交付级测试：每次功能更新，必须验证“导出 ZIP”与“拖拽排序”的稳定性。

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

🚩 待解决与后续计划 (To-Dos)
[明日重点] 画面控制力攻坚 (ControlNet & Consistency)
1. 线稿模式风格隔离 (Draft Mode Pure Style)
问题：目前角色替换（Casting）时，角色自带的色彩或风格（如3D渲染图）有时会“污染”线稿模式，导致画面不纯粹。

目标：绝对纯色。

方案：

Prompt 层：在 buildActionPrompt 中加入更强力的去色指令。

物理层：在 repaint 接口中，强制对输入参考图进行灰度化/边缘提取 (Canny) 处理后再喂给模型，从物理上切断颜色来源。

2. 角色替换的构图锚定 (Casting Composition Lock)
问题：换人后，原本完美的构图、表情或动作会被新角色的习惯动作带偏（例如原图是背影，换人后变成了正面）。

目标：只换脸/衣服，不动骨架。

方案：优化 Repaint 逻辑，引入 Structure Control (结构控制)。在调用生图 API 时，必须将原图作为 image_guidance 且设置高强度的 prompt_strength 或使用 ControlNet Depth/Pose 约束。

3. 双人角色系统 (Dual-Character Engine)
目标：突破目前仅支持单主角的限制，支持“对话”、“对峙”等双人场景。

行动：

更新数据结构，支持 characterIds 数组存储多个 ID。

优化 LLM 剧本拆解，识别“角色A与角色B”的关系。

开展双人同框的生图测试，解决“两个人长得一样”或“人物融合”的问题。

4. 场景一致性检测 (Scene Consistency)
目标：验证 Scene Description（场景/环境）输入框的有效性。

行动：开展压力测试，确保当用户填写“赛博朋克雨夜”时，所有分镜（无论是否包含角色）都严格遵循这一环境设定，不会出现“室内变室外”的情况。


🚩 待定任务核心攻坚

1. 魔法编辑 (Magic Edit)

目标：解决“站位无法调整”、“多余物体无法删除”的问题。

行动：在大图模式开发 Inpaint (局部重绘) 和 Pose Control (姿态控制) 功能。

2. 导演辅助 (Director Mode)

目标：解决 Step 2 文字脚本太干瘪的问题。

行动：集成 Unsplash/Pexels API，根据脚本关键词自动推荐参考图。