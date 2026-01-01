'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clapperboard, Loader2, ArrowLeft, PenTool, Image as ImageIcon, Trash2, Plus, Minus,
  Download, RefreshCw, FileText, Sparkles, GripVertical, Package, RotateCcw, Zap,
  User, X, Check, Globe, Settings, ChevronRight, LayoutGrid, Palette,
  Sun, Moon, Paperclip, Ratio, Send, ChevronDown, MoreHorizontal, Flame, CloudRain, Zap as ZapIcon,
  Maximize2, Eye, ArrowUp, ArrowDown, Repeat, Wand2, ChevronLeft, Camera, GripHorizontal, ChevronUp, Upload,
  Users // 🟢 [V6.0] 新增图标
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
    title: "智能分镜生成",
    subtitle: "不断进化的AI分镜生成器",
    back: "返回",
    step1: "剧本",
    step2: "筹备",
    step3: "渲染",
    mockOn: "Mock On",
    mockOff: "Real API",
    manageChars: "角色库",
    scriptPlaceholder: "输入你的故事，或上传剧本文件...\n(例如：赛博朋克侦探走入雨巷，发现了一枚发光的芯片...)",
    analyzeBtn: "拆解剧本",
    analyzing: "AI 思考中...",
    uploadScript: "上传脚本",
    autoRatio: "自动画幅",
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
    delShot: "删镜头",
    delShotTip: "点击卡片删除",
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
    injectChar: "角色替换",
    charLib: "角色库",
    noChar: "不指定",
    cameraAngle: "拍摄角度",
    casting: "选角替换",
    shotPrefix: "分镜",
    shotSize: "景别",
    angle: "角度"
  },
  en: {
    title: "CineFlow Evolution",
    subtitle: "AI-Powered Storyboard Generation V5.3",
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
    uploadScript: "Upload Script",
    autoRatio: "Auto Ratio",
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
    delShot: "Delete",
    delShotTip: "Select to delete",
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
    injectChar: "Inject Character",
    charLib: "Character Library",
    noChar: "None",
    cameraAngle: "Angle",
    casting: "Casting",
    shotPrefix: "Shot",
    shotSize: "Shot Size",
    angle: "Angle"
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
  // 🟢 [V6.0] 升级为数组以支持双人
  characterIds?: string[];
  characterAvatars?: string[];
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

// --- PanelCard Component (V6.0 重构版) ---
const PanelCard = React.forwardRef<HTMLDivElement, any>(({ panel, idx, currentRatioClass, onDelete, onUpdate, onRegenerate, onOpenCharModal, onImageClick, step, isOverlay, t, isDark, isDeleteMode, ...props }, ref) => {
    const cardBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
    const cardBorder = isDark ? "border-zinc-800" : "border-gray-200";
    const textColor = isDark ? "text-gray-200" : "text-gray-800";
    const subTextColor = isDark ? "text-zinc-500" : "text-gray-400";
    // 胶囊按钮背景
    const pillBg = isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200";
    
    const [isPromptOpen, setIsPromptOpen] = useState(false);

    // 🟢 状态 1：已生成图片 (Step 3) - 极简海报风格 (需求点2)
    if (step === 'generating' || step === 'done') {
        const baseClass = isOverlay ? "ring-2 ring-blue-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" : `${cardBorder} hover:shadow-md transition-shadow duration-300`;

        return (
            <div ref={ref} {...props} className={`flex flex-col gap-2 group`}>
                <div className={`relative rounded-xl overflow-hidden border ${baseClass} ${cardBg} ${currentRatioClass} cursor-pointer`} onClick={() => onImageClick(idx)}>
                    
                    {/* 分镜号 - 大标题覆盖 (需求点2) */}
                    <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none">
                        <span className="text-white font-black text-2xl font-mono tracking-tighter drop-shadow-md">
                            SHOT {String(idx + 1).padStart(2, '0')}
                        </span>
                    </div>

                    {/* 重新生成按钮 (Hover显示) */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRegenerate(panel.id); }}
                        className="absolute top-4 right-4 z-30 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 backdrop-blur-sm"
                        title="Regenerate this shot"
                    >
                        <RefreshCw size={16}/>
                    </button>

                    <div className="w-full h-full">
                        {panel.isLoading ? (
                            <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10 ${isDark ? 'bg-zinc-900/50' : 'bg-white/50'}`}>
                                <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
                            </div>
                        ) : panel.imageUrl ? (
                            <img src={panel.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" draggable={false} />
                        ) : (
                            <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
                                <ImageIcon size={24} className={`${isDark ? 'text-zinc-700' : 'text-gray-300'} mb-2`}/><span className="text-[10px] text-zinc-500">{t.waiting}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* 底部文字 (沉底显示，仅保留描述) */}
                <p className={`text-xs ${subTextColor} leading-relaxed line-clamp-3 px-1 font-medium`}>
                    {panel.description}
                </p>
            </div>
        );
    }

    // 🟢 状态 2：编辑模式 (Step 2) - 垂直布局 (需求点1)
    const baseClass = isOverlay ? "ring-2 ring-blue-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" : `${cardBorder} hover:border-blue-500/50 transition-all shadow-sm`;
    
    return (
        <div ref={ref} {...props} className={`${cardBg} p-5 rounded-2xl border ${baseClass} flex flex-col gap-4 relative group min-h-[240px]`}>
            
            {/* 顶部 Header: 分镜号 + 拖拽/删除 */}
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                     <span className={`font-black text-xl ${isDark ? 'text-white' : 'text-black'} font-mono`}>SHOT {String(idx + 1).padStart(2, '0')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className={`p-1.5 cursor-grab active:cursor-grabbing ${subTextColor} hover:text-blue-500 rounded-lg transition-colors`}>
                         <GripHorizontal size={18} />
                     </div>
                     {isDeleteMode && (
                         <button onClick={() => onDelete(panel.id)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all">
                             <Trash2 size={16} />
                         </button>
                     )}
                 </div>
            </div>

            {/* 中间：文本编辑区 */}
            <div className="flex-1 space-y-3">
                <textarea 
                  value={panel.description} 
                  onChange={(e) => onUpdate(panel.id, 'description', e.target.value)} 
                  className={`w-full bg-transparent text-sm ${textColor} placeholder-zinc-500 border-none focus:ring-0 p-0 resize-none leading-relaxed font-medium min-h-[80px]`}
                  placeholder="Describe the action..."
                />

                <div className={`w-full h-[1px] ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}></div>

                {/* Prompt 折叠 */}
                <div>
                     <button 
                        onClick={() => setIsPromptOpen(!isPromptOpen)}
                        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${subTextColor} hover:text-blue-500 mb-1`}
                     >
                         {isPromptOpen ? <ChevronUp size={10}/> : <ChevronDown size={10}/>} <span>AI Prompt</span>
                     </button>
                     
                     {isPromptOpen && (
                         <textarea 
                           value={panel.prompt} 
                           onChange={(e) => onUpdate(panel.id, 'prompt', e.target.value)} 
                           className={`w-full bg-transparent text-[10px] text-zinc-500 placeholder-zinc-600 border ${isDark ? 'border-zinc-800 bg-black/20' : 'border-gray-200 bg-white/50'} rounded-lg p-2 focus:ring-0 focus:border-blue-500/50 resize-none leading-relaxed font-mono h-20 animate-in slide-in-from-top-2`} 
                           placeholder="AI visual details..."
                         />
                     )}
                </div>
            </div>

            {/* 底部：控制胶囊 (需求点1: 景别/角度/角色) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {/* 1. Shot Size */}
                <div className="relative group shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all`}>
                        <Eye size={14} className="text-zinc-500"/>
                        <span className={`text-xs font-bold ${textColor} uppercase whitespace-nowrap`}>
                            {CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || "Shot"}
                        </span>
                    </div>
                    <select 
                        value={panel.shotType} 
                        onChange={(e) => onUpdate(panel.id, 'shotType', e.target.value)} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                        {CINEMATIC_SHOTS.map(shot => <option key={shot.value} value={shot.value}>{shot.label}</option>)}
                    </select>
                </div>

                {/* 2. Angle */}
                <div className="relative group shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all`}>
                        <Camera size={14} className="text-zinc-500"/>
                        <span className={`text-xs font-bold ${textColor} uppercase whitespace-nowrap`}>
                            {CAMERA_ANGLES.find(a => a.value === panel.cameraAngle)?.label.split(' ')[1] || "Angle"}
                        </span>
                    </div>
                    <select 
                        value={panel.cameraAngle || 'EYE LEVEL'} 
                        onChange={(e) => onUpdate(panel.id, 'cameraAngle', e.target.value)} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                        {CAMERA_ANGLES.map(angle => <option key={angle.value} value={angle.value}>{angle.label}</option>)}
                    </select>
                </div>

                {/* 3. Character (双人支持) */}
                <button 
                    onClick={() => onOpenCharModal(panel.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all shrink-0`}
                >
                    <User size={14} className={panel.characterIds?.length ? "text-blue-500" : "text-zinc-500"}/>
                    <div className="flex -space-x-2 overflow-hidden items-center">
                        {panel.characterAvatars && panel.characterAvatars.length > 0 ? (
                            panel.characterAvatars.map((av: string, i: number) => (
                                <div key={i} className={`w-5 h-5 rounded-full ring-2 ${isDark ? 'ring-[#1e1e1e]' : 'ring-white'} relative z-${10-i}`}>
                                    <img src={av} className="w-full h-full object-cover rounded-full" />
                                </div>
                            ))
                        ) : (
                            <span className={`text-xs font-bold ${textColor} whitespace-nowrap`}>Role</span>
                        )}
                    </div>
                </button>
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
  const [isDeleteMode, setIsDeleteMode] = useState(false); 
  const [useInstantID, setUseInstantID] = useState(false); 
  
  // Lightbox & Casting State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isRepainting, setIsRepainting] = useState(false);
  const [showCastingModal, setShowCastingModal] = useState(false);

  // Modals
  const [showCharModal, setShowCharModal] = useState(false);
  const [activePanelIdForModal, setActivePanelIdForModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta>({ projectName: '', author: '', notes: '' });

  // 🟢 [V6.0] 批量替换相关状态
  const [batchTargetChar, setBatchTargetChar] = useState<Character | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

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

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setLightboxIndex(prev => (prev !== null && prev < panels.length - 1 ? prev + 1 : prev));
      if (e.key === 'Escape' || e.key === 'Enter') setLightboxIndex(null); 
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, panels.length]);

  const handleScriptKeyDown = (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          if (!isAnalyzing && script.trim()) {
              handleAnalyzeScript();
          }
      }
  };

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
        characterIds: [], characterAvatars: [] // 初始化数组
      }));
      setPanels(initialPanels);
      setStep('review'); 
      toast.success('Script analyzed');
    } catch (error: any) { console.error(error); toast.error(error.message); } 
    finally { setIsAnalyzing(false); }
  };

  const handleUpdatePanel = (id: string, field: keyof StoryboardPanel, value: any) => {
    setPanels(current => current.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const handleDeletePanel = (id: string) => {
    setPanels(current => current.filter(p => p.id !== id));
  };
  const handleAddPanel = () => {
    setPanels(current => [...current, {
        id: crypto.randomUUID(), description: "", shotType: "MID SHOT", cameraAngle: "EYE LEVEL", environment: "", prompt: "", isLoading: false, characterIds: [], characterAvatars: []
    }]);
  };

  // 🟢 [V6.0] 核心角色绑定逻辑 (支持双人 + 批量)
  const handleOpenCharModal = (panelId: string) => { setActivePanelIdForModal(panelId); setShowCharModal(true); }
  
  // 1. 预选角色
  const handlePreSelectCharacter = (char: Character) => {
      setBatchTargetChar(char);
      setShowCharModal(false); // 关闭库
      setShowCastingModal(false); // 如果是Lightbox也关闭
      setShowBatchConfirm(true); // 打开批量确认弹窗
  };

  // 2. 执行注入
  const executeCharacterInject = (isBatch: boolean) => {
      if (!activePanelIdForModal || !batchTargetChar) return;
      
      const targetPanel = panels.find(p => p.id === activePanelIdForModal);
      if (!targetPanel) return;

      const keywords = batchTargetChar.description.split(' ').filter(w => w.length > 3).slice(0, 3);
      const matchKeyword = batchTargetChar.name.toLowerCase();

      setPanels(current => current.map(p => {
          // 判定逻辑: 是当前卡片 OR (批量模式 AND 描述含关键词)
          const shouldUpdate = p.id === activePanelIdForModal || (isBatch && (p.description.toLowerCase().includes(matchKeyword) || p.description.toLowerCase().includes('she') || p.description.toLowerCase().includes('he')));
          
          if (shouldUpdate) {
              const currentIds = p.characterIds || [];
              const currentAvatars = p.characterAvatars || [];
              
              let newIds = [...currentIds];
              let newAvatars = [...currentAvatars];

              // 双人逻辑：如果未包含，则追加。超过2人则FIFO替换。
              if (!newIds.includes(batchTargetChar.id)) {
                  if (newIds.length >= 2) {
                      newIds.shift(); newAvatars.shift(); 
                  }
                  newIds.push(batchTargetChar.id);
                  newAvatars.push(batchTargetChar.avatar_url || '');
              }

              // Update Prompt
              const charPrompt = `(Character: ${batchTargetChar.name}, ${batchTargetChar.description})`;
              const newPrompt = p.prompt.includes(batchTargetChar.name) ? p.prompt : `${p.prompt} ${charPrompt}`;

              return { ...p, characterIds: newIds, characterAvatars: newAvatars, prompt: newPrompt };
          }
          return p;
      }));

      toast.success(isBatch ? `Batch applied ${batchTargetChar.name}` : `Linked ${batchTargetChar.name}`);
      setShowBatchConfirm(false);
      setBatchTargetChar(null);
      
      // 如果是在Lightbox里操作的，可能需要触发重绘，这里留个钩子
      if (lightboxIndex !== null && panels[lightboxIndex].id === activePanelIdForModal) {
          // Trigger repaint logic handled by effect
      } else {
          setActivePanelIdForModal(null);
      }
  };

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
        // 取第一个角色作为主ID
        const primaryCharId = panel.characterIds?.[0]; 
        
        const res = await generateShotImage(
            tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
            primaryCharId, undefined, undefined, isMockMode, 
            panel.cameraAngle || 'EYE LEVEL',
            useInstantID 
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
            const primaryCharId = panel.characterIds?.[0];
            
            const res = await generateShotImage(
              tempShotId, actionPrompt, tempProjectId, mode === 'draft', stylePreset, aspectRatio, panel.shotType, 
              primaryCharId, undefined, undefined, isMockMode,
              panel.cameraAngle || 'EYE LEVEL',
              useInstantID
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

  // Lightbox 替换入口
  const handleCastingSelect = async (char: Character) => {
    if (lightboxIndex === null) return;
    const currentPanel = panels[lightboxIndex];
    // 复用批量流程
    setBatchTargetChar(char);
    setActivePanelIdForModal(currentPanel.id);
    setShowCastingModal(false);
    setShowBatchConfirm(true); 
  };

  // 触发 Lightbox 重绘
  const triggerRepaint = async () => {
    if (lightboxIndex === null || !batchTargetChar) return;
    const currentPanel = panels[lightboxIndex]; // State 已经被 executeCharacterInject 更新
    
    setIsRepainting(true);
    try {
        const actionPrompt = buildActionPrompt(currentPanel);
        const res = await repaintShotWithCharacter(
            currentPanel.id,
            currentPanel.imageUrl!,
            batchTargetChar.id,
            actionPrompt,
            tempProjectId,
            aspectRatio,
            mode === 'draft',
            useInstantID
        );

        if (res.success) {
            setPanels(current => current.map(p => p.id === currentPanel.id ? { ...p, imageUrl: (res as any).url } : p));
            toast.success("Repainted!");
        } else {
            throw new Error((res as any).message);
        }
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsRepainting(false);
        setActivePanelIdForModal(null);
    }
  };

  // 监听 Batch 确认后触发重绘 (仅针对 Lightbox 场景)
  useEffect(() => {
      if (!showBatchConfirm && batchTargetChar === null && lightboxIndex !== null && activePanelIdForModal !== null) {
          triggerRepaint();
      }
  }, [showBatchConfirm]);

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
  const currentLightboxPanel = lightboxIndex !== null ? panels[lightboxIndex] : null;
  const containerBg = isDark ? "bg-[#1e1e1e] border-zinc-800" : "bg-white border-white shadow-sm";
  const headerBg = isDark ? "bg-[#131314]/80 border-white/5" : "bg-[#f0f4f9]/80 border-black/5";
  const inputBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
  const buttonBg = isDark ? "bg-[#2d2d2d] hover:bg-[#3d3d3d]" : "bg-[#e3e3e3] hover:bg-[#d3d3d3] text-black";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#131314] text-white" : "bg-[#f0f4f9] text-gray-900"} font-sans transition-colors duration-300`}>
      <Toaster position="top-center" richColors theme={isDark ? "dark" : "light"}/>
      
      {/* 🟢 Lightbox Pro (需求3: 沉浸式 + 悬浮按钮) */}
      {currentLightboxPanel && currentLightboxPanel.imageUrl && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
              
              <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-md"><X size={28} /></button>

              <div className="relative w-full h-[85vh] flex items-center justify-center group">
                  {/* 增加非空判断 && */}
                  {lightboxIndex !== null && lightboxIndex > 0 && <button onClick={() => setLightboxIndex(lightboxIndex - 1)} className="absolute left-4 p-3 bg-black/20 hover:bg-black/50 text-white rounded-full transition-all backdrop-blur-sm"><ArrowLeft /></button>}

                  {/* 增加非空判断 && */}
                  {lightboxIndex !== null && lightboxIndex < panels.length - 1 && <button onClick={() => setLightboxIndex(lightboxIndex + 1)} className="absolute right-4 p-3 bg-black/20 hover:bg-black/50 text-white rounded-full transition-all backdrop-blur-sm"><ChevronRight /></button>}

                  <img src={currentLightboxPanel.imageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                  
                  {isRepainting && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"><Loader2 className="animate-spin text-white w-12 h-12"/><span className="text-white font-bold mt-4">REPAINTING...</span></div>}

                  {/* 底部信息栏 (需求3布局) */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex justify-between items-end rounded-b-lg">
                      <div className="max-w-3xl space-y-2">
                          <div className="flex gap-2 text-blue-400 font-mono text-xs font-bold tracking-wider">
                              <span>#{currentLightboxPanel.shotType}</span>
                              <span>#{currentLightboxPanel.cameraAngle}</span>
                          </div>
                          <p className="text-zinc-100 text-lg font-medium leading-relaxed drop-shadow-md">{currentLightboxPanel.description}</p>
                      </div>
                      
                      {/* 🟢 悬浮替换按钮 */}
                      <button 
                        onClick={() => setShowCastingModal(true)} 
                        disabled={isRepainting}
                        className="px-6 py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
                      >
                          <User size={18} /> 角色替换
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 🟢 Batch Confirm Modal */}
      {showBatchConfirm && batchTargetChar && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className={`w-[400px] ${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} border rounded-3xl p-6 shadow-2xl space-y-6`}>
                  <div className="text-center space-y-3">
                      <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-4 border-blue-500 shadow-lg">
                          <img src={batchTargetChar.avatar_url || ''} className="w-full h-full object-cover"/>
                      </div>
                      <div>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>Apply {batchTargetChar.name}?</h3>
                          <p className="text-sm text-zinc-500 mt-1">Do you want to replace this character in ALL similar shots?</p>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => executeCharacterInject(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}`}>Only This Shot</button>
                      <button onClick={() => executeCharacterInject(true)} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center justify-center gap-2"><Sparkles size={16}/> Apply All</button>
                  </div>
              </div>
          </div>
      )}

      {/* Character Library Modal */}
      {(showCharModal || showCastingModal) && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}>
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[80vh]`} onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-white/10 flex justify-between items-center">
                      <h3 className={`font-bold flex items-center gap-2 text-lg ${isDark ? 'text-white' : 'text-black'}`}><Users size={20} className="text-blue-500"/> Select Character</h3>
                      <button onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}><X size={20}/></button>
                  </div>
                  <div className="p-6 grid grid-cols-4 gap-4 overflow-y-auto custom-scrollbar">
                      {characters.map(char => (
                          <button key={char.id} onClick={() => handlePreSelectCharacter(char)} className="group relative aspect-square rounded-2xl border border-white/10 overflow-hidden hover:border-blue-500 transition-all shadow-md">
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

      {/* Export Modal */}
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
             <button onClick={() => setIsMockMode(!isMockMode)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${isMockMode ? 'bg-green-500/10 border-green-500 text-green-500' : `${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} text-zinc-500`}`}>
                <Zap size={10} fill={isMockMode ? "currentColor" : "none"}/> {isMockMode ? t.mockOn : t.mockOff}
             </button>
             <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                {isDark ? <Moon size={18}/> : <Sun size={18}/>}
             </button>
             <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                <Globe size={18}/>
             </button>
             <Link href="/tools/characters" className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                <User size={18}/>
             </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-40 pb-12 px-6 min-h-screen">
        {step === 'input' && (
           <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center min-h-[70vh]">
              <div className="w-full space-y-6">
                 <div className="text-center space-y-1 mb-8">
                    <h1 className={`text-6xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t.title}
                    </h1>
                    <p className="text-zinc-500 text-sm mt-2">{t.subtitle}</p>
                 </div>
                 
                 <div className={`relative w-full rounded-3xl shadow-xl transition-all duration-300 ${isDark ? 'bg-[#1e1e1e] shadow-black/50 border border-zinc-800' : 'bg-white shadow-blue-900/5 border border-white'}`}>
                    <textarea 
                      className={`w-full min-h-[240px] p-8 text-lg bg-transparent border-none resize-none outline-none leading-relaxed custom-scrollbar ${isDark ? 'text-gray-200 placeholder-zinc-600' : 'text-gray-800 placeholder-gray-300'}`}
                      placeholder={t.scriptPlaceholder}
                      value={script} 
                      onChange={(e) => setScript(e.target.value)}
                      onKeyDown={handleScriptKeyDown}
                    />
                    
                    <div className="flex items-center justify-between p-4 pl-6">
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                 <input type="file" ref={fileInputRef} onChange={handleScriptFileUpload} className="hidden" accept=".txt,.md,.docx,.xlsx" />
                                 <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className={`p-2.5 rounded-full transition-all flex items-center gap-2 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 ${isDark ? 'hover:bg-zinc-800 text-zinc-400 bg-zinc-900' : 'hover:bg-gray-100 text-gray-500 bg-gray-50'}`} 
                                    title={t.uploadScript}
                                 >
                                     <Paperclip size={18}/>
                                     <span>{t.uploadScript}</span>
                                 </button>
                             </div>

                             <div className="relative">
                                 <button 
                                   onClick={() => setShowRatioMenu(!showRatioMenu)}
                                   className={`p-2.5 rounded-full transition-all flex items-center gap-2 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 ${isDark ? 'hover:bg-zinc-800 text-zinc-400 bg-zinc-900' : 'hover:bg-gray-100 text-gray-500 bg-gray-50'}`}
                                   title={t.ratio}
                                 >
                                     <Ratio size={18} />
                                     <span>{t.autoRatio}</span>
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
                        </div>

                        <button 
                            onClick={handleAnalyzeScript} 
                            disabled={isAnalyzing || !script.trim()} 
                            className={`px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 border
                            ${isAnalyzing || !script.trim() 
                                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border-transparent' 
                                : isDark 
                                    ? 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700' 
                                    : 'bg-white text-black border-gray-200 hover:bg-gray-50'}`}
                        >
                            {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles size={16} />}
                            {t.analyzeBtn}
                        </button>
                    </div>
                 </div>
                 <p className="text-center text-xs text-zinc-400 font-medium opacity-60">CineFlow V5.3 Evolution</p>
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
                        <>
                            <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between transition-all ${useInstantID ? 'bg-blue-500/10 border-blue-500' : `${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}`}>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold flex items-center gap-1 ${useInstantID ? 'text-blue-500' : 'text-zinc-500'}`}>
                                        <User size={12} /> InstantID Character Lock
                                    </span>
                                    <span className="text-[8px] opacity-60">High Fidelity Face Keeping (Slower)</span>
                                </div>
                                <button 
                                    onClick={() => setUseInstantID(!useInstantID)}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${useInstantID ? 'bg-blue-500' : 'bg-zinc-600'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${useInstantID ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                        
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
                        </>
                    )}

                    {mode === 'draft' && (
                         <div className="space-y-2">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.scene}</label>
                           <div className={`flex items-center gap-2 ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} p-2.5 rounded-xl focus-within:border-blue-500 transition-colors`}>
                              <LayoutGrid size={14} className="text-green-500 shrink-0"/>
                              <input value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)} placeholder="Describe environment..." className={`bg-transparent text-xs ${isDark ? 'text-white' : 'text-gray-900'} placeholder-zinc-500 outline-none w-full font-bold`}/>
                           </div>
                        </div>
                    )}
                    
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

                    <button onClick={handleGenerateImages} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 hover:shadow-lg text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95">
                        {mode === 'draft' ? <PenTool size={18}/> : <Palette size={18}/>} {t.startGen}
                    </button>
                 </div>
              </div>

              <div className="flex-1 space-y-4">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t.shotList} ({panels.length})</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsDeleteMode(!isDeleteMode)} 
                            className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer ${isDeleteMode ? 'bg-red-500 text-white' : buttonBg}`}
                        >
                            <Minus size={14}/> {t.delShot}
                        </button>
                        <button onClick={handleAddPanel} className={`text-xs ${buttonBg} px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer hover:scale-105`}><Plus size={14}/> {t.addShot}</button>
                    </div>
                 </div>
                 
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {/* 🟢 Key Fix: Pass isDeleteMode */}
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
                        {/* 🟢 布局回归：一行两个大卡片 */}
                        <div className={`grid gap-4 grid-cols-1 xl:grid-cols-2`}>
                            {panels.map((panel, idx) => (
                                <SortablePanelItem key={panel.id} panel={panel} idx={idx} step={step} onDelete={handleDeletePanel} onUpdate={handleUpdatePanel} onOpenCharModal={handleOpenCharModal} onImageClick={setLightboxIndex} t={t} isDark={isDark} currentRatioClass={currentRatioClass} isDeleteMode={isDeleteMode}/>
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activePanel ? <PanelCard panel={activePanel} idx={panels.findIndex(p => p.id === activePanel.id)} step={step} currentRatioClass={currentRatioClass} isOverlay={true} t={t} isDark={isDark} isDeleteMode={isDeleteMode}/> : null}
                    </DragOverlay>
                 </DndContext>
              </div>
           </div>
        )}

        {(step === 'generating' || step === 'done') && (
            <div className="max-w-[1920px] mx-auto animate-in fade-in space-y-8">
                 <div className="flex justify-between items-center px-4">
                     <button onClick={() => setStep('review')} className="text-xs font-bold text-zinc-500 hover:text-blue-500 flex items-center gap-2 transition-colors cursor-pointer"><ArrowLeft size={14}/> Back to Setup</button>
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
                         <button onClick={() => setShowExportModal(true)} disabled={isExporting} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Download size={16}/>} {t.exportPdf}
                         </button>
                         <div className={`w-[1px] mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                         <button onClick={handleExportZIP} disabled={isExporting} className={`px-6 py-3 font-bold rounded-full text-xs flex items-center gap-2 transition-all cursor-pointer ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                             {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Package size={16}/>} {t.exportZip}
                         </button>
                         <button onClick={() => { setStep('input'); setScript(''); setPanels([]); }} className={`px-4 py-3 rounded-full transition-all cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-gray-100 text-zinc-500'}`}>
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