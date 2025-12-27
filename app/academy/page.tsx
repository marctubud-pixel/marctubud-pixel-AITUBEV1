'use client';

import React, { useState, useEffect, Suspense } from 'react'; // 引入 Suspense
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // 引入钩子
import { supabase } from '../lib/supabaseClient'; 
import { Search, BookOpen, Clock, ChevronRight, Tag, PlayCircle, Zap, Layers, GraduationCap, Mic, Newspaper, ArrowLeft } from 'lucide-react';

// 拆分出一个内部组件来使用 useSearchParams
function AcademyContent() {
  const searchParams = useSearchParams();
  // 优先使用 URL 参数中的 category，如果没有则默认为 '全部'
  const initialCategory = searchParams.get('category') || '全部';

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // 🎯 分类体系
  const categories = [
      { id: '全部', label: '全部内容', icon: <Layers size={18}/> },
      { id: '新手入门', label: '新手入门', icon: <GraduationCap size={18}/> },
      { id: '工具学习', label: '工具学习', icon: <Zap size={18}/> },
      { id: '高阶玩法', label: '高阶玩法', icon: <PlayCircle size={18}/> },
      { id: '干货分享', label: '干货分享', icon: <BookOpen size={18}/> },
      { id: '行业资讯', label: '行业资讯', icon: <Newspaper size={18}/> },
      { id: '商业访谈', label: '商业访谈', icon: <Mic size={18}/> },
  ];

  // 监听 URL 参数变化 (处理浏览器后退/前进)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(cat);
  }, [searchParams]);

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

  // 🏷️ 智能标签解析函数
  const parseTags = (tags: any) => {
    if (!tags) return [];
    let parsed: any[] = [];
    if (Array.isArray(tags)) {
      parsed = tags;
    } else if (typeof tags === 'string') {
      try {
        const json = JSON.parse(tags);
        if (Array.isArray(json)) parsed = json;
        else parsed = tags.split(/[,，]/);
      } catch (e) {
        parsed = tags.split(/[,，]/);
      }
    }
    return parsed
      .map(t => {
        if (typeof t !== 'string') return '';
        return t.replace(/[\[\]"'\\]/g, '').trim();
      })
      .filter(t => t && t.length > 0);
  };

  // 前端筛选
  const filteredArticles = articles.filter(item => {
    const itemTags = parseTags(item.tags).join(' '); 
    const matchCat = activeCategory === '全部' || item.category === activeCategory;
    const matchSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || itemTags.includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部 Header */}
      <div className="border-b border-white/5 bg-[#0A0A0A]/90 sticky top-0 z-40 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* ✅ 修改点：将 size={20} 改为 size={18} 以完全匹配详情页的视觉大小 */}
            <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={18}/> 回到首页
            </Link>
            
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

      <main className="max-w-7xl mx-auto p-6 md:p-8 flex flex-col md:flex-row gap-8">
        
        {/* 👈 左侧导航栏 (Sidebar) */}
        <aside className="w-full md:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
                <h3 className="text-xl font-bold mb-6 px-4 text-white">AI 学院</h3>
                
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => {
                            setActiveCategory(cat.id);
                            // 可选：更新 URL 但不刷新页面，保持状态一致
                            window.history.pushState(null, '', `?category=${cat.id}`);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeCategory === cat.id 
                            ? 'bg-white text-black shadow-lg shadow-white/10' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {cat.icon}
                        {cat.label}
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
                                    <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                                        <BookOpen size={40} className="text-gray-700"/>
                                    </div>
                                )}
                                
                                {/* 角标 */}
                                {(['商业访谈', '行业资讯'].includes(item.category) || item.difficulty) && (
                                    <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md shadow-lg ${
                                        item.category === '商业访谈' ? 'bg-blue-600/90 text-white' : 
                                        item.category === '行业资讯' ? 'bg-purple-600/90 text-white' : 
                                        item.difficulty === '入门' ? 'bg-green-500/90 text-black' : 
                                        item.difficulty === '进阶' ? 'bg-yellow-500/90 text-black' : 'bg-red-600/90 text-white'
                                    }`}>
                                        {item.category === '商业访谈' ? '访谈' : item.category === '行业资讯' ? '资讯' : item.difficulty}
                                    </div>
                                )}
                            </div>

                            {/* 内容区 */}
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-sm font-bold text-gray-200 mb-2 line-clamp-2 group-hover:text-white transition-colors">{item.title}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1 leading-relaxed">{item.description}</p>
                                
                                {/* 底部信息 */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                                    <div className="flex gap-1 overflow-hidden flex-wrap h-6">
                                        {parseTags(item.tags).slice(0,3).map((tag:string, i:number) => (
                                            <span key={i} className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                                                <Tag size={10}/> {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono flex-shrink-0">
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

// ✅ 必须包裹 Suspense，因为使用了 useSearchParams
export default function Academy() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">加载中...</div>}>
      <AcademyContent />
    </Suspense>
  );
}