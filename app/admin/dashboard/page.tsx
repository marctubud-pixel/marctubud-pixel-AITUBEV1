'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Upload, Link as LinkIcon, RefreshCw, Save, Edit, Trash2, X } from 'lucide-react';
import Link from 'next/link';

const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = '782567903@qq.com';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [bilibiliLink, setBilibiliLink] = useState('');
  const [formData, setFormData] = useState({
    title: '', author: '', category: '创意短片', prompt: '', tag: '', thumbnail_url: '', video_url: '', views: 0, is_hot: false, tutorial_url: ''
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
    setLoading(true);
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    if (data) setVideos(data);
    setLoading(false);
  }

  const handleFetchInfo = async () => {
    if (!bilibiliLink) return alert('请填入链接');
    const match = bilibiliLink.match(/(BV\w+)/);
    const bvid = match ? match[1] : null;
    if (!bvid) return alert('无效 BV 号');

    setLoading(true);
    try {
      const res = await fetch(`/api/fetch-bilibili?bvid=${bvid}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setFormData(prev => ({
        ...prev,
        title: data.title,
        author: data.author,
        thumbnail_url: data.thumbnail_url,
        video_url: data.video_url,
        views: data.views || 0,
        tag: data.tag || prev.tag,
      }));
      
      alert('✅ 抓取成功！请手动选择分类。');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.title) return alert('标题不能为空');
    const payload = { ...formData };
    
    if (editMode && currentId) {
      const { error } = await supabase.from('videos').update(payload).eq('id', currentId);
      if (!error) { alert('更新成功'); setIsModalOpen(false); fetchVideos(); }
    } else {
      const { error } = await supabase.from('videos').insert([{ ...payload, created_at: new Date().toISOString() }]);
      if (!error) { alert('发布成功'); setIsModalOpen(false); fetchVideos(); }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (!error) { alert('已删除'); fetchVideos(); }
  };

  const openEdit = (video: any) => {
    setFormData({
      title: video.title, author: video.author, category: video.category, prompt: video.prompt || '',
      tag: video.tag || '', thumbnail_url: video.thumbnail_url, video_url: video.video_url, views: video.views, is_hot: video.is_hot || false,
      tutorial_url: video.tutorial_url || ''
    });
    setBilibiliLink('');
    setCurrentId(video.id);
    setEditMode(true);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setFormData({ title: '', author: '', category: '创意短片', prompt: '', tag: '', thumbnail_url: '', video_url: '', views: 0, is_hot: false, tutorial_url: '' });
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
              <tr><th className="p-4">封面</th><th className="p-4">标题/作者</th><th className="p-4">分类/工具</th><th className="p-4">数据/热门</th><th className="p-4 text-right">操作</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {videos.map(v => (
                <tr key={v.id} className="hover:bg-gray-800/50">
                  <td className="p-4 w-24"><img src={v.thumbnail_url} referrerPolicy="no-referrer" className="w-16 h-10 object-cover rounded bg-black"/></td>
                  <td className="p-4"><div>{v.title}</div><div className="text-xs text-gray-600">@{v.author}</div></td>
                  <td className="p-4"><span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs mr-2">{v.category}</span>{v.tag && <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{v.tag}</span>}</td>
                  <td className="p-4 font-mono">{v.views} views {v.is_hot && <span className="ml-2 text-red-500 font-bold">🔥HOT</span>}</td>
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-gray-500 block mb-1">标题</label><input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                  <div><label className="text-xs text-gray-500 block mb-1">作者</label><input value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">分类 (必选)</label>
                    <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white">
                      <option>创意短片</option><option>动画短片</option><option>实验短片</option><option>音乐MV</option><option>写实短片</option><option>创意广告</option><option>AI教程</option><option>获奖作品<option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">播放量</label>
                    <div className="flex gap-2 items-center">
                      <input type="number" value={formData.views} onChange={e=>setFormData({...formData, views: parseInt(e.target.value) || 0})} className="w-full bg-black border border-gray-700 rounded p-2"/>
                      <span className="text-sm text-gray-400 whitespace-nowrap min-w-[60px]">{formData.views >= 10000 ? (formData.views / 10000).toFixed(1) + '万' : formData.views}</span>
                    </div>
                  </div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">工具标签 (Tag)</label><input value={formData.tag} onChange={e=>setFormData({...formData, tag: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                
                {/* 👇 新增：教程链接输入框 */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">关联教程链接 (可选)</label>
                  <input placeholder="https://... 或 /video/123" value={formData.tutorial_url} onChange={e=>setFormData({...formData, tutorial_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/>
                </div>

                <div><label className="text-xs text-gray-500 block mb-1">提示词</label><textarea rows={4} value={formData.prompt} onChange={e=>setFormData({...formData, prompt: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"></textarea></div>
                
                <div className="flex items-center gap-2 bg-gray-900 p-3 rounded border border-gray-700">
                  <input type="checkbox" id="isHot" checked={formData.is_hot} onChange={e => setFormData({ ...formData, is_hot: e.target.checked })} className="w-5 h-5 accent-purple-600"/>
                  <label htmlFor="isHot" className="text-sm font-bold text-white cursor-pointer select-none">🔥 设为“近期热门”推荐</label>
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
