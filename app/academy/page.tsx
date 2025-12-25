'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient'; 
import { Search, BookOpen, Clock, ChevronRight, Tag, PlayCircle, Zap } from 'lucide-react';

export default function Academy() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🎯 新的分类体系
  const categories = ['全部', '新手入门', '工具学习', '高阶玩法', '干货分享', '商业访谈'];
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    setLoading(true);
    const { data } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setArticles(data);
    setLoading(false);
  }

  // 前端筛选
  const filteredArticles = articles.filter(item => {
    const matchCat = activeCategory === '全部' || item.category === activeCategory;
    const matchSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.tags?.includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/20 to-[#0A0A0A] border-b border-white/5 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">AI 创作者学院</h1>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">从入门到精通，这里有你需要的每一个知识点。</p>
            
            {/* 搜索框 */}
            <div className="relative max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
                <input 
                    type="text" 
                    placeholder="搜索教程、关键词..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-full py-3 pl-12 pr-6 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-black/50 transition-all backdrop-blur-md"
                />
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">
        
        {/* 分类 Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all border ${
                        activeCategory === cat 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5 hover:text-white'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* 文章列表 */}
        {loading ? (
            <div className="text-center py-20 text-gray-500">加载知识库...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map(item => (
                    <Link href={`/academy/${item.id}`} key={item.id} className="group flex flex-col bg-[#151515] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all hover:-translate-y-1">
                        {/* 封面区 */}
                        <div className="aspect-video relative overflow-hidden bg-gray-800">
                            {item.image_url ? (
                                <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                                    <BookOpen size={40} className="text-gray-700"/>
                                </div>
                            )}
                            
                            {/* 视频标记 */}
                            {item.video_id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white">
                                        <PlayCircle size={24} fill="currentColor" className="opacity-90"/>
                                    </div>
                                </div>
                            )}

                            {/* 难度角标 */}
                            {item.difficulty && (
                                <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md shadow-lg ${
                                    item.difficulty === '入门' ? 'bg-green-500/90 text-black' : 
                                    item.difficulty === '进阶' ? 'bg-yellow-500/90 text-black' : 'bg-red-600/90 text-white'
                                }`}>
                                    {item.difficulty}
                                </div>
                            )}
                        </div>

                        {/* 内容区 */}
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="text-xs text-purple-400 font-bold mb-2 flex items-center gap-2">
                                <Zap size={12} fill="currentColor"/> {item.category}
                            </div>
                            <h3 className="text-lg font-bold text-gray-200 mb-3 line-clamp-2 group-hover:text-white transition-colors">{item.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{item.description}</p>
                            
                            {/* 底部信息 */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                <div className="flex gap-2 overflow-hidden">
                                    {item.tags && item.tags.split(',').slice(0,2).map((tag:string) => (
                                        <span key={tag} className="text-[10px] bg-white/5 text-gray-400 px-2 py-1 rounded flex items-center gap-1">
                                            <Tag size={10}/> {tag}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock size={12}/> {item.duration || '5 min'}
                                </div>
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
