'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient'; 
import { 
    Video, FileText, Image as ImageIcon, Briefcase, Ticket, 
    LogOut, Plus, Trash2, Edit, X, Loader2, 
    CheckCircle, Search, Link as LinkIcon2, Sparkles, ClipboardPaste, 
    Images, Globe, RefreshCcw, Eye, EyeOff, Copy, Upload, Clock, User, CheckSquare
} from 'lucide-react';
// 👇 引入独立的视频管理组件
import VideoTab from './tabs/VideoTab'; 

// 汉化标题映射
const TAB_TITLES: Record<string, string> = {
    videos: '视频管理',
    articles: '学院文章',
    jobs: '合作需求',
    banners: 'Banner 配置',
    codes: 'VIP 兑换码'
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'videos' | 'articles' | 'banners' | 'jobs' | 'codes'>('videos');
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
        if (activeTab !== 'videos') {
            fetchData(activeTab);
        }
    }
  }, [activeTab, router]);

  const handleLogout = () => {
      localStorage.removeItem('admin_auth');
      router.push('/admin/login');
  };

  async function fetchData(table: string) {
    setLoading(true);
    let tableName = table;
    if (table === 'codes') tableName = 'redemption_codes';

    let query = supabase.from(tableName).select('*');
    
    if (table === 'banners') {
        query = query.order('sort_order', { ascending: true });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data: result } = await query;
    if (result) setData(result || []);
    setLoading(false);
  }

  // ----------------------------------------------------------------
  // 📝 2. 通用状态管理
  // ----------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // 列表搜索状态
  const [mainSearchQuery, setMainSearchQuery] = useState('');

  // 文章抓取状态
  const [articleFetchLink, setArticleFetchLink] = useState('');
  const [isFetchingArticle, setIsFetchingArticle] = useState(false);
  const [fetchProgress, setFetchProgress] = useState('');

  // AI 解析专用状态
  const [aiPasteContent, setAiPasteContent] = useState('');

  // 🔍 文章关联视频专用搜索
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [videoSearchResults, setVideoSearchResults] = useState<any[]>([]);
  const [isSearchingVideo, setIsSearchingVideo] = useState(false);
  
  // 文件上传 Refs
  const imageInputRef = useRef<HTMLInputElement>(null); 
  const batchInputRef = useRef<HTMLInputElement>(null); 
  const [uploadingFile, setUploadingFile] = useState(false);

  // 统一表单数据
  const [formData, setFormData] = useState<any>({
    // --- 文章字段 ---
    title: '', description: '', image_url: '', difficulty: '入门', content: '', link_url: '',
    tags: '', video_id: '', category: '新手入门', 
    // 新增/找回的字段
    author: '', reading_time: '', is_authorized: false,
    
    // --- 需求字段 ---
    budget: '', company: '', deadline: '', status: 'open',
    
    // --- Banner字段 ---
    is_active: true, sort_order: 0, tag: '',

    // --- 卡密字段 ---
    batch_count: 10, duration_days: 30, prefix: 'VIP'
  });

  // ⏳ 自动估算阅读时间
  useEffect(() => {
    // 只有在文章Tab且没有关联视频时，才根据字数估算
    if (activeTab === 'articles' && !formData.video_id && formData.content) {
        const wordCount = formData.content.length;
        const estimatedMinutes = Math.ceil(wordCount / 500); // 假设阅读速度 500字/分钟
        // 避免覆盖用户手动输入（仅当当前为空或看起来是自动生成的才覆盖，这里简化为自动更新）
        // 如果你想让用户手动改了就不动，可以加个判断。这里为了方便，只要改内容就更新。
        setFormData((prev: any) => ({ ...prev, reading_time: `${estimatedMinutes} 分钟` }));
    }
  }, [formData.content, activeTab, formData.video_id]);

  // 🔎 智能解析函数
  const handleSmartParse = () => {
    if (!aiPasteContent.trim()) return alert('请先粘贴 AI 生成的内容');
    try {
      const jsonMatch = aiPasteContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        setFormData((prev: any) => ({ ...prev, ...parsedData }));
        setAiPasteContent('');
        alert('✨ AI 数据已成功解析！');
      } else {
        throw new Error('未找到有效的 JSON');
      }
    } catch (err) { alert('解析失败'); }
  };

  // 🔎 搜索视频库 (用于文章关联视频)
  const searchVideos = async () => {
      if (!videoSearchQuery.trim()) return;
      setIsSearchingVideo(true);
      // 🔥 修改：查询时带上 author 字段
      const { data } = await supabase
          .from('videos')
          .select('id, title, duration, thumbnail_url, author') 
          .ilike('title', `%${videoSearchQuery}%`)
          .limit(5); 
      setVideoSearchResults(data || []);
      setIsSearchingVideo(false);
  };

  // ✅ 选中关联视频 (自动提取信息核心逻辑)
  const selectVideo = (video: any) => {
      // 格式化时间函数
      const formatDuration = (seconds: number) => {
          if (!seconds) return '5 分钟';
          const min = Math.floor(seconds / 60);
          const sec = seconds % 60;
          return `${min}分${sec}秒`;
      };

      setFormData((prev: any) => ({
          ...prev,
          video_id: video.id,
          image_url: video.thumbnail_url || prev.image_url, // 优先用视频封面
          title: prev.title || video.title, // 如果标题为空，自动填入视频标题
          author: prev.author || video.author || 'AI.Tube', // 自动提取作者
          reading_time: formatDuration(video.duration) // 根据时长自动填写阅读时间
      }));
      setVideoSearchResults([]); 
      setVideoSearchQuery('');   
  };

  const removeLinkedVideo = () => {
      setFormData((prev: any) => ({ ...prev, video_id: '' }));
      // 取消关联后，阅读时间可以清空或重置为字数估算，这里暂时不清空，留给useEffect处理或用户修改
  };

  // 🌐 全网文章一键抓取
  const handleFetchArticle = async () => {
    if (!articleFetchLink) return alert('请填入文章链接');
    setIsFetchingArticle(true);
    setFetchProgress('正在初始化...');
    
    try {
      let htmlText = '';
      const targetUrl = articleFetchLink;

      try {
          const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
          if (res.ok) htmlText = await res.text();
      } catch (e) { console.log('线路1失败'); }

      if (!htmlText || htmlText.length < 500) {
          try {
              const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}&disableCache=true`);
              if (res.ok) htmlText = await res.text();
          } catch (e) { console.log('线路2失败'); }
      }

      if (!htmlText) throw new Error('抓取失败');

      setFetchProgress('解析内容中...');
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      let title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title || '未命名文章';
      let contentDiv = doc.querySelector('#js_content') || doc.querySelector('article') || doc.body;
      let markdown = contentDiv.innerHTML
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, '\n\n![]($1)\n\n')
          .replace(/<[^>]+>/g, '')
          .trim();

      setFormData((prev: any) => ({ ...prev, title, content: markdown, link_url: articleFetchLink }));
      alert(`✅ 抓取成功！`);
    } catch (err: any) {
      alert('抓取失败: ' + err.message);
    } finally {
      setIsFetchingArticle(false);
      setFetchProgress('');
    }
  };

  // 🖼️ 图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    const file = e.target.files[0];
    const fileName = `img-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const bucketName = activeTab === 'articles' ? 'articles' : 'banners';

    try {
        const { error } = await supabase.storage.from(bucketName).upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        setFormData((prev: any) => ({ ...prev, image_url: data.publicUrl }));
        alert('✅ 上传成功！');
    } catch (error: any) { alert('上传失败: ' + error.message); } 
    finally { setUploadingFile(false); }
  };

  // 📸 批量图片上传
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    const files = Array.from(e.target.files);
    let newContent = formData.content || '';
    
    for (const file of files) {
        const fileName = `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { error } = await supabase.storage.from('articles').upload(fileName, file);
        if (!error) {
            const { data } = supabase.storage.from('articles').getPublicUrl(fileName);
            const placeholderRegex = /\[(img|image|pic|photo|图片|图)(\d+)?\]/i;
            if (placeholderRegex.test(newContent)) {
                newContent = newContent.replace(placeholderRegex, `![](${data.publicUrl})`);
            } else {
                newContent += `\n\n![](${data.publicUrl})`;
            }
        }
    }
    setFormData((prev: any) => ({ ...prev, content: newContent }));
    setUploadingFile(false);
    alert('📸 批量配图完成！');
  };

  // 💾 提交保存
  const handleSubmit = async () => {
    // 1. 卡密逻辑
    if (activeTab === 'codes' && !editMode) {
        const count = parseInt(formData.batch_count) || 1;
        const days = parseInt(formData.duration_days) || 30;
        const prefix = formData.prefix || 'VIP';
        const newCodes = [];
        for (let i = 0; i < count; i++) {
            const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase(); 
            const timestamp = Date.now().toString().slice(-4); 
            newCodes.push({ code: `${prefix}-${timestamp}-${randomStr}`, duration_days: days, is_used: false });
        }
        const { error } = await supabase.from('redemption_codes').insert(newCodes);
        if (!error) { alert(`✅ 成功生成 ${count} 个兑换码！`); setIsModalOpen(false); fetchData('codes'); } 
        return;
    }

    if (!formData.title && activeTab !== 'codes') return alert('标题不能为空');

    let payload: any = {};
    let tableName: string = activeTab;
    if (activeTab === 'codes') tableName = 'redemption_codes';

    if (activeTab === 'articles') {
        payload = {
            title: formData.title, description: formData.description, 
            category: formData.category, difficulty: formData.difficulty, 
            image_url: formData.image_url, content: formData.content, 
            link_url: formData.link_url,
            tags: formData.tags ? formData.tags.toString().split(/[,，]/).map((t: string) => t.trim()) : [], 
            video_id: formData.video_id ? Number(formData.video_id) : null,
            // 新增字段
            author: formData.author,
            reading_time: formData.reading_time,
            is_authorized: formData.is_authorized
        };
    } else if (activeTab === 'jobs') {
        payload = {
            title: formData.title, budget: formData.budget, company: formData.company,
            deadline: formData.deadline, status: formData.status
        };
    } else if (activeTab === 'banners') {
        payload = {
            title: formData.title, image_url: formData.image_url, link_url: formData.link_url,
            tag: formData.tag, is_active: formData.is_active, sort_order: Number(formData.sort_order)
        };
    }

    let error;
    if (editMode && currentId) {
      const res = await supabase.from(tableName).update(payload).eq('id', currentId);
      error = res.error;
    } else {
      const res = await supabase.from(tableName).insert([{ ...payload, created_at: new Date().toISOString() }]);
      error = res.error;
    }

    if (!error) { alert('✅ 保存成功！'); setIsModalOpen(false); fetchData(activeTab); } 
    else { alert('❌ 保存失败: ' + error.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    const tableName = activeTab === 'codes' ? 'redemption_codes' : activeTab;
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (!error) { alert('已删除'); fetchData(activeTab); }
  };

  const toggleBannerActive = async (item: any) => {
    await supabase.from('banners').update({ is_active: !item.is_active }).eq('id', item.id);
    fetchData('banners');
  };

  const openEdit = (item: any) => {
    let processedItem = { ...item };
    if (activeTab === 'articles' && Array.isArray(item.tags)) {
        processedItem.tags = item.tags.join(', ');
    }
    // 确保打开编辑时，新增字段有默认值
    if (activeTab === 'articles') {
        processedItem.author = processedItem.author || '';
        processedItem.reading_time = processedItem.reading_time || '';
        processedItem.is_authorized = processedItem.is_authorized || false;
    }

    setFormData(processedItem); 
    setVideoSearchQuery('');
    setVideoSearchResults([]);
    setCurrentId(item.id);
    setEditMode(true);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setFormData({ 
        title: '', description: '', image_url: '', difficulty: '入门', content: '', link_url: '',
        tags: '', video_id: '', category: '新手入门', 
        author: '', reading_time: '', is_authorized: false, // 初始化
        budget: '', company: '', deadline: '', status: 'open',
        is_active: true, sort_order: 0, tag: '',
        batch_count: 10, duration_days: 30, prefix: 'VIP'
    });
    setVideoSearchQuery('');
    setVideoSearchResults([]);
    setEditMode(false);
    setIsModalOpen(true);
  };

  const copyUnusedCodes = () => {
      const unused = data.filter(i => !i.is_used).map(i => i.code).join('\n');
      if (!unused) return alert('没有可复制的卡密');
      navigator.clipboard.writeText(unused);
      alert(`已复制 ${unused.split('\n').length} 个未使用卡密到剪贴板！`);
  };

  // 🔥 列表数据过滤 (搜索功能)
  const filteredData = data.filter(item => {
      if (!mainSearchQuery) return true;
      const lowerQ = mainSearchQuery.toLowerCase();
      // 根据不同 Tab 搜索不同字段
      if (activeTab === 'articles') {
          return item.title?.toLowerCase().includes(lowerQ) || item.author?.toLowerCase().includes(lowerQ);
      }
      return item.title?.toLowerCase().includes(lowerQ);
  });

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
            {[{ id: 'videos', label: '视频管理', icon: <Video size={18}/> }, { id: 'articles', label: '学院文章', icon: <FileText size={18}/> }, { id: 'jobs', label: '合作需求', icon: <Briefcase size={18}/> }, { id: 'banners', label: 'Banner 配置', icon: <ImageIcon size={18}/> }, { id: 'codes', label: '卡密管理', icon: <Ticket size={18}/> }].map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id as any); setData([]); setMainSearchQuery(''); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    {item.icon} {item.label}
                </button>
            ))}
        </nav>
        <div className="p-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-red-500 px-4 py-2 text-sm font-bold hover:bg-red-500/10 rounded-lg transition-colors"><LogOut size={16}/> 退出登录</button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-8 overflow-y-auto h-screen relative">
        
        {/* 🔥 核心分流：视频 Tab 独立渲染 */}
        {activeTab === 'videos' ? (
            <VideoTab />
        ) : (
            /* ⚠️ 其他 Tab 的常规渲染逻辑 */
            <>
                <div className="flex justify-between items-center mb-8">
                    {/* 🔥 标题汉化 + 数量显示 */}
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold">{TAB_TITLES[activeTab] || activeTab}</h2>
                        <span className="text-gray-500 text-lg font-mono bg-white/5 px-3 py-1 rounded-lg">
                            共 {filteredData.length} 条
                        </span>
                    </div>

                    <div className="flex gap-4 items-center">
                        {/* 🔍 列表搜索框 */}
                        {activeTab !== 'codes' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input 
                                    type="text" 
                                    placeholder={activeTab === 'articles' ? "搜索标题或作者..." : "搜索..."}
                                    value={mainSearchQuery}
                                    onChange={(e) => setMainSearchQuery(e.target.value)}
                                    className="bg-[#151515] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-purple-500 w-64"
                                />
                            </div>
                        )}

                        {activeTab === 'codes' && <button onClick={copyUnusedCodes} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm border border-white/10"><Copy size={16}/> 复制未使用</button>}
                        <button onClick={openNew} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"><Plus size={18}/> 新增内容</button>
                    </div>
                </div>

                {loading ? <div className="text-center py-20 text-gray-500">加载中...</div> : (
                    <div className="bg-[#151515] rounded-2xl border border-white/10 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-white/5 text-gray-200 font-bold">
                                <tr>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">{activeTab === 'codes' ? '兑换码' : '预览/标题'}</th>
                                    {/* 🔥 文章列表增加作者列 */}
                                    {activeTab === 'articles' && <th className="p-4">作者/授权</th>}
                                    <th className="p-4">信息</th>
                                    <th className="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredData.map(item => (
                                    <tr key={item.id} className={`hover:bg-white/5 transition-colors ${activeTab === 'banners' && !item.is_active ? 'opacity-50' : ''}`}>
                                        <td className="p-4 font-mono text-xs text-gray-600">#{item.id}</td>
                                        <td className="p-4">
                                            {activeTab === 'codes' ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="font-mono text-lg text-white tracking-wider">{item.code}</div>
                                                    {item.is_used ? <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">已使用</span> : <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10}/> 待兑换</span>}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    {item.image_url && <div className="w-16 h-10 bg-gray-800 rounded overflow-hidden flex-shrink-0"><img src={item.image_url} className="w-full h-full object-cover"/></div>}
                                                    <div className="font-bold text-white line-clamp-1">{item.title || '无标题'}</div>
                                                </div>
                                            )}
                                        </td>
                                        
                                        {/* 🔥 文章Tab的作者显示 */}
                                        {activeTab === 'articles' && (
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-white text-xs font-bold">{item.author || '-'}</span>
                                                    {item.is_authorized && <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded w-fit border border-blue-500/30">已授权</span>}
                                                </div>
                                            </td>
                                        )}

                                        <td className="p-4">
                                            {/* 简化显示不同Tab的信息 */}
                                            {activeTab === 'codes' ? (
                                                <div className="text-xs text-gray-500">时长: <span className="text-white">{item.duration_days}天</span></div>
                                            ) : activeTab === 'articles' ? (
                                                <div className="text-xs text-gray-500">
                                                    <span className="block text-gray-400">{item.category}</span>
                                                    {item.reading_time && <span className="block text-gray-600 mt-1">{item.reading_time}</span>}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-500">{item.tag}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {activeTab === 'banners' && <button onClick={() => toggleBannerActive(item)} className="text-gray-400 hover:text-white mr-3 p-2">{item.is_active ? <Eye size={16}/> : <EyeOff size={16}/>}</button>}
                                            {activeTab !== 'codes' && <button onClick={() => openEdit(item)} className="text-blue-400 hover:text-blue-300 mr-3 p-2"><Edit size={16}/></button>}
                                            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 统一弹窗 (Modal) */}
                {isModalOpen && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#151515] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
                      <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
                      <h2 className="text-xl font-bold mb-6">{editMode ? '编辑内容' : (activeTab === 'codes' ? '批量生成卡密' : '发布新内容')}</h2>

                      {activeTab === 'codes' ? (
                          <div className="space-y-6">
                              <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg">
                                  <div className="grid grid-cols-2 gap-4">
                                      <div><label className="text-xs text-gray-500 block mb-1">数量</label><input type="number" value={formData.batch_count} onChange={e=>setFormData({...formData, batch_count: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white font-mono text-lg"/></div>
                                      <div><label className="text-xs text-gray-500 block mb-1">天数</label><select value={formData.duration_days} onChange={e=>setFormData({...formData, duration_days: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"><option value="7">7天</option><option value="30">30天</option><option value="365">365天</option></select></div>
                                  </div>
                                  <div className="mt-4"><label className="text-xs text-gray-500 block mb-1">前缀</label><input type="text" value={formData.prefix} onChange={e=>setFormData({...formData, prefix: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white font-mono"/></div>
                              </div>
                              <button onClick={handleSubmit} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2"><Ticket size={24}/> 生成</button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                            {/* 文章专用：全网抓取 + AI解析 */}
                            {activeTab === 'articles' && (
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-green-900/20 to-teal-900/20 border border-green-500/30 p-4 rounded-xl flex gap-2 items-center">
                                        <Globe size={18} className="text-green-400 flex-shrink-0"/>
                                        <input className="flex-1 bg-black/50 border border-green-500/30 rounded px-3 py-2 text-sm text-green-100" placeholder="粘贴公众号链接..." value={articleFetchLink} onChange={e => setArticleFetchLink(e.target.value)} />
                                        <button onClick={handleFetchArticle} disabled={isFetchingArticle} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2">{isFetchingArticle ? <Loader2 size={14} className="animate-spin"/> : <RefreshCcw size={14}/>} {isFetchingArticle ? fetchProgress : '智能转存'}</button>
                                    </div>

                                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-4 rounded-xl space-y-3">
                                        <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2"><Sparkles size={16} /> AI 智能助手</h3>
                                        <textarea rows={3} className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-xs text-blue-100 placeholder-gray-600 font-mono" placeholder="粘贴 AI 生成的 JSON..." value={aiPasteContent} onChange={(e) => setAiPasteContent(e.target.value)} />
                                        <button onClick={handleSmartParse} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2"><ClipboardPaste size={14} /> 一键解析</button>
                                    </div>
                                    
                                    <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2"><Images size={16} className="text-blue-400"/> 批量配图</h3>
                                        <button onClick={() => batchInputRef.current?.click()} disabled={uploadingFile} className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"><Upload size={14}/> 批量上传</button>
                                        <input type="file" ref={batchInputRef} multiple accept="image/*" hidden onChange={handleBatchUpload} />
                                    </div>
                                </div>
                            )}

                            {/* 关联视频 (文章Tab专用) */}
                            {activeTab === 'articles' && (
                                <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl space-y-4 mb-4 mt-4">
                                    <h3 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2"><LinkIcon2 size={14}/> 关联视频 (自动同步信息)</h3>
                                    {formData.video_id ? (
                                        <div className="flex items-center justify-between bg-black/50 p-3 rounded-lg border border-purple-500/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-8 bg-gray-800 rounded overflow-hidden">
                                                    {formData.image_url && <img src={formData.image_url} className="w-full h-full object-cover"/>}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    <span className="text-white block">ID: {formData.video_id}</span>
                                                    <span>(已自动提取标题、作者与时长)</span>
                                                </div>
                                            </div>
                                            <button onClick={removeLinkedVideo} className="text-red-500 text-xs font-bold">取消</button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input value={videoSearchQuery} onChange={e => setVideoSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchVideos()} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm" placeholder="搜索视频库..."/>
                                                <button onClick={searchVideos} className="bg-gray-800 px-4 rounded text-gray-300"><Search size={16}/></button>
                                            </div>
                                            {videoSearchResults.length > 0 && (
                                                <div className="absolute top-full left-0 w-full bg-[#181818] border border-gray-700 rounded-lg mt-2 shadow-2xl z-50 max-h-48 overflow-y-auto">
                                                    {videoSearchResults.map(v => (
                                                        <div key={v.id} onClick={() => selectVideo(v)} className="flex items-center gap-3 p-3 hover:bg-purple-900/20 cursor-pointer border-b border-white/5">
                                                            <div className="w-10 h-6 bg-gray-800 rounded overflow-hidden flex-shrink-0"><img src={v.thumbnail_url} className="w-full h-full object-cover"/></div>
                                                            <div className="flex-1 min-w-0 text-sm text-white line-clamp-1">{v.title}</div>
                                                            <div className="text-xs text-gray-500">{v.author}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 通用字段 - 标题 */}
                            <div><label className="text-xs text-gray-500 block mb-1">标题</label><input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 font-bold text-white"/></div>

                            {activeTab === 'articles' && (
                                <>
                                    {/* 🔥 新增：作者与授权 & 阅读时间 */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1"><User size={12}/> 作者名称</label>
                                            <input value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white" placeholder="如: AI.Tube 官方"/>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1"><Clock size={12}/> 阅读时间</label>
                                            <input value={formData.reading_time} onChange={e=>setFormData({...formData, reading_time: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white" placeholder="自动计算或手动输入..."/>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 py-2">
                                        <input type="checkbox" id="auth_check" checked={formData.is_authorized} onChange={e => setFormData({...formData, is_authorized: e.target.checked})} className="w-4 h-4 accent-blue-500" />
                                        <label htmlFor="auth_check" className="text-sm text-gray-300 flex items-center gap-1"><CheckSquare size={14}/> 标注为已获得授权内容</label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs text-gray-500 block mb-1">分类</label><select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"><option>新手入门</option><option>工具学习</option><option>干货分享</option></select></div>
                                        <div><label className="text-xs text-gray-500 block mb-1">难度</label><select value={formData.difficulty} onChange={e=>setFormData({...formData, difficulty: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"><option>入门</option><option>中等</option><option>进阶</option></select></div>
                                    </div>
                                    <div><label className="text-xs text-gray-500 block mb-1">封面URL</label><div className="flex gap-2"><input value={formData.image_url} onChange={e=>setFormData({...formData, image_url: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm"/><button onClick={() => imageInputRef.current?.click()} className="bg-gray-700 px-3 rounded"><ImageIcon size={14}/></button><input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} /></div></div>
                                    <div><label className="text-xs text-gray-500 block mb-1">内容 (Markdown)</label><textarea rows={8} value={formData.content} onChange={e=>setFormData({...formData, content: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-sm font-mono"></textarea></div>
                                </>
                            )}

                            {activeTab === 'banners' && (
                                <>
                                    <div><label className="text-xs text-gray-500 block mb-1">图片URL</label><div className="flex gap-2"><input value={formData.image_url} onChange={e=>setFormData({...formData, image_url: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm"/><button onClick={() => imageInputRef.current?.click()} className="bg-gray-700 px-3 rounded"><ImageIcon size={14}/></button><input type="file" ref={imageInputRef} hidden accept="image/*" onChange={handleImageUpload} /></div></div>
                                    <div><label className="text-xs text-gray-500 block mb-1">链接</label><input value={formData.link_url} onChange={e=>setFormData({...formData, link_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div>
                                    <div className="flex items-center gap-2 pt-2"><input type="checkbox" checked={formData.is_active} onChange={e=>setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 accent-green-500"/><label className="text-sm font-bold text-white">启用</label></div>
                                </>
                            )}
                            
                            {activeTab === 'jobs' && (
                                <div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-gray-500 block mb-1">预算</label><input value={formData.budget} onChange={e=>setFormData({...formData, budget: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div><div><label className="text-xs text-gray-500 block mb-1">公司</label><input value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2"/></div></div>
                            )}

                            <button onClick={handleSubmit} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded font-bold mt-4">{editMode ? '保存修改' : '确认发布'}</button>
                          </div>
                      )}
                    </div>
                  </div>
                )}
            </>
        )}
      </main>
    </div>
  );
}