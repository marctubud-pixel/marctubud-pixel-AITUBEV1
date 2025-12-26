# AI.Tube Project Roadmap

> **Project Vision**: 构建下一代 AI 原生视频平台。
> **Current Focus**: 核心生产力工具 (CineFlow) 的 MVP 开发。

---

## 🏗️ Module 1: CineFlow (AI Content Engine)
*定位：AI.Tube 的内容生产“车间”，负责将剧本转化为可视化分镜/视频。*

### ✅ Phase 1.1: 基础设施与核心链路 (Completed)
- [x] **本地开发环境**: Next.js + Supabase + Google SDK 配置完成。
- [x] **网络穿透**: 解决了 Node.js 后端连接 Google/Pollinations 的代理墙问题 (Undici/Proxy)。
- [x] **AI 导演 (The Brain)**: 接入 Gemini 2.0 Flash，实现剧本 -> 结构化分镜数据的推理。
- [x] **AI 画师 (The Painter)**: 接入 Pollinations API，实现双模式生图：
    - **Draft Mode**: 使用 Turbo 模型实现秒级线稿生成（用于快速验证）。
    - **Render Mode**: 使用 Flux 模型实现电影级画质渲染。

### 🚧 Phase 1.2: 资产一致性与编辑器 (In Progress - Next Step)
- [ ] **角色库 (Character Library)**:
    - 建立角色档案（Prompt + Seed），确保生成的画面中主角长相一致。
- [ ] **场景库 (Scene Library)**:
    - 统一场景风格描述，防止同一场戏背景跳变。
- [ ] **可视化编辑器 (Canvas)**:
    - 实现分镜图的拖拽排序、单图重绘 (Inpainting)、文本微调。

---

## 📺 Module 2: AI.Tube Platform (The Stage)
*定位：视频内容的分发与播放平台（类 Bilibili/YouTube 架构）。*

### 📋 Phase 2.1: 基础站点搭建 (Planned)
- [ ] **视频播放器**: 支持高码率流媒体播放。
- [ ] **国内低成本加速**: 解决大陆地区访问 B 站源或自建源的流畅度问题 (基于之前的讨论)。
- [ ] **用户系统**: 打通 CineFlow 与 AI.Tube 的账户体系。

### 🔌 Phase 2.2: 产销一体化 (Planned)
- [ ] **一键发布**: 将 CineFlow 生成好的分镜视频/成片，直接发布到 AI.Tube 个人频道。
- [ ] **创作者中心**: 管理 AI 生成的素材库和草稿箱。

---

## 🛠️ Infrastructure (The Foundation)
- [x] **Backend**: Supabase (PostgreSQL + Storage + Auth).
- [x] **AI Gateway**: Google Gemini API (Logic) + Pollinations/Replicate (Media).
- [ ] **Deployment**: Vercel (Frontend) + Node.js Proxy Service (Backend jobs).

---

## 📝 Change Log
- **2025-12-27**: 完成 CineFlow 的 MVP 核心功能（智能分镜+双模式生图），解决了关键的 API 代理网络问题。