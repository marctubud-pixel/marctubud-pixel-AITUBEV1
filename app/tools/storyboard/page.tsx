'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clapperboard, Loader2, ArrowLeft, PenTool, Image as ImageIcon, Trash2, Plus, 
  PlayCircle, Download, Upload, RefreshCw, FileText, Sparkles, GripVertical, Package, RotateCcw, Zap,
  User, X, Check, Globe, Settings, ChevronRight, LayoutGrid, Palette
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

// --- i18n 字典 ---
const TRANSLATIONS = {
  zh: {
    back: "返回工作台",
    step1: "01 剧本 / SCRIPT",
    step2: "02 筹备 / SETUP",
    step3: "03 渲染 / RENDER",
    mockOn: "测试模式 (MOCK)",
    mockOff: "实战模式 (API)",
    manageChars: "角色库",
    scriptPlaceholder: "在此输入剧本或上传文件... (例如：赛博朋克侦探走入雨巷...)",
    analyzeBtn: "AI 剧本拆解",
    analyzing: "分析中...",
    uploadScript: "导入文件",
    panelCount: "分镜数量",
    ratio: "画幅比例",
    auto: "智能自动",
    style: "渲染风格",
    scene: "场景/环境",
    character: "核心角色",
    atmosphere: "全局氛围",
    draftMode: "草图模式",
    renderMode: "精绘模式",
    startGen: "开始绘制分镜",
    shotList: "分镜列表",
    addShot: "新增镜头",
    exportZip: "导出素材包 (ZIP)",
    exportPdf: "导出通告单 (PDF)",
    newProject: "新建项目",
    waiting: "等待生成...",
    delivery: "交付中心",
    exportTitle: "导出设置",
    exportDesc: "填写项目元数据以生成商业级 PDF",
    projName: "项目名称",
    author: "导演/作者",
    notes: "备注信息",
    confirmExport: "确认导出",
    injectChar: "注入角色",
    noChar: "不指定"
  },
  en: {
    back: "Dashboard",
    step1: "01 SCRIPT",
    step2: "02 SETUP",
    step3: "03 RENDER",
    mockOn: "MOCK MODE",
    mockOff: "REAL API",
    manageChars: "Characters",
    scriptPlaceholder: "Enter script or upload file... (e.g. A cyberpunk detective walks...)",
    analyzeBtn: "Analyze Script",
    analyzing: "Analyzing...",
    uploadScript: "Import File",
    panelCount: "Shot Count",
    ratio: "Aspect Ratio",
    auto: "Auto",
    style: "Style",
    scene: "Scene/Env",
    character: "Main Character",
    atmosphere: "Atmosphere",
    draftMode: "Draft Mode",
    renderMode: "Render Mode",
    startGen: "Start Generation",
    shotList: "Shot List",
    addShot: "Add Shot",
    exportZip: "Export Assets (ZIP)",
    exportPdf: "Export PDF (SOP)",
    newProject: "New Project",
    waiting: "Waiting...",
    delivery: "Delivery Center",
    exportTitle: "Export Settings",
    exportDesc: "Metadata for professional PDF delivery",
    projName: "Project Name",
    author: "Director/Author",
    notes: "Notes",
    confirmExport: "Confirm Export",
    injectChar: "Inject Char",
    noChar: "None"
  }
};

// --- 类型定义 ---
type StoryboardPanel = {
  id: string;
  description: string; 
  shotType: string;    
  environment?: string; 
  prompt: string;      
  imageUrl?: string;   
  isLoading: boolean;
  characterId?: string;
  characterAvatar?: string;
}

type Character = { id: string; name: string; avatar_url: string | null; description: string; }
type CharacterImage = { id: string; image_url: string; description: string | null; }
type WorkflowStep = 'input' | 'review' | 'generating' | 'done';
type Lang = 'zh' | 'en';

// 导出元数据
type ExportMeta = {
  projectName: string;
  author: string;
  notes: string;
}

const CINEMATIC_SHOTS = [
  { value: "EXTREME WIDE SHOT", label: "大远景 (EWS)" },
  { value: "WIDE SHOT", label: "全景 (Wide)" },
  { value: "FULL SHOT", label: "全身 (Full)" },
  { value: "MID SHOT", label: "中景 (Mid)" },
  { value: "CLOSE-UP", label: "特写 (Close-Up)" },
  { value: "EXTREME CLOSE-UP", label: "大特写 (ECU)" },
  { value: "LOW ANGLE", label: "仰视" },
  { value: "HIGH ANGLE", label: "俯视" },
  { value: "OVERHEAD SHOT", label: "上帝视角" },
  { value: "DUTCH ANGLE", label: "荷兰倾斜" },
  { value: "OVER-THE-SHOULDER SHOT", label: "过肩" },
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
  { value: "16:9", label: "16:9 Cinema", cssClass: "aspect-video" },
  { value: "2.39:1", label: "2.39:1 Anamorphic", cssClass: "aspect-[2.39/1]" },
  { value: "4:3", label: "4:3 TV", cssClass: "aspect-[4/3]" },
  { value: "1:1", label: "1:1 Social", cssClass: "aspect-square" },
  { value: "9:16", label: "9:16 Vertical", cssClass: "aspect-[9/16]" },
];

// --- Sub-Components ---
const PanelCard = React.forwardRef<HTMLDivElement, any>(({ panel, idx, currentRatioClass, onDelete, onUpdate, onRegenerate, onOpenCharModal, step, isOverlay, t, ...props }, ref) => {
    const baseClass = isOverlay 
        ? "ring-2 ring-amber-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" 
        : "border-white/5 hover:border-white/10";

    // 渲染模式 (Grid View)
    if (step === 'generating' || step === 'done') {
        return (
            <div ref={ref} {...props} className={`relative bg-[#050505] rounded-lg overflow-hidden border transition-all group ${currentRatioClass} ${baseClass}`}>
                <div className="absolute top-2 right-2 z-40 p-1.5 bg-black/60 hover:bg-amber-500 text-white/70 hover:text-black rounded cursor-grab active:cursor-grabbing backdrop-blur-md border border-white/10 transition-colors">
                     <GripVertical size={14} />
                </div>
                {panel.isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin w-8 h-8 text-amber-500" />
                    </div>
                ) : panel.imageUrl ? (
                    <img src={panel.imageUrl} className="w-full h-full object-cover" draggable={false} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#111] text-zinc-600">
                        <ImageIcon size={24} className="mb-2 opacity-20"/><span className="text-[10px]">{t.waiting}</span>
                    </div>
                )}
                
                {panel.characterAvatar && (
                    <div className="absolute top-2 right-10 z-20 w-6 h-6 rounded-full border border-white/20 overflow-hidden shadow-lg">
                        <Image src={panel.characterAvatar} alt="Char" fill className="object-cover" />
                    </div>
                )}
                
                <div className="absolute top-2 left-2 z-20 pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">{CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || panel.shotType}</span>
                </div>
                
                {!panel.isLoading && !isOverlay && (
                    <div className="absolute top-10 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => onRegenerate(panel.id)} className="p-1.5 bg-black/60 hover:bg-white text-white hover:text-black rounded backdrop-blur-md border border-white/10 transition-all"><RefreshCw size={14} /></button>
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8 text-white z-20 pointer-events-none">
                    <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded font-mono mt-0.5">#{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-[10px] text-zinc-300 line-clamp-2 leading-relaxed opacity-80">{panel.description}</p>
                    </div>
                </div>
            </div>
        );
    }

    // 编辑模式 (List View)
    return (
        <div ref={ref} {...props} className={`bg-[#111] p-4 rounded-xl border flex flex-col md:flex-row gap-4 relative group ${baseClass}`}>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing z-20"><GripVertical size={20} /></div>
            
            <div className="flex items-start gap-3 md:w-48 shrink-0 ml-8">
                <div className="w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center font-mono text-xs text-zinc-500 font-bold mt-1">{String(idx + 1).padStart(2, '0')}</div>
                <div className="flex flex-col gap-2 w-full">
                    <select value={panel.shotType} onChange={(e) => onUpdate(panel.id, 'shotType', e.target.value)} className="bg-black border border-zinc-800 text-amber-500 text-[10px] font-bold px-2 py-1.5 rounded outline-none focus:border-amber-500 uppercase tracking-wide">
                        {CINEMATIC_SHOTS.map(shot => <option key={shot.value} value={shot.value}>{shot.label}</option>)}
                    </select>
                    
                    {!isOverlay && (
                      <button 
                        onClick={() => onOpenCharModal(panel.id)}
                        className={`text-[10px] flex items-center gap-1.5 px-2 py-1.5 rounded border transition-all ${panel.characterId ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                      >
                         {panel.characterAvatar ? (
                           <div className="w-3 h-3 rounded-full overflow-hidden relative"><Image src={panel.characterAvatar} alt="C" fill className="object-cover"/></div>
                         ) : <User size={10} />}
                         {panel.characterId ? t.injectChar : t.injectChar}
                      </button>
                    )}

                    {!isOverlay && (<button onClick={() => onDelete(panel.id)} className="text-zinc-600 hover:text-red-500 text-xs flex items-center gap-1 self-start ml-1 mt-1"><Trash2 size={10}/> Delete</button>)}
                </div>
            </div>

            <div className="flex-1 space-y-2">
                <textarea 
                  value={panel.description} 
                  onChange={(e) => onUpdate(panel.id, 'description', e.target.value)} 
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-700 border-none focus:ring-0 p-0 resize-none leading-relaxed font-medium" 
                  rows={2} 
                />
                <div className="w-full h-[1px] bg-white/5"></div>
                <div className="flex gap-2">
                   <span className="text-[10px] text-zinc-600 font-bold uppercase pt-1">PROMPT:</span>
                   <textarea 
                     value={panel.prompt} 
                     onChange={(e) => onUpdate(panel.id, 'prompt', e.target.value)} 
                     className="w-full bg-transparent text-xs text-zinc-400 placeholder-zinc-700 border-none focus:ring-0 p-0 resize-none leading-relaxed font-mono" 
                     rows={2} 
                   />
                </div>
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

// --- Main Page ---
export default function StoryboardPage() {
  // State
  const [lang, setLang] = useState<Lang>('zh');
  const t = TRANSLATIONS[lang];

  const [script, setScript] = useState('');
  const [globalAtmosphere, setGlobalAtmosphere] = useState('');
  const [sceneDescription, setSceneDescription] = useState(''); 
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null); 
  const [step, setStep] = useState<WorkflowStep>('input');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [mode, setMode] = useState<'draft' | 'render'>('draft'); 
  const [stylePreset, setStylePreset] = useState<string>('realistic');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [panelCountMode, setPanelCountMode] = useState<'auto' | number>('auto'); // New

  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDrawing, setIsDrawing] = useState(false);     
  const [isExporting, setIsExporting] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]); 
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null); 
  const [refImages, setRefImages] = useState<CharacterImage[]>([]);
  const [selectedRefImage, setSelectedRefImage] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  // Modals
  const [showCharModal, setShowCharModal] = useState(false);
  const [activePanelIdForModal, setActivePanelIdForModal] = useState<string | null>(null);
  
  // 🟢 Export Meta Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta>({ projectName: '', author: '', notes: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []); // Singleton fix
  const tempProjectId = "temp_workspace"; 

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Effects ---
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
      const { data, error } = await supabase.from('characters').select('id, name, avatar_url, description').order('created_at', { ascending: false });
      if (!error) setCharacters(data as Character[] || []);
    };
    fetchCharacters();
  }, []);

  // --- Handlers ---
  const handleScriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        toast.info(t.analyzing);
        const text = await parseFileToText(file);
        if (text) {
            setScript(prev => prev + (prev ? '\n\n' : '') + text);
            toast.success(`Loaded: ${file.name}`);
        }
    } catch (error: any) { toast.error(error.message); } 
    finally { e.target.value = ''; }
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
      toast.success('Script analyzed');
    } catch (error: any) { console.error(error); toast.error(error.message); } 
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
  };

  // Character Injection
  const handleOpenCharModal = (panelId: string) => {
    setActivePanelIdForModal(panelId);
    setShowCharModal(true);
  }
  const handleInjectCharacter = (char: Character) => {
    if (!activePanelIdForModal) return;
    setPanels(current => current.map(p => {
        if (p.id === activePanelIdForModal) {
            const existingPrompt = p.prompt || "";
            const charPrompt = `(Character: ${char.name}, ${char.description})`;
            const newPrompt = existingPrompt.includes(char.name) ? existingPrompt : `${existingPrompt} ${charPrompt}`.trim();
            return { ...p, characterId: char.id, characterAvatar: char.avatar_url || undefined, prompt: newPrompt };
        }
        return p;
    }));
    toast.success(`${t.injectChar}: ${char.name}`);
    setShowCharModal(false);
    setActivePanelIdForModal(null);
  };
  const handleRemoveCharacter = () => {
    if (!activePanelIdForModal) return;
    setPanels(current => current.map(p => p.id === activePanelIdForModal ? { ...p, characterId: undefined, characterAvatar: undefined } : p));
    setShowCharModal(false);
  }

  // Generation Logic
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
        const effectiveCharId = panel.characterId || selectedCharacterId || undefined;
        const res = await generateShotImage(
            tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
            effectiveCharId, undefined, undefined, isMockMode 
        );
        if (res.success) {
            setPanels(current => current.map(p => p.id === panelId ? { ...p, imageUrl: (res as any).url, isLoading: false } : p));
            toast.success('Shot Rendered');
        } else { throw new Error((res as any).message); }
    } catch (error: any) { toast.error(error.message); setPanels(current => current.map(p => p.id === panelId ? { ...p, isLoading: false } : p)); }
  };

  const handleGenerateImages = async () => {
    setStep('generating');
    setIsDrawing(true);
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));
    for (const panel of panels) {
        try {
            const tempShotId = `shot_${Date.now()}_${panel.id.substring(0, 4)}`;
            const actionPrompt = buildActionPrompt(panel);
            const effectiveCharId = panel.characterId || selectedCharacterId || undefined;
            const res = await generateShotImage(
              tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
              effectiveCharId, undefined, undefined, isMockMode
            );
            if (res.success) {
              setPanels(current => current.map(p => p.id === panel.id ? { ...p, imageUrl: (res as any).url, isLoading: false } : p));
            } else {
              setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
            }
        } catch (e: any) { 
            console.error(e);
            setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
        }
    }
    setIsDrawing(false);
    setStep('done');
    toast.success('Batch generation complete');
  };

  // 🟢 Fixed: Export Logic
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info('Generating PDF...');
      
      // 构建完整的元数据对象
      const metaData = {
          projectName: exportMeta.projectName || "Untitled Project",
          author: exportMeta.author || "Director",
          notes: exportMeta.notes || ""
      };

      // 传入 metaData 对象
      await exportStoryboardPDF(metaData, panels);
      
      toast.success('PDF Exported');
      setShowExportModal(false);
    } catch (error: any) { 
        console.error(error);
        toast.error('Export failed'); 
    } finally { 
        setIsExporting(false); 
    }
  };

  const handleExportZIP = async () => {
    setIsExporting(true);
    try {
      toast.info('Zipping assets...');
      await exportStoryboardZIP(script.slice(0, 20) || "CineFlow", panels);
      toast.success('ZIP Downloaded');
    } catch (error) { toast.error('Export failed'); } finally { setIsExporting(false); }
  };

  // CSS for Grid
  const currentRatioClass = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.cssClass || "aspect-video";
  const activePanel = activeDragId ? panels.find(p => p.id === activeDragId) : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500/30">
      <Toaster position="top-center" richColors theme="dark"/>
      
      {/* 🟢 Modals */}
      {showCharModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-[#111] w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
                      <h3 className="font-bold flex items-center gap-2 text-sm"><User size={16} className="text-amber-500" /> {t.injectChar}</h3>
                      <button onClick={() => setShowCharModal(false)}><X size={18} className="text-zinc-500 hover:text-white"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                          <button onClick={handleRemoveCharacter} className="aspect-square rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500 flex flex-col items-center justify-center gap-2 group">
                              <X className="text-zinc-600 group-hover:text-red-500" /> <span className="text-xs text-zinc-500">{t.noChar}</span>
                          </button>
                          {characters.map(char => (
                              <button key={char.id} onClick={() => handleInjectCharacter(char)} className="relative aspect-square rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500 overflow-hidden group">
                                  {char.avatar_url ? <Image src={char.avatar_url} alt={char.name} fill className="object-cover"/> : <User className="text-zinc-700"/>}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2"><span className="text-xs font-bold truncate">{char.name}</span></div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-[#111] w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{t.exportTitle}</h3>
                <p className="text-sm text-zinc-500">{t.exportDesc}</p>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.projName}</label>
                    <input value={exportMeta.projectName} onChange={e => setExportMeta({...exportMeta, projectName: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-amber-500 outline-none" placeholder="My Awesome Movie" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.author}</label>
                    <input value={exportMeta.author} onChange={e => setExportMeta({...exportMeta, author: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-amber-500 outline-none" placeholder="Director Name" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.notes}</label>
                    <textarea value={exportMeta.notes} onChange={e => setExportMeta({...exportMeta, notes: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-amber-500 outline-none h-20 resize-none" placeholder="Confidential info..." />
                 </div>
              </div>
              <div className="flex gap-3 pt-2">
                 <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm font-bold transition-colors">Cancel</button>
                 <button onClick={handleExportPDF} disabled={isExporting} className="flex-1 py-3 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                    {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Check size={16}/>} {t.confirmExport}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 🟢 Header / Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
           <Link href="/tools" className="flex items-center text-zinc-500 hover:text-white transition-colors text-sm font-bold gap-2"><ArrowLeft size={16}/> {t.back}</Link>
           <div className="h-4 w-[1px] bg-white/10"></div>
           {/* Steps Indicator */}
           <div className="flex items-center gap-4 text-xs font-mono font-bold tracking-wider">
               <span className={`${step === 'input' ? 'text-amber-500' : 'text-zinc-600'}`}>{t.step1}</span>
               <span className="text-zinc-800">/</span>
               <span className={`${step === 'review' ? 'text-amber-500' : 'text-zinc-600'}`}>{t.step2}</span>
               <span className="text-zinc-800">/</span>
               <span className={`${step === 'generating' || step === 'done' ? 'text-amber-500' : 'text-zinc-600'}`}>{t.step3}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
             {/* Mock Toggle */}
             <button onClick={() => setIsMockMode(!isMockMode)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 ${isMockMode ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                <Zap size={10} fill={isMockMode ? "currentColor" : "none"}/> {isMockMode ? t.mockOn : t.mockOff}
             </button>
             {/* Lang Toggle */}
             <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Switch Language">
                <Globe size={18}/>
             </button>
             {/* Character Library Link */}
             <Link href="/tools/characters" className="p-2 text-zinc-500 hover:text-amber-500 transition-colors" title={t.manageChars}>
                <User size={18}/>
             </Link>
        </div>
      </div>

      {/* 🟢 Main Content Area */}
      <div className="pt-24 pb-12 px-6 min-h-screen">
        
        {/* === STEP 1: SCRIPT (Minimalist Center) === */}
        {step === 'input' && (
           <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center min-h-[70vh]">
              <div className="w-full space-y-8">
                 <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">CINEFLOW <span className="text-amber-500">ENGINE</span></h1>
                    <p className="text-zinc-500 text-sm">AI-Powered Storyboard Generation System V3.1</p>
                 </div>
                 
                 <div className="relative group">
                    <textarea 
                      className="w-full h-64 bg-[#111] border border-white/10 rounded-2xl p-6 text-lg text-gray-200 focus:outline-none focus:border-amber-500/50 transition-all resize-none shadow-2xl leading-relaxed custom-scrollbar placeholder:text-zinc-700" 
                      placeholder={t.scriptPlaceholder}
                      value={script} 
                      onChange={(e) => setScript(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                         <input type="file" ref={fileInputRef} onChange={handleScriptFileUpload} className="hidden" accept=".txt,.md,.docx,.xlsx" />
                         <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white border border-white/5 transition-colors" title={t.uploadScript}><FileText size={16}/></button>
                    </div>
                 </div>

                 <div className="flex gap-4 p-4 bg-[#111] rounded-xl border border-white/5">
                     <div className="flex-1">
                        <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-wider">{t.ratio}</label>
                        <div className="flex gap-1">
                            {ASPECT_RATIOS.slice(0,3).map(r => (
                                <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${aspectRatio === r.value ? 'bg-amber-500 text-black' : 'bg-black text-zinc-600 hover:bg-zinc-900'}`}>{r.label.split(' ')[0]}</button>
                            ))}
                        </div>
                     </div>
                     <div className="flex-1">
                        <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase tracking-wider">{t.panelCount}</label>
                        <div className="flex gap-1 bg-black rounded-md p-1">
                           <button onClick={() => setPanelCountMode('auto')} className={`flex-1 py-1 text-xs font-bold rounded transition-all ${panelCountMode === 'auto' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>{t.auto}</button>
                           {[6, 9, 12].map(n => (
                               <button key={n} onClick={() => setPanelCountMode(n)} className={`flex-1 py-1 text-xs font-bold rounded transition-all ${panelCountMode === n ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>{n}</button>
                           ))}
                        </div>
                     </div>
                 </div>

                 <button onClick={handleAnalyzeScript} disabled={isAnalyzing || !script.trim()} className="w-full py-5 bg-white hover:bg-gray-200 text-black font-black text-lg rounded-full transition-all shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                     {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles className="fill-black" />} {t.analyzeBtn}
                 </button>
              </div>
           </div>
        )}

        {/* === STEP 2: SETUP (Director Console) === */}
        {step === 'review' && (
           <div className="max-w-[1600px] mx-auto flex gap-8 animate-in fade-in">
              {/* Left Console (Sticky) */}
              <div className="w-80 shrink-0 space-y-6 h-fit sticky top-24">
                 <div className="bg-[#111] p-5 rounded-2xl border border-white/5 space-y-6">
                    <h2 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest"><Settings size={12}/> Global Settings</h2>
                    
                    {/* Atmosphere */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.atmosphere}</label>
                       <div className="flex items-center gap-2 bg-black border border-zinc-800 p-2 rounded-lg focus-within:border-amber-500 transition-colors">
                          <Sparkles size={14} className="text-purple-500 shrink-0"/>
                          <input value={globalAtmosphere} onChange={(e) => setGlobalAtmosphere(e.target.value)} placeholder="Cinematic, Dark..." className="bg-transparent text-xs text-white placeholder-zinc-700 outline-none w-full font-bold"/>
                       </div>
                    </div>

                    {/* Scene */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.scene}</label>
                       <div className="flex items-center gap-2 bg-black border border-zinc-800 p-2 rounded-lg focus-within:border-green-500 transition-colors">
                          <LayoutGrid size={14} className="text-green-500 shrink-0"/>
                          <input value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} placeholder="Rainy street..." className="bg-transparent text-xs text-white placeholder-zinc-700 outline-none w-full font-bold"/>
                       </div>
                    </div>

                    {/* Character */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase flex justify-between">{t.character} <Link href="/tools/characters" className="text-amber-500 hover:underline">Edit</Link></label>
                       <div className="relative">
                           <select value={selectedCharacterId || ''} onChange={(e) => setSelectedCharacterId(e.target.value || null)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none appearance-none font-bold">
                               <option value="">-- {t.noChar} --</option>
                               {characters.map(char => <option key={char.id} value={char.id}>{char.name}</option>)}
                           </select>
                           <User size={14} className="absolute right-3 top-2.5 text-zinc-500 pointer-events-none"/>
                       </div>
                    </div>
                    
                    {/* Style & Mode */}
                    <div className="pt-4 border-t border-white/5 space-y-4">
                        <div className="flex bg-black p-1 rounded-lg">
                            <button onClick={() => setMode('draft')} className={`flex-1 py-2 rounded text-[10px] font-bold transition-all ${mode === 'draft' ? 'bg-amber-500 text-black' : 'text-zinc-500'}`}>{t.draftMode}</button>
                            <button onClick={() => setMode('render')} className={`flex-1 py-2 rounded text-[10px] font-bold transition-all ${mode === 'render' ? 'bg-purple-600 text-white' : 'text-zinc-500'}`}>{t.renderMode}</button>
                        </div>
                        {mode === 'render' && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase">{t.style}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {STYLE_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => setStylePreset(opt.value)} className={`text-[9px] py-1.5 border rounded px-2 truncate transition-all ${stylePreset === opt.value ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}>{opt.label.split(' ')[1] || opt.label}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={handleGenerateImages} className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black rounded-xl shadow-lg hover:shadow-white/10 transition-all flex items-center justify-center gap-2">
                        {mode === 'draft' ? <PenTool size={18}/> : <Palette size={18}/>} {t.startGen}
                    </button>
                 </div>
              </div>

              {/* Right Panel List */}
              <div className="flex-1 space-y-4">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t.shotList} ({panels.length})</h3>
                    <button onClick={handleAddPanel} className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-white/5 transition-colors flex items-center gap-2"><Plus size={14}/> {t.addShot}</button>
                 </div>
                 
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid gap-3">
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} onDelete={handleDeletePanel} onUpdate={handleUpdatePanel} onOpenCharModal={handleOpenCharModal} t={t}/>
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activePanel ? <PanelCard panel={activePanel} idx={panels.findIndex(p => p.id === activePanel.id)} step={step} isOverlay={true} t={t}/> : null}
                    </DragOverlay>
                 </DndContext>
              </div>
           </div>
        )}

        {/* === STEP 3: RENDER (Wide Grid) === */}
        {(step === 'generating' || step === 'done') && (
            <div className="max-w-[1920px] mx-auto animate-in fade-in space-y-8">
                 <div className="flex justify-between items-center px-4">
                     <button onClick={() => setStep('review')} className="text-xs font-bold text-zinc-500 hover:text-white flex items-center gap-2 transition-colors"><ArrowLeft size={14}/> Back to Setup</button>
                     <div className="flex items-center gap-4">
                         <div className="text-xs font-mono text-zinc-600">
                             TOTAL: <span className="text-white">{panels.length}</span> SHOTS | RATIO: <span className="text-white">{aspectRatio}</span>
                         </div>
                     </div>
                 </div>

                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className={`grid gap-4 px-4 ${aspectRatio === '9:16' ? 'grid-cols-3 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} currentRatioClass={currentRatioClass} onRegenerate={handleGenerateSingleImage} t={t}/>
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activePanel ? <PanelCard panel={activePanel} idx={panels.findIndex(p => p.id === activePanel.id)} step={step} currentRatioClass={currentRatioClass} isOverlay={true} t={t}/> : null}
                    </DragOverlay>
                 </DndContext>

                 {/* Bottom Delivery Bar */}
                 {step === 'done' && (
                     <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#111]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex gap-2 shadow-2xl animate-in slide-in-from-bottom-10 z-40">
                         <button onClick={() => setShowExportModal(true)} disabled={isExporting} className="px-6 py-3 bg-white hover:bg-gray-200 text-black font-black rounded-xl text-xs flex items-center gap-2 transition-all">
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Download size={16}/>} {t.exportPdf}
                         </button>
                         <div className="w-[1px] bg-white/10 mx-1"></div>
                         <button onClick={handleExportZIP} disabled={isExporting} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all">
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Package size={16}/>} {t.exportZip}
                         </button>
                         <button onClick={() => { setStep('input'); setScript(''); setPanels([]); }} className="px-4 py-3 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl transition-all">
                             <RotateCcw size={16}/>
                         </button>
                     </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
}