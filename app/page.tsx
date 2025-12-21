'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Flame, Play, Filter, MonitorPlay, ChevronRight, Crown } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

export default function Home() {
  const [hotVideos, setHotVideos] = useState<any[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('全部');

  const categories = ['全部', '动画短片', '实验短片', '音乐MV', '写实短片', '创意广告', 'AI教程', '创意短片'];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // 1. 获取 Banner (只显示 active=true 的，并按权重排序)
    const { data: bannerData } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true) 
      .order('sort_order', { ascending: true });
      
    if (bannerData) setBanners(bannerData);

    // 2. 获取热门视频
    const { data: hotData } = await supabase
      .from('videos')
      .select('*')
      .eq('is_hot', true)
      .order('created_at', { ascending: false })
      .limit(4);
      
    if (hotData) setHotVideos(hotData);

    // 3. 获取所有视频
    const { data: allData } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (allData) setAllVideos(allData);
    
    setLoading(false);
  }

  const formatViews = (num: number) => {
    if (!num) return '0';
    return num >= 10000 ? (num / 10000).toFixed(1) + '万' : num;
  };

  const displayVideos = selectedCategory === '全部' ? allVideos : allVideos.filter(v => v.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg flex items-center justify-center"><MonitorPlay size={18} className="text-white" /></div>
            <span>AI.Tube</span>
          </div>
          <div className="flex-1 max-w-md mx-8 relative group">
            <input type="text" placeholder="搜索 AI 视频..." className="w-full bg-[#1A1A1A] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50 transition-all"/>
            <Search className="absolute left-3.5 top-2.5 text-gray-500" size={16} />
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-400 hover:text-white">登录</button>
            <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200">注册</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        
        {/* Banner Section */}
        {banners.length > 0 && (
          <section className="relative rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] group border border-white/5">
            <div className="absolute inset-0">
              <img src={banners[0].image_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-transparent"></div>
            </div>
            <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-2xl">
              {banners[0].is_vip && (
                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold mb-4 inline-flex items-center gap-1">
                  <Crown size={12}/> 会员专享
                </span>
              )}
              <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight drop-shadow-lg">{banners[0].title}</h1>
              {banners[0].link_url && (
                <Link href={banners[0].link_url} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 inline-flex items-center gap-2 transition-colors shadow-lg shadow-white/10">
                  立即观看 <ChevronRight size={18}/>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Hot Videos Section */}
        {hotVideos.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6"><Flame className="text-orange-500" fill="currentColor" size={20} /><h2 className="text-xl font-bold">近期热门</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotVideos.map((video) => (
                <Link href={`/video/${video.id}`} key={video.id} className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 border border-white/5 hover:border-purple-500/50 transition-all duration-300">
                  <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100"></div>
                  <div className="absolute bottom-0 left-0 p-4 w-full">
                    <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mb-2 inline-block">{video.category}</span>
                    <h3 className="font-bold text-white text-sm line-clamp-2 mb-1">{video.title}</h3>
                    <div className="flex justify-between text-xs text-gray-400"><span>@{video.author}</span><div className="flex items-center gap-1"><Play size={10} fill="currentColor"/> {formatViews(video.views)}</div></div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Main List Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-white text-black' : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-white/5'}`}>{cat}</button>
              ))}
            </div>
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-white"><Filter size={14} /> 筛选</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {loading ? <div className="col-span-full text-center py-20 text-gray-500">加载中...</div> : displayVideos.map((video) => (
              <Link href={`/video/${video.id}`} key={video.id} className="group flex flex-col bg-[#121212] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all hover:-translate-y-1">
                <div className="aspect-video relative overflow-hidden bg-gray-900">
                  <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {video.tag && <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white border border-white/10">{video.tag}</div>}
                  <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1"><Play size={8} fill="currentColor"/> {formatViews(video.views)}</div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-200 text-sm line-clamp-2 group-hover:text-white mb-2">{video.title}</h3>
                  <div className="mt-auto flex justify-between text-xs text-gray-500"><span className="truncate max-w-[60%]">@{video.author}</span><span className="text-[10px] bg-white/5 px-1.5 rounded">{video.category}</span></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
