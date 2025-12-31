🛰️ AI.Tube 项目 Master 开发规划与真理文档
(2025-12-30 23:59 封板归档版)

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