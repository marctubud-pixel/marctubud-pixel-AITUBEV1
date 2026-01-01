'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clapperboard, Loader2, ArrowLeft, PenTool, Image as ImageIcon, Trash2, Plus, 
  Download, RefreshCw, FileText, Sparkles, GripVertical, Package, RotateCcw, Zap,
  User, X, Check, Globe, Settings, ChevronRight, LayoutGrid, Palette,
  Sun, Moon, Paperclip, Ratio, Send, ChevronDown, MoreHorizontal, Flame, CloudRain, Zap as ZapIcon,
  Maximize2, Eye, ArrowUp, ArrowDown, Repeat, Wand2, ChevronLeft
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { repaintShotWithCharacter } from '@/app/actions/repaint'; 
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

// --- i18n ---
const TRANSLATIONS = {
  zh: {
    back: "返回",
    step1: "剧本",
    step2: "筹备",
    step3: "渲染",
    mockOn: "Mock On",
    mockOff: "Real API",
    manageChars: "角色库",
    scriptPlaceholder: "输入你的故事，或上传剧本文件...",
    analyzeBtn: "拆解剧本",
    analyzing: "AI 思考中...",
    uploadScript: "上传文件",
    panelCount: "分镜数量",
    ratio: "画幅",
    auto: "自动",
    style: "美术风格",
    scene: "场景/环境",
    character: "核心角色",
    atmosphere: "氛围基调",
    draftMode: "线稿模式 (Draft)",
    renderMode: "精绘模式 (Render)",
    startGen: "生成分镜",
    shotList: "分镜表",
    addShot: "加镜头",
    exportZip: "素材包",
    exportPdf: "通告单",
    newProject: "新项目",
    waiting: "待生成...",
    delivery: "交付",
    exportTitle: "导出设置",
    exportDesc: "填写项目元数据以生成商业级 PDF",
    projName: "项目名称",
    author: "导演/作者",
    notes: "备注信息",
    confirmExport: "确认导出",
    injectChar: "注入角色",
    noChar: "不指定",
    cameraAngle: "拍摄角度",
    casting: "选角替换" 
  },
  en: {
    back: "Back",
    step1: "Script",
    step2: "Setup",
    step3: "Render",
    mockOn: "Mock On",
    mockOff: "Real API",
    manageChars: "Library",
    scriptPlaceholder: "Tell your story...",
    analyzeBtn: "Analyze",
    analyzing: "Thinking...",
    uploadScript: "Upload",
    panelCount: "Shots",
    ratio: "Ratio",
    auto: "Auto",
    style: "Art Style",
    scene: "Scene",
    character: "Hero",
    atmosphere: "Vibe",
    draftMode: "Draft Mode",
    renderMode: "Render Mode",
    startGen: "Generate",
    shotList: "Shots",
    addShot: "Add Shot",
    exportZip: "Assets",
    exportPdf: "PDF (SOP)",
    newProject: "New",
    waiting: "Waiting...",
    delivery: "Delivery",
    exportTitle: "Export Settings",
    exportDesc: "Metadata for professional PDF delivery",
    projName: "Project Name",
    author: "Director",
    notes: "Notes",
    confirmExport: "Export",
    injectChar: "Inject",
    noChar: "None",
    cameraAngle: "Angle",
    casting: "Casting"
  }
};

type StoryboardPanel = {
  id: string;
  description: string; 
  shotType: string;    
  cameraAngle?: string; 
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
type Theme = 'light' | 'dark';

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
];

const CAMERA_ANGLES = [
  { value: "EYE LEVEL", label: "👁️ 平视 (Eye)", desc: "Neutral" },
  { value: "LOW ANGLE", label: "⬆️ 仰视 (Low)", desc: "Powerful" },
  { value: "HIGH ANGLE", label: "⬇️ 俯视 (High)", desc: "Vulnerable" },
  { value: "OVERHEAD SHOT", label: "🚁 上帝视角 (Top)", desc: "Map View" },
  { value: "DUTCH ANGLE", label: "📐 荷兰倾斜 (Dutch)", desc: "Unease" },
  { value: "OVER-THE-SHOULDER", label: "👥 过肩 (OTS)", desc: "Dialog" },
];

const STYLE_OPTIONS = [
  { value: "realistic", label: "电影实拍", sub: "Cinematic", color: "from-blue-900 to-slate-900" },
  { value: "anime_jp", label: "日本动画", sub: "Ghibli", color: "from-pink-500 to-rose-500" },
  { value: "anime_us", label: "美漫风格", sub: "Comics", color: "from-yellow-500 to-orange-600" },
  { value: "cyberpunk", label: "赛博朋克", sub: "Neon", color: "from-purple-600 to-blue-600" },
  { value: "noir", label: "黑色电影", sub: "B&W", color: "from-gray-800 to-black" },
  { value: "pixar", label: "皮克斯3D", sub: "Cute", color: "from-blue-400 to-cyan-400" },
  { value: "watercolor", label: "水彩手绘", sub: "Soft", color: "from-emerald-400 to-teal-500" },
  { value: "ink", label: "中国水墨", sub: "Ink", color: "from-stone-500 to-stone-800" },
];

const ATMOSPHERE_TAGS = [
    { label: "🔥 Cinematic", val: "cinematic lighting, dramatic atmosphere" },
    { label: "🌑 Dark/Noir", val: "dark, moody, low key lighting, noir" },
    { label: "☀️ Warm/Happy", val: "warm lighting, sunny, happy atmosphere" },
    { label: "🤖 Cyberpunk", val: "neon lights, futuristic, cyberpunk atmosphere" },
    { label: "👻 Horror", val: "foggy, scary, horror atmosphere, dim light" },
    { label: "🌫️ Dreamy", val: "soft focus, dreamy, ethereal, glow" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 Cinema", cssClass: "aspect-video" },
  { value: "2.39:1", label: "2.39:1 Anamorphic", cssClass: "aspect-[2.39/1]" },
  { value: "4:3", label: "4:3 TV", cssClass: "aspect-[4/3]" },
  { value: "1:1", label: "1:1 Social", cssClass: "aspect-square" },
  { value: "9:16", label: "9:16 Vertical", cssClass: "aspect-[9/16]" },
];

// --- PanelCard ---
const PanelCard = React.forwardRef<HTMLDivElement, any>(({ panel, idx, currentRatioClass, onDelete, onUpdate, onRegenerate, onOpenCharModal, onImageClick, step, isOverlay, t, isDark, ...props }, ref) => {
    const cardBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
    const cardBorder = isDark ? "border-zinc-800" : "border-gray-100";
    const textColor = isDark ? "text-gray-200" : "text-gray-800";
    const subTextColor = isDark ? "text-zinc-500" : "text-gray-400";
    const baseClass = isOverlay ? "ring-2 ring-blue-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" : `${cardBorder} hover:shadow-md transition-shadow duration-300`;

    if (step === 'generating' || step === 'done') {
        return (
            <div ref={ref} {...props} className={`relative ${cardBg} rounded-2xl overflow-hidden border ${baseClass} ${currentRatioClass} group`}>
                <div className={`absolute top-2 right-2 z-40 p-1.5 rounded-full cursor-grab active:cursor-grabbing backdrop-blur-md transition-colors ${isDark ? 'bg-black/50 hover:bg-blue-500 text-white' : 'bg-white/50 hover:bg-blue-500 text-black hover:text-white'}`}>
                     <GripVertical size={14} />
                </div>
                
                {/* 🟢 Click index instead of panel object */}
                <div className="w-full h-full cursor-pointer" onDoubleClick={() => onImageClick(idx)}>
                    {panel.isLoading ? (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10 ${isDark ? 'bg-zinc-900/50' : 'bg-white/50'}`}>
                            <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
                        </div>
                    ) : panel.imageUrl ? (
                        <img src={panel.imageUrl} className="w-full h-full object-cover" draggable={false} />
                    ) : (
                        <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
                            <ImageIcon size={24} className={`${isDark ? 'text-zinc-700' : 'text-gray-300'} mb-2`}/><span className="text-[10px] text-zinc-500">{t.waiting}</span>
                        </div>
                    )}
                </div>
                
                {panel.characterAvatar && (
                    <div className="absolute top-2 right-10 z-20 w-6 h-6 rounded-full border-2 border-white/20 overflow-hidden shadow-lg">
                        <Image src={panel.characterAvatar} alt="Char" fill className="object-cover" />
                    </div>
                )}
                
                <div className="absolute top-2 left-2 z-20 pointer-events-none flex gap-1">
                    <span className="bg-black/50 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-full uppercase">{CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || panel.shotType}</span>
                    {panel.cameraAngle && panel.cameraAngle !== 'EYE LEVEL' && (
                        <span className="bg-blue-600/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-full uppercase">{CAMERA_ANGLES.find(a => a.value === panel.cameraAngle)?.label.split(' ')[1] || panel.cameraAngle}</span>
                    )}
                </div>
                
                {!panel.isLoading && !isOverlay && (
                    <div className="absolute top-10 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                         <button onClick={() => onRegenerate(panel.id)} className="p-1.5 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all"><RefreshCw size={14} /></button>
                         <button onClick={() => onImageClick(idx)} className="p-1.5 bg-black/60 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md transition-all"><Maximize2 size={14} /></button>
                    </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 text-white z-20 pointer-events-none">
                    <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded font-mono mt-0.5">#{String(idx + 1).padStart(2, '0')}</span>
                        <p className="text-[10px] text-zinc-100 line-clamp-2 leading-relaxed opacity-90 font-medium">{panel.description}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={ref} {...props} className={`${cardBg} p-4 rounded-2xl border ${cardBorder} flex flex-col md:flex-row gap-4 relative group hover:border-blue-500/30 transition-all shadow-sm`}>
            <div className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 cursor-grab active:cursor-grabbing z-20 ${subTextColor} hover:text-blue-500`}><GripVertical size={20} /></div>
            
            <div className="flex items-start gap-3 md:w-48 shrink-0 ml-8">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold mt-1 ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>{String(idx + 1).padStart(2, '0')}</div>
                <div className="flex flex-col gap-2 w-full">
                    <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-500 uppercase">Shot Size</label>
                        <select value={panel.shotType} onChange={(e) => onUpdate(panel.id, 'shotType', e.target.value)} className={`w-full bg-transparent border ${isDark ? 'border-zinc-700 text-blue-400' : 'border-gray-200 text-blue-600'} text-[10px] font-bold px-2 py-1.5 rounded-lg outline-none focus:border-blue-500 uppercase tracking-wide`}>
                            {CINEMATIC_SHOTS.map(shot => <option key={shot.value} value={shot.value}>{shot.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-500 uppercase">Angle</label>
                        <select value={panel.cameraAngle || 'EYE LEVEL'} onChange={(e) => onUpdate(panel.id, 'cameraAngle', e.target.value)} className={`w-full bg-transparent border ${isDark ? 'border-zinc-700 text-purple-400' : 'border-gray-200 text-purple-600'} text-[10px] font-bold px-2 py-1.5 rounded-lg outline-none focus:border-purple-500 uppercase tracking-wide`}>
                            {CAMERA_ANGLES.map(angle => <option key={angle.value} value={angle.value}>{angle.label}</option>)}
                        </select>
                    </div>
                    {!isOverlay && (<button onClick={() => onDelete(panel.id)} className="text-zinc-400 hover:text-red-500 text-xs flex items-center gap-1 self-start ml-1 mt-1"><Trash2 size={12}/> Delete</button>)}
                </div>
            </div>

            <div className="flex-1 space-y-2">
                <textarea 
                  value={panel.description} 
                  onChange={(e) => onUpdate(panel.id, 'description', e.target.value)} 
                  className={`w-full bg-transparent text-sm ${textColor} placeholder-zinc-500 border-none focus:ring-0 p-0 resize-none leading-relaxed font-medium`}
                  rows={2} 
                  placeholder="Describe the action..."
                />
                <div className={`w-full h-[1px] ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}></div>
                <div className="flex gap-2">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase pt-1">PROMPT:</span>
                   <textarea 
                     value={panel.prompt} 
                     onChange={(e) => onUpdate(panel.id, 'prompt', e.target.value)} 
                     className="w-full bg-transparent text-xs text-zinc-500 placeholder-zinc-600 border-none focus:ring-0 p-0 resize-none leading-relaxed font-mono" 
                     rows={2} 
                     placeholder="AI visual details..."
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
  const [theme, setTheme] = useState<Theme>('light');
  const isDark = theme === 'dark';
  const [lang, setLang] = useState<Lang>('zh');
  const t = TRANSLATIONS[lang];

  const [script, setScript] = useState('');
  const [globalAtmosphere, setGlobalAtmosphere] = useState('');
  
  const [sceneDescription, setSceneDescription] = useState(''); 
  const [step, setStep] = useState<WorkflowStep>('input');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [mode, setMode] = useState<'draft' | 'render'>('draft'); 
  const [stylePreset, setStylePreset] = useState<string>('realistic');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDrawing, setIsDrawing] = useState(false);     
  const [isExporting, setIsExporting] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]); 
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null); 
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  
  // 🟢 Lightbox & Casting State
  // 🔥 Change: Store 'index' not 'object' to allow next/prev
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isRepainting, setIsRepainting] = useState(false);
  const [showCastingModal, setShowCastingModal] = useState(false);

  // Modals
  const [showCharModal, setShowCharModal] = useState(false);
  const [activePanelIdForModal, setActivePanelIdForModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta>({ projectName: '', author: '', notes: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []); 
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
      const { data, error } = await supabase.from('characters').select('id, name, avatar_url, description').order('created_at', { ascending: false });
      if (!error) setCharacters(data as Character[] || []);
    };
    fetchCharacters();
  }, []);

  // 🟢 Keyboard Navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft') setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
      if (e.key === 'ArrowRight') setLightboxIndex(prev => (prev !== null && prev < panels.length - 1 ? prev + 1 : prev));
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, panels.length]);

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
        cameraAngle: 'EYE LEVEL', 
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
        id: crypto.randomUUID(), description: "New shot...", shotType: "MID SHOT", cameraAngle: "EYE LEVEL", environment: "", prompt: "", isLoading: false
    }]);
  };

  const handleOpenCharModal = (panelId: string) => { setActivePanelIdForModal(panelId); setShowCharModal(true); }
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

  const toggleAtmosphere = (tag: string) => {
      if (globalAtmosphere.includes(tag)) {
          setGlobalAtmosphere(prev => prev.replace(tag, "").replace(/,\s*,/g, ",").replace(/^,|,$/g, ""));
      } else {
          setGlobalAtmosphere(prev => prev ? `${prev}, ${tag}` : tag);
      }
  };

  const buildActionPrompt = (panel: StoryboardPanel) => {
    const effectiveEnv = panel.environment?.trim() || sceneDescription;
    const scenePart = effectiveEnv ? `(Environment: ${effectiveEnv}), ` : '';
    const atmospherePart = globalAtmosphere.trim() ? `(Atmosphere: ${globalAtmosphere}), ` : '';
    const anglePart = panel.cameraAngle && panel.cameraAngle !== 'EYE LEVEL' ? `(Camera Angle: ${panel.cameraAngle}), ` : '';
    if (panel.prompt && panel.prompt.length > 10) return `${atmospherePart}${anglePart}${panel.prompt}`;
    return `${atmospherePart}${scenePart}${anglePart}${panel.description}`;
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
            effectiveCharId, undefined, undefined, isMockMode, 
            panel.cameraAngle || 'EYE LEVEL'
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
              effectiveCharId, undefined, undefined, isMockMode,
              panel.cameraAngle || 'EYE LEVEL'
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

  // ... 在 page.tsx 文件中找到这个函数 ...

  const handleCastingSelect = async (char: Character) => {
    if (lightboxIndex === null) return;
    const currentPanel = panels[lightboxIndex];
    if (!currentPanel || !currentPanel.imageUrl) return;
    
    setIsRepainting(true);
    setShowCastingModal(false);
    // 🟢 提示信息区分模式
    const toastMsg = mode === 'draft' ? `Redrawing inject ${char.name} as sketch...` : `Injecting ${char.name} into shot...`;
    const toastId = toast.loading(toastMsg);

    try {
        const actionPrompt = buildActionPrompt(currentPanel);
        const res = await repaintShotWithCharacter(
            currentPanel.id,
            currentPanel.imageUrl,
            char.id,
            actionPrompt,
            tempProjectId,
            aspectRatio,
            mode === 'draft' // 🟢 核心修复：传入当前是否为 Draft 模式
        );

        if (res.success) {
            setPanels(current => current.map(p => p.id === currentPanel.id ? { ...p, imageUrl: (res as any).url, characterId: char.id, characterAvatar: char.avatar_url || undefined } : p));
            toast.success("Character Injected Successfully", { id: toastId });
        } else {
            throw new Error((res as any).message);
        }
    } catch (e: any) {
        toast.error(e.message, { id: toastId });
    } finally {
        setIsRepainting(false);
    }
};

// ... 函数结束 ...

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info('Generating PDF...');
      const metaData = {
          projectName: exportMeta.projectName || "Untitled Project",
          author: exportMeta.author || "Director",
          notes: exportMeta.notes || ""
      };
      await exportStoryboardPDF(metaData, panels);
      toast.success('PDF Exported');
      setShowExportModal(false);
    } catch (error: any) { console.error(error); toast.error('Export failed'); } finally { setIsExporting(false); }
  };

  const handleExportZIP = async () => {
    setIsExporting(true);
    try {
      toast.info('Zipping assets...');
      await exportStoryboardZIP(script.slice(0, 20) || "CineFlow", panels);
      toast.success('ZIP Downloaded');
    } catch (error) { toast.error('Export failed'); } finally { setIsExporting(false); }
  };

  const currentRatioClass = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.cssClass || "aspect-video";
  const activePanel = activeDragId ? panels.find(p => p.id === activeDragId) : null;
  const pageBg = isDark ? "bg-[#131314] text-white" : "bg-[#f0f4f9] text-gray-900";
  const containerBg = isDark ? "bg-[#1e1e1e] border-zinc-800" : "bg-white border-white shadow-sm";
  const headerBg = isDark ? "bg-[#131314]/80 border-white/5" : "bg-[#f0f4f9]/80 border-black/5";
  const inputBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
  const buttonBg = isDark ? "bg-[#2d2d2d] hover:bg-[#3d3d3d]" : "bg-[#e3e3e3] hover:bg-[#d3d3d3] text-black";

  // Helper to get current panel from index
  const currentLightboxPanel = lightboxIndex !== null ? panels[lightboxIndex] : null;

  return (
    <div className={`min-h-screen ${pageBg} font-sans transition-colors duration-300`}>
      <Toaster position="top-center" richColors theme={isDark ? "dark" : "light"}/>
      
      {/* 🟢 Improved Lightbox Navigation */}
      {currentLightboxPanel && currentLightboxPanel.imageUrl && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
              <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50"><X size={32} /></button>
              
              {/* Prev Button */}
              {lightboxIndex !== null && lightboxIndex > 0 && (
                  <button onClick={() => setLightboxIndex(lightboxIndex - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-4 z-50 transition-colors">
                      <ChevronLeft size={48} />
                  </button>
              )}
              {/* Next Button */}
              {lightboxIndex !== null && lightboxIndex < panels.length - 1 && (
                  <button onClick={() => setLightboxIndex(lightboxIndex + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-4 z-50 transition-colors">
                      <ChevronRight size={48} />
                  </button>
              )}

              <div className="relative w-full h-[80vh] flex items-center justify-center">
                  <img src={currentLightboxPanel.imageUrl} className="max-w-full max-h-full object-contain shadow-2xl scale-100 animate-in zoom-in-95 duration-200 rounded-lg" />
                  {isRepainting && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
                          <Loader2 className="animate-spin text-white w-12 h-12 mb-4" />
                          <p className="text-white font-bold tracking-wider">REPAINTING SCENE...</p>
                      </div>
                  )}
              </div>

              <div className="mt-6 flex gap-4">
                  <button 
                    onClick={() => setShowCastingModal(true)} 
                    disabled={isRepainting}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-full flex items-center gap-2 shadow-lg hover:shadow-blue-500/50 transition-all"
                  >
                      {isRepainting ? <Loader2 className="animate-spin w-5 h-5"/> : <Wand2 size={20} />}
                      {t.casting} (Inject Character)
                  </button>
              </div>
          </div>
      )}

      {/* 🟢 Casting Modal */}
      {showCastingModal && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[70vh]`}>
                  <div className="p-4 border-b border-white/10 flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2 text-white"><User size={18} /> Select Character to Inject</h3>
                      <button onClick={() => setShowCastingModal(false)}><X size={20} className="text-white/50 hover:text-white"/></button>
                  </div>
                  <div className="p-6 grid grid-cols-3 sm:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar">
                      {characters.map(char => (
                          <button key={char.id} onClick={() => handleCastingSelect(char)} className="group relative aspect-square rounded-2xl border border-white/10 overflow-hidden hover:border-blue-500 transition-all">
                              {char.avatar_url ? <Image src={char.avatar_url} alt={char.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500"/> : <User className="text-zinc-700 m-auto"/>}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                                  <span className="text-xs font-bold text-white truncate">{char.name}</span>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
      
      {/* ... Rest of UI (Modals, Header) Unchanged ... */}
      {showCharModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[80vh]`}>
                  <div className={`p-4 border-b ${isDark ? 'border-zinc-800' : 'border-gray-100'} flex justify-between items-center`}>
                      <h3 className="font-bold flex items-center gap-2 text-sm"><User size={16} className="text-blue-500" /> {t.injectChar}</h3>
                      <button onClick={() => setShowCharModal(false)}><X size={18} className="text-zinc-500 hover:text-red-500"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                          <button onClick={handleRemoveCharacter} className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-2 group transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-red-500' : 'bg-gray-50 border-gray-100 hover:border-red-500'}`}>
                              <X className="text-zinc-500 group-hover:text-red-500" /> <span className="text-xs text-zinc-500">{t.noChar}</span>
                          </button>
                          {characters.map(char => (
                              <button key={char.id} onClick={() => handleInjectCharacter(char)} className={`relative aspect-square rounded-2xl border overflow-hidden group transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-blue-500' : 'bg-gray-50 border-gray-100 hover:border-blue-500'}`}>
                                  {char.avatar_url ? <Image src={char.avatar_url} alt={char.name} fill className="object-cover"/> : <User className="text-zinc-700"/>}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3"><span className="text-xs font-bold text-white truncate">{char.name}</span></div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-md rounded-3xl border p-6 space-y-6 shadow-2xl`}>
              <div>
                <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.exportTitle}</h3>
                <p className="text-sm text-zinc-500">{t.exportDesc}</p>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.projName}</label>
                    <input value={exportMeta.projectName} onChange={e => setExportMeta({...exportMeta, projectName: e.target.value})} className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} placeholder="Project Name" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.author}</label>
                    <input value={exportMeta.author} onChange={e => setExportMeta({...exportMeta, author: e.target.value})} className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} placeholder="Director Name" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.notes}</label>
                    <textarea value={exportMeta.notes} onChange={e => setExportMeta({...exportMeta, notes: e.target.value})} className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-20 resize-none`} placeholder="Notes..." />
                 </div>
              </div>
              <div className="flex gap-3 pt-2">
                 <button onClick={() => setShowExportModal(false)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${buttonBg}`}>Cancel</button>
                 <button onClick={handleExportPDF} disabled={isExporting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                    {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Check size={16}/>} {t.confirmExport}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b h-16 flex items-center justify-between px-6 transition-colors duration-300 ${headerBg}`}>
        <div className="flex items-center gap-6">
           <Link href="/tools" className="flex items-center text-zinc-500 hover:text-blue-500 transition-colors text-sm font-bold gap-2"><ArrowLeft size={18}/> {t.back}</Link>
           <div className="flex items-center gap-2 text-xs font-bold">
               <span className={`px-3 py-1 rounded-full ${step === 'input' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step1}</span>
               <span className="text-zinc-300 dark:text-zinc-700">/</span>
               <span className={`px-3 py-1 rounded-full ${step === 'review' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step2}</span>
               <span className="text-zinc-300 dark:text-zinc-700">/</span>
               <span className={`px-3 py-1 rounded-full ${step === 'generating' || step === 'done' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500'}`}>{t.step3}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
             <button onClick={() => setIsMockMode(!isMockMode)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 ${isMockMode ? 'bg-green-500/10 border-green-500 text-green-500' : `${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} text-zinc-500`}`}>
                <Zap size={10} fill={isMockMode ? "currentColor" : "none"}/> {isMockMode ? t.mockOn : t.mockOff}
             </button>
             <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                {isDark ? <Moon size={18}/> : <Sun size={18}/>}
             </button>
             <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                <Globe size={18}/>
             </button>
             <Link href="/tools/characters" className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                <User size={18}/>
             </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-6 min-h-screen">
        {step === 'input' && (
           <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center min-h-[70vh]">
              <div className="w-full space-y-6">
                 <div className="text-center space-y-1 mb-8">
                    <h1 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        CineFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Evolution</span>
                    </h1>
                    <p className="text-zinc-500 text-sm">AI-Powered Storyboard Generation V4.0</p>
                 </div>
                 
                 <div className={`relative w-full rounded-3xl shadow-xl transition-all duration-300 ${isDark ? 'bg-[#1e1e1e] shadow-black/50 border border-zinc-800' : 'bg-white shadow-blue-900/5 border border-white'}`}>
                    <textarea 
                      className={`w-full min-h-[240px] p-8 text-lg bg-transparent border-none resize-none outline-none leading-relaxed custom-scrollbar ${isDark ? 'text-gray-200 placeholder-zinc-600' : 'text-gray-800 placeholder-gray-300'}`}
                      placeholder={t.scriptPlaceholder}
                      value={script} 
                      onChange={(e) => setScript(e.target.value)}
                    />
                    
                    <div className="flex items-center justify-between p-4 pl-6">
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                 <button 
                                   onClick={() => setShowRatioMenu(!showRatioMenu)}
                                   className={`p-2.5 rounded-full transition-all flex items-center gap-2 text-xs font-bold ${isDark ? 'hover:bg-zinc-800 text-zinc-400 bg-zinc-900' : 'hover:bg-gray-100 text-gray-500 bg-gray-50'}`}
                                   title={t.ratio}
                                 >
                                     <Ratio size={18} />
                                     <span>{ASPECT_RATIOS.find(r => r.value === aspectRatio)?.label.split(' ')[0]}</span>
                                 </button>
                                 
                                 {showRatioMenu && (
                                     <div className={`absolute bottom-12 left-0 w-40 rounded-2xl p-1 shadow-xl border z-50 flex flex-col gap-1 ${isDark ? 'bg-[#1e1e1e] border-zinc-800' : 'bg-white border-gray-100'}`}>
                                         {ASPECT_RATIOS.map(r => (
                                             <button 
                                                key={r.value} 
                                                onClick={() => { setAspectRatio(r.value); setShowRatioMenu(false); }} 
                                                className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${aspectRatio === r.value ? 'bg-blue-500 text-white' : isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-100'}`}
                                             >
                                                 {r.label}
                                             </button>
                                         ))}
                                     </div>
                                 )}
                             </div>

                             <div className="relative">
                                 <input type="file" ref={fileInputRef} onChange={handleScriptFileUpload} className="hidden" accept=".txt,.md,.docx,.xlsx" />
                                 <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className={`p-2.5 rounded-full transition-all ${isDark ? 'hover:bg-zinc-800 text-zinc-400 bg-zinc-900' : 'hover:bg-gray-100 text-gray-500 bg-gray-50'}`} 
                                    title={t.uploadScript}
                                 >
                                     <Paperclip size={18}/>
                                 </button>
                             </div>
                        </div>

                        <button 
                            onClick={handleAnalyzeScript} 
                            disabled={isAnalyzing || !script.trim()} 
                            className={`px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg flex items-center gap-2 
                            ${isAnalyzing || !script.trim() 
                                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:scale-105 active:scale-95'}`}
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles size={16} />}
                            {t.analyzeBtn}
                        </button>
                    </div>
                 </div>
                 <p className="text-center text-xs text-zinc-400 font-medium opacity-60">CineFlow V4.0 Gemini Evolution</p>
              </div>
           </div>
        )}

        {step === 'review' && (
           <div className="max-w-[1600px] mx-auto flex gap-8 animate-in fade-in">
              <div className="w-[340px] shrink-0 space-y-6 h-fit sticky top-24">
                 <div className={`${containerBg} p-5 rounded-3xl space-y-6`}>
                    <h2 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest"><Settings size={12}/> Global Settings</h2>
                    
                    <div className={`flex ${isDark ? 'bg-black' : 'bg-gray-100'} p-1 rounded-xl mb-4`}>
                        <button onClick={() => setMode('draft')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all ${mode === 'draft' ? 'bg-white text-black shadow-sm' : 'text-zinc-500'}`}>{t.draftMode}</button>
                        <button onClick={() => setMode('render')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all ${mode === 'render' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500'}`}>{t.renderMode}</button>
                    </div>

                    {mode === 'render' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-left-2">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                               {t.atmosphere} <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">Multi-Select</span>
                           </label>
                           <div className="flex flex-wrap gap-2">
                               {ATMOSPHERE_TAGS.map(tag => {
                                   const isActive = globalAtmosphere.includes(tag.val);
                                   return (
                                       <button 
                                         key={tag.label} 
                                         onClick={() => toggleAtmosphere(tag.val)}
                                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isActive ? 'bg-blue-500 border-blue-500 text-white' : `${isDark ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800' : 'border-gray-200 bg-white hover:bg-gray-50'} text-zinc-500`}`}
                                       >
                                           {tag.label}
                                       </button>
                                   )
                               })}
                           </div>
                           <div className={`flex items-center gap-2 ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} p-2.5 rounded-xl focus-within:border-blue-500 transition-colors`}>
                              <Sparkles size={14} className="text-purple-500 shrink-0"/>
                              <input value={globalAtmosphere} onChange={(e) => setGlobalAtmosphere(e.target.value)} placeholder="Or type custom atmosphere..." className={`bg-transparent text-xs ${isDark ? 'text-white' : 'text-gray-900'} placeholder-zinc-500 outline-none w-full font-bold`}/>
                           </div>
                        </div>
                    )}

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.scene}</label>
                       <div className={`flex items-center gap-2 ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} p-2.5 rounded-xl focus-within:border-blue-500 transition-colors`}>
                          <LayoutGrid size={14} className="text-green-500 shrink-0"/>
                          <input value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} placeholder="Describe environment..." className={`bg-transparent text-xs ${isDark ? 'text-white' : 'text-gray-900'} placeholder-zinc-500 outline-none w-full font-bold`}/>
                       </div>
                    </div>
                    
                    {/* Style Section (Only for Render) */}
                    {mode === 'render' && (
                        <div className={`pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-100'} space-y-4 animate-in slide-in-from-right-2`}>
                            <label className="text-[10px] font-bold text-zinc-500 mb-2 block uppercase">{t.style}</label>
                            <div className="grid grid-cols-2 gap-2">
                                {STYLE_OPTIONS.map(opt => {
                                    const isActive = stylePreset === opt.value;
                                    return (
                                        <button 
                                            key={opt.value} 
                                            onClick={() => setStylePreset(opt.value)} 
                                            className={`relative h-14 rounded-xl border transition-all overflow-hidden group text-left p-2 flex flex-col justify-end ${isActive ? 'border-blue-500 ring-1 ring-blue-500' : `${isDark ? 'border-zinc-800' : 'border-gray-200'}`}`}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                                            <div className="relative z-10">
                                                <span className={`text-[10px] font-bold block ${isDark || isActive ? 'text-white' : 'text-gray-800'}`}>{opt.label}</span>
                                                <span className="text-[8px] text-white/70 uppercase tracking-wider">{opt.sub}</span>
                                            </div>
                                            {isActive && <div className="absolute top-1 right-1 bg-blue-500 text-white p-0.5 rounded-full"><Check size={8}/></div>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <button onClick={handleGenerateImages} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 hover:shadow-lg text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                        {mode === 'draft' ? <PenTool size={18}/> : <Palette size={18}/>} {t.startGen}
                    </button>
                 </div>
              </div>

              <div className="flex-1 space-y-4">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t.shotList} ({panels.length})</h3>
                    <button onClick={handleAddPanel} className={`text-xs ${buttonBg} px-3 py-1.5 rounded-full transition-colors flex items-center gap-2`}><Plus size={14}/> {t.addShot}</button>
                 </div>
                 
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className="grid gap-4">
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} onDelete={handleDeletePanel} onUpdate={handleUpdatePanel} onOpenCharModal={handleOpenCharModal} onImageClick={setLightboxIndex} t={t} isDark={isDark}/>
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activePanel ? <PanelCard panel={activePanel} idx={panels.findIndex(p => p.id === activePanel.id)} step={step} isOverlay={true} t={t} isDark={isDark}/> : null}
                    </DragOverlay>
                 </DndContext>
              </div>
           </div>
        )}

        {(step === 'generating' || step === 'done') && (
            <div className="max-w-[1920px] mx-auto animate-in fade-in space-y-8">
                 <div className="flex justify-between items-center px-4">
                     <button onClick={() => setStep('review')} className="text-xs font-bold text-zinc-500 hover:text-blue-500 flex items-center gap-2 transition-colors"><ArrowLeft size={14}/> Back to Setup</button>
                     <div className="flex items-center gap-4">
                         <div className="text-xs font-mono text-zinc-500">
                             TOTAL: <span className={isDark ? "text-white" : "text-black"}>{panels.length}</span> SHOTS | RATIO: <span className={isDark ? "text-white" : "text-black"}>{aspectRatio}</span>
                         </div>
                     </div>
                 </div>

                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                        <div className={`grid gap-6 px-4 ${aspectRatio === '9:16' ? 'grid-cols-3 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} currentRatioClass={currentRatioClass} onRegenerate={handleGenerateSingleImage} onImageClick={setLightboxIndex} t={t} isDark={isDark}/>
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activePanel ? <PanelCard panel={activePanel} idx={panels.findIndex(p => p.id === activePanel.id)} step={step} currentRatioClass={currentRatioClass} isOverlay={true} t={t} isDark={isDark}/> : null}
                    </DragOverlay>
                 </DndContext>

                 {step === 'done' && (
                     <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 backdrop-blur-xl border p-2 rounded-full flex gap-2 shadow-2xl animate-in slide-in-from-bottom-10 z-40 ${isDark ? 'bg-[#111]/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
                         <button onClick={() => setShowExportModal(true)} disabled={isExporting} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Download size={16}/>} {t.exportPdf}
                         </button>
                         <div className={`w-[1px] mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                         <button onClick={handleExportZIP} disabled={isExporting} className={`px-6 py-3 font-bold rounded-full text-xs flex items-center gap-2 transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Package size={16}/>} {t.exportZip}
                         </button>
                         <button onClick={() => { setStep('input'); setScript(''); setPanels([]); }} className={`px-4 py-3 rounded-full transition-all ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-gray-100 text-gray-500'}`}>
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