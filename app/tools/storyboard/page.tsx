'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  Clapperboard, Loader2, ArrowLeft, PenTool, Image as ImageIcon, Trash2, Plus, 
  PlayCircle, Download, Upload, RefreshCw, FileText, Sparkles, GripVertical, Package, RotateCcw, Zap
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { createClient } from '@/utils/supabase/client';
import { exportStoryboardPDF } from '@/utils/export-pdf';
import { parseFileToText } from '@/utils/file-parsers';
import { exportStoryboardZIP } from '@/utils/export-zip';

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type StoryboardPanel = {
  id: string;
  description: string; 
  shotType: string;    
  environment?: string; 
  prompt: string;      
  imageUrl?: string;   
  isLoading: boolean;  
}

type Character = { id: string; name: string; avatar_url: string | null; }
type CharacterImage = { id: string; image_url: string; description: string | null; }
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

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", cssClass: "aspect-video" },
  { value: "2.39:1", label: "2.39:1", cssClass: "aspect-[2.39/1]" },
  { value: "4:3", label: "4:3", cssClass: "aspect-[4/3]" },
  { value: "1:1", label: "1:1", cssClass: "aspect-square" },
  { value: "9:16", label: "9:16", cssClass: "aspect-[9/16]" },
];

const PanelCard = React.forwardRef<HTMLDivElement, any>(({ panel, idx, currentRatioClass, onDelete, onUpdate, onRegenerate, step, isOverlay, ...props }, ref) => {
    const baseClass = isOverlay 
        ? "ring-2 ring-yellow-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" 
        : "border-white/5 hover:border-white/10";

    if (step === 'generating' || step === 'done') {
        return (
            <div ref={ref} {...props} className={`relative bg-black rounded-xl overflow-hidden border transition-all group ${currentRatioClass} ${baseClass}`}>
                <div className="absolute top-2 right-2 z-40 p-1.5 bg-black/60 hover:bg-yellow-500 text-white/70 hover:text-black rounded cursor-grab active:cursor-grabbing backdrop-blur-md border border-white/10 transition-colors" title="拖拽排序">
                     <GripVertical size={14} />
                </div>
                {panel.isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin w-8 h-8 text-yellow-500" />
                    </div>
                ) : panel.imageUrl ? (
                    <img src={panel.imageUrl} className="w-full h-full object-cover" draggable={false} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#111] text-zinc-600">
                        <ImageIcon size={32} className="mb-2 opacity-20"/><span className="text-xs">等待生成</span>
                    </div>
                )}
                <div className="absolute top-2 left-2 z-20 pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider">{CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || panel.shotType}</span>
                </div>
                {!panel.isLoading && !isOverlay && (
                    <div className="absolute top-10 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => onRegenerate(panel.id)} className="p-1.5 bg-black/60 hover:bg-white text-white hover:text-black rounded backdrop-blur-md border border-white/10 transition-all" title="重绘此镜头"><RefreshCw size={14} /></button>
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-10 text-white z-20 pointer-events-none">
                    <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded font-mono mt-0.5">#{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">{panel.description}</p>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div ref={ref} {...props} className={`bg-[#151515] p-4 rounded-xl border flex flex-col md:flex-row gap-4 relative ${baseClass}`}>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing z-20"><GripVertical size={20} /></div>
            <div className="flex items-start gap-3 md:w-48 shrink-0 ml-8">
                <div className="w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center font-mono text-xs text-zinc-500 font-bold mt-1">{String(idx + 1).padStart(2, '0')}</div>
                <div className="flex flex-col gap-2 w-full">
                    <select value={panel.shotType} onChange={(e) => onUpdate(panel.id, 'shotType', e.target.value)} className="bg-black border border-zinc-800 text-yellow-500 text-[10px] font-bold px-2 py-1.5 rounded outline-none focus:border-yellow-500 uppercase tracking-wide">
                        {CINEMATIC_SHOTS.map(shot => <option key={shot.value} value={shot.value}>{shot.label}</option>)}
                    </select>
                    {!isOverlay && (<button onClick={() => onDelete(panel.id)} className="text-zinc-600 hover:text-red-500 text-xs flex items-center gap-1 self-start ml-1"><Trash2 size={10}/> Delete</button>)}
                </div>
            </div>
            <div className="flex-1">
                <textarea value={panel.description} onChange={(e) => onUpdate(panel.id, 'description', e.target.value)} className="w-full bg-transparent text-sm text-gray-300 placeholder-zinc-700 border-none focus:ring-0 p-0 resize-none leading-relaxed" placeholder="Shot description..." rows={3} />
            </div>
        </div>
    );
});
PanelCard.displayName = "PanelCard";

function SortablePanelItem(props: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.panel.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
    return (<div ref={setNodeRef} style={style} {...attributes} {...listeners}><PanelCard {...props} /></div>);
}

export default function StoryboardPage() {
  const [script, setScript] = useState('');
  const [globalAtmosphere, setGlobalAtmosphere] = useState('');
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // 🟢 新增：Mock 模式状态
  const [isMockMode, setIsMockMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const tempProjectId = "temp_workspace"; 

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => { setActiveDragId(event.active.id as string); };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPanels((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveDragId(null);
  };

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

  const handleScriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        toast.info("正在解析文件...");
        const text = await parseFileToText(file);
        if (text) {
            setScript(prev => prev + (prev ? '\n\n' : '') + text);
            toast.success(`已导入: ${file.name}`);
        } else { toast.warning("文件为空"); }
    } catch (error: any) { console.error(error); toast.error(`导入失败: ${error.message}`); } 
    finally { e.target.value = ''; }
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
        toast.success("场景图上传成功");
    } catch (error: any) { console.error(error); toast.error("上传失败: " + error.message); } 
    finally { setIsUploadingScene(false); }
  };

  const handleAnalyzeScript = async () => {
    if (!script.trim()) return;
    setIsAnalyzing(true);
    setPanels([]); 
    try {
      const breakdown = await analyzeScript(script);
      const initialPanels: StoryboardPanel[] = breakdown.panels.map((p: any) => ({
        id: crypto.randomUUID(), 
        description: p.description,
        shotType: p.shotType || 'MID SHOT',
        environment: '', prompt: p.visualPrompt, isLoading: false, 
      }));
      setPanels(initialPanels);
      setStep('review'); 
      toast.success(`剧本拆解完成`);
    } catch (error: any) { console.error(error); toast.error('拆解失败: ' + error.message); } 
    finally { setIsAnalyzing(false); }
  };

  const handleUpdatePanel = (id: string, field: keyof StoryboardPanel, value: string) => {
    setPanels(current => current.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const handleDeletePanel = (id: string) => {
    setPanels(current => current.filter(p => p.id !== id));
  };
  const handleAddPanel = () => {
    setPanels(current => [...current, {
        id: crypto.randomUUID(), description: "New shot...", shotType: "MID SHOT", environment: "", prompt: "", isLoading: false
    }]);
    setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 100);
  };

  const buildActionPrompt = (panel: StoryboardPanel) => {
    const effectiveEnv = panel.environment?.trim() || sceneDescription;
    const scenePart = effectiveEnv ? `(Environment: ${effectiveEnv}), ` : '';
    const atmospherePart = globalAtmosphere.trim() ? `(Atmosphere: ${globalAtmosphere}), ` : '';
    if (panel.prompt && panel.prompt.length > 10) return `${atmospherePart}${panel.prompt}`;
    return `${atmospherePart}${scenePart}${panel.description}`;
  };

  const handleGenerateSingleImage = async (panelId: string) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: true } : p));
    try {
        const tempShotId = `shot_${Date.now()}`; 
        const actionPrompt = buildActionPrompt(panel);
        // 🟢 传入 isMockMode 参数
        const res = await generateShotImage(
            tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
            selectedCharacterId || undefined, selectedRefImage || undefined, sceneImageUrl || undefined,
            isMockMode 
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
        toast.error(`重绘失败: ${error.message}`); 
        setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: false } : p)); 
    }
  };

  const handleGenerateImages = async () => {
    if (!sceneDescription.trim() && !sceneImageUrl) toast.warning('建议填写“场景设定”');
    setStep('generating');
    setIsDrawing(true);
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));
    for (const panel of panels) {
        try {
            const tempShotId = `shot_${Date.now()}_${panel.id.substring(0, 4)}`;
            const actionPrompt = buildActionPrompt(panel);
            // 🟢 传入 isMockMode 参数
            const res = await generateShotImage(
              tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
              selectedCharacterId || undefined, selectedRefImage || undefined, sceneImageUrl || undefined,
              isMockMode
            );
            if (res.success) {
              const successRes = res as { success: true; url: string };
              setPanels(current => current.map(p => p.id === panel.id ? { ...p, imageUrl: successRes.url, isLoading: false } : p));
            } else {
              const errorRes = res as { success: false; message: string };
              toast.error(`Shot failed: ${errorRes.message}`);
              setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
            }
        } catch (e: any) { 
            console.error(e);
            toast.error(e.message);
            setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
        }
    }
    setIsDrawing(false);
    setStep('done');
    toast.success('商业级分镜绘制完成');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info('正在生成 PDF...');
      await exportStoryboardPDF(script || "Untitled Project", panels);
      toast.success('PDF 导出成功');
    } catch (error) { toast.error('导出失败'); } finally { setIsExporting(false); }
  };
  const handleExportZIP = async () => {
    setIsExporting(true);
    try {
      toast.info('正在打包素材...');
      await exportStoryboardZIP(script.slice(0, 20) || "CineFlow", panels);
      toast.success('ZIP 素材包已下载');
    } catch (error) { toast.error('打包失败'); } finally { setIsExporting(false); }
  };

  const currentRatioClass = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.cssClass || "aspect-video";
  const activePanel = activeDragId ? panels.find(p => p.id === activeDragId) : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-sans">
      <Toaster position="top-center" richColors />
      {/* 顶部导航 */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/tools" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4 mr-2" /> 返回工作台</Link>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-600">
             <span className={step === 'input' ? 'text-yellow-500 font-bold' : ''}>01 SCRIPT</span>
             <span>/</span>
             <span className={step === 'review' ? 'text-yellow-500 font-bold' : ''}>02 SETUP</span>
             <span>/</span>
             <span className={step === 'generating' || step === 'done' ? 'text-yellow-500 font-bold' : ''}>03 RENDER</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 min-h-[600px]">
        {/* Sidebar */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 h-fit sticky top-6">
          <div className="bg-[#111] p-6 rounded-2xl border border-white/5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-400 flex items-center gap-2"><Clapperboard className="w-4 h-4 text-yellow-500" /> PROJECT SETTINGS</h2>
                
                {/* 🟢 上帝模式开关 */}
                <button 
                    onClick={() => setIsMockMode(!isMockMode)}
                    className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 border transition-colors ${isMockMode ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-black/30 border-white/10 text-zinc-600'}`}
                    title="开启后不消耗 API 额度，仅生成测试图"
                >
                    <Zap size={10} fill={isMockMode ? "currentColor" : "none"}/>
                    {isMockMode ? "MOCK ON" : "REAL API"}
                </button>
            </div>

            <div className="flex bg-black/50 rounded-lg p-1 border border-white/5">
                {ASPECT_RATIOS.map(r => (
                    <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`text-[10px] px-2 py-1 rounded transition-all ${aspectRatio === r.value ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-600 hover:text-zinc-400'}`}>{r.label}</button>
                ))}
            </div>

            {/* 模式选择 */}
            <div className="bg-black/30 p-1 rounded-lg flex border border-white/5">
                <button onClick={() => setMode('draft')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'draft' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><PenTool className="w-3 h-3" /> 草图模式</button>
                <button onClick={() => setMode('render')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'render' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><ImageIcon className="w-3 h-3" /> 精绘渲染</button>
            </div>
            {mode === 'render' && (
                <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="text-xs font-bold text-zinc-500 mb-2 block">RENDER STYLE</label>
                    <select value={stylePreset} onChange={(e) => setStylePreset(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-gray-300 focus:border-purple-500 outline-none">
                        {STYLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            )}
            <div className="space-y-4 pt-4 border-t border-white/5">
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-2 flex justify-between"><span>MAIN CHARACTER</span>{selectedCharacterId && <Link href="/tools/characters" className="text-blue-500 hover:underline">Manage</Link>}</label>
                    <select value={selectedCharacterId || ''} onChange={(e) => setSelectedCharacterId(e.target.value || null)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-gray-300 focus:border-blue-500 outline-none">
                        <option value="">-- No Character --</option>
                        {characters.map(char => <option key={char.id} value={char.id}>{char.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-2 block">SCENE / ENVIRONMENT</label>
                    <input type="text" value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} placeholder="e.g. Rainy cyberpunk street..." className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm text-gray-300 focus:border-green-500 outline-none" />
                 </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          {step === 'review' && (
             <div className="flex flex-col gap-3 animate-in fade-in">
                 <button onClick={handleGenerateImages} className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${mode === 'draft' ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'}`}>
                    {mode === 'draft' ? <PenTool size={18}/> : <Sparkles size={18}/>} START GENERATION
                 </button>
             </div>
          )}

          {/* 🟢 Sidebar 完成态: 显示交付按钮 */}
          {(step === 'generating' || step === 'done') && (
             <div className="bg-[#111] p-6 rounded-2xl border border-white/5 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                 <h2 className="text-sm font-bold text-zinc-400 flex items-center gap-2 mb-2">DELIVERY</h2>
                 <button onClick={handleExportZIP} disabled={isExporting} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5">
                    {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Package className="w-4 h-4 text-green-500"/>} Export Assets (ZIP)
                 </button>
                 <button onClick={handleExportPDF} disabled={isExporting} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5">
                    {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Download className="w-4 h-4 text-blue-500"/>} Export PDF
                 </button>
                 <div className="w-full h-[1px] bg-white/5 my-2"></div>
                 <button onClick={() => { setStep('input'); setScript(''); setPanels([]); }} className="w-full py-2 text-zinc-500 hover:text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
                    <RotateCcw className="w-3 h-3"/> Start New Project
                 </button>
             </div>
          )}
        </div>

        {/* Main Workspace */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          {step === 'input' && (
              <div className="bg-[#111] p-1 rounded-2xl border border-white/5 relative group">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <input type="text" value={globalAtmosphere} onChange={(e) => setGlobalAtmosphere(e.target.value)} placeholder="Global Atmosphere (e.g. Cinematic lighting...)" className="flex-1 bg-transparent text-sm text-purple-200 placeholder-zinc-600 focus:outline-none"/>
                  </div>
                  <textarea className="w-full h-[500px] bg-transparent p-6 text-gray-300 focus:outline-none resize-none text-base leading-relaxed font-mono" placeholder="Enter your script here... (Scene 1: ...)" value={script} onChange={(e) => setScript(e.target.value)}/>
                  <div className="absolute top-3 right-3">
                      <input type="file" ref={fileInputRef} onChange={handleScriptFileUpload} className="hidden" accept=".txt,.md,.docx,.xlsx" />
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all border border-white/5" title="Import Script"><FileText size={16} /></button>
                  </div>
                  <div className="absolute bottom-4 right-4">
                      <button onClick={handleAnalyzeScript} disabled={isAnalyzing || !script.trim()} className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                          {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <PlayCircle className="w-4 h-4" />} Analyze Script
                      </button>
                  </div>
              </div>
          )}

          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                
                {step === 'review' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Shot List ({panels.length})</h3>
                            <button onClick={handleAddPanel} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors text-white"><Plus size={14}/> Add Shot</button>
                        </div>
                        <div className="grid gap-3">
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} onDelete={handleDeletePanel} onUpdate={handleUpdatePanel} />
                            ))}
                        </div>
                    </div>
                )}

                {(step === 'generating' || step === 'done') && (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <button onClick={() => setStep('review')} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"><ArrowLeft size={12}/> Back to Editor</button>
                            {step === 'done' && (
                                <div className="flex gap-2">
                                    <button onClick={handleExportZIP} className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-zinc-700 transition-colors border border-white/10">
                                        {isExporting ? <Loader2 className="animate-spin w-3 h-3"/> : <Package size={14}/>} Assets (ZIP)
                                    </button>
                                    <button onClick={handleExportPDF} className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                                        {isExporting ? <Loader2 className="animate-spin w-3 h-3"/> : <Download size={14}/>} PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className={`grid gap-6 ${aspectRatio === '9:16' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} currentRatioClass={currentRatioClass} onRegenerate={handleGenerateSingleImage}/>
                            ))}
                        </div>
                    </div>
                )}
            </SortableContext>

            <DragOverlay>
                {activePanel ? (
                    <PanelCard 
                        panel={activePanel} 
                        idx={panels.findIndex(p => p.id === activePanel.id)} 
                        step={step} 
                        currentRatioClass={currentRatioClass} 
                        isOverlay={true} 
                    />
                ) : null}
            </DragOverlay>

          </DndContext>
        </div>
      </div>
    </div>
  );
}