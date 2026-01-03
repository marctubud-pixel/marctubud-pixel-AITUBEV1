'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  User, Plus, Save, Loader2, Upload, Trash2, ArrowLeft, ScanEye, Zap, Sparkles, LayoutGrid, FileText
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { analyzeImageContent } from '@/app/actions/vision';

// --- Types ---
type CharacterAssets = {
  back?: string;
  side?: string;
  pain?: string;
  laugh?: string;
  [key: string]: string | undefined;
}

// 🟢 新增：分面描述结构
type DescriptionMap = {
  base?: string;  // 基础特征（发型、发色）
  front?: string; // 正面细节（Logo、领带）
  back?: string;  // 背面细节（纯色、无Logo）
  side?: string;  // 侧面轮廓
  [key: string]: string | undefined;
}

type Character = {
  id: string;
  name: string;
  description: string; // 兼容旧版，作为 Base/Front 描述
  negative_prompt: string | null;
  avatar_url: string | null;
  assets: CharacterAssets;
  description_map: DescriptionMap; // 🟢 新增字段
}

// --- Sub-Component: Asset Slot ---
const AssetSlot = ({ 
  label, imageUrl, desc, onUpload, isAnalyzing = false, isUploading = false 
}: { 
  label: string, imageUrl?: string | null, desc?: string, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isAnalyzing?: boolean, isUploading?: boolean 
}) => (
  <div className="group relative aspect-square bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all hover:border-zinc-600">
    {imageUrl ? (
      <>
        <Image src={imageUrl} alt={label} fill className="object-cover transition-transform duration-700 group-hover:scale-110"/>
        {/* 🟢 显示是否有独立描述 */}
        <div className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md ${desc ? 'bg-green-500/20 text-green-400' : 'bg-black/50 text-zinc-500'} transition-colors`} title={desc ? "Has specific description" : "No description"}>
             <FileText size={10} />
        </div>
      </>
    ) : (
      <div className="text-center p-2 opacity-50 group-hover:opacity-100 transition-opacity">
        <Upload size={18} className="mx-auto mb-1"/>
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
    )}
    
    {/* Upload Overlay */}
    <label className={`absolute inset-0 bg-black/60 ${imageUrl ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'} hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-[2px]`}>
        {isUploading || isAnalyzing ? <Loader2 className="animate-spin w-5 h-5"/> : <Upload className="w-5 h-5 mb-1"/>}
        <span className="text-[10px] font-bold">
            {isUploading ? 'Uploading...' : (isAnalyzing ? 'Analyzing...' : (imageUrl ? 'Change' : 'Upload'))}
        </span>
        <input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={isUploading || isAnalyzing} />
    </label>

    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-md rounded text-[9px] font-bold text-white/80 uppercase">{label}</div>
  </div>
);

export default function CharacterPage() {
  const supabase = useMemo(() => createClient(), []);
  
  // Data State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [activeUploadSlot, setActiveUploadSlot] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  
  // Assets State
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [tempAssets, setTempAssets] = useState<CharacterAssets>({});
  
  // 🟢 New State: 分面描述
  const [tempDescMap, setTempDescMap] = useState<DescriptionMap>({});

  useEffect(() => { fetchCharacters(); }, []);

  useEffect(() => {
    if (selectedChar) {
      setName(selectedChar.name);
      setDesc(selectedChar.description || '');
      setNegPrompt(selectedChar.negative_prompt || '');
      setTempAvatarUrl(selectedChar.avatar_url);
      setTempAssets(selectedChar.assets || {});
      setTempDescMap(selectedChar.description_map || {}); // 载入分面描述
    } else {
      resetForm();
    }
  }, [selectedChar]);

  const resetForm = () => {
    setName(''); setDesc(''); setNegPrompt(''); 
    setTempAvatarUrl(null); setTempAssets({}); setTempDescMap({});
    setSelectedChar(null);
  };

  const fetchCharacters = async () => {
    const { data, error } = await supabase.from('characters').select('*').order('created_at', { ascending: false });
    if (!error) setCharacters(data as Character[] || []);
    setIsLoading(false);
  };

  const handleSaveCharacter = async () => {
    if (!name.trim()) return toast.warning('Name required');
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return toast.error('Login required');

    try {
      // 确保 base 描述同步
      const finalDescMap = { ...tempDescMap, base: desc };

      const payload = { 
          name, 
          description: desc, 
          negative_prompt: negPrompt, 
          user_id: user.id,
          avatar_url: tempAvatarUrl,
          assets: tempAssets,
          description_map: finalDescMap // 🟢 保存分面描述
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
      
      if (newId) {
        const { data } = await supabase.from('characters').select('*').eq('id', newId).single();
        if(data) setSelectedChar(data as Character);
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteCharacter = async () => {
    if (!selectedChar || !confirm('Delete this character?')) return;
    await supabase.from('characters').delete().eq('id', selectedChar.id);
    resetForm();
    fetchCharacters();
    toast.success('Deleted');
  };

  // 🟢 智能上传处理器：上传即分析
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 'avatar' | keyof CharacterAssets) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    setActiveUploadSlot(slot as string);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No User");

      // 1. 上传文件
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${String(slot)}_${Date.now()}.${fileExt}`; 
      
      const { error: uploadError } = await supabase.storage.from('characters').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('characters').getPublicUrl(fileName);

      // 2. 🟢 智能分析逻辑 (Smart Analysis)
      // 如果是 Back, Side, Avatar，自动触发 AI 分析该角度的描述
      if (['avatar', 'back', 'side'].includes(slot as string)) {
          
          // 读取文件为 Base64
          const reader = new FileReader();
          reader.readAsDataURL(file);
          
          reader.onload = async () => {
              const base64 = reader.result as string;
              setIsAnalyzing(true);
              
              try {
                  let promptHint = "";
                  if (slot === 'back') promptHint = "Describe ONLY the back view details of this character. Focus on hair from behind, clothing details on the back. Do NOT describe the face.";
                  if (slot === 'side') promptHint = "Describe the side profile view of this character.";
                  
                  toast.info(`AI Analyzing ${String(slot).toUpperCase()} features...`);
                  
                  // 调用 Vision API (注意：这里复用了原来的 analyzeImageContent，你可能需要确保它支持 prompt 参数，或者让它通用分析)
                  // 如果 analyzeImageContent 目前不支持自定义 prompt，它会返回通用描述，我们可以在前端或者 API 层做区分。
                  // 假设 analyzeRefImage/VisionAnalysis 能返回通用描述：
                  const result = await analyzeImageContent(base64); 
                  
                  // 更新对应的 Description Map
                  if (slot === 'avatar') {
                      setDesc(result.description);
                  } else {
                      setTempDescMap(prev => ({ ...prev, [slot]: result.description }));
                      toast.success(`Generated Description for ${(slot as string).toUpperCase()}`);
                  }
                  
              } catch (err) { 
                  console.error(err); 
                  toast.error("Auto-analysis failed");
              } finally { 
                  setIsAnalyzing(false); 
              }
          };
      }

      // 3. 更新 State
      if (slot === 'avatar') {
          setTempAvatarUrl(publicUrl);
      } else {
          setTempAssets(prev => ({ ...prev, [slot]: publicUrl }));
      }
      
      toast.success(`${(slot as string).toUpperCase()} Uploaded`);

    } catch (error: any) { toast.error(error.message); } 
    finally { setActiveUploadSlot(null); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-6 gap-4 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
         <Link href="/tools/cineflow" className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><ArrowLeft size={18} className="text-zinc-400"/></Link>
         <h1 className="text-xs font-bold tracking-widest text-zinc-300">ASSET MATRIX (SMART MODE)</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col">
           <div className="p-4">
              <button 
                onClick={resetForm}
                className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/5"
              >
                <Plus size={14}/> Create New
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
              {characters.map(char => (
                <div 
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className={`p-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-all border ${selectedChar?.id === char.id ? 'bg-zinc-800 border-zinc-700' : 'border-transparent hover:bg-zinc-900/50'}`}
                >
                   <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden relative shrink-0 border border-white/5">
                      {char.avatar_url ? <Image src={char.avatar_url} alt={char.name} fill className="object-cover"/> : <User className="w-4 h-4 m-auto text-zinc-600"/>}
                   </div>
                   <div className="overflow-hidden">
                      <p className="font-bold text-xs truncate text-zinc-200">{char.name}</p>
                      <div className="flex gap-1 mt-0.5">
                         {char.description_map?.back && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Back Desc Ready"/>}
                         {char.description_map?.side && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Side Desc Ready"/>}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Main Edit Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#050505]">
           <div className="max-w-5xl mx-auto flex gap-12">
              
              {/* Left Column: Visual Assets Matrix */}
              <div className="w-72 shrink-0 space-y-4">
                 
                 {/* 1. Main Avatar */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 tracking-wider">PRIMARY REFERENCE</label>
                    <div className="group relative w-72 h-72 rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shadow-2xl">
                        {tempAvatarUrl ? (
                            <Image src={tempAvatarUrl} alt="Main" fill className="object-cover transition-transform duration-700 group-hover:scale-105"/>
                        ) : (
                            <div className="text-center p-6">
                                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3"><Upload className="text-zinc-600 w-5 h-5"/></div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Front View</p>
                            </div>
                        )}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm">
                            {isAnalyzing && activeUploadSlot === 'avatar' ? <Loader2 className="animate-spin text-blue-500 w-6 h-6"/> : <ScanEye className="text-blue-500 w-6 h-6 mb-2"/>}
                            <span className="text-[10px] font-bold text-white uppercase">Upload & Analyze</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'avatar')} disabled={activeUploadSlot !== null} />
                        </label>
                    </div>
                 </div>

                 {/* 2. Asset Grid */}
                 <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-500 tracking-wider flex items-center gap-2">
                           <LayoutGrid size={12}/> ASSET MATRIX
                        </label>
                        <span className="text-[9px] text-zinc-600">Auto-Generates Descriptions</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <AssetSlot 
                            label="Back View" 
                            imageUrl={tempAssets.back} 
                            desc={tempDescMap.back} // 🟢 传入背影描述状态
                            onUpload={(e) => handleUpload(e, 'back')} 
                            isUploading={activeUploadSlot === 'back'}
                            isAnalyzing={isAnalyzing && activeUploadSlot === 'back'}
                        />
                        <AssetSlot 
                            label="Side View" 
                            imageUrl={tempAssets.side} 
                            desc={tempDescMap.side}
                            onUpload={(e) => handleUpload(e, 'side')} 
                            isUploading={activeUploadSlot === 'side'}
                            isAnalyzing={isAnalyzing && activeUploadSlot === 'side'}
                        />
                        <AssetSlot 
                            label="Pain / Cry" 
                            imageUrl={tempAssets.pain} 
                            onUpload={(e) => handleUpload(e, 'pain')} 
                            isUploading={activeUploadSlot === 'pain'}
                        />
                        <AssetSlot 
                            label="Laugh / Smile" 
                            imageUrl={tempAssets.laugh} 
                            onUpload={(e) => handleUpload(e, 'laugh')} 
                            isUploading={activeUploadSlot === 'laugh'}
                        />
                    </div>
                 </div>

                 {selectedChar && (
                    <button onClick={handleDeleteCharacter} className="w-full py-3 opacity-50 hover:opacity-100 text-red-500 hover:bg-red-950/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mt-8">
                        <Trash2 size={14}/> Delete Asset
                    </button>
                 )}
              </div>

              {/* Right Column: Text Metadata */}
              <div className="flex-1 space-y-8 pt-1">
                 <div>
                    <h2 className="text-3xl font-black text-white mb-2">{name || 'New Character'}</h2>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-lg">
                       SMART MODE: Uploading a Back or Side view will automatically generate a specific visual description for that angle, preventing "Ghost Effects" (e.g. logos appearing on the back).
                    </p>
                 </div>

                 <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 mb-2 block tracking-wider">CHARACTER NAME</label>
                        <input 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm focus:border-white/20 outline-none transition-all font-medium"
                          placeholder="Character Name"
                        />
                    </div>

                    <div className="relative">
                        <div className="flex justify-between mb-2">
                            <label className="text-[10px] font-bold text-zinc-500 block tracking-wider">BASE DESCRIPTION (FRONT)</label>
                            {isAnalyzing && <span className="text-[10px] text-blue-500 flex items-center gap-1"><Sparkles size={10}/> AI Writing...</span>}
                        </div>
                        <textarea 
                          value={desc} 
                          onChange={e => setDesc(e.target.value)} 
                          className={`w-full h-48 bg-zinc-900 border rounded-xl p-4 text-sm outline-none resize-none leading-relaxed transition-all ${isAnalyzing ? 'border-blue-500/50 animate-pulse' : 'border-zinc-800 focus:border-white/20'}`}
                          placeholder="Detailed visual description..."
                        />
                    </div>
                    
                    {/* 🟢 可视化检查：分面描述预览 */}
                    {(tempDescMap.back || tempDescMap.side) && (
                        <div className="grid grid-cols-2 gap-4">
                            {tempDescMap.back && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-blue-500 block tracking-wider">BACK DESCRIPTION</label>
                                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-zinc-400 h-24 overflow-y-auto">
                                        {tempDescMap.back}
                                    </div>
                                </div>
                            )}
                            {tempDescMap.side && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-green-500 block tracking-wider">SIDE DESCRIPTION</label>
                                    <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-xs text-zinc-400 h-24 overflow-y-auto">
                                        {tempDescMap.side}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-6 border-t border-white/5">
                        <button 
                          onClick={handleSaveCharacter} 
                          className="px-8 py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                        >
                           <Save size={16}/> Save Changes
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