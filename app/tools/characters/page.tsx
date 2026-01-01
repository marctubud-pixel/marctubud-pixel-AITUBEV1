'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  User, Plus, Save, Image as ImageIcon, 
  Loader2, Upload, X, Sparkles, ArrowLeft, ScanEye, Zap, Trash2
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { analyzeImageContent } from '@/app/actions/vision';

type Character = {
  id: string;
  name: string;
  description: string;
  negative_prompt: string | null;
  avatar_url: string | null;
}

export default function CharacterPage() {
  const supabase = useMemo(() => createClient(), []);
  
  // State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  // 🟢 新增：专门用一个 state 来存当前的 avatarUrl，防止不同步
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  
  const isDark = true;

  useEffect(() => { fetchCharacters(); }, []);

  useEffect(() => {
    if (selectedChar) {
      setName(selectedChar.name);
      setDesc(selectedChar.description || '');
      setNegPrompt(selectedChar.negative_prompt || '');
      setTempAvatarUrl(selectedChar.avatar_url); // 同步头像
    } else {
      setName(''); setDesc(''); setNegPrompt(''); setTempAvatarUrl(null);
    }
  }, [selectedChar]);

  const fetchCharacters = async () => {
    const { data, error } = await supabase.from('characters').select('*').order('created_at', { ascending: false });
    if (!error) setCharacters(data as Character[] || []);
    setIsLoading(false);
  };

  // 🟢 修复 1：保存逻辑必须包含 avatar_url
  const handleSaveCharacter = async () => {
    if (!name.trim()) return toast.warning('Name required');
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return toast.error('Login required');

    try {
      // 构建 payload 时带上 avatar_url
      const payload = { 
          name, 
          description: desc, 
          negative_prompt: negPrompt, 
          user_id: user.id,
          avatar_url: tempAvatarUrl // 🔥 关键修复：写入头像 URL
      };

      let newId = selectedChar?.id;

      if (selectedChar) {
        await supabase.from('characters').update(payload).eq('id', selectedChar.id);
        toast.success('Character Updated');
      } else {
        const { data, error } = await supabase.from('characters').insert(payload).select().single();
        if (error) throw error;
        newId = data.id;
        toast.success('Character Created');
      }
      
      await fetchCharacters();
      
      // 刷新选中态
      if (newId) {
        const { data } = await supabase.from('characters').select('*').eq('id', newId).single();
        if(data) setSelectedChar(data as Character);
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteCharacter = async () => {
    if (!selectedChar || !confirm('Delete this character?')) return;
    await supabase.from('characters').delete().eq('id', selectedChar.id);
    setSelectedChar(null);
    fetchCharacters();
    toast.success('Deleted');
  };

  // 🟢 修复 2：上传逻辑优化
  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No User");

      // A. 视觉分析 (Vision)
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        if (!desc.trim()) {
            setIsAnalyzing(true);
            try {
                toast.info("AI Vision Analyzing...");
                const result = await analyzeImageContent(base64);
                setDesc(prev => prev || result.description);
                if(!name) setName("New Character");
                toast.success("Analysis Complete");
            } catch (err) { console.error(err); } 
            finally { setIsAnalyzing(false); }
        }
      };

      // B. 上传文件 (Storage)
      const fileExt = file.name.split('.').pop();
      // 使用随机文件名，避免未创建 ID 时无法路径化
      const fileName = `${user.id}/temp_${Date.now()}.${fileExt}`; 
      
      const { error: uploadError } = await supabase.storage.from('characters').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('characters').getPublicUrl(fileName);
      
      // 🔥 关键：只更新临时状态，不立即写库 (防止覆盖或ID丢失)
      // 用户必须点击 "Save" 才能将此 URL 写入数据库
      setTempAvatarUrl(publicUrl); 
      
      // 如果当前已经是编辑模式，可以顺手更新一下预览，但为了逻辑统一，建议统一走 Save
      toast.success("Image Uploaded (Click Save to apply)");

    } catch (error: any) { toast.error(error.message); } 
    finally { setIsUploading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center px-6 gap-4 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
         <Link href="/tools/cineflow" className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><ArrowLeft size={18} className="text-zinc-400"/></Link>
         <h1 className="text-sm font-bold tracking-wider">ASSET LIBRARY</h1>
         <div className="flex-1"></div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-72 border-r border-white/5 bg-[#0a0a0a] flex flex-col">
           <div className="p-4">
              <button 
                onClick={() => { setSelectedChar(null); setName(''); setDesc(''); setNegPrompt(''); setTempAvatarUrl(null); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={16}/> New Character
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
              {characters.map(char => (
                <div 
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${selectedChar?.id === char.id ? 'bg-zinc-800 border-zinc-700' : 'border-transparent hover:bg-zinc-900'}`}
                >
                   <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden relative shrink-0 border border-white/5">
                      {char.avatar_url ? <Image src={char.avatar_url} alt={char.name} fill className="object-cover"/> : <User className="w-5 h-5 m-auto text-zinc-600"/>}
                   </div>
                   <div className="overflow-hidden">
                      <p className="font-bold text-xs truncate text-zinc-200">{char.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{char.description ? 'Has description' : 'No description'}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Main Edit Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#050505]">
           <div className="max-w-4xl mx-auto flex gap-10">
              
              {/* Left Column: Avatar & Vision */}
              <div className="w-64 shrink-0 space-y-6">
                 {/* 🟢 使用 tempAvatarUrl 来显示预览 */}
                 <div className="group relative w-64 h-64 rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shadow-2xl">
                    {tempAvatarUrl ? (
                        <Image src={tempAvatarUrl} alt="Avatar" fill className="object-cover transition-transform duration-700 group-hover:scale-105"/>
                    ) : (
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4"><Upload className="text-zinc-600"/></div>
                            <p className="text-xs text-zinc-500">Upload Image to<br/>Auto-Analyze</p>
                        </div>
                    )}
                    
                    {/* Upload Overlay */}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm">
                        {isAnalyzing ? <Loader2 className="animate-spin text-blue-500 w-8 h-8"/> : <ScanEye className="text-blue-500 w-8 h-8 mb-2"/>}
                        <span className="text-xs font-bold text-white">{isAnalyzing ? 'Analyzing...' : 'Change & Analyze'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={isUploading || isAnalyzing} />
                    </label>
                 </div>

                 {selectedChar && (
                    <button onClick={handleDeleteCharacter} className="w-full py-2 border border-red-900/30 text-red-500 hover:bg-red-900/10 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                        <Trash2 size={14}/> Delete Character
                    </button>
                 )}
              </div>

              {/* Right Column: Details */}
              <div className="flex-1 space-y-6">
                 <div>
                    <h2 className="text-2xl font-black text-white mb-1">{selectedChar ? 'Edit Character' : 'Create Character'}</h2>
                    <p className="text-xs text-zinc-500">Upload an image to let AI auto-generate the visual description.</p>
                 </div>

                 <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1.5 block">NAME</label>
                        <input 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition-all"
                          placeholder="e.g. Jinx"
                        />
                    </div>

                    <div className="relative">
                        <div className="flex justify-between mb-1.5">
                            <label className="text-xs font-bold text-zinc-500 block">VISUAL PROMPT (AI Description)</label>
                            {isAnalyzing && <span className="text-[10px] text-blue-500 flex items-center gap-1"><Sparkles size={10}/> AI Writing...</span>}
                        </div>
                        <textarea 
                          value={desc} 
                          onChange={e => setDesc(e.target.value)} 
                          className={`w-full h-40 bg-zinc-900 border rounded-xl p-4 text-sm outline-none resize-none leading-relaxed transition-all ${isAnalyzing ? 'border-blue-500/50 animate-pulse' : 'border-zinc-800 focus:border-blue-500'}`}
                          placeholder="Upload an image to auto-fill, or type manually..."
                        />
                        <div className="absolute bottom-3 right-3">
                             <Zap size={14} className={desc ? "text-yellow-500" : "text-zinc-700"} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-zinc-500 mb-1.5 block">NEGATIVE PROMPT (Avoid)</label>
                        <input 
                          value={negPrompt} 
                          onChange={e => setNegPrompt(e.target.value)} 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:border-red-500/50 outline-none transition-all text-zinc-400"
                          placeholder="e.g. glasses, hat, beard..."
                        />
                    </div>

                    <div className="pt-4">
                        <button 
                          onClick={handleSaveCharacter} 
                          className="px-8 py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-lg shadow-white/5 transition-all flex items-center gap-2"
                        >
                           <Save size={16}/> Save Character
                        </button>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
}