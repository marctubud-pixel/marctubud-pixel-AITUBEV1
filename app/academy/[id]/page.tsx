'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient'; 
import { ArrowLeft, Clock, Calendar, User, Share2, BookOpen, Lock, Star, ThumbsUp, Tag, PlayCircle, ExternalLink } from 'lucide-react';

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<any>(null);
  const [linkedVideo, setLinkedVideo] = useState<any>(null); // ✅ 新增：关联视频状态
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  async function fetchArticle() {
    setLoading(true);
    // 1. 获取文章详情
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
        setArticle(data);
        // ✅ 2. 如果关联了视频，去 videos 表查详情
        if (data.video_id) {
            const { data: videoData } = await supabase
                .from('videos')
                .select('*')
                .eq('id', data.video_id)
                .single();
            if (videoData) setLinkedVideo(videoData);
        }
    }
    setLoading(false);
  }

  // ✅ B站播放器解析助手
  const getBilibiliEmbed = (url: string) => {
    const match = url.match(/bvid=(BV\w+)/) || url.match(/\/video\/(BV\w+)/);
    if (match) {
      return `https://player.bilibili.com/player.html?bvid=${match[1]}&high_quality=1&danmaku=0`;
    }
    return null;
  };

  // 📝 模拟正文内容 (保留你原有的逻辑，稍作增强)
  const renderContent = () => {
    // 如果数据库里真的有 content，优先用数据库的
    if (article.content) {
        return (
            <div className="space-y-6 text-gray-300 leading-relaxed whitespace-pre-wrap">
                {article.content}
            </div>
        );
    }

    // 否则显示你的 Mock 数据
    return (
      <div className="space-y-6 text-gray-300 leading-relaxed">
        <p>
            欢迎来到<strong>《{article.title}》</strong>的学习页面。在本课程中，我们将深入探讨 {article.category} 的核心逻辑与实战技巧。
        </p>
        <h3 className="text-xl font-bold text-white mt-8 mb-4">1. 核心概念解析</h3>
        <p>
            在开始实操之前，我们需要理解底层的生成逻辑。AI 视频生成并非简单的画面拼接，而是基于潜在空间的去噪过程。通过精确控制提示词的权重，我们可以引导模型生成符合物理规律的运动轨迹。
        </p>
        <div className="bg-white/5 border border-white/10 p-4 rounded-lg my-6">
            <h4 className="font-bold text-purple-400 mb-2">💡 专家提示</h4>
            <p className="text-sm">在编写 Prompt 时，建议遵循 "主体 + 环境 + 动作 + 运镜 + 风格" 的标准公式，这样能最大程度减少抽卡失败的概率。</p>
        </div>
        <h3 className="text-xl font-bold text-white mt-8 mb-4">2. 实战操作步骤</h3>
        <p>
            接下来，请打开你的创作工具。我们将从一个简单的案例入手。请注意，参数设置中的 <code>Motion Scale</code> 是控制画面动态幅度的关键，通常设置为 5-7 之间最为自然。
        </p>
        {/* 这里可以放一个占位图，或者如果有关联视频的缩略图就用它 */}
        <img src={linkedVideo?.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"} className="w-full h-64 object-cover rounded-xl my-6 opacity-80" alt="demo" />
        <p>
            (此处省略详细教程内容...)
        </p>
        <p>
            祝你创作愉快！别忘了将你的作品投稿到首页，让更多人看到你的创意。
        </p>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">加载中...</div>;
  if (!article) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">文章不存在</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部进度条 */}
      <div className="fixed top-0 left-0 w-full h-1 bg-white/10 z-50">
        <div className="h-full bg-purple-600 w-1/3"></div>
      </div>

      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-40">
        <Link href="/academy" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="font-bold">返回学院</span>
        </Link>
        <div className="flex gap-4">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Share2 size={20}/></button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Star size={20}/></button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 md:p-10">
        
        {/* 头部信息 */}
        <header className="mb-10 border-b border-white/5 pb-10">
            <div className="flex flex-wrap gap-3 mb-6">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-purple-900/40">
                    {article.category}
                </span>
                {article.difficulty && (
                    <span className={`bg-white/10 text-gray-300 px-3 py-1 rounded-full text-xs font-bold border border-white/10 ${
                        article.difficulty === '入门' ? 'text-green-400 border-green-500/30' : 
                        article.difficulty === '进阶' ? 'text-yellow-400 border-yellow-500/30' : ''
                    }`}>
                        {article.difficulty}
                    </span>
                )}
                {article.is_vip && (
                    <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Lock size={12}/> VIP 专享
                    </span>
                )}
                {/* ✅ 新增：标签展示 */}
                {article.tags && article.tags.split(',').map((tag: string) => (
                    <span key={tag} className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Tag size={12}/> {tag}
                    </span>
                ))}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {article.author_name?.[0] || 'A'}
                    </div>
                    <span className="text-gray-300">{article.author_name || 'AI.Tube'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar size={14}/> {new Date(article.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={14}/> {article.duration || '10 min'} 阅读
                </div>
                <div className="flex items-center gap-1.5">
                    <BookOpen size={14}/> {article.id * 12 + 100} 次学习
                </div>
            </div>
        </header>

        {/* ✅ 核心逻辑：视频 OR 封面 */}
        <div className="w-full rounded-2xl overflow-hidden mb-10 border border-white/10 bg-gray-900 shadow-2xl">
            {linkedVideo ? (
                // 📺 视频模式
                <div className="aspect-video w-full relative group">
                    {linkedVideo.video_url?.includes('bilibili') ? (
                        <iframe 
                            src={getBilibiliEmbed(linkedVideo.video_url)} 
                            className="w-full h-full" 
                            frameBorder="0" 
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <video src={linkedVideo.video_url} controls className="w-full h-full" poster={linkedVideo.thumbnail_url}></video>
                    )}
                </div>
            ) : (
                // 🖼️ 纯文章模式 (封面)
                <div className="aspect-[21/9] w-full relative">
                    <img src={article.image_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent opacity-60"></div>
                </div>
            )}
        </div>

        {/* 正文区域 */}
        <article className="prose prose-invert prose-lg max-w-none">
            {renderContent()}
        </article>

        {/* ✅ 新增：外部链接卡片 */}
        {article.link_url && (
            <div className="mt-12 p-6 bg-[#151515] border border-white/10 rounded-xl flex flex-col md:flex-row items-center justify-between group hover:border-purple-500/50 transition-all gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                        <ExternalLink size={24}/>
                    </div>
                    <div>
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors">外部资源链接</div>
                        <div className="text-sm text-gray-500">点击访问原始文档或下载资源</div>
                    </div>
                </div>
                <a href={article.link_url} target="_blank" className="w-full md:w-auto text-center bg-white text-black px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                    立即访问 <ExternalLink size={16}/>
                </a>
            </div>
        )}

        {/* 底部互动 */}
        <div className="mt-20 pt-10 border-t border-white/5 flex justify-center">
            <button className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                    <ThumbsUp size={28} />
                </div>
                <span className="text-sm text-gray-500 group-hover:text-white transition-colors">很有帮助</span>
            </button>
        </div>

      </main>
    </div>
  );
}
