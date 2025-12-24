'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient'; // ⚠️ 注意路径：app/academy/[id]/page.tsx -> ../../../lib
import { ArrowLeft, Clock, Calendar, User, Share2, BookOpen, Lock, Star, ThumbsUp } from 'lucide-react';

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  async function fetchArticle() {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) setArticle(data);
    setLoading(false);
  }

  // 📝 模拟正文内容 (因为数据库目前 content 为空)
  // 实际开发中，你应该在后台存入真实的 Markdown 或 HTML 内容
  const renderContent = () => {
    if (article.content) return article.content;

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
        <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80" className="w-full h-64 object-cover rounded-xl my-6 opacity-80" alt="demo" />
        <p>
            (此处省略 2000 字详细教程内容...)
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
      
      {/* 顶部进度条 (模拟) */}
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
                <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                    {article.difficulty}
                </span>
                {article.is_vip && (
                    <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Lock size={12}/> VIP 专享
                    </span>
                )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                        AI
                    </div>
                    <span className="text-gray-300">{article.author}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar size={14}/> {new Date(article.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={14}/> {article.duration} 阅读
                </div>
                <div className="flex items-center gap-1.5">
                    <BookOpen size={14}/> {article.views + 120} 次学习
                </div>
            </div>
        </header>

        {/* 文章封面 */}
        <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden mb-10 border border-white/10 bg-gray-900">
            <img src={article.image_url} className="w-full h-full object-cover" />
        </div>

        {/* 正文区域 */}
        <article className="prose prose-invert prose-lg max-w-none">
            {renderContent()}
        </article>

        {/* 底部互动 */}
        <div className="mt-20 pt-10 border-t border-white/5 flex justify-center">
            <button className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                    <ThumbsUp size={28} />
                </div>
                <span className="text-sm text-gray-500 group-hover:text-white transition-colors">这就去试试</span>
            </button>
        </div>

      </main>
    </div>
  );
}
