'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, LogOut, Trash2, Heart, Video, Download, 
  Plus, Edit2, Crown, Gem, Camera, Package, Diamond, Loader2
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [activeTab, setActiveTab] = useState<'favorites' | 'uploads' | 'downloads'>('favorites');
  const [favVideos, setFavVideos] = useState<any[]>([]);
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [myDownloads, setMyDownloads] = useState<any[]>([]);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  async function checkUserAndFetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser(session.user);
    
    // 获取详细资料
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (profile) {
      setUserProfile(profile);
      setNewName(profile.username || session.user.email?.split('@')[0]);
    }

    fetchFavorites(session.user.id);
    fetchMyUploads(session.user);
    fetchDownloads(session.user.id);
    setLoading(false);
  }

  // --- 数据获取函数 ---
  async function fetchFavorites(userId: string) {
    const { data } = await supabase.from('favorites').select('*, videos(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
      // @ts-ignore
      setFavVideos(data.map(item => item.videos).filter(v => v !== null));
    }
  }

  async function fetchMyUploads(currentUser: any) {
    // 逻辑保留：暂时用邮箱前缀查视频
    const authorName = currentUser.email.split('@')[0]; 
    const { data } = await supabase.from('videos').select('*').eq('author', authorName).order('created_at', { ascending: false });
    if (data) setMyUploads(data);
  }

  async function fetchDownloads(userId: string) {
    const { data } = await supabase.from('downloads').select('*, videos(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
      // @ts-ignore
      // 简单去重逻辑，防止同一视频显示多次
      const uniqueVideos = new Map();
      data.forEach((item: any) => {
          if(item.videos) uniqueVideos.set(item.videos.id, item.videos);
      });
      setMyDownloads(Array.from(uniqueVideos.values()));
    }
  }

  // --- 交互操作 ---
  async function handleUpdateName() {
    if (!newName.trim()) return;
    const { error } = await supabase.from('profiles').update({ username: newName }).eq('id', user.id);
    if (!error) {
      setUserProfile({ ...userProfile, username: newName });
      setIsEditingName(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingAvatar(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    // 1. 上传图片
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      alert('上传失败: ' + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    // 2. 获取链接
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    
    // 3. 更新数据库
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    
    if (!updateError) {
      setUserProfile({ ...userProfile, avatar_url: data.publicUrl });
      // alert("头像更新成功！"); // 体验优化：不需要弹窗，看到图片变了就行
    }
    setUploadingAvatar(false);
  }

  async function handleDelete(videoId: number) {
    if (!confirm('确定删除？')) return;
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (!error) {
      setMyUploads(prev => prev.filter(v => v.id !== videoId));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" /></div>;

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
        <div className="text-sm font-bold text-gray-500 tracking-widest hidden sm:block">PERSONAL CENTER</div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-900/30 hover:bg-red-900/20 transition-colors">
           <LogOut size={14} /> 退出
        </button>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* 左侧：用户信息卡片 (UI 升级版) */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
              {/* 背景装饰光 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[50px] pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                
                {/* 头像区域：整合了上传逻辑 */}
                <div 
                    className="relative w-24 h-24 mb-4 cursor-pointer group/avatar"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className={`w-full h-full rounded-full border-2 border-purple-500/50 p-1 shadow-[0_0_20px_rgba(168,85,247,0.3)] overflow-hidden ${uploadingAvatar ? 'opacity-50' : ''}`}>
                        {userProfile?.avatar_url ? (
                            <img src={userProfile.avatar_url} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
                            {user?.email?.[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    {/* 上传遮罩 */}
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                    </div>
                    {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-purple-500"/></div>}
                </div>
                {/* 隐藏的文件输入框 */}
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />

                {/* 用户名编辑区域 */}
                <div className="mb-1 w-full flex justify-center h-8 items-center">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 justify-center">
                      <input 
                        autoFocus
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-transparent border-b border-purple-500 text-lg font-bold text-center w-32 outline-none"
                      />
                      <button onClick={handleUpdateName} className="text-xs bg-purple-600 px-2 py-1 rounded hover:bg-purple-500">OK</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/name cursor-pointer" onClick={() => setIsEditingName(true)}>
                        <h2 className="text-xl font-bold text-white">{userProfile?.username || user?.email?.split('@')[0]}</h2>
                        <Edit2 size={12} className="text-gray-600 group-hover/name:text-white transition-colors"/>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 font-mono mb-6">{user?.email}</p>

                {/* 统计数据 */}
                <div className="w-full grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center border border-white/5 hover:border-purple-500/30 transition-colors">
                    <span className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Diamond size={12} className="text-blue-400"/> 积分</span>
                    <span className="text-xl font-bold text-white font-mono">{userProfile?.points || 0}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center border border-white/5 hover:border-yellow-500/30 transition-colors">
                    <span className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Package size={12} className="text-yellow-400"/> 免费次数</span>
                    <span className="text-xl font-bold text-white font-mono">{userProfile?.free_quota || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 会员状态卡片 */}
            <div className={`border rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden ${userProfile?.is_member ? 'bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-yellow-500/20' : 'bg-[#111] border-white/5'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${userProfile?.is_member ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-800 text-gray-500'}`}>
                    <Crown size={20} />
                </div>
                <div>
                    <div className={`text-sm font-bold ${userProfile?.is_member ? 'text-yellow-500/90' : 'text-gray-400'}`}>
                        {userProfile?.is_member ? 'VIP 会员' : '普通用户'}
                    </div>
                    <div className="text-[10px] text-gray-500">{userProfile?.is_member ? '尊享会员权益' : '开通会员解锁更多'}</div>
                </div>
            </div>
          </div>

          {/* 右侧：Tab 内容区 */}
          <div className="md:col-span-8 lg:col-span-9">
             {/* Tab 切换 */}
             <div className="flex gap-6 border-b border-white/10 mb-6 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === 'favorites' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Heart size={16} className={activeTab === 'favorites' ? 'text-red-500 fill-red-500' : ''} /> 
                  收藏 ({favVideos.length})
                  {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('downloads')}
                  className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === 'downloads' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Download size={16} className={activeTab === 'downloads' ? 'text-purple-500' : ''} /> 
                  已购 ({myDownloads.length})
                  {activeTab === 'downloads' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('uploads')}
                  className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === 'uploads' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Video size={16} className={activeTab === 'uploads' ? 'text-blue-500' : ''} /> 
                  创作 ({myUploads.length})
                  {activeTab === 'uploads' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                </button>
             </div>

             {/* 列表内容 */}
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  {/* 发布按钮 (仅在创作 Tab 显示) */}
                  {activeTab === 'uploads' && (
                    <Link href="/upload" className="group flex flex-col items-center justify-center bg-[#121212] border border-dashed border-white/20 rounded-xl overflow-hidden hover:border-blue-500 hover:bg-white/5 transition-all duration-300 min-h-[180px] cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Plus size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-white">发布作品</span>
                    </Link>
                  )}

                  {/* 视频列表渲染 */}
                  {(() => {
                     let list = [];
                     if (activeTab === 'favorites') list = favVideos;
                     else if (activeTab === 'uploads') list = myUploads;
                     else if (activeTab === 'downloads') list = myDownloads;

                     if (list.length === 0 && activeTab !== 'uploads') {
                        return <EmptyState icon={activeTab === 'favorites' ? <Heart size={48}/> : <Download size={48}/>} text="暂无内容" />;
                     }

                     return list.map(video => (
                        <div key={video.id} className="group relative block bg-[#151515] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                            <Link href={`/video/${video.id}`} className="block">
                                <div className="aspect-video relative overflow-hidden bg-gray-900">
                                    {video.thumbnail_url ? (
                                        <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600"><Video size={24}/></div>
                                    )}
                                    {activeTab === 'downloads' && <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/30">已购</div>}
                                </div>
                                <div className="p-3">
                                    <h3 className="text-sm font-bold text-gray-300 truncate group-hover:text-white mb-1">{video.title}</h3>
                                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                                        <span>@{video.author}</span>
                                        {activeTab === 'favorites' && <Heart size={12} className="fill-red-500 text-red-500"/>}
                                        {activeTab === 'downloads' && <Download size={12} className="text-purple-500"/>}
                                    </div>
                                </div>
                            </Link>
                            
                            {/* 删除按钮 (仅在创作 Tab 显示) */}
                            {activeTab === 'uploads' && (
                                <button 
                                  onClick={(e) => { e.preventDefault(); handleDelete(video.id); }}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-md text-white opacity-0 group-hover:opacity-100 transition-all"
                                  title="删除作品"
                                >
                                  <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                     ));
                  })()}
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
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
