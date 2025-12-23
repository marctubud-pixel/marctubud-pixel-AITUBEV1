'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Upload, Save, Edit, Trash2, X, Clock, Link as LinkIcon, Download, Crown, DollarSign, FileUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = '782567903@qq.com';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [bilibiliLink, setBilibiliLink] = useState('');
  
  // 🆕 文件上传相关
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    title: '', author: '', category: '创意短片', 
    prompt: '', tag: '', thumbnail_url: '', video_url: '', views: 0, 
    duration: '', 
    storyboard_url: '', 
    price: 10,
    is_vip: false,
    
    is_hot: false, is_selected: false, is_award: false, tutorial_url: ''
  });

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.email === ADMIN_EMAIL) {
      setUser(session.user);
      setIsAdmin(true);
      fetchVideos();
    }
  }

  async function fetchVideos() {
    const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    if (error) console.error('加载视频失败:', error);
    if (data) setVideos(data);
  }

  const handleFetchInfo = async () => {
    if (!bilibiliLink) return alert('请填入链接');
    const match = bilibiliLink.match(/(BV\w+)/);
    const bvid = match ? match[1] : null;
    if (!bvid) return alert('无效 BV 号');

    try {
      const res = await fetch(`/api/fetch-bilibili?bvid=${bvid}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setFormData(prev => ({
        ...prev,
        title: data.title, author: data.author, thumbnail_url: data.thumbnail_url,
        video_url: data.video_url, views: data.views || 0, tag: data.tag || prev.tag,
        duration: data.duration || '', 
        prompt: prev.prompt || '', 
      }));
      alert('✅ 抓取成功！');
    } catch (err: any) { alert(err.message); }
  };

  // 📂 核心逻辑：处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingFile(true);
    const file = e.target.files[0];
    
    // 生成随机文件名，防止中文乱码或重名
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    try {
        // 1. 上传到 storyboards 桶
        const { error: uploadError } = await supabase.storage
            .from('storyboards') // 👈 确保你在 Supabase 创建了这个名字的 bucket
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. 获取公开链接
        const { data } = supabase.storage.from('storyboards').getPublicUrl(fileName);
        
        // 3. 自动填入表单
        setFormData(prev => ({ ...prev, storyboard_url: data.publicUrl }));
        alert('✅ 文件上传成功！链接已自动填入。');

    } catch (error: any) {
        console.error(error);
        alert('上传失败: ' + error.message);
    } finally {
        setUploadingFile(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) return alert('标题不能为空');

    const payload = { 
      ...formData,
      views: Number(formData.views),
      price: Number(formData.price),
    };

    let error;
    if (editMode && currentId) {
      const res = await supabase.from('videos').update(payload).eq('id', currentId);
      error = res.error;
    } else {
      const res = await supabase.from('videos').insert([{ ...payload, created_at: new Date().toISOString() }]);
      error = res.error;
    }

    if (!error) { 
        alert('✅ 保存成功！'); 
        setIsModalOpen(false); 
        fetchVideos(); 
    } else { 
        alert('❌ 保存失败: ' + error.message); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (!error) { alert('已删除'); fetchVideos(); }
  };

  const openEdit = (video: any) => {
    setFormData({
      title: video.title, author: video.author, category: video.category, 
      prompt: video.prompt || '', 
      tag: video.tag || '', thumbnail_url: video.thumbnail_url, video_url: video.video_url, views: video.views, 
      duration: video.duration || '', 
      storyboard_url: video.storyboard_url || '',
      price: video.price || 10,
      is_vip: video.is_vip || false,
      is_hot: video.is_hot || false, is_selected: video.is_selected || false, is_award: video.is_award || false,
      tutorial_url: video.tutorial_url || ''
    });
    
    if (video.video_url && video.video_url.includes('bvid=')) {
        const match = video.video_url.match(/bvid=(BV\w+)/);
        if (match) setBilibiliLink(`https://www.bilibili.com/video/${match[1]}`);
    } else {
        setBilibiliLink('');
    }

    setCurrentId(video.id);
    setEditMode(true);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setFormData({ 
        title: '', author: '', category: '创意短片', prompt: '', tag: '', thumbnail_url: '', video_url: '', views: 0, duration: '', 
        storyboard_url: '', price: 10, is_vip: false,
        is_hot: false, is_selected: false, is_award: false, tutorial_url: '' 
    });
    setBilibiliLink('');
    setEditMode(false);
    setIsModalOpen(true);
  };

  if (!isAdmin) return <div className="p-10 text-white text-center">权限验证中...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">后台管理系统</h1>
          <div className="flex gap-4">
            <Link href="/" className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700">返回首页</Link>
            <Link href="/admin/banners" className="px-4 py-2 bg-blue-900 text-blue-200 rounded hover:bg-blue-800">Banner管理</Link>
            <button onClick={openNew} className="px-4 py-2 bg-purple-600 rounded font-bold hover:bg-purple-500 flex items-center gap-2"><Upload size={18}/> 上传新视频</button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-800 text-gray-200 font-bold">
              <tr><th className="p-4">封面</th><th className="p-4">标题/作者</th><th className="p-4">分类/工具</th><th className="p-4">数据/标签</th><th className="p-4 text-right">操作</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {videos.map(v => (
                <tr key={v.id} className="hover:bg-gray-800/50">
                  <td className="p-4 w-24"><img src={v.thumbnail_url} referrerPolicy="no-referrer" className="w-16 h-10 object-cover rounded bg-black"/></td>
                  <td className="p-4"><div>{v.title}</div><div className="text-xs text-gray-600">@{v.author}</div></td>
                  <td className="p-4"><span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs mr-2">{v.category}</span>{v.tag && <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{v.tag}</span>}</td>
                  <td className="p-4 font-mono text-xs">
                    <div>{v.views} views</div>
                    {v.duration ? (
                        <div className="flex items-center gap-1 text-gray-500 mt-1"><Clock size={12}/> {v.duration}</div>
                    ) : (<div className="text-red-900/50 mt-1 text-[10px]">无时长</div>)}
                    {v.storyboard_url && <div className="flex items-center gap-1 text-green-500 mt-1" title="有分镜"><Download size={12}/> 分镜</div>}
                  </td>
                  <td className="p-4 text-right"><button onClick={() => openEdit(v)} className="text-blue-400 mr-4"><Edit size={18}/></button><button onClick={() => handleDelete(v.id)} className="text-red-500"><Trash2 size={18}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#151515] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
              <h2 className="text-xl font-bold mb-6">{editMode ? '编辑视频' : '发布新视频'}</h2>
              {!editMode && (
                <div className="bg-gray-900 p-4 rounded mb-6 flex gap-2">
                  <input className="flex-1 bg-black border border-gray-700 rounded px-3 py-2" placeholder="粘贴 B 站链接..." value={bilibiliLink} onChange={e => setBilibiliLink(e.target.value)} />
                  <button onClick={handleFetchInfo} className="bg-blue-600 px-4 rounded font-bold hover:bg-blue-500">抓取</button>
                </div>
              )}
              {editMode && (
                <div className="bg-gray-900 p-4 rounded mb-6">
                    <div className="text-xs text-gray-500 mb-2">更新数据 (时长/播放量)</div>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-black border border-gray-700 rounded px-3 py-2" placeholder="粘贴 B 站链接..." value={bilibiliLink} onChange={e => setBilibiliLink(e.target.value)} />
                        <button onClick={handleFetchInfo} className="bg-blue-600 px-4 rounded font-bold hover:bg-blue-500">刷新抓取</button>
                    </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-gray-500 block mb-1">标题</label><input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                  <div><label className="text-xs text-gray-500 block mb-1">作者</label><input value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">分类</label>
                    <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white">
                      <option>创意短片</option><option>动画短片</option><option>实验短片</option><option>音乐MV</option><option>写实短片</option><option>创意广告</option><option>AI教程</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500 block mb-1">播放量</label><input type="number" value={formData.views} onChange={e=>setFormData({...formData, views: parseInt(e.target.value) || 0})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                  <div><label className="text-xs text-gray-500 block mb-1">时长</label><input placeholder="04:20" value={formData.duration} onChange={e=>setFormData({...formData, duration: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                </div>

                {/* 👇 升级后的资源配置区 */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Download size={12}/> 资源配置</h3>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">分镜下载链接 (支持文件上传)</label>
                        <div className="flex gap-2">
                            <input 
                                placeholder="粘贴链接，或点击右侧上传..." 
                                value={formData.storyboard_url} 
                                onChange={e=>setFormData({...formData, storyboard_url: e.target.value})} 
                                className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm text-green-500"
                            />
                            {/* 📤 文件上传按钮 */}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                                className="bg-gray-700 hover:bg-gray-600 px-4 rounded text-xs font-bold flex items-center gap-2"
                            >
                                {uploadingFile ? <Loader2 size={14} className="animate-spin"/> : <FileUp size={14} />}
                                上传文件
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                hidden 
                                onChange={handleFileUpload} 
                                // 支持 PDF, Excel, Word, 图片等
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg" 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">消耗积分</label>
                            <div className="flex items-center gap-2 bg-black border border-gray-700 rounded px-2">
                                <DollarSign size={14} className="text-gray-500"/>
                                <input type="number" value={formData.price} onChange={e=>setFormData({...formData, price: parseInt(e.target.value) || 0})} className="w-full bg-transparent p-2 outline-none"/>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                            <input type="checkbox" id="isVip" checked={formData.is_vip} onChange={e => setFormData({ ...formData, is_vip: e.target.checked })} className="w-5 h-5 accent-yellow-500"/>
                            <label htmlFor="isVip" className="text-sm font-bold text-yellow-500 cursor-pointer select-none flex items-center gap-1"><Crown size={14}/> 会员专享</label>
                        </div>
                    </div>
                </div>

                <div><label className="text-xs text-gray-500 block mb-1">工具标签</label><input value={formData.tag} onChange={e=>setFormData({...formData, tag: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                <div><label className="text-xs text-gray-500 block mb-1">教程链接</label><input placeholder="https://..." value={formData.tutorial_url} onChange={e=>setFormData({...formData, tutorial_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">提示词</label>
                  <textarea rows={4} value={formData.prompt} onChange={e=>setFormData({...formData, prompt: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-sm font-mono" placeholder="粘贴提示词..."></textarea>
                </div>
                
                <div className="flex flex-wrap gap-4 bg-gray-900 p-3 rounded border border-gray-700">
                  <div className="flex items-center gap-2"><input type="checkbox" id="isHot" checked={formData.is_hot} onChange={e => setFormData({ ...formData, is_hot: e.target.checked })} className="w-5 h-5 accent-red-600"/><label htmlFor="isHot" className="text-sm font-bold text-white cursor-pointer select-none">🔥 近期热门</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" id="isSelected" checked={formData.is_selected} onChange={e => setFormData({ ...formData, is_selected: e.target.checked })} className="w-5 h-5 accent-yellow-500"/><label htmlFor="isSelected" className="text-sm font-bold text-yellow-500 cursor-pointer select-none">🏆 编辑精选</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" id="isAward" checked={formData.is_award} onChange={e => setFormData({ ...formData, is_award: e.target.checked })} className="w-5 h-5 accent-purple-500"/><label htmlFor="isAward" className="text-sm font-bold text-purple-500 cursor-pointer select-none">🥇 获奖作品</label></div>
                </div>

                <button onClick={handleSubmit} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded font-bold mt-4">{editMode ? '保存修改' : '确认发布'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
