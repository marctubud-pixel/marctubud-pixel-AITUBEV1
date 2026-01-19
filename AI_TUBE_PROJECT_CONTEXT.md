🛰️ AI.Tube 项目 Master 开发规划与真理文档
(2026-01-20 02:00 更新版)

🛠️ 一、 协作铁律 (The Iron Rules)
单文件修改：必须由用户发送完整代码 -> AI 确认后回复修改后的完整代码。

全局语言协议 (Global Language Protocol)
对话语言：无论任何情况，必须强制使用简体中文回复。
文档语言：所有的计划、人物列表（task）、进度报告、代码注释、commit 信息必须强制使用中文。更新 task 时必须翻译为中文。
界面文字：生成的前端 UI 按钮、标题、提示语必须是中文。
例外情况：代码中的变量名、函数名，必须保持标准的英文（如 generateProposal），严禁使用拼音或中英文混杂。

多文件联动：采取**“分步接力式”**修改。

同步机制：每日重大修改完结，AI 必须主动提醒用户同步此文档。

Git 指令跟进：AI 必须在回复末尾附上 Git 同步指令，并提供中文注释说明。

验收归档闭环：AI 提供代码 -> 用户实测通过 -> 用户确认 -> AI 更新文档 -> 进入下一阶段。

上帝模式优先：在开发 UI 交互或演示流程时，必须优先开启 Mock Mode。

交付级测试：每次功能更新，必须验证“导出 ZIP”与“拖拽排序”的稳定性。

逻辑守恒原则：涉及 Prompt 构建与负面词计算的核心函数，必须 1:1 还原，严禁简化。

平行宇宙开发法 (Branching Strategy)
触发条件：重大功能（InstantID、支付）或重构。

执行：文件 > 500行先拆分 -> git checkout -b feature/xxx ->通过 TEST_CASES.md 后合并。

AI 防呆指令 (The Foolproof Prompt)
场景：核心算法迁移、文件拆分、隐蔽 Bug 修复。

口令：“请进行像素级迁移，严禁简化任何判断逻辑，即使它看起来很冗余。必须保留所有针对边缘情况（如空镜、特定模式）的 if/else 判定。”

🎯 二、 核心愿景与战略 (Core Vision)
定位：全球领先的 AI 原生视频创作社区。

核心支柱：灵感 (Inspiration) / 商业 (Business) / 学习 (Academy)。

🏗️ 三、 板块布局与逻辑架构
/tools/cineflow: [核心] 分镜生成器 (CineFlow 2.0)。

AI Engine:

Render Mode: Z-Image Turbo (胶片感/写实) + Master Composition (大师构图增强)。

Draft Mode: Doubao-Seedream (原生素描) + Wanx 2.1 (智能容灾)。

High Precision: Replicate (ControlNet 构图锁死)。

🚀 六、 开发进度追踪 (Progress Tracker)
✅ ... [2026/01/01 - 2026/01/11 已归档，详见历史记录] ...

✅ 今日完成工作 (Milestones - 2026/01/20)
1. 大师构图引擎 (The Master Composition Engine) —— 视觉 RAG 系统
为了解决用户“无法用语言精准描述画面构图”的痛点，我们构建了一套基于电影工业标准的视觉检索增强生成 (Visual RAG) 系统。

全阿里云技术栈 (Full Aliyun Stack):

彻底移除了 OpenAI 依赖，实现技术栈的纯国产化与成本优化。

视觉大脑: 阿里云 Qwen-VL-Plus (用于提取高精度视觉标签)。

向量中枢: 阿里云 Text-Embedding-V2 (用于生成 1536 维特征向量)。

工业级数据架构 (Pro Max Schema):

设计了包含 4 大维度、16 个关键字段的 JSON 范本。

新增维度: 环境光效 (Environment/Lighting)、时间天气 (Time/Weather)、人物精准朝向 (Facing Direction)。

价值: 解决了“搜背影出正脸”的语义模糊问题，支持如“雨夜霓虹背影”的精准检索。

自动化构建流水线:

开发了 scripts/build-db.js：支持断点续传、自动查重、自动上传至 Supabase Storage 并生成向量入库。

在 Supabase 部署了 composition_refs 向量表与 match_compositions RPC 匹配函数。

2. 前端深度集成 (UI Integration)
构图选择器 (CompositionPicker):

封装了独立的模态框组件，支持关键词实时向量搜索。

实现了电影级 Metadata 展示（景别、角度、光影）。

分镜卡片升级:

在 PanelCard 工具栏新增了 大师构图 (Film/Clapperboard) 入口。

实现了 Prompt 自动增强逻辑：选中参考图后，自动提取其专业术语（如 Low Angle, Cinematic Lighting, Tense）并追加到用户的 Prompt 中。

3. IDE 迁移准备
完成了从 Cursor 迁移至 Google Antigravity 的代码准备工作。

确认了代码库与 Antigravity Agent 模式的兼容性路径。


4. IDE 迁移与执行 (IDE Migration Execution)
IDE 环境验证:
已修复 CompositionPicker.tsx 构建错误。
修复了 page.tsx 中 missing imports (CINEMATIC_SHOTS) 问题。
已在 Antigravity 环境中成功运行 npm run build。

5. 构图控制深化 (Composition Control & ControlNet)
核心逻辑打通:
实现了 handleApplyComposition 函数：自动映射 Master Composition 到分镜的 景别 (Shot Type)、角度 (Angle)。
实现了 Prompt 智能增强：提取光影 (Lighting) 和 氛围 (Mood) 关键词。
关联 ControlNet:
已将 CompositionPicker 选中的图片 URL 传递给生图引擎。
修复了 UI 遮挡问题：将全屏黑底改为底部渐变 (Linear Gradient)，避免遮挡构图画面。

⚠️ 待解决 / 下一步计划 (Next Steps)
数据扩容 (Data Expansion):
目前仅跑通了测试集。需要运行脚本大规模处理 raw_images，构建千张级的电影数据库。
生图额度问题:
注意 DashScope 免费额度已耗尽，需提醒用户充值或切换模型。
Mock Mode 验证:
建议用户在下次开发前优先使用 Mock Mode 验证业务流转，节省 Token。