'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Heart, Zap, Lock, Diamond, Image as ImageIcon, Sparkles, Loader2, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient'; // ⚠️ 注意：根据文件层级，这里通常是 ../../../lib

export default function PromptsPage() {
  // 默认进入 'favorites' 标签，方便你直接看到刚才在视频页收藏的效果
  const [activeTab, setActiveTab] = useState<'favorites' | 'expert' | 'advanced' | 'rewriter'>('favorites');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // 模拟用户信息
  const [userPoints, setUserPoints] = useState(100);

  // ------------------------------------------------------------------
  // 1. ❤️ 真实收藏数据 (已连接 Supabase)
  // ------------------------------------------------------------------
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);

  // 初始化：获取收藏数据
  useEffect(() => {
    fetchFavorites();
  }, []);

  // 监听 Tab 切换，如果切到收藏，刷新一下数据（确保数据最新）
  useEffect(() => {
    if (activeTab === 'favorites') {
        fetchFavorites();
    }
  }, [activeTab]);

  // 从 Supabase 获取收藏
  async function fetchFavorites() {
    setLoadingFavs(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data, error } = await supabase
            .from('saved_prompts')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }); // 最新收藏在最前
        
        if (data) setFavorites(data);
        if (error) console.error('Error fetching favorites:', error);
    }
    setLoadingFavs(false);
  }

  // 删除收藏逻辑
  async function handleDeleteFavorite(id: number) {
      // 乐观更新 UI (先删界面，再删数据库，体验更快)
      setFavorites(prev => prev.filter(item => item.id !== id));
      
      const { error } = await supabase.from('saved_prompts').delete().eq('id', id);
      if (error) {
          alert("删除失败，请重试");
          fetchFavorites(); // 失败了就重新拉取数据恢复界面
      }
  }

  // ------------------------------------------------------------------
  // 2. ⚡ 大神精选数据 (静态)
  // ------------------------------------------------------------------
  const expertPrompts = [
    { id: 101, tool: "Midjourney", tag: "人像摄影", text: "Portrait of an old man, wrinkles, detailed skin texture, rembrandt lighting, 85mm lens, f/1.8 --v 6.0" },
    { id: 102, tool: "Sora", tag: "电影运镜", text: "Drone shot following a red sports car driving along the coastal highway in California, sunset, cinematic lighting, motion blur" },
    { id: 103, tool: "Runway", tag: "科幻特效", text: "Liquid metal forming a human shape, glossy texture, chrome reflection, seamless transformation, slow motion" },
  ];

  // ------------------------------------------------------------------
  // 3. 💎 进阶提示词数据 (静态)
  // ------------------------------------------------------------------
  const [advancedPrompts, setAdvancedPrompts] = useState([
    { id: 201, title: "好莱坞级电影质感公式", price: 10, isUnlocked: false, text: "Cinematic shot, anamorphic lens, 2.39:1 aspect ratio, teal and orange color grading, volumetric fog, dramatic shadows, Arri Alexa Mini LF" },
    { id: 202, title: "皮克斯风格角色三视图", price: 10, isUnlocked: false, text: "Pixar style character design, 3D render, cute monster, fluffy fur, character sheet, front view, side view, back view, solid background, octane render" },
    { id: 203, title: "建筑设计方案渲染", price: 20, isUnlocked: false, text: "Modern minimalist villa, floor-to-ceiling windows, infinity pool, forest environment, twilight, architectural photography, archdaily style, 8k" },
  ]);

  // ------------------------------------------------------------------
  // 4. 🪄 改写工具状态 (静态)
  // ------------------------------------------------------------------
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  // 通用复制功能
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 解锁功能
  const handleUnlock = (id: number, price: number) => {
    if (userPoints >= price) {
        if (confirm(`确定消耗 ${price} 积分解锁此提示词吗？\n当前积分: ${userPoints}`)) {
            setUserPoints(prev => prev - price);
            setAdvancedPrompts(prev => prev.map(p => p.id === id ? { ...p, isUnlocked: true } : p));
        }
    } else {
        alert("积分不足！请多去签到哦~");
    }
  };

  // 模拟图片上传与分析
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setUploadedImage(URL.createObjectURL(file));
        setIsAnalyzing(true);
        setGeneratedPrompt("");
        
        // 模拟 API 请求延迟
        setTimeout(() => {
            setIsAnalyzing(false);
            setGeneratedPrompt("An extremely detailed close-up shot of a futuristic robot eye, reflecting a neon city, intricate mechanical details, glowing blue iris, depth of field, 8k resolution, cinematic lighting.");
        }, 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/tools" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
          <span className="font-bold">返回工具库</span>
        </Link>
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full border border-white/10">
            <Diamond size={14} className="text-yellow-500" />
            <span className="text-xs font-mono text-yellow-500">{userPoints} 积分</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-4 pb-20">
        
        {/* 顶部 Tab 切换 */}
        <div className="flex flex-wrap gap-2 mb-8 bg-[#151515] p-1.5 rounded-xl border border-white/10 w-fit">
            {[
                { id: 'favorites', label: '我的收藏', icon: <Heart size={16}/> },
                { id: 'expert', label: '大神精选', icon: <Zap size={16}/> },
                { id: 'advanced', label: '进阶专区', icon: <Lock size={16}/> },
                { id: 'rewriter', label: 'AI 改写工具', icon: <Sparkles size={16}/> },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                        activeTab === tab.id 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* ----------------- 1. 我的收藏 Tab (真实数据) ----------------- */}
        {activeTab === 'favorites' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {loadingFavs ? (
                    <div className="text-center py-20 text-gray-500"><Loader2 className="animate-spin mx-auto"/> 加载中...</div>
                ) : favorites.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {favorites.map(item => (
                            <div key={item.id} className="bg-[#121212] p-6 rounded-xl border border-white/5 hover:border-red-500/30 transition-all group">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="text-xs text-red-400 flex items-center gap-1 font-bold">
                                        <Heart size={12} fill="currentColor"/> {item.source || '未知来源'}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleDeleteFavorite(item.id)} 
                                            className="text-gray-600 hover:text-red-500 text-xs p-2 hover:bg-red-500/10 rounded-lg transition-colors" 
                                            title="移除"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                        <button onClick={() => handleCopy(item.prompt_text)} className="text-gray-500 hover:text-white transition-colors">
                                            {copiedText === item.prompt_text ? <Check size={16} className="text-green-500"/> : <Copy size={16}/>}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-300 font-mono text-sm leading-relaxed select-all">
                                    {item.prompt_text}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-[#121212] rounded-xl border border-dashed border-white/10">
                        <Heart size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>还没有收藏任何提示词哦</p>
                        <p className="text-xs mt-2">去视频详情页点击“收藏”按钮即可添加</p>
                        <Link href="/">
                            <button className="mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold transition-all">
                                去逛逛
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        )}

        {/* ----------------- 2. 大神精选 Tab ----------------- */}
        {activeTab === 'expert' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-6 rounded-2xl border border-white/10 mb-6">
                    <h2 className="text-xl font-bold mb-2">🔥 每日灵感源泉</h2>
                    <p className="text-gray-400 text-sm">官方精选的高质量 Prompt，复制即用，小白也能出大片。</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {expertPrompts.map(item => (
                        <div key={item.id} className="bg-[#121212] p-6 rounded-xl border border-white/5 hover:border-purple-500/50 transition-all group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2">
                                    <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded font-bold">{item.tool}</span>
                                    <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">{item.tag}</span>
                                </div>
                                <button onClick={() => handleCopy(item.text)} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                                    {copiedText === item.text ? <Check size={18} className="text-green-500"/> : <Copy size={18}/>}
                                </button>
                            </div>
                            <p className="text-gray-300 font-mono text-sm leading-relaxed bg-black/30 p-4 rounded-lg border border-white/5 select-all">
                                {item.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ----------------- 3. 进阶提示词 Tab ----------------- */}
        {activeTab === 'advanced' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-6 rounded-2xl border border-yellow-500/20 mb-6 flex items-center gap-4">
                    <div className="bg-yellow-500/20 p-3 rounded-full"><Diamond className="text-yellow-500" size={24}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-yellow-500 mb-1">VIP 进阶库</h2>
                        <p className="text-yellow-200/50 text-sm">系统化整理的高级 Prompt 公式，消耗积分即可永久解锁。</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {advancedPrompts.map(item => (
                        <div key={item.id} className={`relative p-6 rounded-xl border transition-all ${item.isUnlocked ? 'bg-[#151515] border-green-500/30' : 'bg-[#121212] border-yellow-500/10'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-white">{item.title}</h3>
                                {item.isUnlocked ? (
                                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded font-bold flex items-center gap-1"><Check size={12}/> 已解锁</span>
                                ) : (
                                    <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded font-bold flex items-center gap-1"><Lock size={12}/> {item.price} 积分</span>
                                )}
                            </div>
                            
                            {/* 内容区域 */}
                            <div className="relative">
                                <p className={`font-mono text-sm leading-relaxed p-4 rounded-lg bg-black/50 ${item.isUnlocked ? 'text-gray-300 select-all' : 'text-gray-600 blur-sm select-none'}`}>
                                    {item.text}
                                </p>

                                {/* 遮罩层 (未解锁时显示) */}
                                {!item.isUnlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                        <button 
                                            onClick={() => handleUnlock(item.id, item.price)}
                                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-full font-bold shadow-lg shadow-yellow-900/50 hover:scale-105 transition-transform flex items-center gap-2"
                                        >
                                            <Diamond size={16} fill="black"/> 立即解锁
                                        </button>
                                    </div>
                                )}
                                
                                {item.isUnlocked && (
                                    <button onClick={() => handleCopy(item.text)} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-md text-gray-400 hover:text-white transition-colors">
                                        {copiedText === item.text ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ----------------- 4. AI 改写工具 Tab ----------------- */}
        {activeTab === 'rewriter' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2"><Sparkles className="text-blue-500"/> AI 视觉分析与改写</h2>
                    
                    {!uploadedImage ? (
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group cursor-pointer relative">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" />
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} className="text-gray-400 group-hover:text-blue-400"/>
                            </div>
                            <p className="text-gray-300 font-bold mb-2">点击上传图片</p>
                            <p className="text-gray-500 text-sm">支持 JPG, PNG (最大 5MB)</p>
                            <p className="text-blue-500/50 text-xs mt-4">AI 将自动分析画面并生成专业提示词</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-8 items-start text-left">
                            <div className="w-full md:w-1/3 shrink-0">
                                <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden border border-white/10 relative">
                                    <img src={uploadedImage} className="w-full h-full object-cover" />
                                    <button onClick={() => {setUploadedImage(null); setGeneratedPrompt("")}} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full hover:bg-red-500 transition-colors">
                                        <RefreshCw size={14}/>
                                    </button>
                                </div>
                            </div>
                            <div className="w-full flex-1">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">AI Analysis Result</h3>
                                {isAnalyzing ? (
                                    <div className="bg-black/30 rounded-xl p-6 border border-white/5 flex items-center gap-3 text-blue-400 animate-pulse">
                                        <Loader2 size={20} className="animate-spin"/> 正在分析画面构图与光影...
                                    </div>
                                ) : (
                                    <div className="bg-black/30 rounded-xl p-6 border border-blue-500/30 relative group">
                                        <p className="font-mono text-gray-200 leading-relaxed text-sm">
                                            {generatedPrompt}
                                        </p>
                                        <button onClick={() => handleCopy(generatedPrompt)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                                            {copiedText === generatedPrompt ? <Check size={18} className="text-green-500"/> : <Copy size={18}/>}
                                        </button>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                                            <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-md transition-colors">翻译成中文</button>
                                            <button className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-md transition-colors">优化为 Midjourney 格式</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
