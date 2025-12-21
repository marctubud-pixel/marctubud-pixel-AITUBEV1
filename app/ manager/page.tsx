'use client';

import React, { useState, useEffect } from 'react';
// 👇 这里是关键，退回3层去引用 lib
import { supabase } from '@/app/lib/supabaseClient'; 
import { ArrowLeft, Upload, Link as LinkIcon, RefreshCw, Save } from 'lucide-react';
import Link from 'next/link';

export default function UploadPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [bilibiliLink, setBilibiliLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'Sora',
    prompt: '',
    tag: '',
    thumbnail_url: '',
    video_url: '',
  });

  // 👇 这里填你自己的邮箱
  const ADMIN_EMAIL = 'marctubud@gmail.com'; 

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      if (session.user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      }
    }
  }

  const handleFetchInfo = async () => {
    if (!bilibiliLink) return alert('请先填入 B 站链接');
    const match = bilibiliLink.match(/(BV\w+)/);
    const bvid = match ? match[1] : null;

    if (!bvid) return alert('链接里没找到 BV 号');

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
      }));
      
      alert('抓取成功！请补充信息。');

    } catch (err: any) {
      alert('抓取失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.video_url) return alert('信息不完整');

    try {
      const { error } = await supabase.from('videos').insert([
        {
          title: formData.title,
          author: formData.author,
          category: formData.category,
          prompt: formData.prompt,
          tag: formData.tag,
          thumbnail_url: formData.thumbnail_url,
          video_url: formData.video_url,
          views: 0,
          created_at: new Date().toISOString()
        }
      ]);

      if (error) throw error;

      alert('✅ 发布成功！');
      setFormData({
        title: '',
        author: '',
        category: 'Sora',
        prompt: '',
        tag: '',
        thumbnail_url: '',
        video_url: '',
      });
      setBilibiliLink('');

    } catch (err: any) {
      alert('发布失败: ' + err.message);
    }
  };

  if (!user) return <div className="p-10 text-white flex justify-center">请先登录</div>;
  if (!isAdmin) return <div className="p-10 text-white flex justify-center">你不是管理员 (权限不足)</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="text-purple-500"/> 视频上传后台
          </h1>
          <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-white">
            <ArrowLeft size={16}/> 回首页
          </Link>
        </div>

        <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10 mb-8">
          <label className="block text-sm font-bold text-gray-400 mb-2">1. 输入 Bilibili 视频链接</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={bilibiliLink}
              onChange={(e) => setBilibiliLink(e.target.value)}
              placeholder="https://www.bilibili.com/video/BV..."
              className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
            />
            <button 
              onClick={handleFetchInfo}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" size={18}/> : <LinkIcon size={18}/>}
              一键抓取
            </button>
          </div>
        </div>

        <div className="space-y-4 bg-gray-900/50 p-6 rounded-xl border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">2. 确认并发布信息</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">视频标题</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">作者 (UP主)</label>
              <input type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">分类</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm">
                <option value="Sora">Sora</option>
                <option value="Runway">Runway</option>
                <option value="Pika">Pika</option>
                <option value="Midjourney">Midjourney</option>
                <option value="Stable Video">Stable Video</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">使用工具</label>
              <input type="text" placeholder="例如: Runway Gen-2" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm"/>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">提示词 (Prompt)</label>
            <textarea rows={4} value={formData.prompt} onChange={e => setFormData({...formData, prompt: e.target.value})} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm" placeholder="AI 提示词..."></textarea>
          </div>

          {formData.thumbnail_url && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">封面预览</label>
              <img src={formData.thumbnail_url} alt="Cover" className="h-32 rounded border border-gray-700 object-cover"/>
            </div>
          )}

          <button 
            onClick={handleSubmit}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 mt-4 transition-colors"
          >
            <Save size={20}/> 确认发布
          </button>
        </div>
      </div>
    </div>
  );
}
