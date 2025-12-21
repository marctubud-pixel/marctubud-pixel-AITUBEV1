'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Search, Upload, Play, X, ChevronLeft, ChevronRight, Loader2, Eye } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  // 核心数据状态
  const [videos, setVideos] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 交互状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('近期热门');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);

  const categories = ["近期热门", "动画短片", "音乐MV", "写实短片", "创意短片", "AI教程", "创意广告"];

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
    // 逻辑修正：如果是"近期热门"，则筛选 is_hot=true 的视频，而不是看 category 字段
    const matchCategory = selectedTag === '近期热门' 
      ? video.is_hot === true 
      : video.category === selectedTag;

    const matchSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        video.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        video.tag?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const displayVideos = filteredVideos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVideos.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 8);
  };

  // 播放量格式化
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
            <Play fill="white" size={16} />
          </div>
          <span className="text-xl font-bold tracking-tight">AI Tube</span>
        </div>

        <div className="flex flex-1 max-w-md mx-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="搜索 test!!!, Runway 或 标题..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-purple-600 transition-all text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/upload">
            <button className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-purple-900/20">
              <Upload size={18} /> <span>上传</span>
            </button>
          </Link>
          
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300 hidden sm:block font-medium">
                {userProfile?.username || user.email?.split('@')[0]}
              </span>
              <Link href="/profile">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    className="w-9 h-9 rounded-full object-cover border border-purple-500/50 hover:border-purple-500 transition-colors shadow-lg"
                  />
                ) : (
                  <div className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-transform hover:scale-105" title="个人中心">
                    <span className="text-xs font-bold">{user.email?.[0].toUpperCase()}</span>
                  </div>
                )}
              </Link>
            </div>
          ) : (
            <Link href="/login">
              <button className="text-sm font-medium text-gray-300 hover:text-white border border-gray-700 px-4 py-2 rounded-full hover:border-gray-500 transition-colors">
                登录 / 注册
              </button>
            </Link>
          )}
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        
        {/* 轮播图区域 */}
        {banners.length > 0 && (
          <Link href={banners[currentBanner].link_url || '#'} className="block mb-10 relative group rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] bg-gray-900 cursor-pointer shadow-2xl border border-white/5">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform group-hover:scale-105"
              style={{ backgroundImage: `url(${banners[currentBanner].image_url})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            </div>

            <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-3/4 z-30 pointer-events-none">
              {/* 这里改用了 tag 字段，如果你数据库是 is_vip，请改成 is_vip 逻辑 */}
              {banners[currentBanner].tag && (
                <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded mb-2 inline-block font-bold shadow-lg">
                  {banners[currentBanner].tag}
                </span>
              )}
              <h2 className="text-lg md:text-2xl font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] line-clamp-2">
                {banners[currentBanner].title}
              </h2>
            </div>

            <button 
              onClick={(e) => {
                e.preventDefault(); 
                setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur z-40 cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault(); 
                setCurrentBanner((prev) => (prev + 1) % banners.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur z-40 cursor-pointer"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-4 right-4 flex gap-2 z-40">
              {banners.map((_, index) => (
                <div 
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentBanner(index);
                  }}
                  className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all shadow-sm ${index === currentBanner ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/80'}`}
                ></div>
              ))}
            </div>
          </Link>
        )}

        {/* 分类标签栏 */}
        <div className="flex gap-3 overflow-x-auto pb-6 mb-4 scrollbar-hide justify-center">
          {categories.map((tag) => (
            <button 
              key={tag} 
              onClick={() => { setSelectedTag(tag); setVisibleCount(8); }}
              className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-300 border cursor-pointer ${
                selectedTag === tag 
                  ? 'bg-white text-black border-white font-bold transform scale-105 shadow-lg shadow-white/10' 
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="mb-4 text-sm text-gray-500 text-center">
          {searchTerm && <span>搜索 "{searchTerm}" </span>}
          {selectedTag !== '近期热门' && <span>分类 "{selectedTag}" </span>}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" /> 加载中...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayVideos.length > 0 ? (
                displayVideos.map((video: any) => (
                  <Link href={`/video/${video.id}`} key={video.id} className="group flex flex-col bg-[#121212] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:-translate-y-1">
                    
                    <div className="aspect-video relative overflow-hidden bg-gray-900">
                       {video.thumbnail_url ? (
                         <img 
                           src={video.thumbnail_url} 
                           referrerPolicy="no-referrer"
                           className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center">
                           <Play className="text-gray-700" size={32} />
                         </div>
                       )}
                       {video.category && (
                         <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-medium border border-white/10">
                           {video.category}
                         </div>
                       )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-200 text-sm leading-snug line-clamp-2 group-hover:text-white transition-colors mb-2">
                        {video.title}
                      </h3>
                      
                      <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate max-w-[60%] hover:text-gray-300 transition-colors">
                          @{video.author}
                        </span>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Eye size={12} />
                          <span>{formatViews(video.views)}</span>
                        </div>
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

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button 
                  onClick={handleLoadMore}
                  className="bg-white/5 border border-white/10 text-gray-300 px-8 py-3 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                >
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
