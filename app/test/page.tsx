'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Upload, Link as LinkIcon, RefreshCw, Save } from 'lucide-react';
import Link from 'next/link';

// 👇 1. Supabase 配置 (硬编码模式，最稳！)
const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo';
const supabase = createClient(supabaseUrl, supabaseKey);

// 👇 2. 管理员邮箱 (一定要改对，否则你会看到“权限不足”)
const ADMIN_EMAIL = 'marctubud@gmail.com';

export default function UploadPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 表单状态
  const [bilibiliLink, setBilibiliLink] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'Sora',
    prompt: '',
    tag: '',
    thumbnail_url: '',
    video_url: '',
  });

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

  // 核心功能：调用 API 抓取 B 站数据
  const handleFetchInfo = async () => {
    if (!bilibiliLink) return alert('请先填入 B 站链接');
    
    // 提取 BV 号
    const match = bilibiliLink.match(/(BV\w+)/);
    const bvid = match ? match[1] : null;
    if (!bvid) return alert('链接里没找到 BV 号');

    setLoading(true);
    try {
      // 调用我们在 app/api/fetch-bilibili/route.ts 里写的接口
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
      
      alert('✅ 抓取成功！请补充 Prompt 和分类。');
    } catch (err: any) {
      alert('❌ 抓取失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 提交到数据库
  const handleSubmit = async () => {
    if (!formData.title || !formData.video_url) return alert('标题和链接不能为空');

    try {
      const { error } = await supabase.from('videos').insert([{
        ...formData,
        views: 0,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      alert('🎉 发布成功！');
      // 重置表单
      setFormData({ title: '', author: '', category: 'Sora', prompt: '', tag: '', thumbnail_url: '', video_url: '' });
      setBilibiliLink('');
    } catch (err: any) {
      alert('发布失败: ' + err.message);
    }
  };

  // 权限拦截视图
  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><h1>请先登录账号</h1></div>;
  if (!isAdmin) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><h1>🚫 你不是管理员 ({user.email})</h1></div>;

  // 正常视图
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* 头部 */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Upload className="text-purple-500"/> 视频发布后台</h1>
          <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-white"><ArrowLeft size={16}/> 返回首页</Link>
        </div>

        {/* 1. 抓取区 */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10">
          <label className="block text-sm font-bold text-gray-400 mb-3">1. 抓取 B 站数据</label>
          <div className="flex gap-3">
            <input 
              value={bilibiliLink}
              onChange={(e) => setBilibiliLink(e.target.value)}
              placeholder="粘贴链接，例如: https://www.bilibili.com/video/BV1xx..."
              className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
            />
            <button 
              onClick={handleFetchInfo} 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin"/> : <LinkIcon/>} 一键抓取
            </button>
          </div>
        </div>

        {/* 2. 编辑区 */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-white/10 space-y-4">
          <h2 className="text-lg font-bold">2. 确认信息</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">标题</label>
              <input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">作者</label>
              <input value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">分类</label>
              <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2">
                <option>Sora</option><option>Runway</option><option>Pika</option><option>Midjourney</option><option>Stable Video</option><option>其他</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">工具标签</label>
              <input placeholder="如: Gen-3 Alpha" value={formData.tag} onChange={e=>setFormData({...formData, tag: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">提示词 (Prompt)</label>
            <textarea rows={3} value={formData.prompt} onChange={e=>setFormData({...formData, prompt: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2" placeholder="输入 AI 提示词..."></textarea>
          </div>

          {formData.thumbnail_url && (
            <img src={formData.thumbnail_url} className="h-32 rounded object-cover border border-gray-700"/>
          )}

          <button onClick={handleSubmit} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold mt-4 flex justify-center items-center gap-2">
            <Save size={18}/> 确认发布到网站
          </button>
        </div>

      </div>
    </div>
  );
}
