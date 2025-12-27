'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient'; 
import { Search, BookOpen, Clock, ChevronRight, Tag } from 'lucide-react';

export default function AcademyPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 分类列表
  const categories = ['全部', '新手入门', '工具学习', '高阶玩法', '干货分享', '行业资讯', '商业访谈'];

  useEffect(() => {
    fetchArticles();
  }, [activeCategory]);

  async function fetchArticles() {
    setLoading(true);
    let query = supabase.from('articles').select('*').order('created_at', { ascending: false });
    
    if (activeCategory !== '全部') {
      query = query.eq('category', activeCategory);
    }

    const { data, error } = await query;
    if (error) console.error('Error fetching articles:', error);
    else setArticles(data || []);
    setLoading(false);
  }

  // 辅助函数：解析标签
  const parseTags = (tags: any) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return tags.split(/[,，]/).filter(Boolean);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <div className="fixed top-0 left-0 w-full h-1 bg-white/10 z-50">
        <div className="h-full bg-purple-600 w-1/3"></div>
      </div>

      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-40">
        <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            AI.Tube <span className="text-purple-500">学院</span>
        </div>
        <div className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <Search size={16} className="text-gray-500"/>
            <input type="text" placeholder="搜索教程..." className="bg-transparent border-none outline-none text-sm w-40 text-white placeholder-gray-500"/>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
                掌握 AI 影像<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">未来叙事</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
                从零基础入门到商业化变现，这里有你需要的全链路知识库。
            </p>
        </header>

        {/* 分类筛选 */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                        activeCategory === cat 
                        ? 'bg-white text-black border-white' 
                        : 'bg-black text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* 文章列表 */}
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-80 bg-white/5 rounded-2xl animate-pulse"></div>)}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                    <Link href={`/academy/${article.id}`} key={article.id} className="group relative bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1">
                        
                        {/* 封面图容器 */}
                        <div className="aspect-video w-full bg-gray-800 relative overflow-hidden">
                            {article.image_url ? (
                                // ⚠️ 修复：前台列表页图片添加防盗链
                                <img src={article.image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700">
                                    <BookOpen size={40}/>
                                </div>
                            )}
                            
                            {/* 标签浮层 */}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md ${
                                    article.category === '商业访谈' ? 'bg-blue-600 text-white' : 
                                    article.category === '行业资讯' ? 'bg-purple-600 text-white' : 
                                    'bg-black/50 text-white border border-white/20'
                                }`}>
                                    {article.category === '商业访谈' ? '访谈' : article.category === '行业资讯' ? '资讯' : article.category}
                                </span>
                            </div>
                        </div>

                        {/* 内容区 */}
                        <div className="p-5">
                            <h3 className="text-lg font-bold leading-snug mb-3 group-hover:text-purple-400 transition-colors line-clamp-2">
                                {article.title}
                            </h3>
                            
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                                {parseTags(article.tags).slice(0, 2).map((tag: string, i: number) => (
                                    <span key={i} className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/5">
                                        <Tag size={10}/> {tag.replace(/['"]+/g, '')}
                                    </span>
                                ))}
                                <span className="ml-auto flex items-center gap-1">
                                    <Clock size={12}/> {article.duration || '10 min'}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}