'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient'; // ⚠️ 路径检查：app/academy/page.tsx -> ../lib
import { BookOpen, Play, Clock, Star, ChevronRight, Search, GraduationCap, Flame, Layout, Filter } from 'lucide-react';

export default function AcademyPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 初始化：去数据库拉取文章
  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    setLoading(true);
    // 从 articles 表查数据，按创建时间倒序
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
        setArticles(data);
    } else {
        console.error('Error fetching articles:', error);
    }
    setLoading(false);
  }

  // 2. 本地筛选逻辑 (根据 activeCategory 过滤)
  const filteredArticles = activeCategory === '全部' 
    ? articles 
    : articles.filter(article => article.category === activeCategory || (activeCategory === '会员专享' && article.is_vip));

  const categories = [
    { id: 'all', name: '全部', icon: <Layout size={16}/> },
    { id: 'sora', name: 'Sora', icon: <Play size={16}/> },
    { id: 'midjourney', name: 'Midjourney', icon: <Star size={16}/> },
    { id: 'runway', name: 'Runway', icon: <Flame size={16}/> },
    { id: 'stable-diffusion', name: 'Stable Diffusion', icon: <Filter size={16}/> },
    { id: 'monetization', name: '变现实战', icon: <GraduationCap size={16}/> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ChevronRight size={20} className="rotate-180 group-hover:-translate-x-1 transition-transform"/>
          <span className="font-bold">返回首页</span>
        </Link>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
                <GraduationCap fill="white" size={16} />
            </div>
            <span className="text-xl font-bold tracking-tight">AI 学院</span>
        </div>
        <div className="w-20"></div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-8 mt-6">
        
        {/* 左侧侧边栏：分类导航 */}
        <aside className="w-full md:w-64 flex-shrink-0">
            <div className="bg-[#151515] rounded-2xl p-4 border border-white/5 sticky top-24">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4 px-2">学习路径</h3>
                <div className="space-y-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.name)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                                activeCategory === cat.name 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {cat.icon}
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                     <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl p-4 border border-yellow-500/20">
                        <h4 className="font-bold text-yellow-500 flex items-center gap-2 mb-2"><Star size={14} fill="currentColor"/> 会员特权</h4>
                        <p className="text-xs text-yellow-200/60 mb-3">解锁高阶实战课程与变现案例。</p>
                        <Link href="/vip">
                            <button className="w-full bg-yellow-500 text-black text-xs font-bold py-2 rounded-lg hover:bg-yellow-400 transition-colors">
                                立即升级
                            </button>
                        </Link>
                     </div>
                </div>
            </div>
        </aside>

        {/* 右侧：课程列表 */}
        <div className="flex-1">
            
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">探索 AI 创作的无限可能</h1>
                    <p className="text-gray-400 text-sm">共找到 {filteredArticles.length} 门相关课程</p>
                </div>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                    <input type="text" placeholder="搜索教程..." className="bg-[#151515] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 w-64 transition-all"/>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="bg-[#151515] rounded-2xl h-80 animate-pulse border border-white/5"></div>
                    ))}
                </div>
            ) : filteredArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map((course) => (
                        <div key={course.id} className="group bg-[#151515] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer flex flex-col">
                            {/* 封面图 */}
                            <div className="aspect-video bg-gray-900 relative overflow-hidden">
                                <img src={course.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#151515] to-transparent opacity-60"></div>
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <span className="bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/10 flex items-center gap-1">
                                        <Clock size={10}/> {course.duration}
                                    </span>
                                    {course.is_vip && (
                                        <span className="bg-yellow-500 text-black text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 shadow-lg">
                                            <Star size={10} fill="black"/> VIP
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* 内容 */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                        course.difficulty === '入门' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                        course.difficulty === '进阶' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                        {course.difficulty}
                                    </span>
                                    <span className="text-xs text-gray-500">{course.category}</span>
                                </div>
                                
                                <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">{course.title}</h3>
                                <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed flex-1">
                                    {course.description}
                                </p>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-[8px]">
                                            AI
                                        </div>
                                        {course.author}
                                    </div>
                                    <button className="text-xs font-bold flex items-center gap-1 text-white group-hover:translate-x-1 transition-transform">
                                        开始学习 <ChevronRight size={12}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500 bg-[#151515] rounded-2xl border border-dashed border-white/5">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>该分类下暂无课程</p>
                    <p className="text-xs mt-2">试试切换其他分类，或者去后台发布一篇？</p>
                </div>
            )}

        </div>
      </main>
    </div>
  );
}
