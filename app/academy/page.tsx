'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // ⚠️ 注意路径
import Link from 'next/link';
import { BookOpen, Clock, ChevronRight, GraduationCap, Star, Zap, Layout, ArrowLeft } from 'lucide-react';

export default function AcademyPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('全部');

  const filters = ['全部', '新手入门', '工具实战', '变现指南'];

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    const { data } = await supabase.from('articles').select('*').eq('is_published', true).order('created_at', { ascending: false });
    if (data) setArticles(data);
    setLoading(false);
  }

  const filteredArticles = activeFilter === '全部' 
    ? articles 
    : articles.filter(a => a.category === activeFilter);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30 pb-20">
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="font-bold">返回首页</span>
        </Link>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap fill="white" size={16} />
            </div>
            <span className="text-xl font-bold tracking-tight">AI 学院</span>
        </div>
        <div className="w-20"></div> {/* 占位 */}
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        
        {/* 头部：学习路线图 (静态展示) */}
        <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                从零开始，成为 AI 视频大师
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto mb-10">
                系统化的学习路径，精选的实战教程。无论你是想做第一部短片，还是想通过 AI 接单变现，这里都有你需要的知识。
            </p>
            
            {/* 路线 Step */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-[#111] p-6 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Star size={64} />
                    </div>
                    <div className="text-blue-500 font-bold text-lg mb-2 flex items-center gap-2">01 新手入门 <ChevronRight size={16}/></div>
                    <p className="text-sm text-gray-500">了解基础概念，注册必备工具，完成你的第一个 5 秒镜头。</p>
                </div>
                <div className="bg-[#111] p-6 rounded-2xl border border-white/5 hover:border-purple-500/50 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={64} />
                    </div>
                    <div className="text-purple-500 font-bold text-lg mb-2 flex items-center gap-2">02 工具进阶 <ChevronRight size={16}/></div>
                    <p className="text-sm text-gray-500">掌握分镜控制、角色一致性、运镜技巧，制作完整的叙事短片。</p>
                </div>
                <div className="bg-[#111] p-6 rounded-2xl border border-white/5 hover:border-green-500/50 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layout size={64} />
                    </div>
                    <div className="text-green-500 font-bold text-lg mb-2 flex items-center gap-2">03 商业实战 <ChevronRight size={16}/></div>
                    <p className="text-sm text-gray-500">对接真实需求，学习报价与交付，将你的 AI 技能转化为收入。</p>
                </div>
            </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex justify-center gap-2 mb-10">
            {filters.map(filter => (
                <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                        activeFilter === filter 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent text-gray-500 border-white/10 hover:text-white'
                    }`}
                >
                    {filter}
                </button>
            ))}
        </div>

        {/* 文章列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
                <div className="col-span-full text-center py-20 text-gray-500">加载知识中...</div>
            ) : filteredArticles.length > 0 ? (
                filteredArticles.map(article => (
                    <article key={article.id} className="group bg-[#111] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 cursor-pointer">
                        <div className="aspect-[4/3] overflow-hidden relative">
                            <img src={article.cover_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                                {article.category}
                            </div>
                        </div>
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                                {article.title}
                            </h2>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                                {article.description}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-600 border-t border-white/5 pt-4">
                                <span className="flex items-center gap-1"><BookOpen size={12}/> {article.author}</span>
                                <span className="flex items-center gap-1"><Clock size={12}/> {article.read_time} min 阅读</span>
                            </div>
                        </div>
                    </article>
                ))
            ) : (
                <div className="col-span-full text-center py-20 bg-[#111] rounded-2xl border border-dashed border-white/10 text-gray-500">
                    暂时还没有相关教程，正在加紧撰写中... ✍️
                </div>
            )}
        </div>

      </main>
    </div>
  );
}
