'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { Crown, Lock, Diamond, ArrowLeft, Play, Star, Sparkles } from 'lucide-react';

export default function VipPage() {
  const [vipVideos, setVipVideos] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // 1. 获取用户信息
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(profile);
      }

      // 2. 获取 VIP 视频 (is_vip = true)
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .eq('is_vip', true)
        .order('created_at', { ascending: false });
      
      if (videos) setVipVideos(videos);
      setLoading(false);
    }
    init();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30 pb-20">
      
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#050505]/90 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
          <span className="font-bold">返回首页</span>
        </Link>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <Crown fill="black" size={16} className="text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                VIP Lounge
            </span>
        </div>
        <div className="w-20"></div> 
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-8">
        
        {/* 🎫 黑金会员卡片区域 */}
        <div className="relative mb-16 p-1 rounded-3xl bg-gradient-to-br from-yellow-500/50 via-transparent to-yellow-500/10">
            <div className="relative bg-[#0a0a0a] rounded-[22px] overflow-hidden p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                {/* 背景装饰 */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-600/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="z-10 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                        <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Sparkles size={12} /> 会员专属
                        </span>
                        <span className="text-gray-500 text-xs font-mono tracking-widest">PREMIUM ONLY</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                        解锁 <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">无限创意</span> 资产
                    </h1>
                    <p className="text-gray-400 max-w-lg mb-8">
                        加入 VIP，获取 4K 原片下载权限、工程源文件、以及专属的商业授权许可。让你的创作不再受限。
                    </p>
                    
                    {userProfile?.is_member ? (
                        <div className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/20 px-6 py-4 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center text-black font-bold text-xl">
                                {userProfile.username?.[0]?.toUpperCase() || 'V'}
                            </div>
                            <div>
                                <div className="text-yellow-500 font-bold text-lg">尊贵的 VIP 会员</div>
                                <div className="text-gray-500 text-xs">有效期至：2099-12-31</div>
                            </div>
                        </div>
                    ) : (
                        <button className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-3 rounded-full font-bold text-lg hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-95 flex items-center gap-2 mx-auto md:mx-0">
                            <Diamond size={18} fill="black" /> 立即开通会员
                        </button>
                    )}
                </div>

                {/* 右侧：3D 卡片视觉图 (CSS画一个) */}
                <div className="relative w-80 h-48 md:w-96 md:h-56 bg-gradient-to-br from-[#2a2a2a] to-black rounded-2xl border border-white/10 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 group cursor-pointer">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <div className="absolute top-6 left-6">
                        <Crown size={32} className="text-yellow-500" fill="currentColor" />
                    </div>
                    <div className="absolute bottom-6 left-6">
                        <div className="text-gray-400 text-xs font-mono mb-1">MEMBER ID</div>
                        <div className="text-white font-mono text-lg tracking-widest">8888 8888 8888</div>
                    </div>
                    <div className="absolute bottom-6 right-6">
                        <div className="text-yellow-500 font-bold italic">AI.Tube PREMIUM</div>
                    </div>
                    {/* 光效 */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-2xl pointer-events-none"></div>
                </div>
            </div>
        </div>

        {/* 🔒 资源列表 */}
        <div className="mb-8 flex items-center gap-3">
            <Lock className="text-yellow-500" size={24} />
            <h2 className="text-2xl font-bold">VIP 专属资源库</h2>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{vipVideos.length}</span>
        </div>

        {loading ? (
             <div className="py-20 text-center text-gray-500">加载中...</div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vipVideos.map(video => (
                    <Link href={`/video/${video.id}`} key={video.id} className="group relative block bg-[#121212] rounded-xl overflow-hidden border border-yellow-900/20 hover:border-yellow-500/50 transition-all hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                        {/* 封面 */}
                        <div className="aspect-video relative overflow-hidden bg-gray-900">
                             <img src={video.thumbnail_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                             
                             {/* 锁标志 */}
                             <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-bold text-yellow-500 border border-yellow-500/20 flex items-center gap-1">
                                <Lock size={10} /> VIP
                             </div>

                             {/* Play 按钮 */}
                             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-yellow-500/90 text-black flex items-center justify-center scale-50 group-hover:scale-100 transition-transform">
                                    <Play fill="currentColor" size={20} className="ml-1"/>
                                </div>
                             </div>
                        </div>
                        
                        {/* 信息 */}
                        <div className="p-4">
                             <h3 className="font-bold text-gray-200 truncate group-hover:text-yellow-400 transition-colors mb-2">{video.title}</h3>
                             <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>@{video.author}</span>
                                <span className="text-yellow-600 font-mono font-bold flex items-center gap-1"><Diamond size={10}/> {video.price || 10} 积分</span>
                             </div>
                        </div>
                    </Link>
                ))}
                
                {vipVideos.length === 0 && (
                    <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                        <p className="text-gray-500">暂无 VIP 资源，敬请期待...</p>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}
