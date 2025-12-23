'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { Search, Upload, X, ChevronLeft, ChevronRight, Loader2, Eye, Crown, MonitorPlay, Trophy, Play, Clock, Flame, Sparkles, Bot, Send, MessageSquare, GripHorizontal } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  // ----------------------------------------------------------------
  // 1. 数据状态
  // ----------------------------------------------------------------
  const [videos, setVideos] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 搜索与筛选
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('近期热门');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [visibleCount, setVisibleCount] = useState(10);

  // 🤖 AI 助手状态 (含拖拽逻辑)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'ai'|'user', content: string}[]>([
    { role: 'ai', content: '你好！我是 AI.Tube 创作助手。' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 拖拽相关状态
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 代表尚未初始化，使用默认 CSS
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 }); // 记录按下时的位置，用于判断是点击还是拖拽

  const categories = ["近期热门", "编辑精选", "获奖作品", "动画短片", "音乐MV", "写实短片", "创意短片", "AI教程", "创意广告", "实验短片"];

  // ----------------------------------------------------------------
  // 2. 初始化逻辑
  // ----------------------------------------------------------------
  useEffect(() => {
    // 初始化按钮位置 (右下角)
    if (typeof window !== 'undefined') {
        setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
    }

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

  // Banner 轮播
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  // 聊天窗口自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  // ----------------------------------------------------------------
  // 3. 拖拽逻辑处理
  // ----------------------------------------------------------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        // 简单的拖拽跟随
        setPosition(prev => ({
            x: prev.x + e.movementX,
            y: prev.y + e.movementY
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleBotClick = (e: React.MouseEvent) => {
    // 计算移动距离，如果移动太远，说明是拖拽，不触发点击
    const moveDist = Math.hypot(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
    if (moveDist < 5) {
        setIsChatOpen(!isChatOpen);
    }
  };


  // ----------------------------------------------------------------
  // 4. 常规交互逻辑
  // ----------------------------------------------------------------
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

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    
    setTimeout(() => {
        let aiReply = "这是一个很好的问题！作为一个演示助手，我建议你去「AI 学院」看看相关教程。";
        if (userMsg.includes("分镜")) aiReply = "想生成分镜？你可以去「灵感工具库」使用我们的智能分镜生成器，或者下载首页的 PDF 模板。";
        if (userMsg.includes("会员")) aiReply = "成为 VIP 可以解锁 4K 原片下载权限，现在开通还有优惠哦！";
        setChatMessages(prev => [...prev, { role: 'ai', content: aiReply }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部导航 (统一字体和颜色) */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer flex-shrink-0" 
          onClick={() => {setSelectedTag('近期热门'); setSearchTerm('')}}
        >
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <MonitorPlay fill="white" size={16} />
          </div>
          <span className="text-xl font-bold tracking-tight">AI Tube</span>
        </div>

        <div className="hidden md:flex flex-1 items-center ml-10 mr-4 gap-8">
            <div className="flex items-center gap-6 text-sm flex-shrink-0">
                {/* 统一为 text-gray-300 + font-bold */}
                <Link href="/academy" className="text-gray-300 hover:text-white transition-colors font-bold">
                    AI 学院
                </Link>
                <Link href="/vip" className="text-gray-300 hover:text-yellow-400 transition-colors font-bold flex items-center gap-1">
                    <Crown size={16} className="mb-0.5" /> 会员专区
                </Link>
                <Link href="/tools" className="text-gray-300 hover:text-white transition-colors font-bold">
                    灵感工具
                </Link>
                <Link href="/collaboration" className="text-gray-300 hover:text-white transition-colors font-bold">
                    合作中心
                </Link>
            </div>

            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="搜索 Sora, Runway, 动画..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-purple-600 transition-all text-sm focus:bg-[#151515]"
                />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
            </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/upload">
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

      <main className="p-6 max-w-7xl mx-auto relative">
        
        {/* Banner */}
        {banners.length > 0 && !searchTerm && (
          <Link href={banners[currentBanner].link_url || '#'}>
            <div className="block mb-10 relative group rounded-2xl overflow-hidden aspect-[21/9] md:aspect-[3/1] bg-gray-900 cursor-pointer shadow-2xl border border-white/5">
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
            </div>
          </Link>
        )}

        {/* 分类栏 */}
        <div className="flex gap-3 overflow-x-auto pb-6 mb-4 scrollbar-hide justify-center">
          {categories.map((tag) => (
            <button 
              key={tag} 
              onClick={() => { setSelectedTag(tag); setVisibleCount(8); setSearchTerm(''); }}
              className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-300 border cursor-pointer ${selectedTag === tag ? 'bg-white text-black border-white font-bold transform scale-105 shadow-lg shadow-white/10' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {searchTerm && <div className="mb-4 text-sm text-gray-500 text-center">🔍 搜索 "{searchTerm}" 的结果 ({filteredVideos.length})</div>}

        {loading ? (
          <div className="text-center text-gray-500 py-20 flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> 加载中...</div>
        ) : (
          <>
            {/* 视频网格 (已删除 HOT 角标) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayVideos.length > 0 ? (
                displayVideos.map((video: any) => (
                  <Link href={`/video/${video.id}`} key={video.id} className="group flex flex-col bg-[#121212] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:-translate-y-1">
                    
                    <div className="aspect-video relative overflow-hidden bg-gray-900">
                       <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                       
                       <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                           <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-50 group-hover:scale-100 transition-transform duration-300 border border-white/30 shadow-xl">
                               <Play fill="currentColor" size={20} className="ml-1"/>
                           </div>
                       </div>
                       
                       <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>

                       {video.category && (
                         <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[10px] text-white font-medium border border-white/10">
                           {video.category}
                         </div>
                       )}

                       <div className="absolute top-2 right-2 flex gap-1">
                         {video.is_selected && <div className="w-6 h-6 bg-yellow-500/20 backdrop-blur rounded-full flex items-center justify-center border border-yellow-500/50 text-yellow-400 shadow-lg" title="编辑精选"><Crown size={12} fill="currentColor"/></div>}
                         {video.is_award && <div className="w-6 h-6 bg-yellow-500/20 backdrop-blur rounded-full flex items-center justify-center border border-yellow-500/500 text-yellow-400 shadow-lg" title="获奖作品"><Trophy size={12} fill="currentColor"/></div>}
                         {/* 已移除 HOT 角标 */}
                       </div>

                       <div className="absolute bottom-2 left-2 text-[10px] text-white flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                         <Eye size={12} className="text-white"/> <span className="font-medium">{formatViews(video.views)}</span>
                       </div>

                       {video.duration && (
                         <div className="absolute bottom-2 right-2 text-[10px] text-white font-bold font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                           {video.duration}
                         </div>
                       )}

                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-200 text-sm leading-snug line-clamp-2 group-hover:text-white transition-colors mb-2">{video.title}</h3>
                      <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate max-w-[60%] hover:text-gray-300 transition-colors">@{video.author}</span>
                        {video.tag && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] max-w-[40%] truncate">{video.tag.split(',')[0]}</span>}
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
                  加载更多灵感 ({filteredVideos.length - visibleCount})
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ----------------------------------------------------------------
         🤖 AI 悬浮创作助手 (可拖拽 + 幽灵模式)
      ---------------------------------------------------------------- */}
      <div 
        style={{ 
            position: 'fixed', 
            left: position.x === -1 ? 'auto' : position.x, 
            top: position.y === -1 ? 'auto' : position.y,
            right: position.x === -1 ? '32px' : 'auto', // 默认右边距
            bottom: position.y === -1 ? '32px' : 'auto', // 默认底边距
            zIndex: 100
        }}
        className="flex flex-col items-end gap-4 select-none touch-none"
      >
        {/* 聊天窗口 (跟随按钮，出现在按钮上方) */}
        {isChatOpen && (
            <div className="absolute bottom-12 right-0 bg-[#151515] border border-white/10 rounded-2xl w-80 shadow-2xl overflow-hidden flex flex-col h-96 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
                <div className="bg-purple-900/20 p-3 border-b border-white/5 flex justify-between items-center cursor-move" onMouseDown={handleMouseDown}>
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <Sparkles size={14} className="text-purple-400" /> 创作助手
                    </div>
                    <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white"><X size={14}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0A0A0A]">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-purple-600 text-white rounded-br-none' 
                                : 'bg-gray-800 text-gray-200 rounded-bl-none border border-white/5'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>

                {/* 快捷指令 */}
                <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setChatInput('帮我生成分镜')} className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-2 py-0.5 text-[10px] text-gray-400 hover:text-white transition-colors">生成分镜</button>
                    <button onClick={() => setChatInput('会员有什么权益？')} className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-2 py-0.5 text-[10px] text-gray-400 hover:text-white transition-colors">会员权益</button>
                </div>

                <div className="p-2 border-t border-white/5 bg-[#151515] flex gap-2">
                    <input 
                        className="flex-1 bg-black/50 border border-white/10 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500 text-white"
                        placeholder="输入问题..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-500 text-white p-1.5 rounded-full transition-colors">
                        <Send size={14} />
                    </button>
                </div>
            </div>
        )}

        {/* 悬浮按钮 */}
        <div 
            onMouseDown={handleMouseDown}
            onClick={handleBotClick}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/10 transition-all duration-300 cursor-pointer shadow-lg hover:scale-110 active:scale-95
            ${isChatOpen 
                ? 'bg-purple-600 border-purple-500 opacity-100' // 打开时：紫色、不透明
                : 'bg-black/40 hover:bg-black/60 opacity-30 hover:opacity-100' // 关闭时：透明、幽灵模式
            }`}
        >
            {isChatOpen ? <X size={18} /> : <Bot size={20} />}
        </div>
      </div>

    </div>
  );
}
