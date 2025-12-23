'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User, Heart, Download, Diamond, LogOut, ArrowLeft, Crown, Clock, LayoutGrid, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // 数据列表
  const [favorites, setFavorites] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  
  // 当前激活的 Tab: 'favorites' | 'downloads'
  const [activeTab, setActiveTab] = useState('favorites');

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login'); // 没登录直接踢去登录页
      return;
    }

    setUser(session.user);

    // 1. 获取用户信息 (积分等)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setProfile(profileData);

    // 2. 获取收藏列表 (关联查询 videos 表)
    const { data: favData } = await supabase
      .from('favorites')
      .select('*, videos(*)') // 联表查询
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (favData) {
      // 提取 videos 数据
      setFavorites(favData.map((f: any) => f.videos).filter(Boolean));
    }

    // 3. 获取下载历史 (关联查询 videos 表)
    const { data: dlData } = await supabase
      .from('downloads')
      .select('*, videos(*)') // 联表查询
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (dlData) {
       // 提取 videos 数据 (如果有重复下载，去重一下体验更好，这里简单处理)
       const uniqueVideos = new Map();
       dlData.forEach((d: any) => {
         if (d.videos && !uniqueVideos.has(d.videos.id)) {
           uniqueVideos.set(d.videos.id, d.videos);
         }
       });
       setDownloads(Array.from(uniqueVideos.values()));
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-12 h-12 bg-purple-600 rounded-full animate-bounce"></div><p className="text-gray-500 font-mono">Loading data...</p></div></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30 pb-20">
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="font-bold">返回首页</span>
        </Link>
        <div className="text-sm font-bold text-gray-500 tracking-widest">PERSONAL CENTER</div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* 左侧：用户信息卡片 */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
              {/* 背景装饰光 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[50px] pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full border-2 border-purple-500/50 p-1 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
                      {user?.email?.[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{profile?.username || user?.email?.split('@')[0]}</h2>
                <p className="text-xs text-gray-500 font-mono mb-6">{user?.email}</p>

                <div className="w-full grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center border border-white/5 hover:border-purple-500/30 transition-colors">
                    <span className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Diamond size={12} className="text-blue-400"/> 积分</span>
                    <span className="text-xl font-bold text-white font-mono">{profile?.points || 0}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center border border-white/5 hover:border-yellow-500/30 transition-colors">
                    <span className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Package size={12} className="text-yellow-400"/> 免费次数</span>
                    <span className="text-xl font-bold text-white font-mono">{profile?.free_quota || 0}</span>
                  </div>
                </div>

                <div className="w-full space-y-2">
                    {/* 充值入口 - 暂时做个样子，后续可以开发 */}
                   <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-sm shadow-lg hover:shadow-purple-900/40 transition-all active:scale-95">
                     ⚡️ 充值积分
                   </button>
                   <button onClick={handleLogout} className="w-full py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2">
                     <LogOut size={14} /> 退出登录
                   </button>
                </div>
              </div>
            </div>

            {/* 会员状态卡片 */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-yellow-500/20 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 flex-shrink-0">
                    <Crown size={20} />
                </div>
                <div>
                    <div className="text-sm font-bold text-yellow-500/90">标准会员</div>
                    <div className="text-[10px] text-gray-500">更多权益敬请期待</div>
                </div>
            </div>
          </div>

          {/* 右侧：Tab 内容区 */}
          <div className="md:col-span-8 lg:col-span-9">
             {/* Tab 切换 */}
             <div className="flex gap-6 border-b border-white/10 mb-6">
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative ${activeTab === 'favorites' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Heart size={16} className={activeTab === 'favorites' ? 'text-red-500 fill-red-500' : ''} /> 
                  我的收藏 ({favorites.length})
                  {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('downloads')}
                  className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative ${activeTab === 'downloads' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Download size={16} className={activeTab === 'downloads' ? 'text-purple-500' : ''} /> 
                  已购资源 ({downloads.length})
                  {activeTab === 'downloads' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
                </button>
             </div>

             {/* 列表内容 */}
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'favorites' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                        {favorites.length > 0 ? favorites.map(video => (
                           <VideoCard key={video.id} video={video} type="favorite" />
                        )) : (
                           <EmptyState icon={<Heart size={48} />} text="暂无收藏内容" />
                        )}
                    </div>
                )}

                {activeTab === 'downloads' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                        {downloads.length > 0 ? downloads.map(video => (
                           <VideoCard key={video.id} video={video} type="download" />
                        )) : (
                           <EmptyState icon={<Download size={48} />} text="暂无已购资源" />
                        )}
                    </div>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// 子组件：视频小卡片
function VideoCard({ video, type }: { video: any, type: 'favorite' | 'download' }) {
    if (!video) return null;
    return (
        <Link href={`/video/${video.id}`} className="group block bg-[#151515] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
            <div className="aspect-video relative overflow-hidden bg-gray-900">
                <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                {type === 'download' && <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/30">已购</div>}
            </div>
            <div className="p-3">
                <h3 className="text-sm font-bold text-gray-300 truncate group-hover:text-white mb-1">{video.title}</h3>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span>@{video.author}</span>
                    {type === 'favorite' ? <Heart size={12} className="fill-red-500 text-red-500"/> : <Download size={12} />}
                </div>
            </div>
        </Link>
    )
}

// 子组件：空状态
function EmptyState({ icon, text }: { icon: any, text: string }) {
    return (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-600 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <div className="mb-4 opacity-50">{icon}</div>
            <p className="text-sm">{text}</p>
            <Link href="/" className="mt-4 text-xs bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 text-white transition-colors">去逛逛</Link>
        </div>
    )
}
