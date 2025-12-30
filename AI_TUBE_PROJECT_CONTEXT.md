🛰️ AI.Tube 项目 Master 开发规划与真理文档
(2025-12-30 23:59 封板归档版)

🛠️ 一、 协作铁律 (The Iron Rules)
单文件修改：必须由用户发送完整代码 -> AI 确认后回复修改后的完整代码。

多文件联动：采取**“分步接力式”**修改。

同步机制：每日重大修改完结，AI 必须主动提醒用户同步此文档。

Git 指令跟进 (中文化标准)：AI 必须在回复末尾附上 Git 同步指令，并提供中文注释说明。

验收归档闭环：AI 提供代码 -> 用户实测通过 -> 用户确认 -> AI 更新文档 -> 进入下一阶段。

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
✅ 今日完成工作 (Milestones - 2025/12/30)

1. AIGC 核心引擎 V2.1 (The "Ghost Face" Battle)

物理层：服务端裁剪 (Sharp Integration)，配合 Vision 坐标阻断 AI 联想。

逻辑层：熔断式语义隔离 (Semantic Fuse)，实现中英文双语识别与负面指令高权重熔断。

特征层：智能清洗 (Feature Scrubbing)，解决“眼球里长裙子”的特征污染问题。

2. CineFlow 2.0 终极完善 (Logic Closure)

Director 智能体 (app/actions/director.ts) 重构：

Prompt 覆盖模式 (Override Mode)：针对特定镜头（车轮、手部、脚部），从“追加提示词”升级为**“完全覆盖”**，彻底根除 AI 幻觉（如车轮里长人）。

主语识别增强：精准区分“车停下”（轮胎特写）与“人停下”（脚部特写），并移除了对“行走”的误判（恢复全景）。

防御式编程：引入强制类型转换，解决了 Server Action 因 AI 返回非字符串数据导致崩溃的隐患。

前端交互 (page.tsx) 逻辑修正：

Prompt 优先级重构：生图时优先使用后端清洗过的 panel.prompt (English)，不再盲目拼接中文描述，确保去人化逻辑在生图端真正生效。

生图引擎 (generate.ts) 补丁：

车辆关键词支持：在 isNonFaceDetail 中新增 car/wheel/tire，配合熔断机制，实现了“车轮特写”自动屏蔽角色 ID。

3. 基础设施

角色库 UI 就绪，存储权限修复。

🚩 待解决与后续计划 (To-Dos)

[明日重点] 角色库功能升级 (Character Library Upgrade)

字段扩展：

在“编辑角色”弹窗中新增 “负面提示词 (Negative Prompt)” 字段。

目的：为特定角色配置永久屏蔽词（如 glasses），减少重复劳动。

引擎接入：

修改 actions/generate.ts，使其自动挂载角色的 negative_prompt。

画廊联动：

实现 CineFlow 编辑器直接调用角色库“参考图画廊”的功能。