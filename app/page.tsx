'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Search, Upload, Play, X, ChevronLeft, ChevronRight, Loader2, Eye, Crown, Flame, Filter, MonitorPlay, Medal, Star } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  const [videos, setVideos] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('近期热门'); // 默认选中
  const [currentBanner, setCurrentBanner] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);

  // 普通分类 (不包含精选/获奖，因为它们是独立维度)
  const categories = ["动画短片", "音乐MV", "写实短片", "创意短片", "AI教程", "创意广告", "实验短片"];

  useEffect(() => {
    async function initData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) setUserProfile(profile);
      }
      const { data: videoData } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (videoData) setVideos(videoData);
      const { data: bannerData } = await supabase.from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      if (bannerData) setBanners(bannerData);
      setLoading(false);
    }
    initData();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    router.refresh();
  }

  // 🔍 核心筛选逻辑
  const filteredVideos = videos.filter(video => {
    // 1. 荣誉/分类筛选
    let matchCategory = false;
    if (selectedTag === '近期热门') {
      matchCategory = video.is_hot === true;
    } else if (selectedTag === '编辑精选') {
      matchCategory = video.is_selected === true;
    } else if (selectedTag === '获奖作品') {
      matchCategory = video.is_award === true;
    } else {
      // 普通分类
      matchCategory = video.category === selectedTag;
    }

    // 2. 搜索筛选
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || 
                        video.title?.toLowerCase().includes(searchLower) || 
                        video.author?.toLowerCase().includes(searchLower) ||
                        video.tag?.toLowerCase().includes(searchLower) ||
                        video.category?.toLowerCase().includes(searchLower) ||
                        video.prompt?.toLowerCase().includes(searchLower);

    if (searchTerm) return matchSearch;
    return matchCategory;
  });

  const displayVideos = filteredVideos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVideos.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 8);
  };

  const formatViews = (num: number) => {
    if (!num) return '0';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-xl z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => {setSelectedTag('近期热门'); setSearchTerm('')}}
        >
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <MonitorPlay fill="white" size={16} />
          </div>
          <span className="text-xl font-bold tracking-tight">AI Tube</span>
        </div>

        <div className="flex flex-1 max-w-md mx-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="搜索 Sora, Runway, 动画..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-purple-600 transition-all text-sm"
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <button className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-purple-900/20">
              <Upload size={18} /> <span>投稿</span>
            </button>
          </Link>
          
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300 hidden sm:block font-medium">{userProfile?.username || user.email?.split('@')[0]}</span>
              <Link href="/profile">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} className="w-9 h-9 rounded-full object-cover border border-purple-500/50 hover:border-purple-500 transition-colors shadow-lg"/>
                ) : (
                  <div className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-transform hover:scale-105" title="个人中心"><span className="text-xs font-bold">{user.email?.[0].toUpperCase()}</span></div>
                )}
              </Link>
            </div>
          ) : (
            <Link href="/login">
              <button className="text-sm font-medium text-gray-300 hover:text-white border border-gray-700 px-4 py-2 rounded-full hover:border-gray-500 transition-colors">登录 / 注册</button>
            </Link>
          )}
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        
        {/* Banner */}
        {banners.length > 0 && !searchTerm && (
          <Link href={banners[currentBanner].link_url || '#'} className="block mb-10 relative group rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] bg-gray-900 cursor-pointer shadow-2xl border border-white/5">
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform group-hover:scale-105" style={{ backgroundImage: `url(${banners[currentBanner].image_url})` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            </div>
            <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-3/4 z-30 pointer-events-none">
              <div className="flex gap-2 mb-2">
                {banners[currentBanner].tag && <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded inline-block font-bold shadow-lg">{banners[currentBanner].tag}</span>}
                {(banners[currentBanner].is_vip || banners[currentBanner].tag === '会员') && <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded inline-flex items-center gap-1 font-bold shadow-lg"><Crown size={12}/> 会员专享</span>}
              </div>
              <h2 className="text-lg md:text-2xl font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] line-clamp-2">{banners[currentBanner].title}</h2>
            </div>
            <button onClick={(e) => { e.preventDefault(); setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur z-40 cursor-pointer"><ChevronLeft size={24} /></button>
            <button onClick={(e) => { e.preventDefault(); setCurrentBanner((prev) => (prev + 1) % banners.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur z-40 cursor-pointer"><ChevronRight size={24} /></button>
            <div className="absolute bottom-4 right-4 flex gap-2 z-40">
              {banners.map((_, index) => (<div key={index} onClick={(e) => { e.preventDefault(); setCurrentBanner(index); }} className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all shadow-sm ${index === currentBanner ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/80'}`}></div>))}
            </div>
          </Link>
        )}

        {/* 👇 顶部筛选栏 (特殊分类 + 普通分类) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-6 mb-4 scrollbar-hide">
          {/* 特殊分类组 */}
          <button onClick={() => { setSelectedTag('近期热门'); setVisibleCount(8); setSearchTerm(''); }} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 ${selectedTag === '近期热门' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-gray-400 hover:text-white'}`}>
            🔥 近期热门
          </button>
          <div className="w-px h-6 bg-white/10 mx-2"></div>
          
          <button onClick={() => { setSelectedTag('编辑精选'); setVisibleCount(8); setSearchTerm(''); }} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 ${selectedTag === '编辑精选' ? 'bg-yellow-500 text-black' : 'bg-[#1A1A1A] text-gray-400 hover:text-yellow-500'}`}>
            <Crown size={14}/> 编辑精选
          </button>
          <button onClick={() => { setSelectedTag('获奖作品'); setVisibleCount(8); setSearchTerm(''); }} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 ${selectedTag === '获奖作品' ? 'bg-purple-600 text-white' : 'bg-[#1A1A1A] text-gray-400 hover:text-purple-500'}`}>
            <Medal size={14}/> 获奖作品
          </button>
          
          <div className="w-px h-6 bg-white/10 mx-2"></div>

          {/* 普通分类循环 */}
          {categories.map((tag) => (
            <button 
              key={tag} 
              onClick={() => { setSelectedTag(tag); setVisibleCount(8); setSearchTerm(''); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border cursor-pointer ${selectedTag === tag ? 'bg-white text-black border-white' : 'bg-[#1A1A1A] text-gray-400 border-white/5 hover:text-white'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 提示信息 */}
        {searchTerm && <div className="mb-4 text-sm text-gray-500 text-center">🔍 搜索 "{searchTerm}" 的结果 ({filteredVideos.length})</div>}

        {loading ? (
          <div className="text-center text-gray-500 py-20 flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> 加载中...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayVideos.length > 0 ? (
                displayVideos.map((video: any) => (
                  <Link href={`/video/${video.id}`} key={video.id} className="group flex flex-col bg-[#121212] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-video relative overflow-hidden bg-gray-900">
                       <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                       
                       {/* 👇 左上角角标逻辑：优先显示荣誉标签，没有才显示分类 */}
                       <div className="absolute top-2 left-2 flex gap-1">
                         {video.is_selected && <div className="bg-yellow-500/90 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-black font-bold flex items-center gap-1 shadow-lg"><Crown size={10}/> 精选</div>}
                         {video.is_award && <div className="bg-purple-600/90 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-bold flex items-center gap-1 shadow-lg"><Medal size={10}/> 获奖</div>}
                         {!video.is_selected && !video.is_award && selectedTag !== '全部' && video.category && (
                           <div className="bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-medium border border-white/10">{video.category}</div>
                         )}
                       </div>

                       <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                         <Eye size={10} className="text-gray-300"/> <span>{formatViews(video.views)}</span>
                       </div>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-200 text-sm leading-snug line-clamp-2 group-hover:text-white transition-colors mb-2">{video.title}</h3>
                      <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate max-w-[60%] hover:text-gray-300 transition-colors">@{video.author}</span>
                        {video.tag && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{video.tag}</span>}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-20 text-gray-500"><p>没有找到相关视频...</p></div>
              )}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button onClick={handleLoadMore} className="bg-white/5 border border-white/10 text-gray-300 px-8 py-3 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                  加载更多内容 ({filteredVideos.length - visibleCount})
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
