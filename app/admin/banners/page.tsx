'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// Supabase 配置
const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = '782567903@qq.com';

export default function BannerManager() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    is_vip: false,
    is_active: true, // 默认启用
    sort_order: 0 
  });

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      fetchBanners();
    }
  }

  async function fetchBanners() {
    // 后台要显示所有 banner (包括未启用的)，按权重排序
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    if (data) setBanners(data);
  }

  const handleSubmit = async () => {
    if (!formData.image_url) return alert('图片链接不能为空');
    
    const { error } = await supabase.from('banners').insert([formData]);
    
    if (!error) {
      alert('Banner 添加成功！');
      // 重置表单
      setFormData({ title: '', image_url: '', link_url: '', is_vip: false, is_active: true, sort_order: 0 });
      fetchBanners();
    } else {
      alert('添加失败: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这个 Banner 吗？')) return;
    await supabase.from('banners').delete().eq('id', id);
    fetchBanners();
  };

  // 快速切换激活状态
  const toggleActive = async (banner: any) => {
    await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id);
    fetchBanners();
  };

  if (!isAdmin) return <div className="p-10 text-white text-center">正在验证权限...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Banner 广告位管理</h1>
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-white flex items-center gap-1"><ArrowLeft size={16}/> 返回视频后台</Link>
        </div>

        {/* 添加区 */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8 space-y-4">
          <h3 className="font-bold mb-2 text-lg">添加新 Banner</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">标题</label>
              <input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">图片链接 (必填)</label>
              <input value={formData.image_url} onChange={e=>setFormData({...formData, image_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2" placeholder="https://..."/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">跳转链接</label>
              <input value={formData.link_url} onChange={e=>setFormData({...formData, link_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2" placeholder="/video/123 或 https://..."/>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">排序权重 (越小越靠前)</label>
              <input type="number" value={formData.sort_order} onChange={e=>setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} className="w-full bg-black border border-gray-700 rounded p-2"/>
            </div>
          </div>

          <div className="flex gap-6 py-2">
            <div className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e=>setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 accent-green-500"/>
              <label htmlFor="isActive" className="text-sm font-bold">✅ 启用展示</label>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="isVip" checked={formData.is_vip} onChange={e=>setFormData({...formData, is_vip: e.target.checked})} className="w-5 h-5 accent-yellow-500"/>
              <label htmlFor="isVip" className="text-sm font-bold text-yellow-500">💎 会员专享</label>
            </div>
          </div>

          {formData.image_url && <img src={formData.image_url} className="h-32 w-full object-cover rounded border border-gray-700"/>}
          
          <button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold flex items-center justify-center gap-2">
            <Save size={18}/> 保存 Banner
          </button>
        </div>

        {/* 列表区 */}
        <div className="space-y-4">
          {banners.map(b => (
            <div key={b.id} className={`flex items-center gap-4 bg-gray-900 p-4 rounded border ${b.is_active ? 'border-gray-700' : 'border-red-900/50 opacity-60'}`}>
              <img src={b.image_url} className="w-32 h-16 object-cover rounded bg-black"/>
              
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {b.title || '无标题'} 
                  {b.is_vip && <span className="text-[10px] border border-yellow-500 text-yellow-500 px-1 rounded">VIP</span>}
                  {!b.is_active && <span className="text-[10px] bg-red-600 text-white px-1 rounded">已下架</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">{b.link_url || '无跳转'}</div>
              </div>

              <div className="text-right text-sm text-gray-500">
                <div>权重: {b.sort_order}</div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => toggleActive(b)} title={b.is_active ? "下架" : "上架"} className="p-2 bg-gray-800 rounded hover:bg-gray-700 text-gray-300">
                  {b.is_active ? <Eye size={18}/> : <EyeOff size={18}/>}
                </button>
                <button onClick={() => handleDelete(b.id)} title="删除" className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40">
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <div className="text-center text-gray-500 py-10">暂无 Banner</div>}
        </div>
      </div>
    </div>
  );
}

