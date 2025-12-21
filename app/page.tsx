'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Flame, Play, Clock, MoreHorizontal, Filter, ChevronDown, MonitorPlay } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

export default function Home() {
  const [hotVideos, setHotVideos] = useState<any[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('全部');

  // 分类列表 (和你后台一致)
  const categories = ['全部', '动画短片', '实验短片', '音乐MV', '写实短片', '创意广告', 'AI教程', '创意短片'];

  useEffect(() => {
    fetchVideos();
  }, []);

  async function fetchVideos() {
    setLoading(true);
    
    // 1. 获取热门视频 (只取前4个勾选了 is_hot 的)
    const { data: hotData } = await supabase
      .from('videos')
      .select('*')
      .eq('is_hot', true)
      .order('created_at', { ascending: false })
      .limit(4);
    
    if (hotData) setHotVideos(hotData);

    // 2. 获取所有视频 (用于下方列表)
    const { data: allData } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allData) setAllVideos(allData);
    
    setLoading(false);
  }

  // 播放量格式化函数
  const formatViews = (num: number) => {
    if (!num) return '0';
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num;
  };

  // 根据分类筛选显示
  const displayVideos = selectedCategory === '全部' 
    ? allVideos 
    : allVideos.filter(v => v.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <MonitorPlay size={18} className="text-white" />
            </div>
            <span>AI.Tube</span>
          </div>
          <div className="flex-1 max-w-md mx-8 relative group">
            <input 
              type="text" 
              placeholder="搜索 AI 视频、提示词..." 
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 focus:bg-[#222] transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={16} />
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">登录</button>
            <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">注册</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* 近期热门 Section */}
        {hotVideos.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Flame className="text-orange-500" fill="currentColor" size={20} />
              <h2 className="text-xl font-bold text-gray-100">近期热门</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotVideos.map((video) => (
                <Link href={`/video/${video.id}`} key={video.id} className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 border border-white/5 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20">
                  <img 
                    src={video.thumbnail_url} 
                    alt={video.title} 
                    referrerPolicy="no-referrer" // 👈 防盗链关键
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute bottom-0 left-0 p-4 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{video.category}</span>
                    </div>
                    <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-1 group-hover:text-purple-300 transition-colors">{video.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>@{video.author}</span>
                      <div className="flex items-center gap-1"><Play size={10} fill="currentColor"/> {formatViews(video.views)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 主内容区 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-white text-black' 
                      : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#252525] hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors">
              <Filter size={14} /> 筛选
            </button>
          </div>

          {/* 视频网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-20 text-gray-500">加载中...</div>
            ) : displayVideos.length > 0 ? (
              displayVideos.map((video) => (
                <Link href={`/video/${video.id}`} key={video.id} className="group flex flex-col bg-[#121212] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:-translate-y-1">
                  <div className="aspect-video relative overflow-hidden bg-gray-900">
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title} 
                      referrerPolicy="no-referrer" // 👈 防盗链关键
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    {video.tag && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-medium border border-white/10">
                        {video.tag}
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                      <Play size={8} fill="currentColor"/> {formatViews(video.views)}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-200 text-sm leading-snug line-clamp-2 group-hover:text-white transition-colors mb-2">
                      {video.title}
                    </h3>
                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                      <span className="truncate max-w-[60%] hover:text-gray-300 transition-colors">@{video.author}</span>
                      <span className="text-[10px] bg-white/5 px-1.5 rounded">{video.category}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-gray-500">
                <p>没有找到相关视频...</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
