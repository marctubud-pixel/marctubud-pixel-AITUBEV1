'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient'; // ⚠️ 注意路径：app/admin/page.tsx -> ../lib
import { 
    LayoutDashboard, Video, FileText, Image as ImageIcon, Briefcase, 
    Plus, Trash2, Edit, X, LogOut, Upload, Loader2, Link as LinkIcon, 
    Clock, Download, DollarSign, Crown, FileUp, Save, Eye, EyeOff, RefreshCw, ArrowLeft
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'videos' | 'articles' | 'banners' | 'jobs'>('videos');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ----------------------------------------------------------------
  // 🔐 1. 鉴权与初始化
  // ----------------------------------------------------------------
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (isAuth !== 'true') {
        router.push('/admin/login');
    } else {
        fetchData(activeTab);
    }
  }, [activeTab]);

  const handleLogout = () => {
      localStorage.removeItem('admin_auth');
      router.push('/admin/login');
  };

  async function fetchData(table: string) {
    setLoading(true);
    let query = supabase.from(table).select('*');
    
    // Banner 按权重排序，其他按时间倒序
    if (table === 'banners') {
        query = query.order('sort_order', { ascending: true });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data: result, error } = await query;
    if (result) setData(result);
    setLoading(false);
  }

  // ----------------------------------------------------------------
  // 🎥 2. 核心逻辑状态管理
  // ----------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [bilibiliLink, setBilibiliLink] = useState('');
  
  // 文件上传
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // 统一大表单 (包含视频、文章、Banner、需求的所有字段)
  const [formData, setFormData] = useState<any>({
    // 视频 & 通用
    title: '', author: '', category: '创意短片', 
    prompt: '', tag: '', thumbnail_url: '', video_url: '', views: 0, 
    duration: '', storyboard_url: '', price: 10, is_vip: false,
    is_hot: false, is_selected: false, is_award: false, tutorial_url: '',
    
    // 文章
    description: '', image_url: '', difficulty: '入门',
    
    // 需求
    budget: '', company: '', deadline: '', status: 'open', applicants: 0,
    
    // Banner
    link_url: '', is_active: true, sort_order: 0
  });

  // B站抓取
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

  // 视频分镜上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    try {
        const { error: uploadError } = await supabase.storage.from('storyboards').upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('storyboards').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, storyboard_url: data.publicUrl }));
        alert('✅ 文件上传成功！');
    } catch (error: any) {
        alert('上传失败: ' + error.message);
    } finally {
        setUploadingFile(false);
    }
  };

  // Banner/文章封面 图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    const file = e.target.files[0];
    const fileName = `banner-${Date.now()}-${file.name}`; // 加个前缀区分
    
    try {
        // 这里假设不管是文章还是Banner，都传到 banners 桶里方便管理，或者你可以改成分别传
        const { error } = await supabase.storage.from('banners').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('banners').getPublicUrl(fileName);
        
        // 自动回填到 image_url 字段
        setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
        alert('✅ 图片上传成功！');
    } catch (error: any) {
        alert('上传失败: ' + error.message);
    } finally {
        setUploadingFile(false);
    }
  };

  // 提交保存
  const handleSubmit = async () => {
    if (!formData.title) return alert('标题不能为空');

    // 组装 Payload (只提取当前 Tab 需要的字段)
    let payload: any = {};
    if (activeTab === 'videos') {
        payload = {
            title: formData.title, author: formData.author, category: formData.category,
            prompt: formData.prompt, tag: formData.tag, thumbnail_url: formData.thumbnail_url,
            video_url: formData.video_url, views: Number(formData.views), duration: formData.duration,
            storyboard_url: formData.storyboard_url, price: Number(formData.price), is_vip: formData.is_vip,
            is_hot: formData.is_hot, is_selected: formData.is_selected, is_award: formData.is_award,
            tutorial_url: formData.tutorial_url
        };
    } else if (activeTab === 'articles') {
        payload = {
            title: formData.title, description: formData.description, category: formData.category,
            difficulty: formData.difficulty, duration: formData.duration, image_url: formData.image_url,
            is_vip: formData.is_vip
        };
    } else if (activeTab === 'jobs') {
        payload = {
            title: formData.title, budget: formData.budget, company: formData.company,
            deadline: formData.deadline, status: formData.status, tags: formData.tag ? formData.tag.split(',') : []
        };
    } else if (activeTab === 'banners') {
        payload = {
            title: formData.title, image_url: formData.image_url, link_url: formData.link_url,
            tag: formData.tag, is_active: formData.is_active, sort_order: Number(formData.sort_order)
        };
    }

    let error;
    if (editMode && currentId) {
      const res = await supabase.from(activeTab).update(payload).eq('id', currentId);
      error = res.error;
    } else {
      const res = await supabase.from(activeTab).insert([{ ...payload, created_at: new Date().toISOString() }]);
      error = res.error;
    }

    if (!error) { 
        alert('✅ 保存成功！'); 
        setIsModalOpen(false); 
        fetchData(activeTab); 
    } else { 
        alert('❌ 保存失败: ' + error.message); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    const { error } = await supabase.from(activeTab).delete().eq('id', id);
    if (!error) { alert('已删除'); fetchData(activeTab); }
  };

  // Banner 上下架快捷操作
  const toggleBannerActive = async (item: any) => {
    await supabase.from('banners').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchData('banners');
  };

  const openEdit = (item: any) => {
    setFormData({ ...item }); 
    // 特殊处理 B 站链接回显
    if (activeTab === 'videos' && item.video_url && item.video_url.includes('bvid=')) {
        const match = item.video_url.match(/bvid=(BV\w+)/);
        if (match) setBilibiliLink(`https://www.bilibili.com/video/${match[1]}`);
    } else {
        setBilibiliLink('');
    }
    setCurrentId(item.id);
    setEditMode(true);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setFormData({ 
        title: '', author: '', category: activeTab === 'videos' ? '创意短片' : 'Sora', 
        prompt: '', tag: '', thumbnail_url: '', video_url: '', views: 0, 
        duration: '', storyboard_url: '', price: 10, is_vip: false,
        is_hot: false, is_selected: false, is_award: false, tutorial_url: '',
        description: '', image_url: '', difficulty: '入门',
        budget: '', company: '', deadline: '', status: 'open', applicants: 0,
        link_url: '', is_active: true, sort_order: 0
    });
    setBilibiliLink('');
    setEditMode(false);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex font-sans">
      
      {/* 侧边栏 */}
      <aside className="w-64 bg-[#111] border-r border-white/5 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-white/5">
            <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                AI.Tube 后台
            </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            {[
                { id: 'videos', label: '视频管理', icon: <Video size={18}/> },
                { id: 'articles', label: '学院文章', icon: <FileText size={18}/> },
                { id: 'jobs', label: '合作需求', icon: <Briefcase size={18}/> },
                { id: 'banners', label: 'Banner 配置', icon: <ImageIcon size={18}/> },
            ].map(item => (
                <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as any); setData([]); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === item.id 
                        ? 'bg-white text-black' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {item.icon} {item.label}
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-red-500 px-4 py-2 text-sm font-bold hover:bg-red-500/10 rounded-lg transition-colors">
                <LogOut size={16}/> 退出登录
            </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold capitalize">{activeTab === 'videos' ? '视频库' : activeTab === 'articles' ? '文章列表' : activeTab === 'jobs' ? '需求列表' : '首页轮播图'}</h2>
            <div className="flex gap-4 items-center">
                <span className="text-gray-500 text-sm">共 {data.length} 条数据</span>
                <button onClick={openNew} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                    <Plus size={18}/> 新增{activeTab === 'videos' ? '视频' : activeTab === 'articles' ? '文章' : activeTab === 'jobs' ? '需求' : 'Banner'}
                </button>
            </div>
        </div>

        {/* 📋 数据列表 */}
        {loading ? (
            <div className="text-center py-20 text-gray-500">加载中...</div>
        ) : (
            <div className="bg-[#151515] rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 font-bold">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">预览/标题</th>
                            <th className="p-4">信息</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map(item => (
                            <tr key={item.id} className={`hover:bg-white/5 transition-colors ${activeTab === 'banners' && !item.is_active ? 'opacity-50' : ''}`}>
                                <td className="p-4 font-mono text-xs text-gray-600">#{item.id}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {(item.thumbnail_url || item.image_url) && (
                                            <div className="w-16 h-10 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                                <img src={item.thumbnail_url || item.image_url} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-white line-clamp-1 max-w-xs flex items-center gap-2">
                                                {item.title || '无标题'}
                                                {activeTab === 'banners' && item.tag && <span className="text-[10px] border border-purple-500 text-purple-500 px-1 rounded">{item.tag}</span>}
                                            </div>
                                            {activeTab === 'videos' && <div className="text-xs text-gray-600">@{item.author}</div>}
                                            {activeTab === 'banners' && !item.is_active && <div className="text-xs text-red-500">已下架</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {activeTab === 'banners' ? (
                                            <div className="flex flex-col gap-1">
                                                <span>权重: {item.sort_order}</span>
                                                <span className="text-gray-600 truncate max-w-[150px]">{item.link_url}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {item.category && <span className="bg-white/10 px-2 py-0.5 rounded">{item.category}</span>}
                                                {activeTab === 'videos' && (
                                                    <>
                                                        <span>{item.views} views</span>
                                                        {item.storyboard_url && <span className="text-green-500 flex items-center gap-1"><Download size={10}/> 分镜</span>}
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    {/* Banner 专属上下架按钮 */}
                                    {activeTab === 'banners' && (
                                        <button onClick={() => toggleBannerActive(item)} className="text-gray-400 hover:text-white mr-3 p-2 hover:bg-white/10 rounded" title={item.is_active ? "下架" : "上架"}>
                                            {item.is_active ? <Eye size={16}/> : <EyeOff size={16}/>}
                                        </button>
                                    )}
                                    <button onClick={() => openEdit(item)} className="text-blue-400 hover:text-blue-300 mr-3 p-2 hover:bg-blue-500/10 rounded"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && <div className="text-center py-10 text-gray-600">暂无数据</div>}
            </div>
        )}

        {/* -----------------------------------------------------------
          📢 统一弹窗 (Modal)
        ----------------------------------------------------------- */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#151515] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
              <h2 className="text-xl font-bold mb-6">{editMode ? '编辑内容' : '发布新内容'}</h2>

              {/* 📺 视频表单专属：B站抓取 */}
              {activeTab === 'videos' && (
                <div className="bg-gray-900 p-4 rounded mb-6 flex gap-2">
                  <input className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm" placeholder="粘贴 B 站链接 (BV号)..." value={bilibiliLink} onChange={e => setBilibiliLink(e.target.value)} />
                  <button onClick={handleFetchInfo} className="bg-blue-600 px-4 rounded font-bold hover:bg-blue-500 text-sm">一键抓取</button>
                </div>
              )}

              <div className="space-y-4">
                {/* 1. 标题 (通用) */}
                <div><label className="text-xs text-gray-500 block mb-1">标题</label><input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>

                {/* 2. 视频特有字段 */}
                {activeTab === 'videos' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-gray-500 block mb-1">作者</label><input value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">分类</label>
                                <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white">
                                    <option>创意短片</option><option>动画短片</option><option>实验短片</option><option>音乐MV</option><option>Sora</option><option>Midjourney</option><option>Runway</option>
                                </select>
                            </div>
                        </div>
                        {/* 分镜上传 */}
                        <div className="bg-white/5 border border-white/10 p-4 rounded-lg space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Download size={12}/> 资源配置</h3>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">分镜链接 (支持上传)</label>
                                <div className="flex gap-2">
                                    <input value={formData.storyboard_url} onChange={e=>setFormData({...formData, storyboard_url: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm text-green-500" placeholder="http://..."/>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="bg-gray-700 hover:bg-gray-600 px-4 rounded text-xs font-bold flex items-center gap-2">
                                        {uploadingFile ? <Loader2 size={14} className="animate-spin"/> : <FileUp size={14} />} 上传
                                    </button>
                                    <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 bg-black border border-gray-700 rounded px-2">
                                    <DollarSign size={14} className="text-gray-500"/>
                                    <input type="number" value={formData.price} onChange={e=>setFormData({...formData, price: parseInt(e.target.value) || 0})} className="w-full bg-transparent p-2 outline-none"/>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input type="checkbox" id="isVip" checked={formData.is_vip} onChange={e => setFormData({ ...formData, is_vip: e.target.checked })} className="w-5 h-5 accent-yellow-500"/>
                                    <label htmlFor="isVip" className="text-sm font-bold text-yellow-500 cursor-pointer select-none flex items-center gap-1"><Crown size={14}/> 会员专享</label>
                                </div>
                            </div>
                        </div>
                        <div><label className="text-xs text-gray-500 block mb-1">提示词</label><textarea rows={3} value={formData.prompt} onChange={e=>setFormData({...formData, prompt: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-sm font-mono"></textarea></div>
                    </>
                )}

                {/* 3. 文章特有字段 */}
                {activeTab === 'articles' && (
                    <>
                         <div>
                            <label className="text-xs text-gray-500 block mb-1">封面图 URL (支持上传)</label>
                            <div className="flex gap-2">
                                <input value={formData.image_url} onChange={e=>setFormData({...formData, image_url: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm"/>
                                <button onClick={() => imageInputRef.current?.click()} disabled={uploadingFile} className="bg-gray-700 hover:bg-gray-600 px-4 rounded text-xs font-bold flex items-center gap-2">
                                    {uploadingFile ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14} />} 上传
                                </button>
                                <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                            </div>
                        </div>
                        <div><label className="text-xs text-gray-500 block mb-1">简介</label><textarea rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                    </>
                )}

                {/* 4. Banner 特有字段 */}
                {activeTab === 'banners' && (
                    <>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">图片 URL (支持上传)</label>
                            <div className="flex gap-2">
                                <input value={formData.image_url} onChange={e=>setFormData({...formData, image_url: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm"/>
                                <button onClick={() => imageInputRef.current?.click()} disabled={uploadingFile} className="bg-gray-700 hover:bg-gray-600 px-4 rounded text-xs font-bold flex items-center gap-2">
                                    {uploadingFile ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14} />} 上传
                                </button>
                                <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                            </div>
                        </div>
                        <div><label className="text-xs text-gray-500 block mb-1">跳转链接</label><input value={formData.link_url} onChange={e=>setFormData({...formData, link_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2" placeholder="/video/123 或 https://..."/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-gray-500 block mb-1">角标 (Tag)</label><input value={formData.tag} onChange={e=>setFormData({...formData, tag: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                            <div><label className="text-xs text-gray-500 block mb-1">排序权重</label><input type="number" value={formData.sort_order} onChange={e=>setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 cursor-pointer">
                            <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e=>setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 accent-green-500"/>
                            <label htmlFor="isActive" className="text-sm font-bold text-white select-none">✅ 启用展示</label>
                        </div>
                    </>
                )}
                
                {/* 5. 需求特有字段 */}
                {activeTab === 'jobs' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-gray-500 block mb-1">预算</label><input value={formData.budget} onChange={e=>setFormData({...formData, budget: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                        <div><label className="text-xs text-gray-500 block mb-1">公司</label><input value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                    </div>
                )}

                <button onClick={handleSubmit} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded font-bold mt-4">{editMode ? '保存修改' : '确认发布'}</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
