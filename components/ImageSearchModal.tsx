'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Image as ImageIcon, Loader2, Check, Globe, Languages, Lock, LayoutTemplate, Clapperboard, Camera, Maximize2, ChevronDown } from 'lucide-react';
import { translateToEnglish } from '@/app/actions/translate';
import { toast } from 'sonner';

// 🟢 1. 引入真实的模版配置文件
import { COMPOSITION_TEMPLATES } from '@/app/tools/storyboard/constants/compositionTemplates';

// --- 类型定义 ---
interface ImageItem {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  source: 'unsplash' | 'template' | 'movie';
  isPremium?: boolean;
  dimensions?: string; 
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  initialQuery?: string;
}

type TabType = 'atmosphere' | 'composition' | 'cinematic';

// ❌ 删除这里原本写死的 const COMPOSITION_TEMPLATES = [...] 数组
// 我们直接用 import 进来的那个

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialQuery = ''
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('atmosphere');
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  const performSearch = useCallback(async (searchTerm: string, tab: TabType, pageNum: number = 1) => {
    if (!searchTerm.trim() && tab !== 'composition') return;
    
    setLoading(true);
    if (pageNum === 1) setImages([]); 

    try {
        if (tab === 'atmosphere') {
            // 1. 氛围参考
            const res = await fetch(`/api/external/unsplash?query=${encodeURIComponent(searchTerm)}&page=${pageNum}`);
            const data = await res.json();
            if (data.results) {
                const newImages = data.results.map((img: any) => ({
                    id: img.id,
                    url: img.urls.regular,
                    thumbnail: img.urls.small,
                    title: `Photo by ${img.user.name}`,
                    source: 'unsplash'
                }));
                setImages(prev => pageNum === 1 ? newImages : [...prev, ...newImages]);
                setHasMore(newImages.length > 0);
            }
        } 
        else if (tab === 'composition') {
            // 🟢 2. 构图参考 (连接真实数据)
            if (pageNum === 1) {
                // 模拟一点延迟让体验更流畅
                await new Promise(r => setTimeout(r, 100)); 
                
                // 数据映射：把 CompositionTemplate 转换为 ImageItem 格式
                const templateImages: ImageItem[] = COMPOSITION_TEMPLATES.map(t => ({
                    id: t.id,
                    // 核心逻辑：url 传 controlUrl (骨架图)，thumbnail 传 previewUrl (示意图)
                    url: t.controlUrl, 
                    thumbnail: t.previewUrl,
                    title: t.name,
                    source: 'template'
                }));
                
                setImages(templateImages);
            }
            setHasMore(false); 
        } 
        else if (tab === 'cinematic') {
            // 3. 电影剧照
            let finalQuery = searchTerm;
            if (pageNum === 1 && /[\u4e00-\u9fa5]/.test(searchTerm)) {
                setIsTranslating(true);
                toast.loading("正在匹配电影数据库...", { id: 'translating' });
                try {
                    const en = await translateToEnglish(searchTerm);
                    if (en && en !== searchTerm) {
                        finalQuery = en;
                        setQuery(en); 
                        toast.success(`已匹配片名: ${en}`, { id: 'translating' });
                    } else {
                        toast.dismiss('translating');
                    }
                } catch (e) {
                    console.error(e);
                    toast.dismiss('translating');
                } finally {
                    setIsTranslating(false);
                }
            }

            const res = await fetch(`/api/external/google?query=${encodeURIComponent(finalQuery)}&page=${pageNum}`);
            const data = await res.json();
            
            if (data.results) {
                const newImages = data.results.map((img: any) => ({
                    id: img.id,
                    url: img.url,
                    thumbnail: img.thumbnail,
                    title: img.title || 'Cinematic Still',
                    source: 'movie',
                    isPremium: true,
                    dimensions: img.width && img.height ? `${img.width}x${img.height}` : undefined
                }));
                setImages(prev => pageNum === 1 ? newImages : [...prev, ...newImages]);
                setHasMore(newImages.length > 0);
            } else {
                 if(pageNum === 1) toast.error("未找到相关剧照");
                 setHasMore(false);
            }
        }
    } catch (err) {
        console.error('Search failed:', err);
        if (pageNum === 1) toast.error('加载失败，请稍后重试');
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
      setPage(1);
      setHasMore(true);
      if (activeTab === 'composition') {
          performSearch('', 'composition', 1);
      } else if (query) {
          performSearch(query, activeTab, 1);
      }
  }, [activeTab]); 

  useEffect(() => {
    if (isOpen && initialQuery) {
        setQuery(initialQuery);
        setPage(1);
        performSearch(initialQuery, 'atmosphere', 1);
    }
  }, [isOpen, initialQuery]);

  const handleLoadMore = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      performSearch(query, activeTab, nextPage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      performSearch(query, activeTab, 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[90vh] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5 relative">
        
        {/* Header */}
        <div className="bg-[#181818] border-b border-white/5 shrink-0">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
                        <Clapperboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg tracking-tight">导演参考库</h3>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Director Reference</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex px-4 gap-6">
                <button 
                    onClick={() => setActiveTab('atmosphere')}
                    className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'atmosphere' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <div className="flex items-center gap-2"><Camera size={16}/> 氛围参考</div>
                    {activeTab === 'atmosphere' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-t-full" />}
                </button>

                <button 
                    onClick={() => setActiveTab('composition')}
                    className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'composition' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <div className="flex items-center gap-2"><LayoutTemplate size={16}/> 构图骨架</div>
                    {activeTab === 'composition' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] rounded-t-full" />}
                </button>

                <button 
                    onClick={() => setActiveTab('cinematic')}
                    className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'cinematic' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <ImageIcon size={16}/> 电影剧照
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded ml-1">PRO</span>
                    </div>
                    {activeTab === 'cinematic' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] rounded-t-full" />}
                </button>
            </div>
        </div>

        {/* Search Bar */}
        {activeTab !== 'composition' && (
            <div className="p-4 border-b border-white/5 bg-[#121212] shrink-0">
            <div className="relative group max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeTab === 'cinematic' ? "输入电影中文名 (如: 变形金刚)..." : "搜索..."}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-24 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
                autoFocus
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isTranslating && <span className="text-[10px] text-zinc-500 flex items-center gap-1 mr-2 animate-pulse"><Languages size={10}/> 匹配中...</span>}
                    <button onClick={() => { setPage(1); performSearch(query, activeTab, 1); }} className="px-4 py-2 bg-zinc-800 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors">搜索</button>
                </div>
            </div>
            </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar bg-[#0a0a0a]">
          {loading && page === 1 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <div key={i} className="aspect-video bg-zinc-900 rounded-xl animate-pulse ring-1 ring-white/5" />)}
            </div>
          ) : images.length > 0 ? (
            <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map((img, index) => (
                    <div 
                    key={`${img.id}-${index}`}
                    className="group relative aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-white/5 cursor-pointer hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
                    onClick={() => setPreviewImage(img)}
                    >
                    <img 
                        src={img.thumbnail} 
                        alt={img.title}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${activeTab === 'composition' ? 'grayscale opacity-70 group-hover:opacity-100 group-hover:grayscale-0' : ''}`}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <Maximize2 className="text-white w-8 h-8 drop-shadow-lg" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-[10px] text-zinc-300 font-medium truncate pr-2 max-w-[70%]">{img.title}</span>
                        {img.isPremium && <Lock size={10} className="text-yellow-500 mb-0.5"/>}
                    </div>
                    </div>
                ))}
                </div>
                {hasMore && activeTab !== 'composition' && (
                    <div className="py-8 flex justify-center w-full">
                        <button onClick={handleLoadMore} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300 font-medium transition-all disabled:opacity-50 hover:scale-105 active:scale-95">
                            {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                            {loading ? '加载更多...' : '查看更多结果'}
                        </button>
                    </div>
                )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              {activeTab === 'composition' ? <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" /> : <ImageIcon className="w-16 h-16 mb-4 opacity-20" />}
              <p className="text-sm font-medium">{activeTab === 'composition' ? '暂无模版数据' : '输入关键词开始探索...'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"><X size={32}/></button>
                <img src={previewImage.url} alt={previewImage.title} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"/>
                <div className="absolute -bottom-20 left-0 right-0 flex flex-col items-center gap-4">
                    <div className="text-white text-sm bg-zinc-800/80 px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 flex items-center gap-3">
                        <span className="font-medium">{previewImage.title}</span>
                    </div>
                    <button onClick={() => { onSelect(previewImage.url); setPreviewImage(null); onClose(); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transform hover:scale-105 transition-all">
                        <Check size={20}/> 确认使用这张参考图
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};