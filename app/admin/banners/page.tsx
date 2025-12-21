'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, Edit, Upload, Image as ImageIcon, RefreshCw  } from 'lucide-react';
import Link from 'next/link';

const supabaseUrl = 'https://muwpfhwzfxocqlcxbsoa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d3BmaHd6ZnhvY3FsY3hic29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODI4NjEsImV4cCI6MjA4MTQ1ODg2MX0.GvW2cklrWrU1wyipjSiEPfA686Uoy3lRFY75p_UkNzo';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = '782567903@qq.com';

export default function BannerManager() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // 编辑模式状态
  const [editId, setEditId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    tag: '',
    is_active: true,
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
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    if (data) setBanners(data);
  }

  // 图片上传处理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      // 上传到 banners 存储桶
      const { data, error } = await supabase.storage.from('banners').upload(fileName, file);
      
      if (error) throw error;

      // 获取公开链接
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      alert('图片上传成功！');
    } catch (error: any) {
      alert('上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.image_url) return alert('图片链接不能为空');
    
    if (editId) {
      // 更新模式
      const { error } = await supabase.from('banners').update(formData).eq('id', editId);
      if (!error) {
        alert('Banner 更新成功！');
        resetForm();
        fetchBanners();
      } else {
        alert('更新失败: ' + error.message);
      }
    } else {
      // 新建模式
      const { error } = await supabase.from('banners').insert([formData]);
      if (!error) {
        alert('Banner 添加成功！');
        resetForm();
        fetchBanners();
      } else {
        alert('添加失败: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ title: '', image_url: '', link_url: '', tag: '', is_active: true, sort_order: 0 });
  };

  const handleEdit = (b: any) => {
    setEditId(b.id);
    setFormData({
      title: b.title,
      image_url: b.image_url,
      link_url: b.link_url,
      tag: b.tag,
      is_active: b.is_active,
      sort_order: b.sort_order
    });
    // 滚动到顶部方便编辑
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这个 Banner 吗？')) return;
    await supabase.from('banners').delete().eq('id', id);
    fetchBanners();
  };

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

        {/* 编辑/添加区 */}
        <div className={`p-6 rounded-xl border mb-8 space-y-4 transition-colors ${editId ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-900 border-gray-800'}`}>
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              {editId ? <><Edit size={20} className="text-blue-400"/> 编辑 Banner (#{editId})</> : <><Upload size={20} className="text-green-400"/> 添加新 Banner</>}
            </h3>
            {editId && <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white underline">取消编辑</button>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">标题</label>
              <input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/>
            </div>
            
            {/* 图片上传区 */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">封面图片</label>
              <div className="flex gap-2">
                <input 
                  value={formData.image_url} 
                  onChange={e=>setFormData({...formData, image_url: e.target.value})} 
                  className="flex-1 bg-black border border-gray-700 rounded p-2 text-xs" 
                  placeholder="https://... 或直接上传 ->"
                />
                <label className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded cursor-pointer flex items-center gap-1 min-w-fit">
                  {uploading ? <RefreshCw className="animate-spin" size={14}/> : <ImageIcon size={14}/>}
                  <span className="text-xs">{uploading ? '上传中' : '上传'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading}/>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">跳转链接</label>
              <input value={formData.link_url} onChange={e=>setFormData({...formData, link_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2" placeholder="/video/123 或 https://..."/>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div>
                 <label className="text-xs text-gray-500 block mb-1">角标 (如: 搞钱)</label>
                 <input value={formData.tag} onChange={e=>setFormData({...formData, tag: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/>
               </div>
               <div>
                 <label className="text-xs text-gray-500 block mb-1">排序权重</label>
                 <input type="number" value={formData.sort_order} onChange={e=>setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} className="w-full bg-black border border-gray-700 rounded p-2"/>
               </div>
            </div>
          </div>

          <div className="flex gap-6 py-2">
            <div className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e=>setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 accent-green-500"/>
              <label htmlFor="isActive" className="text-sm font-bold">✅ 启用展示</label>
            </div>
          </div>

          {formData.image_url && <img src={formData.image_url} className="h-32 w-full object-cover rounded border border-gray-700"/>}
          
          <button onClick={handleSubmit} className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 ${editId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'}`}>
            <Save size={18}/> {editId ? '保存修改' : '立即发布'}
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
                  {b.tag && <span className="text-[10px] border border-purple-500 text-purple-500 px-1 rounded">{b.tag}</span>}
                  {!b.is_active && <span className="text-[10px] bg-red-600 text-white px-1 rounded">已下架</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">{b.link_url || '无跳转'}</div>
              </div>

              <div className="text-right text-sm text-gray-500">
                <div>权重: {b.sort_order}</div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleEdit(b)} title="编辑" className="p-2 bg-blue-900/20 text-blue-400 rounded hover:bg-blue-900/40">
                  <Edit size={18}/>
                </button>
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
