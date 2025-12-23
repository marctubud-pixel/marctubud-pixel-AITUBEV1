'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Search, Upload, X, ChevronLeft, ChevronRight, Loader2, Eye, Crown, MonitorPlay, Trophy, Play, Clock, Flame } from 'lucide-react';
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
  const [selectedTag, setSelectedTag] = useState('近期热门');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [visibleCount, setVisibleCount] = useState(10);

  const categories = ["近期热门", "编辑精选", "获奖作品", "动画短片", "音乐MV", "写实短片", "创意短片", "AI教程", "创意广告", "实验短片"];

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

  const filteredVideos = videos.filter(video => {
    let matchCategory = false;
    if (selectedTag === '近期热门') {
      matchCategory = video.is_hot === true;
    } else if (selectedTag === '编辑精选') {
      matchCategory = video.is_selected === true;
    } else if (selectedTag === '获奖作品') {
      matchCategory = video.is_award === true;
    } else {
      matchCategory = video.category === selectedTag;
    }

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
    setVisibleCount(prev => prev + 10);
  };

  const formatViews = (num: number) => {
    if (!num) return '0';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num;
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white"><div className="animate-pulse flex flex-col items-center gap-2"><div className="w-8 h-8 bg-purple-600 rounded-full animate-bounce"></div><span className="text-xs text-gray-500 font-mono">LOADING SYSTEM...</span></div></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部导航 (玻璃拟态效果) */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between transition-all duration-300">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => {setSelectedTag('近期热门'); setSearchTerm('')}}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform">
            <span className="text-xs">Ai</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">AI.Tube</span>
        </div>

        <div className="flex flex-1 max-w-md mx-4 relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="搜索 Sora, Runway, 灵感..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#151515] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-gray-300 placeholder:text-gray-600 focus:bg-[#1a1a1a]"
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/upload" className="hidden sm:block">
             <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5">
                <Upload size={16} /> 投稿
             </button>
          </Link>
          
          {user ? (
            <Link href="/profile">
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 border border-white/10 hover:border-purple-500 transition-all flex items-center justify-center overflow-hidden shadow-lg cursor-pointer">
                 {userProfile?.avatar_url ? (
                   <img src={userProfile.avatar_url} className="w-full h-full object-cover" />
                 ) : (
                   <div className="text-[10px] font-bold tracking-wider">{user.email?.[0].toUpperCase()}</div>
                 )}
              </div>
            </Link>
          ) : (
            <Link href="/login">
              <button className="text-xs font-bold bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">登录</button>
            </Link>
          )}
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        
        {/* Banner (Hero Section) */}
        {banners.length > 0 && !searchTerm && (
          <div className="mb-12 relative rounded-2xl overflow-hidden aspect-[21/9] group border border-white/10 shadow-2xl shadow-purple-900/10 cursor-pointer">
            <Link href={banners[currentBanner].link_url || '#'}>
                {/* 背景图 + 动效 */}
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform group-hover:scale-105" 
                    style={{ backgroundImage: `url(${banners[currentBanner].image_url})` }}
                ></div>
                
                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-3xl z-30 pointer-events-none">
                    <div className="flex items-center gap-2 mb-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
                        {banners[currentBanner].tag && <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">{banners[currentBanner].tag}</span>}
                        {(banners[currentBanner].is_vip || banners[currentBanner].tag === '会员') && <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-lg"><Crown size={10}/> 会员专享</span>}
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold mb-4 leading-tight text-shadow-lg text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{banners[currentBanner].title}</h2>
                    
                    {/* PC端显示的按钮 */}
                    <div className="hidden md:flex items-center gap-2 pointer-events-auto">
                        <button className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            <Play size={14} fill="currentColor" /> 立即查看
                        </button>
                    </div>
                </div>

                {/* 轮播控制 */}
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md z-40 border border-white/10"><ChevronLeft size={20} /></button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentBanner((prev) => (prev + 1) % banners.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md z-40 border border-white/10"><ChevronRight size={20} /></button>
                
                <div className="absolute bottom-6 right-6 flex gap-2 z-40">
                    {banners.map((_, index) => (
                        <div 
                            key={index} 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentBanner(index); }} 
                            className={`h-1.5 rounded-full cursor-pointer transition-all shadow-sm ${index === currentBanner ? 'bg-white w-6' : 'bg-white/30 w-1.5 hover:bg-white/60'}`}
                        ></div>
                    ))}
                </div>
            </Link>
          </div>
        )}

        {/* 分类栏 */}
        <div className="flex items-center justify-between mb-8">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full">
                {categories.map((tag) => (
                    <button 
                        key={tag}
                        onClick={() => { setSelectedTag(tag); setVisibleCount(10); setSearchTerm(''); }}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            selectedTag === tag 
                            ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] transform scale-105' 
                            : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </div>

        {searchTerm && <div className="mb-6 text-sm text-gray-400 text-center border-b border-white/5 pb-4">🔍 搜索 <span className="text-white font-bold">"{searchTerm}"</span> 的结果 ({filteredVideos.length})</div>}

        {/* 视频网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayVideos.length > 0 ? (
                displayVideos.map((video: any) => (
                    <Link href={`/video/${video.id}`} key={video.id} className="group relative block bg-[#121212] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/10">
                        
                        {/* 封面图区域 */}
                        <div className="aspect-video relative overflow-hidden bg-gray-900">
                            {video.thumbnail_url ? (
                                <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700"><MonitorPlay size={32}/></div>
                            )}
                            
                            {/* 播放按钮遮罩 (Hover时显示) */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white scale-50 group-hover:scale-100 transition-transform duration-300 backdrop-blur-md shadow-lg">
                                    <Play size={20} fill="currentColor" className="ml-1" />
                                </div>
                            </div>

                            {/* 角标：左上角 (热门) */}
                            {video.is_hot && (
                                <div className="absolute top-2 left-2 z-10">
                                    <span className="bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse border border-red-500/50">
                                        <Flame size={10} fill="currentColor"/> HOT
                                    </span>
                                </div>
                            )}

                             {/* 角标：右上角 (VIP/精选) */}
                            <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                                {video.is_vip && (
                                    <span className="bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                        <Crown size={10} fill="currentColor"/> VIP
                                    </span>
                                )}
                                {video.is_selected && !video.is_vip && (
                                    <span className="bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                        <Trophy size={10} fill="currentColor"/> 精选
                                    </span>
                                )}
                            </div>

                            {/* 底部：时长 */}
                            {video.duration && (
                                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-gray-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                                    <Clock size={10} /> {video.duration}
                                </div>
                            )}
                            
                            {/* 底部：分类标签 (半透明) */}
                            {video.category && (
                                <div className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded border border-white/5">
                                    {video.category}
                                </div>
                            )}
                        </div>

                        {/* 信息区域 */}
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-gray-200 line-clamp-1 group-hover:text-purple-400 transition-colors mb-2">{video.title}</h3>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-[8px] text-gray-300 border border-white/10 flex-shrink-0">
                                        {video.author?.[0]?.toUpperCase()}
                                    </div>
                                    <span className="text-xs text-gray-500 truncate hover:text-gray-300 transition-colors">@{video.author}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono flex-shrink-0">
                                    <span className="flex items-center gap-1"><Eye size={10}/> {formatViews(video.views)}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-gray-600">
                    <Search size={48} className="mb-4 opacity-20"/>
                    <p>没有找到相关视频...</p>
                    <button onClick={() => {setSelectedTag('近期热门'); setSearchTerm('')}} className="mt-4 text-xs text-purple-500 hover:text-purple-400 underline">查看热门推荐</button>
                </div>
            )}
        </div>

        {hasMore && (
            <div className="mt-12 flex justify-center pb-10">
            <button onClick={handleLoadMore} className="bg-white/5 border border-white/10 text-gray-300 px-8 py-3 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                <Loader2 size={16} className="text-purple-500"/> 加载更多灵感 ({filteredVideos.length - visibleCount})
            </button>
            </div>
        )}

      </main>
    </div>
  );
}
