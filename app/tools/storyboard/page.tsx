'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, Clapperboard, Loader2, ArrowLeft, PenTool, 
  Image as ImageIcon, Trash2, Plus, PlayCircle, Save, CheckCircle2, User, MapPin, Camera, Palette, Monitor, Paperclip, Download, Upload, RefreshCw, FileText, Sparkles
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { createClient } from '@/utils/supabase/client';
import { exportStoryboardPDF } from '@/utils/export-pdf';

// ... 类型定义保持不变 ...
type StoryboardPanel = {
  id: number;
  description: string; 
  shotType: string;    
  environment?: string; 
  prompt: string;      
  imageUrl?: string;   
  isLoading: boolean;  
}

type Character = {
  id: string;
  name: string;
  avatar_url: string | null;
}

type CharacterImage = {
  id: string;
  image_url: string;
  description: string | null;
}

type WorkflowStep = 'input' | 'review' | 'generating' | 'done';

const CINEMATIC_SHOTS = [
  { value: "EXTREME WIDE SHOT", label: "大远景 (EWS)" },
  { value: "WIDE SHOT", label: "全景 (Wide)" },
  { value: "FULL SHOT", label: "全身 (Full)" },
  { value: "MID SHOT", label: "中景 (Mid)" },
  { value: "CLOSE-UP", label: "特写 (Close-Up)" },
  { value: "EXTREME CLOSE-UP", label: "大特写 (ECU)" },
  { value: "LOW ANGLE", label: "仰视/低机位" },
  { value: "HIGH ANGLE", label: "俯视/高机位" },
  { value: "OVERHEAD SHOT", label: "上帝视角 (Top Down)" },
  { value: "DUTCH ANGLE", label: "荷兰倾斜 (不安感)" },
  { value: "OVER-THE-SHOULDER SHOT", label: "过肩镜头" },
];

const STYLE_OPTIONS = [
  { value: "realistic", label: "🎥 电影实拍 (Realistic)" },
  { value: "anime_jp", label: "🇯🇵 日本动画 (Anime)" },
  { value: "anime_us", label: "🇺🇸 美漫风格 (Comics)" },
  { value: "cyberpunk", label: "🤖 赛博朋克 (Cyberpunk)" },
  { value: "noir", label: "🕵️‍♂️ 黑色电影 (Noir)" },
  { value: "pixar", label: "🧸 皮克斯 3D (Pixar)" },
  { value: "watercolor", label: "🎨 水彩手绘 (Watercolor)" },
  { value: "ink", label: "🖌️ 中国水墨 (Ink)" },
];

// 🎨 极简画幅定义
const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", cssClass: "aspect-video" },
  { value: "2.39:1", label: "2.39:1", cssClass: "aspect-[2.39/1]" },
  { value: "4:3", label: "4:3", cssClass: "aspect-[4/3]" },
  { value: "1:1", label: "1:1", cssClass: "aspect-square" },
  { value: "9:16", label: "9:16", cssClass: "aspect-[9/16]" },
];

export default function StoryboardPage() {
  const [script, setScript] = useState('');
  const [globalAtmosphere, setGlobalAtmosphere] = useState(''); // 🌤️ 新增：全局氛围
  const [sceneDescription, setSceneDescription] = useState(''); 
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null); 
  const [isUploadingScene, setIsUploadingScene] = useState(false);

  const [step, setStep] = useState<WorkflowStep>('input');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  
  const [mode, setMode] = useState<'draft' | 'render'>('draft'); 
  const [stylePreset, setStylePreset] = useState<string>('realistic');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');

  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDrawing, setIsDrawing] = useState(false);     
  const [isExporting, setIsExporting] = useState(false);
  
  const [characters, setCharacters] = useState<Character[]>([]); 
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null); 
  const [refImages, setRefImages] = useState<CharacterImage[]>([]);
  const [selectedRefImage, setSelectedRefImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null); // 📂 剧本文件上传Ref

  const supabase = createClient();
  const tempProjectId = "temp_workspace"; 

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase.from('characters').select('id, name, avatar_url').order('created_at', { ascending: false });
      if (!error) setCharacters(data || []);
    };
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (selectedCharacterId) {
      const fetchRefImages = async () => {
        const { data, error } = await supabase.from('character_images').select('id, image_url, description').eq('character_id', selectedCharacterId).order('created_at', { ascending: false });
        if (!error) { setRefImages(data || []); setSelectedRefImage(null); }
      };
      fetchRefImages();
    } else { setRefImages([]); setSelectedRefImage(null); }
  }, [selectedCharacterId]);

  // 📂 剧本文件读取 (基础版: 仅支持 txt/md)
  const handleScriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 简单文件读取逻辑
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
            setScript(prev => prev + (prev ? '\n\n' : '') + text);
            toast.success(`已导入文件: ${file.name}`);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleSceneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    setIsUploadingScene(true);
    try {
        const file = e.target.files[0];
        const { data: { user } } = await supabase.auth.getUser();
        const fileExt = file.name.split('.').pop();
        const safeName = `scene_${Date.now()}.${fileExt}`;
        const filePath = `scene_refs/${user?.id || 'guest'}/${safeName}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
        setSceneImageUrl(publicUrl);
        toast.success("场景参考图上传成功");
    } catch (error: any) {
        console.error(error);
        toast.error("上传失败: " + error.message);
    } finally { setIsUploadingScene(false); }
  };

  const handleAnalyzeScript = async () => {
    if (!script.trim()) return;
    setIsAnalyzing(true);
    setPanels([]); 
    try {
      const breakdown = await analyzeScript(script);
      const initialPanels: StoryboardPanel[] = breakdown.panels.map((p: any, index: number) => ({
        id: index,
        description: p.description,
        shotType: p.shotType || 'MID SHOT',
        environment: '', 
        prompt: p.visualPrompt, 
        isLoading: false, 
      }));
      setPanels(initialPanels);
      setStep('review'); 
      toast.success(`剧本拆解完成`);
    } catch (error: any) {
      console.error(error);
      toast.error('拆解失败: ' + error.message);
    } finally { setIsAnalyzing(false); }
  };

  const handleUpdatePanel = (id: number, field: keyof StoryboardPanel, value: string) => {
    setPanels(current => current.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const handleDeletePanel = (id: number) => {
    setPanels(current => current.filter(p => p.id !== id));
  };
  const handleAddPanel = () => {
    const newId = panels.length > 0 ? Math.max(...panels.map(p => p.id)) + 1 : 0;
    setPanels([...panels, {
        id: newId, description: "...", shotType: "MID SHOT", environment: "", prompt: "", isLoading: false
    }]);
  };

  // 🧠 Prompt 组装逻辑：全局氛围 + 场景 + 描述
  const buildActionPrompt = (panel: StoryboardPanel) => {
    const effectiveEnv = panel.environment?.trim() || sceneDescription;
    const scenePart = effectiveEnv ? `(Environment: ${effectiveEnv}), ` : '';
    const atmospherePart = globalAtmosphere.trim() ? `(Atmosphere: ${globalAtmosphere}), ` : '';
    
    // 如果后端给的 prompt 很长，说明是清洗过的，但也需要加上全局氛围
    if (panel.prompt && panel.prompt.length > 10) {
        return `${atmospherePart}${panel.prompt}`;
    }
    return `${atmospherePart}${scenePart}${panel.description}`;
  };

  const handleGenerateSingleImage = async (panelId: number) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: true } : p));
    try {
        const tempShotId = `storyboard_${Date.now()}_${panel.id}`;
        const actionPrompt = buildActionPrompt(panel);

        const res = await generateShotImage(
            tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
            selectedCharacterId || undefined, selectedRefImage || undefined, sceneImageUrl || undefined 
        );

        if (res.success) {
            const successRes = res as { success: true; url: string };
            setPanels(current => current.map(p => p.id === panelId ? { ...p, imageUrl: successRes.url, isLoading: false } : p));
            toast.success('镜头已重绘');
        } else {
            const errorRes = res as { success: false; message: string };
            throw new Error(errorRes.message || '生成失败');
        }
    } catch (error: any) {
        console.error(error);
        toast.error('重绘失败: ' + error.message);
        setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: false } : p));
    }
  };

  const handleGenerateImages = async () => {
    if (!sceneDescription.trim() && !sceneImageUrl) toast.warning('建议填写“场景设定”或上传参考图');
    setStep('generating');
    setIsDrawing(true);
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));

    const promises = panels.map(async (panel) => {
      try {
        const tempShotId = `storyboard_${Date.now()}_${panel.id}`;
        const actionPrompt = buildActionPrompt(panel);

        const res = await generateShotImage(
          tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
          selectedCharacterId || undefined, selectedRefImage || undefined, sceneImageUrl || undefined 
        );

        if (res.success) {
          const successRes = res as { success: true; url: string };
          setPanels(current => current.map(p => p.id === panel.id ? { ...p, imageUrl: successRes.url, isLoading: false } : p));
        } else {
          const errorRes = res as { success: false; message: string };
          throw new Error(errorRes.message || '生成失败');
        }
      } catch (error: any) {
        console.error(`Panel ${panel.id} failed`, error);
        setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p)); 
      }
    });

    await Promise.all(promises);
    setIsDrawing(false);
    setStep('done');
    toast.success('商业级分镜绘制完成');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info('正在打包 PDF，请稍候...');
      await exportStoryboardPDF(script || "Untitled Project", panels);
      toast.success('PDF 导出成功！');
    } catch (error) { console.error(error); toast.error('导出失败'); } 
    finally { setIsExporting(false); }
  };

  const currentRatioClass = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.cssClass || "aspect-video";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-sans">
      <Toaster position="top-center" richColors />
      
      {/* 🟢 顶部导航 */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/tools" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回工作台
        </Link>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-600">
             <span className={step === 'input' ? 'text-yellow-500 font-bold' : ''}>01 SCRIPT</span>
             <span>/</span>
             <span className={step === 'review' ? 'text-yellow-500 font-bold' : ''}>02 SETUP</span>
             <span>/</span>
             <span className={step === 'generating' || step === 'done' ? 'text-yellow-500 font-bold' : ''}>03 RENDER</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 min-h-[600px]">
        
        {/* 🟢 左侧控制栏 (Sidebar) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 h-fit sticky top-6">
          
          {/* 1. 全局设置卡片 */}
          <div className="bg-[#111] p-6 rounded-2xl border border-white/5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-yellow-500" /> 
                    PROJECT SETTINGS
                </h2>
                {/* 🎨 极简画幅选择器 */}
                <div className="flex bg-black/50 rounded-lg p-1 border border-white/5">
                    {ASPECT_RATIOS.map(r => (
                        <button 
                            key={r.value} 
                            onClick={() => setAspectRatio(r.value)}
                            className={`text-[10px] px-2 py-1 rounded transition-all ${aspectRatio === r.value ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 模式切换 Switch */}
            <div className="bg-black/30 p-1 rounded-lg flex border border-white/5">
                <button onClick={() => setMode('draft')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'draft' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <PenTool className="w-3 h-3" /> 草图模式
                </button>
                <button onClick={() => setMode('render')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'render' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <ImageIcon className="w-3 h-3" /> 精绘渲染
                </button>
            </div>
            
            {/* 渲染风格 (Render Mode Only) */}
            {mode === 'render' && (
                <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="text-xs font-bold text-zinc-500 mb-2 block">RENDER STYLE</label>
                    <select value={stylePreset} onChange={(e) => setStylePreset(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-gray-300 focus:border-purple-500 outline-none">
                        {STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            )}
            
            {/* 角色与场景绑定 */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-2 flex justify-between">
                        <span>MAIN CHARACTER</span>
                        {selectedCharacterId && <Link href="/tools/characters" className="text-blue-500 hover:underline">Manage</Link>}
                    </label>
                    <select value={selectedCharacterId || ''} onChange={(e) => setSelectedCharacterId(e.target.value || null)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-gray-300 focus:border-blue-500 outline-none">
                        <option value="">-- No Character --</option>
                        {characters.map(char => <option key={char.id} value={char.id}>{char.name}</option>)}
                    </select>
                    {/* 参考图网格 */}
                    {selectedCharacterId && refImages.length > 0 && (
                        <div className="grid grid-cols-5 gap-2 mt-2">
                             {refImages.slice(0, 5).map(img => (
                                <div key={img.id} onClick={() => setSelectedRefImage(selectedRefImage === img.image_url ? null : img.image_url)} className={`relative aspect-square rounded overflow-hidden cursor-pointer border-2 transition-all ${selectedRefImage === img.image_url ? 'border-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                                    <Image src={img.image_url} alt="Ref" fill className="object-cover" />
                                </div>
                             ))}
                        </div>
                    )}
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-zinc-500">SCENE / ENVIRONMENT</label>
                        <label className="cursor-pointer text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition">
                             {isUploadingScene ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                             Reference
                             <input type="file" className="hidden" accept="image/*" onChange={handleSceneUpload} disabled={isUploadingScene}/>
                        </label>
                    </div>
                    {sceneImageUrl && (
                        <div className="mb-2 relative w-full h-24 rounded-lg overflow-hidden border border-zinc-700 group">
                            <Image src={sceneImageUrl} alt="Scene" fill className="object-cover" />
                            <button onClick={() => setSceneImageUrl(null)} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 p-1 rounded text-white transition"><Trash2 size={12}/></button>
                        </div>
                    )}
                    <input type="text" value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} placeholder="e.g. Rainy cyberpunk street..." className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-gray-300 focus:border-green-500 outline-none" />
                 </div>
            </div>
          </div>
          
          {/* 3. Action Buttons */}
          {step === 'review' && (
             <div className="flex flex-col gap-3 animate-in fade-in">
                 <button onClick={handleGenerateImages} className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${mode === 'draft' ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}`}>
                    {mode === 'draft' ? <PenTool size={18}/> : <Sparkles size={18}/>}
                    START GENERATION
                 </button>
             </div>
          )}

        </div>

        {/* 🟢 右侧主工作区 (Main Workspace) */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          
          {/* Phase 1 新增：全局氛围输入 + 剧本输入 */}
          {step === 'input' && (
              <div className="bg-[#111] p-1 rounded-2xl border border-white/5 relative group">
                  {/* 🌤️ 全局氛围控制 */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <input 
                        type="text" 
                        value={globalAtmosphere}
                        onChange={(e) => setGlobalAtmosphere(e.target.value)}
                        placeholder="Global Atmosphere (e.g. Cinematic lighting, foggy, matrix green tint...)" 
                        className="flex-1 bg-transparent text-sm text-purple-200 placeholder-zinc-600 focus:outline-none"
                      />
                  </div>
                  
                  {/* 剧本输入 */}
                  <textarea
                    className="w-full h-[500px] bg-transparent p-6 text-gray-300 focus:outline-none resize-none text-base leading-relaxed font-mono"
                    placeholder="Enter your script here... (Scene 1: ...)"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                  />

                  {/* 📂 文件上传按钮 (右上角) */}
                  <div className="absolute top-3 right-3">
                      <input type="file" ref={fileInputRef} onChange={handleScriptFileUpload} className="hidden" accept=".txt,.md" />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all border border-white/5"
                        title="Import Script (.txt)"
                      >
                          <FileText size={16} />
                      </button>
                  </div>

                  {/* ▶️ 剧本分析按钮 (右下角) */}
                  <div className="absolute bottom-4 right-4">
                      <button 
                        onClick={handleAnalyzeScript} 
                        disabled={isAnalyzing || !script.trim()} 
                        className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                          Analyze Script
                      </button>
                  </div>
              </div>
          )}

          {/* Review 阶段：镜头列表 */}
          {step === 'review' && (
             <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-2 px-2">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Shot List ({panels.length})</h3>
                    <button onClick={handleAddPanel} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors text-white"><Plus size={14}/> Add Shot</button>
                </div>
                <div className="grid gap-3">
                    {panels.map((panel, idx) => (
                        <div key={panel.id} className="bg-[#151515] p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex flex-col md:flex-row gap-4 group">
                            {/* 序号与控制 */}
                            <div className="flex items-start gap-3 md:w-48 shrink-0">
                                <div className="w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center font-mono text-xs text-zinc-500 font-bold mt-1">{String(idx + 1).padStart(2, '0')}</div>
                                <div className="flex flex-col gap-2 w-full">
                                    <select value={panel.shotType} onChange={(e) => handleUpdatePanel(panel.id, 'shotType', e.target.value)} className="bg-black border border-zinc-800 text-yellow-500 text-[10px] font-bold px-2 py-1.5 rounded outline-none focus:border-yellow-500 uppercase tracking-wide">
                                        {CINEMATIC_SHOTS.map(shot => <option key={shot.value} value={shot.value}>{shot.label}</option>)}
                                    </select>
                                    <button onClick={() => handleDeletePanel(panel.id)} className="text-zinc-600 hover:text-red-500 text-xs flex items-center gap-1 self-start ml-1"><Trash2 size={10}/> Delete</button>
                                </div>
                            </div>
                            {/* 描述与 Prompt */}
                            <div className="flex-1">
                                <textarea 
                                    value={panel.description} 
                                    onChange={(e) => handleUpdatePanel(panel.id, 'description', e.target.value)} 
                                    className="w-full bg-transparent text-sm text-gray-300 placeholder-zinc-700 border-none focus:ring-0 p-0 resize-none leading-relaxed" 
                                    placeholder="Shot description..."
                                    rows={3} 
                                />
                                {/* 预览 Visual Prompt (Optional, hidden by default or small) */}
                                <div className="mt-2 text-[10px] text-zinc-600 truncate font-mono bg-black/30 p-1 rounded px-2">
                                    Prompt: {panel.prompt.substring(0, 60)}...
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {/* Result 阶段：成片展示 */}
          {(step === 'generating' || step === 'done') && (
            <div className="space-y-8 animate-in fade-in">
                {/* 顶部工具栏 (返回 / 导出) */}
                <div className="flex justify-between items-center">
                    <button onClick={() => setStep('review')} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"><ArrowLeft size={12}/> Back to Editor</button>
                    {step === 'done' && (
                        <button onClick={handleExportPDF} className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                            {isExporting ? <Loader2 className="animate-spin w-3 h-3"/> : <Download size={14}/>} 
                            Export PDF
                        </button>
                    )}
                </div>

                <div className={`grid gap-6 ${aspectRatio === '9:16' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                {panels.map((panel, idx) => (
                    <div key={panel.id} className={`relative bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5 group ${currentRatioClass}`}>
                    {panel.isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-sm z-10">
                            <Loader2 className="animate-spin w-8 h-8 text-yellow-500" />
                            <span className="text-[10px] text-zinc-400 mt-2 font-mono">RENDERING...</span>
                        </div>
                    ) : panel.imageUrl ? (
                        <img src={panel.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : null}

                    {/* Badge */}
                    <div className="absolute top-3 left-3 z-20 flex gap-2">
                        <span className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                            {CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || panel.shotType}
                        </span>
                    </div>

                    {/* Controls */}
                    {!panel.isLoading && (
                        <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => handleGenerateSingleImage(panel.id)}
                                className="p-2 bg-black/60 hover:bg-yellow-500 text-white hover:text-black rounded-full backdrop-blur-md border border-white/10 transition-all"
                                title="Regenerate"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    )}

                    {/* Caption */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-10 text-white z-20 translate-y-2 group-hover:translate-y-0 transition-transform">
                        <div className="flex items-start gap-2">
                            <span className="text-[10px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded font-mono mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                            <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">{panel.description}</p>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}