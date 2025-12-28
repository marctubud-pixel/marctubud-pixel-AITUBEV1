'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient'; 
import { 
    Video, Plus, Trash2, Edit, X, Search, CheckCircle, 
    Database, CloudDownload, Loader2, Play, Eye, Flame, AlertTriangle, 
    Filter, Clock, SortAsc, RefreshCcw, FileText, Image as ImageIcon, 
    PenTool, Download, Crown, DollarSign, FileUp, Star, Trophy, ThumbsUp
} from 'lucide-react';

export default function VideoTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState(''); // 🔍 本地搜索词

  // 🔄 初始化
  useEffect(() => {
    fetchVideos();
  }, []);

  async function fetchVideos() {
    setLoading(true);
    const { data: result } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (result) setData(result);
    setLoading(false);
  }

  // 🔍 本地过滤逻辑 (核心需求：搜索视频库)
  const filteredData = useMemo(() => {
      if (!localSearch) return data;
      return data.filter(item => 
          (item.title && item.title.toLowerCase().includes(localSearch.toLowerCase())) ||
          (item.author && item.author.toLowerCase().includes(localSearch.toLowerCase()))
      );
  }, [data, localSearch]);

  // ----------------------------------------------------------------
  // 🕷️ B站批量抓取逻辑 (保持 V8.0 完美体验)
  // ----------------------------------------------------------------
  const [isSpiderOpen, setIsSpiderOpen] = useState(false);
  const [spiderKeyword, setSpiderKeyword] = useState('');
  const [spiderResults, setSpiderResults] = useState<any[]>([]);
  const [spiderLoading, setSpiderLoading] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [spiderSortBy, setSpiderSortBy] = useState<'default' | 'views'>('default');
  const [minViews, setMinViews] = useState<number>(0);

  const handleSpiderSearch = async () => {
      if (!spiderKeyword.trim()) return;
      setSpiderLoading(true);
      setSpiderResults([]);
      setSelectedVideos(new Set());
      try {
          const res = await fetch(`/api/admin/bilibili-search?keyword=${encodeURIComponent(spiderKeyword)}`);
          const json = await res.json();
          if (json.success) setSpiderResults(json.data);
          else alert(json.error || '搜索失败');
      } catch (err) { alert('网络错误'); } 
      finally { setSpiderLoading(false); }
  };

  const processedSpiderResults = useMemo(() => {
      let results = [...spiderResults];
      const getNum = (v: any) => {
          if (typeof v === 'number') return v;
          if (!v) return 0;
          const str = String(v);
          const n = parseFloat(str.replace(/[^\d.]/g, ''));
          return str.includes('万') ? n * 10000 : n;
      };
      if (minViews > 0) results = results.filter(v => getNum(v.play) >= minViews);
      if (spiderSortBy === 'views') results.sort((a, b) => getNum(b.play) - getNum(a.play));
      return results;
  }, [spiderResults, spiderSortBy, minViews]);

  const toggleSelectVideo = (bvid: string) => {
      const newSet = new Set(selectedVideos);
      if (newSet.has(bvid)) newSet.delete(bvid);
      else newSet.add(bvid);
      setSelectedVideos(newSet);
  };

  const toggleSelectAll = () => {
      const newSet = new Set(selectedVideos);
      const allSelected = processedSpiderResults.every(v => v.bvid && newSet.has(v.bvid));
      if (allSelected) processedSpiderResults.forEach(v => v.bvid && newSet.delete(v.bvid));
      else processedSpiderResults.forEach(v => v.bvid && newSet.add(v.bvid));
      setSelectedVideos(newSet);
  };

  const handleBatchImport = async () => {
      if (selectedVideos.size === 0) return alert('请先选择视频');
      setImporting(true);
      
      const videosToImport = spiderResults.filter(v => v.bvid && selectedVideos.has(v.bvid));
      let successCount = 0;
      let failCount = 0;

      for (const v of videosToImport) {
          try {
              let cleanViews = 0;
              if (typeof v.play === 'number') cleanViews = v.play;
              else if (typeof v.play === 'string') {
                  const num = parseFloat(v.play.replace(/[^\d.]/g, ''));
                  cleanViews = v.play.includes('万') ? Math.floor(num * 10000) : Math.floor(num);
              }
              if (isNaN(cleanViews)) cleanViews = 0;

              const videoUrl = `https://www.bilibili.com/video/${v.bvid}`;
              const { data: exist } = await supabase.from('videos').select('id').eq('video_url', videoUrl).maybeSingle();
              
              if (!exist) {
                  const payload = {
                      title: v.title ? v.title.slice(0, 100) : '无标题',
                      author: v.author || '网络', 
                      description: v.description ? v.description.slice(0, 500) : '', 
                      video_url: videoUrl,
                      thumbnail_url: v.pic || '', 
                      duration: v.duration || '00:00', 
                      views: cleanViews, 
                      category: '创意短片',
                      created_at: new Date().toISOString(),
                      // 默认值
                      tag: v.tag || '',
                      price: 10,
                      is_vip: false,
                      is_hot: false,
                      is_selected: false,
                      is_award: false,
                      storyboard_url: '',
                      tutorial_url: '',
                      prompt: ''
                  };
                  const { error } = await supabase.from('videos').insert(payload);
                  if (!error) successCount++; else failCount++;
              }
          } catch (err) { failCount++; }
      }

      setImporting(false);
      setIsSpiderOpen(false);
      fetchVideos(); 
      alert(`🎉 导入完成！成功: ${successCount}，跳过/失败: ${failCount}`);
  };

  // ----------------------------------------------------------------
  // 📝 CRUD 与文件上传 (回归旧版全功能)
  // ----------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [bilibiliLink, setBilibiliLink] = useState('');
  
  // 📤 文件上传 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    title: '', author: '', category: '创意短片', prompt: '', tag: '', 
    thumbnail_url: '', video_url: '', views: 0, duration: '', 
    storyboard_url: '', price: 10, is_vip: false, tutorial_url: '',
    is_hot: false, is_selected: false, is_award: false
  });

  const openNew = () => {
    setFormData({ 
        title: '', author: '', category: '创意短片', prompt: '', tag: '', 
        thumbnail_url: '', video_url: '', views: 0, duration: '', 
        storyboard_url: '', price: 10, is_vip: false, tutorial_url: '',
        is_hot: false, is_selected: false, is_award: false 
    });
    setBilibiliLink('');
    setEditMode(false);
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setFormData(item);
    setCurrentId(item.id);
    
    // 自动回填 BV 链接
    if (item.video_url && item.video_url.includes('bilibili')) {
        setBilibiliLink(item.video_url);
    } else {
        setBilibiliLink('');
    }

    setEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await supabase.from('videos').delete().eq('id', id);
    fetchVideos();
  };

  const handleSubmit = async () => {
    if (!formData.title) return alert('标题不能为空');
    const payload = { 
        ...formData,
        views: Number(formData.views) || 0,
        price: Number(formData.price) || 0
    };
    
    if (editMode && currentId) {
      await supabase.from('videos').update(payload).eq('id', currentId);
    } else {
      await supabase.from('videos').insert([{ ...payload, created_at: new Date().toISOString() }]);
    }
    setIsModalOpen(false);
    fetchVideos();
  };

  // 🕷️ 单个抓取 (回归旧版逻辑)
  const handleSingleFetch = async () => {
      if (!bilibiliLink) return alert('链接为空');
      const match = bilibiliLink.match(/(BV\w+)/);
      if (!match) return alert('无效链接，请检查是否包含 BV 号');
      try {
          const res = await fetch(`/api/fetch-bilibili?bvid=${match[1]}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setFormData((prev: any) => ({ 
              ...prev, 
              title: data.title,
              author: data.author,
              thumbnail_url: data.thumbnail_url,
              video_url: data.video_url,
              views: data.views,
              duration: data.duration,
              // 如果已有 tag/prompt 不覆盖
              tag: prev.tag || data.tag,
              prompt: prev.prompt || '' 
          }));
          alert('✅ 数据回填成功');
      } catch (e: any) { alert(e.message); }
  };

  // 📂 文件上传逻辑 (Storyboards)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `sb-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    try {
        const { error } = await supabase.storage.from('storyboards').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('storyboards').getPublicUrl(fileName);
        setFormData((prev: any) => ({ ...prev, storyboard_url: data.publicUrl }));
        alert('✅ 文件上传成功！');
    } catch (error: any) { alert('上传失败: ' + error.message); } 
    finally { setUploadingFile(false); }
  };

  // 📊 状态小组件：渲染是否已填写
  const StatusBadge = ({ active, label, icon: Icon, colorClass }: any) => (
      <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${active ? `bg-${colorClass}-900/20 text-${colorClass}-400 border-${colorClass}-500/30` : 'bg-gray-800 text-gray-600 border-gray-700'}`}>
          <Icon size={10} />
          <span>{label}</span>
      </div>
  );

  return (
    <div>
        {/* 顶部栏：标题 + 搜索 + 按钮 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h2 className="text-3xl font-bold">视频库管理</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500 text-sm">共 {data.length} 个视频</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* 🔍 本地搜索框 */}
                <div className="relative group">
                    <input 
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="🔍 搜索本地库 (标题/作者)..." 
                        className="bg-[#151515] border border-gray-700 text-sm rounded-lg pl-9 pr-4 py-2 w-full md:w-64 focus:border-purple-500 outline-none transition-all"
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500"/>
                    {localSearch && <button onClick={() => setLocalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={12}/></button>}
                </div>

                <button onClick={() => setIsSpiderOpen(true)} className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-pink-900/20 text-sm whitespace-nowrap">
                    <Database size={16}/> B站进货
                </button>
                <button onClick={openNew} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm whitespace-nowrap">
                    <Plus size={16}/> 上传视频
                </button>
            </div>
        </div>

        {/* 列表 */}
        {loading ? <div className="text-center py-20 text-gray-500">加载中...</div> : (
            <div className="bg-[#151515] rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 font-bold">
                        <tr>
                            <th className="p-4">封面</th>
                            <th className="p-4">内容信息</th>
                            <th className="p-4">完善度 (Prompt/分镜/工具)</th>
                            <th className="p-4">属性</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredData.map(item => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 w-28">
                                    <div className="w-24 h-14 bg-gray-800 rounded-lg overflow-hidden relative border border-white/5">
                                        <img src={item.thumbnail_url} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                                        <div className="absolute bottom-0 right-0 bg-black/60 px-1 text-[9px] text-white rounded-tl">{item.duration}</div>
                                    </div>
                                </td>
                                <td className="p-4 max-w-xs">
                                    <div className="font-bold text-white line-clamp-1 mb-1 group-hover:text-purple-400 transition-colors" title={item.title}>{item.title}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>@{item.author}</span>
                                        <span className="w-px h-3 bg-gray-700"></span>
                                        <span className="flex items-center gap-1"><Eye size={10}/> {item.views}</span>
                                    </div>
                                    <div className="mt-1">
                                        <span className="bg-white/5 border border-white/10 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">{item.category}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {/* 🔥 核心需求：状态标注栏 */}
                                    <div className="flex flex-wrap gap-2">
                                        <StatusBadge active={!!item.prompt} label="Prompt" icon={FileText} colorClass="blue" />
                                        <StatusBadge active={!!item.storyboard_url} label="分镜" icon={ImageIcon} colorClass="green" />
                                        <StatusBadge active={!!item.tag} label="工具" icon={PenTool} colorClass="purple" />
                                        {item.tutorial_url && <StatusBadge active={true} label="教程" icon={Play} colorClass="orange" />}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1.5">
                                        {item.is_vip ? <span className="text-yellow-500 text-xs font-bold flex items-center gap-1"><Crown size={12}/> 会员 ({item.price}积分)</span> : <span className="text-gray-600 text-xs">免费资源</span>}
                                        <div className="flex gap-1">
                                            {item.is_hot && <span title="热门" className="bg-red-900/30 text-red-500 p-1 rounded"><Flame size={12}/></span>}
                                            {item.is_selected && <span title="精选" className="bg-yellow-900/30 text-yellow-500 p-1 rounded"><Star size={12}/></span>}
                                            {item.is_award && <span title="获奖" className="bg-purple-900/30 text-purple-500 p-1 rounded"><Trophy size={12}/></span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => openEdit(item)} className="text-blue-400 hover:text-blue-300 mr-3 p-2 bg-blue-500/10 rounded-lg transition-colors"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400 p-2 bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">没有找到相关视频</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* 🕷️ B站爬虫 Modal (V8.0 完美版) */}
        {isSpiderOpen && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#181818] border border-gray-700 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#202020] shrink-0">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-500"><Database size={24}/></div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Bilibili 批量内容库</h2>
                                <p className="text-xs text-gray-400">一键抓取，自动补全信息 (V8.0)</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSpiderOpen(false)} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col p-6 min-h-0">
                        <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
                            <div className="flex-1 flex gap-2">
                                <input value={spiderKeyword} onChange={(e) => setSpiderKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSpiderSearch()} className="flex-1 bg-black border border-gray-700 rounded-xl px-5 py-3 text-lg focus:border-pink-500 outline-none" placeholder="🔍 输入关键词 (例如: Sora教程)..." autoFocus />
                                <button onClick={handleSpiderSearch} disabled={spiderLoading} className="bg-pink-600 hover:bg-pink-500 text-white px-6 rounded-xl font-bold text-lg flex items-center gap-2 shadow-lg disabled:opacity-50 min-w-[120px] justify-center">{spiderLoading ? <Loader2 size={24} className="animate-spin"/> : <Search size={24}/>} 搜索</button>
                            </div>
                        </div>
                            
                        {spiderResults.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-[#202020] rounded-xl border border-white/5 shrink-0">
                                <span className="text-sm text-gray-400 flex items-center gap-1"><Filter size={14}/> 筛选:</span>
                                <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
                                    <button onClick={() => setSpiderSortBy('default')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${spiderSortBy === 'default' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>综合</button>
                                    <button onClick={() => setSpiderSortBy('views')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${spiderSortBy === 'views' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}><Flame size={12}/> 播放最多</button>
                                </div>
                                <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                                    <span className="text-xs text-gray-500">最低播放:</span>
                                    <select value={minViews} onChange={(e) => setMinViews(Number(e.target.value))} className="bg-black/50 border border-white/10 text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-pink-500">
                                        <option value={0}>全部</option><option value={10000}>1万+</option><option value={50000}>5万+</option><option value={100000}>10万+</option>
                                    </select>
                                </div>
                                <div className="flex-1"></div>
                                <button onClick={toggleSelectAll} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><CheckCircle size={12}/> 全选/反选当前</button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-10">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 content-start">
                                {processedSpiderResults.map((v, index) => (
                                    <div key={v.bvid || index} onClick={() => v.bvid && toggleSelectVideo(v.bvid)} className={`group relative bg-[#121212] rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 flex flex-col ${v.bvid && selectedVideos.has(v.bvid) ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-white/5 hover:border-white/30 hover:-translate-y-1 hover:shadow-xl'}`}>
                                        <div className="relative w-full pb-[56.25%] bg-gray-900 shrink-0">
                                            <img src={v.pic} className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer"/>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
                                            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-mono flex items-center gap-1 border border-white/10"><Clock size={10}/> {v.duration}</div>
                                            {v.bvid && selectedVideos.has(v.bvid) && (<div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in duration-200 z-10"><div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-2xl scale-110"><CheckCircle size={24} className="fill-white text-pink-500"/></div></div>)}
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col bg-[#121212]">
                                            <h3 className="text-xs font-bold text-gray-200 leading-relaxed mb-2 group-hover:text-pink-400 transition-colors line-clamp-2 min-h-[32px]" title={v.title}>{v.title}</h3>
                                            <div className="flex items-center justify-between text-[10px] text-gray-500 mt-auto pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-1.5 truncate max-w-[60%]"><div className="w-3.5 h-3.5 rounded-full bg-gray-800 flex items-center justify-center text-[8px] text-gray-400 border border-white/5">UP</div><span className="truncate hover:text-gray-300">{v.author}</span></div>
                                                <div className="flex items-center gap-1 text-gray-400 font-mono bg-white/5 px-1.5 py-0.5 rounded"><Eye size={10}/><span>{v.play}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {spiderResults.length === 0 && !spiderLoading && (<div className="h-64 flex flex-col items-center justify-center text-gray-600"><Search size={48} className="mb-4 opacity-20"/><p>请输入关键词开始搜索</p></div>)}
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/10 bg-[#202020] rounded-b-2xl flex justify-between items-center shrink-0">
                        <div className="text-sm text-gray-400">已选中 <span className="text-pink-500 font-bold text-lg mx-1">{selectedVideos.size}</span> 个视频</div>
                        <div className="flex gap-3">
                            <button onClick={() => setSelectedVideos(new Set())} className="px-4 py-2 text-gray-400 hover:text-white text-sm hover:bg-white/5 rounded-lg transition-colors">清空</button>
                            <button onClick={handleBatchImport} disabled={selectedVideos.size === 0 || importing} className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 hover:scale-105 transition-transform active:scale-95">{importing ? <Loader2 size={18} className="animate-spin"/> : <CloudDownload size={18}/>} 确认批量入库</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 📝 编辑/新增弹窗 (旧版功能全回归) */}
        {isModalOpen && (
             <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-[#151515] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
                    <h2 className="text-xl font-bold mb-6">{editMode ? '编辑视频' : '发布新视频'}</h2>
                    
                    {/* 单体抓取工具 */}
                    <div className="bg-gray-900 p-4 rounded mb-6 flex gap-2 border border-gray-800">
                        <input className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm" placeholder="粘贴 B 站链接 (更新数据用)..." value={bilibiliLink} onChange={e => setBilibiliLink(e.target.value)} />
                        <button onClick={handleSingleFetch} className="bg-blue-600 px-4 rounded font-bold hover:bg-blue-500 text-sm whitespace-nowrap">抓取 / 刷新</button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-gray-500 block mb-1">标题</label><input value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"/></div>
                            <div><label className="text-xs text-gray-500 block mb-1">作者</label><input value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"/></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-xs text-gray-500 block mb-1">分类</label><select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"><option>创意短片</option><option>动画短片</option><option>实验短片</option><option>音乐MV</option><option>写实短片</option><option>AI教程</option><option>创意广告</option></select></div>
                            <div><label className="text-xs text-gray-500 block mb-1">播放量</label><input type="number" value={formData.views} onChange={e=>setFormData({...formData, views: parseInt(e.target.value) || 0})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"/></div>
                            <div><label className="text-xs text-gray-500 block mb-1">时长</label><input placeholder="04:20" value={formData.duration} onChange={e=>setFormData({...formData, duration: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"/></div>
                        </div>

                        {/* 🔥 核心回归：资源配置区 */}
                        <div className="bg-white/5 border border-white/10 p-4 rounded-lg space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Download size={12}/> 资源配置 (分镜)</h3>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">下载链接 (支持上传)</label>
                                <div className="flex gap-2">
                                    <input placeholder="粘贴链接，或点击右侧上传..." value={formData.storyboard_url} onChange={e=>setFormData({...formData, storyboard_url: e.target.value})} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm text-green-500"/>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="bg-gray-700 hover:bg-gray-600 px-4 rounded text-xs font-bold flex items-center gap-2 whitespace-nowrap border border-gray-600">{uploadingFile ? <Loader2 size={14} className="animate-spin"/> : <FileUp size={14} />} 上传文件</button>
                                    <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">消耗积分</label>
                                    <div className="flex items-center gap-2 bg-black border border-gray-700 rounded px-2"><DollarSign size={14} className="text-gray-500"/><input type="number" value={formData.price} onChange={e=>setFormData({...formData, price: parseInt(e.target.value) || 0})} className="w-full bg-transparent p-2 outline-none text-white"/></div>
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <input type="checkbox" id="isVip" checked={formData.is_vip} onChange={e => setFormData({ ...formData, is_vip: e.target.checked })} className="w-5 h-5 accent-yellow-500"/>
                                    <label htmlFor="isVip" className="text-sm font-bold text-yellow-500 cursor-pointer select-none flex items-center gap-1"><Crown size={14}/> 会员专享</label>
                                </div>
                            </div>
                        </div>

                        <div><label className="text-xs text-gray-500 block mb-1">工具标签 (Tools)</label><input value={formData.tag} onChange={e=>setFormData({...formData, tag: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white" placeholder="例如: Midjourney, Runway..."/></div>
                        <div><label className="text-xs text-gray-500 block mb-1">教程链接</label><input placeholder="https://..." value={formData.tutorial_url} onChange={e=>setFormData({...formData, tutorial_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-white"/></div>
                        
                        <div><label className="text-xs text-gray-500 block mb-1">提示词 (Prompt)</label><textarea rows={4} value={formData.prompt} onChange={e=>setFormData({...formData, prompt: e.target.value})} className="w-full bg-black border border-gray-700 rounded p-2 text-sm font-mono text-gray-300" placeholder="粘贴提示词..."></textarea></div>
                        
                        {/* 属性勾选 */}
                        <div className="flex flex-wrap gap-4 bg-gray-900 p-3 rounded border border-gray-800">
                          <div className="flex items-center gap-2"><input type="checkbox" id="isHot" checked={formData.is_hot} onChange={e => setFormData({ ...formData, is_hot: e.target.checked })} className="w-5 h-5 accent-red-600"/><label htmlFor="isHot" className="text-sm font-bold text-white cursor-pointer select-none">🔥 近期热门</label></div>
                          <div className="flex items-center gap-2"><input type="checkbox" id="isSelected" checked={formData.is_selected} onChange={e => setFormData({ ...formData, is_selected: e.target.checked })} className="w-5 h-5 accent-yellow-500"/><label htmlFor="isSelected" className="text-sm font-bold text-yellow-500 cursor-pointer select-none">🏆 编辑精选</label></div>
                          <div className="flex items-center gap-2"><input type="checkbox" id="isAward" checked={formData.is_award} onChange={e => setFormData({ ...formData, is_award: e.target.checked })} className="w-5 h-5 accent-purple-500"/><label htmlFor="isAward" className="text-sm font-bold text-purple-500 cursor-pointer select-none">🥇 获奖作品</label></div>
                        </div>

                        <button onClick={handleSubmit} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-bold mt-4 text-white shadow-lg">{editMode ? '保存修改' : '确认发布'}</button>
                    </div>
                 </div>
             </div>
        )}
    </div>
  );
}