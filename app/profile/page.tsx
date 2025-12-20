'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, LogOut, Trash2, Heart, Video, Download, Plus, Edit2, Crown, Gem, Camera } from 'lucide-react';

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
  }

  // --- 数据获取函数 ---
  async function fetchFavorites(userId: string) {
    const { data } = await supabase.from('favorites').select('*, videos(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
      // @ts-ignore
      setFavVideos(data.map(item => item.videos).filter(v => v !== null));
    }
    setLoading(false);
  }
  async function fetchMyUploads(currentUser: any) {
    const authorName = currentUser.email.split('@')[0]; // 暂时还是用邮箱前缀查视频，因为视频表里存的是旧作者名
    const { data } = await supabase.from('videos').select('*').eq('author', authorName).order('created_at', { ascending: false });
    if (data) setMyUploads(data);
  }
  async function fetchDownloads(userId: string) {
    const { data } = await supabase.from('downloads').select('*, videos(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
      // @ts-ignore
      setMyDownloads(data.map(item => item.videos).filter(v => v !== null));
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
    
    // 调试日志：看看是不是这里就断了
    console.log("开始上传...");
    setUploadingAvatar(true);
    
    const file = e.target.files[0];
    
    // 👇 傻瓜文件名：不依赖 user.id，纯随机
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    console.log("目标路径:", filePath);

    // 1. 上传图片
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { 
        upsert: true,
        contentType: file.type // 👈 显式指定类型，防止被当成二进制流
      });

    if (uploadError) {
      console.error("上传报错详情:", uploadError); // 👈 打开控制台看这个！
      alert('上传失败: ' + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    // 2. 获取链接
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    console.log("获取到链接:", data.publicUrl);
    
    // 3. 更新数据库
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    
    if (!updateError) {
      setUserProfile({ ...userProfile, avatar_url: data.publicUrl });
      alert("头像更新成功！");
    } else {
      console.error("更新数据库失败:", updateError);
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

  if (!user) return <div className="min-h-screen bg-[#0A0A0A] text-white p-10">加载中...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span>返回首页</span>
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 px-4 py-2 rounded-full border border-red-900/50 hover:bg-red-900/20 transition-colors">
          <LogOut size={16} /> 退出
        </button>
      </nav>

      <main className="max-w-5xl mx-auto p-6">
        
        {/* 👇 头部个人信息 (重新设计：极简居中) */}
        <div className="flex flex-col items-center justify-center mb-12 mt-4">
          
          {/* 头像区域 */}
          <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-purple-500 transition-colors shadow-2xl">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
              )}
              {/* 遮罩提示 */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            {/* 会员标识 */}
            {userProfile?.is_member && (
              <div className="absolute bottom-0 right-0 bg-yellow-500 text-black p-1.5 rounded-full border-2 border-[#0A0A0A]" title="VIP会员">
                <Crown size={12} fill="currentColor" />
              </div>
            )}
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
          </div>

          {/* 昵称区域 */}
          <div className="flex items-center gap-2 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-transparent border-b border-white/30 text-2xl font-bold text-center w-40 outline-none pb-1"
                />
                <button onClick={handleUpdateName} className="text-xs bg-purple-600 px-3 py-1 rounded-full">保存</button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{userProfile?.username || user.email?.split('@')[0]}</h1>
                <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-white transition-colors">
                  <Edit2 size={14} />
                </button>
              </>
            )}
          </div>

          {/* 标签与积分 */}
          <div className="flex items-center gap-4 text-sm">
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${userProfile?.is_member ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              {userProfile?.is_member ? 'VIP 会员' : '普通用户'}
            </span>
            <div className="flex items-center gap-1.5 text-purple-300">
              <Gem size={14} />
              <span className="font-bold">{userProfile?.points || 0}</span>
              <span className="text-purple-300/60 text-xs">灵感积分</span>
            </div>
          </div>

        </div>

        {/* 选项卡 (简化版) */}
        <div className="flex justify-center border-b border-white/10 mb-8">
          <div className="flex gap-8">
            {[
              { id: 'favorites', label: '收藏', icon: Heart },
              { id: 'downloads', label: '下载', icon: Download },
              { id: 'uploads', label: '创作', icon: Video },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-sm font-medium flex items-center gap-2 transition-all border-b-2 px-4 ${
                  activeTab === tab.id 
                    ? 'text-white border-purple-500' 
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 列表内容 */}
        {loading ? (
          <div className="py-20 text-center text-gray-500">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(() => {
              let list = [];
              if (activeTab === 'favorites') list = favVideos;
              else if (activeTab === 'uploads') list = myUploads;
              else if (activeTab === 'downloads') list = myDownloads;

              return (
                <>
                  {activeTab === 'uploads' && (
                    <Link href="/upload" className="group flex flex-col items-center justify-center bg-[#121212] border border-dashed border-white/20 rounded-xl overflow-hidden hover:border-purple-500 hover:bg-white/5 transition-all duration-300 min-h-[200px] cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Plus size={24} />
                      </div>
                      <span className="text-sm font-bold text-gray-400 group-hover:text-white">发布作品</span>
                    </Link>
                  )}

                  {list.map((video: any) => (
                    <div key={video.id} className="group relative bg-[#121212] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1">
                      <Link href={`/video/${video.id}`} className="block">
                        <div className="aspect-video bg-gray-900 relative flex items-center justify-center group-hover:opacity-90">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} className="w-full h-full object-cover" />
                          ) : (
                            <Play className="text-gray-600" size={32} />
                          )}
                          {activeTab === 'downloads' && (
                            <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur px-2 py-0.5 rounded text-[10px] text-white font-bold shadow-sm">已购</div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-bold text-gray-200 text-sm truncate mb-1">{video.title}</h3>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{video.views || 0} 播放</span>
                            {activeTab === 'favorites' && <span>已收藏</span>}
                          </div>
                        </div>
                      </Link>
                      {activeTab === 'uploads' && (
                        <button 
                          onClick={(e) => { e.preventDefault(); handleDelete(video.id); }}
                          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {list.length === 0 && activeTab !== 'uploads' && (
                    <div className="col-span-full py-20 text-center text-gray-500 text-sm">暂无内容</div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
