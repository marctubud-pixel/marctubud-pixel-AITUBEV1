'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient'; 
import { Search, BookOpen, Clock, ChevronRight, Tag, PlayCircle, Zap, Layers, GraduationCap } from 'lucide-react';

export default function Academy() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🎯 分类体系
  const categories = [
      { id: '全部', label: '全部内容', icon: <Layers size={18}/> },
      { id: '新手入门', label: '新手入门', icon: <GraduationCap size={18}/> },
      { id: '工具学习', label: '工具学习', icon: <Zap size={18}/> },
      { id: '高阶玩法', label: '高阶玩法', icon: <PlayCircle size={18}/> },
      { id: '干货分享', label: '干货分享', icon: <BookOpen size={18}/> },
      { id: '商业访谈', label: '商业访谈', icon: <Tag size={18}/> },
  ];
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
      
      {/* 简单的顶部 Header */}
      <div className="border-b border-white/5 bg-[#0A0A0A]/90 sticky top-0 z-40 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <GraduationCap fill="white" size={20}/>
                </div>
                <h1 className="text-xl font-bold tracking-tight">AI 创作学院</h1>
            </div>
            
            {/* 搜索框 */}
            <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                <input 
                    type="text" 
                    placeholder="搜索教程..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#151515] border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-purple-500 transition-all"
                />
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-8">
        
        {/* 👈 左侧导航栏 (Sidebar) */}
        <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-4">知识分类</h3>
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeCategory === cat.id 
                            ? 'bg-white text-black shadow-lg shadow-white/10' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {cat.icon}
                        {cat.label}
                        {/* 数量角标 (可选) */}
                        {cat.id === '全部' && <span className="ml-auto text-xs opacity-50">{articles.length}</span>}
                    </button>
                ))}
            </div>
        </aside>

        {/* 👉 右侧内容区 (Grid) */}
        <div className="flex-1 min-w-0">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{activeCategory}</h2>
                <span className="text-xs text-gray-500">{filteredArticles.length} 个教程</span>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="aspect-video bg-[#151515] rounded-xl animate-pulse"></div>)}
                </div>
            ) : filteredArticles.length > 0 ? (
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
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white">
                                            <PlayCircle size={20} fill="currentColor" className="opacity-90"/>
                                        </div>
                                    </div>
                                )}

                                {/* 难度角标 */}
                                {item.difficulty && (
                                    <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md shadow-lg ${
                                        item.difficulty === '入门' ? 'bg-green-500/90 text-black' : 
                                        item.difficulty === '进阶' ? 'bg-yellow-500/90 text-black' : 'bg-red-600/90 text-white'
                                    }`}>
                                        {item.difficulty}
                                    </div>
                                )}
                            </div>

                            {/* 内容区 */}
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-sm font-bold text-gray-200 mb-2 line-clamp-2 group-hover:text-white transition-colors">{item.title}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1 leading-relaxed">{item.description}</p>
                                
                                {/* 底部信息 */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                                    <div className="flex gap-1 overflow-hidden">
                                        {item.tags && item.tags.split(',').slice(0,1).map((tag:string) => (
                                            <span key={tag} className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Tag size={10}/> {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                                        <Clock size={10}/> {item.duration || '5m'}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>该分类下暂无内容</p>
                </div>
            )}
        </div>

      </main>
    </div>
  );
}
