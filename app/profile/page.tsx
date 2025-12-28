'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/contexts/user-context'; 
import { 
  ArrowLeft, LogOut, Trash2, Heart, Video, Download, 
  Plus, Edit2, Crown, Gem, Camera, Package, Diamond, 
  Loader2, Calendar, Check, Gift, X, CheckCircle, Copy, Sparkles 
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🔗 接入全局用户状态
  const { user, profile, isLoading: isUserLoading, refreshProfile } = useUser();
  
  // 本地数据状态
  const [loadingData, setLoadingData] = useState(true);
  
  // 编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 签到状态
  const [checkingIn, setCheckingIn] = useState(false);

  // 🎁 兑换功能状态
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [redeemMsg, setRedeemMsg] = useState('');

  // 🗂️ 选项卡
  const [activeTab, setActiveTab] = useState<'favorites' | 'prompts' | 'uploads' | 'downloads'>('favorites');
  const [favVideos, setFavVideos] = useState<any[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<any[]>([]); 
  const [myUploads, setMyUploads] = useState<any[]>([]);
  const [myDownloads, setMyDownloads] = useState<any[]>([]);

  // 🔄 初始化逻辑
  useEffect(() => {
    if (!isUserLoading) {
        if (!user) {
            router.push('/login'); 
        } else {
            fetchSecondaryData(user.id, user.email || '');
            if (profile?.username) setNewName(profile.username);
        }
    }
  }, [user, isUserLoading, profile, router]);

  // 计算今日是否已签到
  const hasCheckedIn = React.useMemo(() => {
      if (!profile?.last_check_in) return false;
      const today = new Date().toISOString().split('T')[0];
      return profile.last_check_in === today;
  }, [profile]);

  async function fetchSecondaryData(userId: string, email: string) {
    setLoadingData(true);
    await Promise.all([
        fetchFavorites(userId),
        fetchSavedPrompts(userId),
        fetchMyUploads(email),
        fetchDownloads(userId)
    ]);
    setLoadingData(false);
  }

  // --- 数据获取函数 ---
  async function fetchFavorites(userId: string) {
    const { data } = await supabase.from('favorites').select('*, videos(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
      // @ts-ignore
      setFavVideos(data.map(item => item.videos).filter(v => v !== null));
    }
  }

  async function fetchSavedPrompts(userId: string) {
    const { data } = await supabase
        .from('saved_prompts')
        .select('*, video:videos(title, thumbnail_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (data) setSavedPrompts(data);
  }

  async function fetchMyUploads(email: string) {
    const authorName = email.split('@')[0]; 
    const { data } = await supabase.from('videos').select('*').eq('author', authorName).order('created_at', { ascending: false });
    if (data) setMyUploads(data);
  }

  async function fetchDownloads(userId: string) {
    const { data } = await supabase.from('downloads').select('*, videos(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
      // @ts-ignore
      const uniqueVideos = new Map();
      data.forEach((item: any) => {
          if(item.videos) uniqueVideos.set(item.videos.id, item.videos);
      });
      setMyDownloads(Array.from(uniqueVideos.values()));
    }
  }

  // --- 交互操作 ---
  async function handleUpdateName() {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from('profiles').update({ username: newName }).eq('id', user.id);
    if (!error) {
      await refreshProfile();
      setIsEditingName(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    setUploadingAvatar(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      alert('上传失败: ' + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    
    if (!updateError) {
      await refreshProfile(); 
    }
    setUploadingAvatar(false);
  }

  // ✨ 每日签到
  async function handleCheckIn() {
    if (hasCheckedIn || checkingIn || !user || !profile) return;
    setCheckingIn(true);

    const today = new Date().toISOString().split('T')[0];
    const reward = 10; 
    const newPoints = (profile.points || 0) + reward;

    const { error } = await supabase.from('profiles').update({ 
        points: newPoints,
        last_check_in: today 
    }).eq('id', user.id);

    if (!error) {
        await refreshProfile(); 
        alert(`🎉 签到成功！积分 +${reward}`);
    } else {
        alert('签到失败，请稍后再试');
    }
    setCheckingIn(false);
  }

  async function handleDelete(videoId: number) {
    if (!confirm('确定删除？')) return;
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (!error) {
      setMyUploads((prev: any[]) => prev.filter(v => v.id !== videoId));
    }
  }

  async function handleDeletePrompt(id: number) {
    if(!confirm('确定删除这条提示词收藏吗？')) return;
    const { error } = await supabase.from('saved_prompts').delete().eq('id', id);
    if (!error) setSavedPrompts((prev: any[]) => prev.filter(p => p.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  // 🎁 核心逻辑：兑换 VIP
  const handleRedeem = async () => {
      if (!redeemCode.trim() || !user) return;
      setRedeemStatus('loading');
      setRedeemMsg('');

      try {
          const { data: codeData, error: codeError } = await supabase.from('redemption_codes').select('*').eq('code', redeemCode.trim()).single();
          if (codeError || !codeData) throw new Error('无效的兑换码');
          if (codeData.is_used) throw new Error('该兑换码已被使用');

          const now = new Date();
          let newExpiresAt = now;
          if (profile?.is_vip && profile?.vip_expires_at && new Date(profile.vip_expires_at) > now) {
              newExpiresAt = new Date(profile.vip_expires_at);
          }
          newExpiresAt.setDate(newExpiresAt.getDate() + codeData.duration_days);

          const { error: updateCodeError } = await supabase.from('redemption_codes').update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() }).eq('id', codeData.id);
          if (updateCodeError) throw new Error('兑换失败');

          const { error: updateProfileError } = await supabase.from('profiles').update({ is_vip: true, vip_expires_at: newExpiresAt.toISOString() }).eq('id', user.id);
          if (updateProfileError) throw new Error('账户更新失败');

          setRedeemStatus('success');
          setRedeemMsg(`兑换成功！增加 ${codeData.duration_days} 天 VIP`);
          
          await refreshProfile(); 
          
          setTimeout(() => {
              setIsRedeemOpen(false);
              setRedeemStatus('idle');
              setRedeemCode('');
          }, 2000);

      } catch (err: any) {
          setRedeemStatus('error');
          setRedeemMsg(err.message);
      }
  };

  if (isUserLoading || (user && loadingData)) return <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" /></div>;

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
          
          {/* 左侧：用户信息卡片 */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 rounded-full blur-[50px] pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                
                {/* 👑 头像区域 (已增加 VIP 皇冠) */}
                <div 
                    className="relative w-24 h-24 mb-4 cursor-pointer group/avatar"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {/* VIP 皇冠角标 */}
                    {profile?.is_vip && (
                        <div className="absolute -top-2 -right-2 z-20 bg-gradient-to-br from-yellow-300 to-yellow-600 w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#111] shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                            <Crown size={14} className="text-black fill-black" />
                        </div>
                    )}

                    {/* 头像容器：根据 VIP 状态改变边框颜色 */}
                    <div className={`w-full h-full rounded-full border-2 p-1 overflow-hidden transition-all duration-500 ${
                        profile?.is_vip 
                        ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                        : 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                    } ${uploadingAvatar ? 'opacity-50' : ''}`}>
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
                            {user?.email?.[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity z-10">
                        <Camera size={24} className="text-white" />
                    </div>
                    {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center z-20"><Loader2 className="animate-spin text-purple-500"/></div>}
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />

                {/* 用户名 */}
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
                        <h2 className={`text-xl font-bold transition-colors ${profile?.is_vip ? 'text-yellow-500' : 'text-white'}`}>
                            {profile?.username || user?.email?.split('@')[0]}
                        </h2>
                        <Edit2 size={12} className="text-gray-600 group-hover/name:text-white transition-colors"/>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono mb-6">{user?.email}</p>

                {/* 统计数据 */}
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

                {/* 签到按钮 */}
                <div className="w-full">
                    <button 
                        onClick={handleCheckIn}
                        disabled={hasCheckedIn || checkingIn}
                        className={`w-full py-3 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                            hasCheckedIn 
                            ? 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5' 
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-purple-900/40 active:scale-95'
                        }`}
                    >
                        {hasCheckedIn ? (
                            <><Check size={16} /> 今日已签到</>
                        ) : (
                            <><Calendar size={16} /> 每日签到 (+10积分)</>
                        )}
                    </button>
                </div>
              </div>
            </div>

            {/* 会员状态卡片 */}
            <div className={`border rounded-2xl p-5 relative overflow-hidden ${profile?.is_vip ? 'bg-gradient-to-br from-yellow-900/20 to-black border-yellow-500/30' : 'bg-[#111] border-white/5'}`}>
                <div className="flex items-center gap-4 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${profile?.is_vip ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-800 text-gray-500'}`}>
                        <Crown size={20} />
                    </div>
                    <div>
                        <div className={`text-sm font-bold ${profile?.is_vip ? 'text-yellow-500' : 'text-gray-400'}`}>
                            {profile?.is_vip ? '尊贵 VIP 会员' : '普通用户'}
                        </div>
                        <div className="text-[10px] text-gray-500">
                            {profile?.is_vip && profile?.vip_expires_at 
                                ? `有效期至：${new Date(profile.vip_expires_at).toLocaleDateString()}` 
                                : '开通会员解锁无限下载'
                            }
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => setIsRedeemOpen(true)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Gift size={14}/> {profile?.is_vip ? '续费/兑换' : '使用卡密兑换 VIP'}
                </button>
            </div>
          </div>

          {/* 右侧内容区 (保持不变) */}
          <div className="md:col-span-8 lg:col-span-9">
             <div className="flex gap-6 border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('favorites')} className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === 'favorites' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Heart size={16} className={activeTab === 'favorites' ? 'text-red-500 fill-red-500' : ''} /> 视频收藏 ({favVideos.length})
                  {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 rounded-full"></div>}
                </button>
                <button onClick={() => setActiveTab('prompts')} className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === 'prompts' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Sparkles size={16} className={activeTab === 'prompts' ? 'text-yellow-500 fill-yellow-500' : ''} /> 提示词库 ({savedPrompts.length})
                  {activeTab === 'prompts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500 rounded-full"></div>}
                </button>
                <button onClick={() => setActiveTab('downloads')} className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === 'downloads' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Download size={16} className={activeTab === 'downloads' ? 'text-purple-500' : ''} /> 已购 ({myDownloads.length})
                  {activeTab === 'downloads' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full"></div>}
                </button>
                <button onClick={() => setActiveTab('uploads')} className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === 'uploads' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <Video size={16} className={activeTab === 'uploads' ? 'text-blue-500' : ''} /> 创作 ({myUploads.length})
                  {activeTab === 'uploads' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full"></div>}
                </button>
             </div>

             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  {/* 发布按钮 */}
                  {activeTab === 'uploads' && (
                    <Link href="/upload" className="group flex flex-col items-center justify-center bg-[#121212] border border-dashed border-white/20 rounded-xl overflow-hidden hover:border-blue-500 hover:bg-white/5 transition-all duration-300 min-h-[180px] cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Plus size={20} />
                      </div>
                      <span className="text-xs font-bold text-gray-400 group-hover:text-white">发布作品</span>
                    </Link>
                  )}

                  {/* 列表渲染 */}
                  {(() => {
                      if (activeTab === 'prompts') {
                          if (savedPrompts.length === 0) return <div className="col-span-full"><EmptyState icon={<Sparkles size={48}/>} text="还没收藏提示词" /></div>;
                          return savedPrompts.map(item => (
                              <div key={item.id} className="col-span-full bg-[#151515] border border-white/5 rounded-xl p-4 flex gap-4 group hover:border-yellow-500/30 transition-all">
                                  {item.video && (
                                      <Link href={`/video/${item.video_id}`} className="w-24 h-16 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden cursor-pointer">
                                          <img src={item.video.thumbnail_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                      </Link>
                                  )}
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start mb-2">
                                          <h3 className="font-bold text-sm text-gray-300 truncate">{item.video?.title || '未命名视频'}</h3>
                                          <div className="flex gap-2">
                                              <button onClick={() => { navigator.clipboard.writeText(item.prompt_content); alert('复制成功'); }} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="复制"><Copy size={14}/></button>
                                              <button onClick={() => handleDeletePrompt(item.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-500" title="删除"><Trash2 size={14}/></button>
                                          </div>
                                      </div>
                                      <div className="bg-black/40 rounded p-2 border border-white/5">
                                          <p className="text-xs text-gray-500 font-mono line-clamp-2">{item.prompt_content || '无内容...'}</p>
                                      </div>
                                  </div>
                              </div>
                          ));
                      }

                      let list = [];
                      if (activeTab === 'favorites') list = favVideos;
                      else if (activeTab === 'uploads') list = myUploads;
                      else if (activeTab === 'downloads') list = myDownloads;

                      if (list.length === 0 && activeTab !== 'uploads') {
                        return <div className="col-span-full"><EmptyState icon={<Video size={48}/>} text="暂无内容" /></div>;
                      }
                      return list.map(video => (
                        <div key={video.id} className="group relative block bg-[#151515] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                            <Link href={`/video/${video.id}`} className="block">
                                <div className="aspect-video relative overflow-hidden bg-gray-900">
                                    {video.thumbnail_url ? <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><Video size={24}/></div>}
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
                            {activeTab === 'uploads' && (
                                <button onClick={(e) => { e.preventDefault(); handleDelete(video.id); }} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-md text-white opacity-0 group-hover:opacity-100 transition-all" title="删除作品"><Trash2 size={12} /></button>
                            )}
                        </div>
                      ));
                  })()}
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* 兑换弹窗 (代码保持一致) */}
      {isRedeemOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
                  <button onClick={() => setIsRedeemOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                  
                  <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
                          <Gift className="text-black" size={24}/>
                      </div>
                      <h3 className="text-xl font-bold text-white">兑换会员 / 积分</h3>
                      <p className="text-xs text-gray-500 mt-1">请输入您获取的卡密</p>
                  </div>

                  <div className="space-y-4">
                      <input 
                          type="text" 
                          placeholder="VIP-XXXX-XXXX-XXXX" 
                          value={redeemCode}
                          onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center font-mono tracking-widest text-white focus:border-yellow-500 outline-none transition-colors"
                      />
                      
                      {redeemStatus === 'error' && <div className="text-red-500 text-xs text-center flex items-center justify-center gap-1"><X size={12}/> {redeemMsg}</div>}
                      {redeemStatus === 'success' && <div className="text-green-500 text-xs text-center flex items-center justify-center gap-1"><CheckCircle size={12}/> {redeemMsg}</div>}

                      <button 
                          onClick={handleRedeem}
                          disabled={redeemStatus === 'loading' || redeemStatus === 'success'}
                          className={`w-full py-3 rounded-xl font-bold text-black transition-all ${
                              redeemStatus === 'success' ? 'bg-green-500' : 'bg-white hover:bg-gray-200'
                          }`}
                      >
                          {redeemStatus === 'loading' ? <Loader2 size={18} className="animate-spin mx-auto"/> : (redeemStatus === 'success' ? '兑换成功' : '立即激活')}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

function EmptyState({ icon, text }: { icon: any, text: string }) {
    return (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-600 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <div className="mb-4 opacity-50">{icon}</div>
            <p className="text-sm">{text}</p>
            <Link href="/" className="mt-4 text-xs bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 text-white transition-colors">去逛逛</Link>
        </div>
    )
}