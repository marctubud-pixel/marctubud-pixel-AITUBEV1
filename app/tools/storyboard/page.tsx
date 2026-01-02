'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Clapperboard, Loader2, ArrowLeft, PenTool, Image as ImageIcon, Trash2, Plus, Minus,
  Download, RefreshCw, FileText, Sparkles, GripVertical, Package, RotateCcw, Zap,
  User, X, Check, Globe, Settings, ChevronRight, LayoutGrid, Palette,
  Sun, Moon, Paperclip, Ratio, Send, ChevronDown, MoreHorizontal, Flame, CloudRain, Zap as ZapIcon,
  Maximize2, Eye, ArrowUp, ArrowDown, Repeat, Wand2, ChevronLeft, Camera, GripHorizontal, ChevronUp, Upload,
  Users, ChevronsUpDown 
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
// 请确保以下 actions 路径正确，或使用您的 mock 数据
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
      scriptPlaceholder: "输入你的故事 (Enter 拆解，Shift+Enter 换行)...\n例如：赛博朋克侦探走入雨巷...",
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
      atmospherePlaceholder: "例如：阴郁，赛博朋克...",
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
      angle: "角度",      
      selectStyle: "选择风格",
      uploadRef: "上传参考图",
      moreAtmosphere: "更多氛围",
      instantID: "角色一致性 (InstantID)",
      instantIDDesc: "保持面部高度一致",
      prompt: "AI 提示词",
      loading: "加载中...",
      globalSettings: "全局设置",
      scenePlaceholder: "描述场景与环境...",
      roleFallback: "角色",
      shotFallback: "景别",
      backToSetup: "返回编辑",
      genComplete: "批量生成已完成",
      total: "总计",
      shotUnit: "个分镜",
      ratioLabel: "画幅",
      // 🟢 新增：渲染中的中文提示
      rendering: "AI 正在绘图...", 
      apply: "应用",
      onlyThisShot: "仅当前分镜",
      applyAll: "全部应用", 
      clickToUpload: "点击上传参考图",
      linked: "已关联角色",
      batchLinked: "已批量关联角色",
      projNamePlaceholder: "输入项目名称",
      authorPlaceholder: "输入导演姓名",
      notesPlaceholder: "输入备注信息...",
      cancel: "取消",
      zipping: "正在打包素材...",
      zipDownloaded: "素材包已下载",
      defaultFileName: "未命名分镜项目",
      pdfExported: "PDF 通告单已导出"

    },
    en: {
      title: "CineFlow Evolution",
      subtitle: "AI-Powered Storyboard Generation V6.0",
      back: "Back",
      step1: "Script",
      step2: "Setup",
      step3: "Render",
      mockOn: "Mock On",
      mockOff: "Real API",
      manageChars: "Library",
      scriptPlaceholder: "Tell your story (Enter to Analyze, Shift+Enter for new line)...",
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
      atmospherePlaceholder: "e.g., Moody, Cyberpunk...",
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
      shotPrefix: "SHOT",
      shotSize: "Shot Size",
      angle: "Angle",
      selectStyle: "Select Style",
      uploadRef: "Upload Ref",
      moreAtmosphere: "More Vibe",
      instantID: "InstantID Lock",
      instantIDDesc: "High Fidelity Face Keeping",
      prompt: "AI Prompt",
      loading: "Loading...",
      globalSettings: "Global Settings",
      scenePlaceholder: "Describe environment...",
      roleFallback: "Role",
      shotFallback: "Shot",
      backToSetup: "Back to Setup",
      genComplete: "Batch generation complete",
      total: "TOTAL",
      shotUnit: "SHOTS",
      ratioLabel: "RATIO",
      // 🟢 新增
      rendering: "Rendering...",
      apply: "Apply",
      onlyThisShot: "Only This Shot",
      applyAll: "Apply All",
      clickToUpload: "Click to upload reference image",
      linked: "Linked",
      batchLinked: "Batch Linked",
      projNamePlaceholder: "Project Name",
      authorPlaceholder: "Director Name",
      notesPlaceholder: "Notes...",
      cancel: "Cancel",
      zipping: "Zipping assets...",
      zipDownloaded: "ZIP Downloaded",
      defaultFileName: "Untitled_Project",
      pdfExported: "PDF Exported"
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
    { label: "电影感", val: "cinematic lighting, dramatic atmosphere" },
    { label: "黑暗/黑色电影", val: "dark, moody, low key lighting, noir" },
    { label: "温暖/治愈", val: "warm lighting, sunny, happy atmosphere" },
    { label: "赛博朋克", val: "neon lights, futuristic, cyberpunk atmosphere" },
    { label: "恐怖/惊悚", val: "foggy, scary, horror atmosphere, dim light" },
    { label: "梦幻/唯美", val: "soft focus, dreamy, ethereal, glow" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 Cinema", cssClass: "aspect-video" },
  { value: "2.39:1", label: "2.39:1 Anamorphic", cssClass: "aspect-[2.39/1]" },
  { value: "4:3", label: "4:3 TV", cssClass: "aspect-[4/3]" },
  { value: "1:1", label: "1:1 Social", cssClass: "aspect-square" },
  { value: "9:16", label: "9:16 Vertical", cssClass: "aspect-[9/16]" },
];

// --- PanelCard Component (V6.0 更新版) ---
const PanelCard = React.forwardRef<HTMLDivElement, any>(({ panel, idx, currentRatioClass, onDelete, onUpdate, onRegenerate, onOpenCharModal, onImageClick, step, isOverlay, t, isDark, isDeleteMode, ...props }, ref) => {
    const cardBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
    const cardBorder = isDark ? "border-zinc-800" : "border-gray-200";
    const textColor = isDark ? "text-gray-200" : "text-gray-800";
    const subTextColor = isDark ? "text-zinc-500" : "text-gray-400";
    const pillBg = isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200";
    
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    // 🟢 Step 3 折叠状态
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const shotTitle = `${t.shotPrefix} ${String(idx + 1).padStart(2, '0')}`;

    // 🟢 状态 1：已生成图片 (Step 3) - 参考图1布局
    // 🟢 状态 1：已生成图片 (Step 3)
    if (step === 'generating' || step === 'done') {
        const baseClass = isOverlay ? "ring-2 ring-blue-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" : `${cardBorder} hover:shadow-md transition-shadow duration-300`;

        return (
            <div ref={ref} {...props} className={`flex flex-col gap-2 group relative`}>
                <div className={`relative rounded-xl overflow-hidden border ${baseClass} ${cardBg} ${currentRatioClass} cursor-pointer group`} onClick={() => onImageClick(idx)}>
                    
                    {/* 🟢 修改：左上角分镜号 - 字号缩小 (text-sm -> text-xs)，内边距减小 */}
                    <div className="absolute top-2 left-2 z-20">
                        <span className="text-white font-bold text-xs font-mono tracking-tight drop-shadow-md bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
                            {shotTitle}
                        </span>
                    </div>

                    {/* 重新生成按钮 */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRegenerate(panel.id); }}
                        className="absolute top-2 right-2 z-30 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 backdrop-blur-sm"
                    >
                        <RefreshCw size={12}/>
                    </button>

                    <div className="w-full h-full relative">
                        {panel.isLoading ? (
                            <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10 ${isDark ? 'bg-zinc-900/50' : 'bg-white/50'}`}>
                                <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
                                <span className="text-[10px] text-zinc-500 mt-2 font-bold">{t.loading}</span>
                            </div>
                        ) : panel.imageUrl ? (
                            <img src={panel.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" draggable={false} />
                        ) : (
                            <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
                                <ImageIcon size={24} className={`${isDark ? 'text-zinc-700' : 'text-gray-300'} mb-2`}/><span className="text-[10px] text-zinc-500">{t.waiting}</span>
                            </div>
                        )}
                        
                        {/* 底部文字覆盖 */}
                        <div 
                            className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-auto transition-all duration-300"
                            onClick={(e) => { e.stopPropagation(); }}
                        >
                             <div className="p-3 pb-3 flex items-end gap-2">
                                 <p 
                                    className={`text-white/90 text-xs leading-relaxed font-medium transition-all ${isDescriptionExpanded ? '' : 'line-clamp-1'} flex-1`}
                                    title={panel.description}
                                 >
                                    {panel.description}
                                 </p>
                                 {panel.description.length > 15 && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(!isDescriptionExpanded); }}
                                        className="text-white/60 hover:text-white transition-colors shrink-0 p-1"
                                     >
                                        {isDescriptionExpanded ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                                     </button>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 🟢 状态 2：编辑模式 (Step 2)
    const baseClass = isOverlay ? "ring-2 ring-blue-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" : `${cardBorder} hover:border-blue-500/50 transition-all shadow-sm`;
    
    return (
        <div ref={ref} {...props} className={`${cardBg} p-5 rounded-2xl border ${baseClass} flex flex-col gap-4 relative group min-h-[240px]`}>
            
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                     <span className={`font-black text-xl ${isDark ? 'text-white' : 'text-black'} font-mono`}>{shotTitle}</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className={`p-1.5 cursor-grab active:cursor-grabbing ${subTextColor} hover:text-blue-500 rounded-lg transition-colors`}>
                         <GripHorizontal size={18} />
                     </div>
                     {isDeleteMode && (
                         <button onClick={() => onDelete(panel.id)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer">
                         <Trash2 size={16} />
                     </button>
                )}
                 </div>
            </div>

            <div className="flex-1 space-y-3">
                <textarea 
                  value={panel.description} 
                  onChange={(e) => onUpdate(panel.id, 'description', e.target.value)} 
                  className={`w-full bg-transparent text-sm ${textColor} placeholder-zinc-500 border-none focus:ring-0 p-0 resize-none leading-relaxed font-medium min-h-[80px]`}
                  placeholder="Describe the action..."
                />

                <div className={`w-full h-[1px] ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}></div>

                <div>
                     <button 
                        onClick={() => setIsPromptOpen(!isPromptOpen)}
                        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${subTextColor} hover:text-blue-500 mb-1 cursor-pointer`}
                     >
                         {isPromptOpen ? <ChevronUp size={10}/> : <ChevronDown size={10}/>} <span>{t.prompt}</span>
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

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {/* 1. Shot Size (景别) */}
                <div className="relative group shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all`}>
                        <Eye size={14} className="text-zinc-500"/>
                        <span className={`text-xs font-bold ${textColor} uppercase whitespace-nowrap`}>
                            {/* 🟢 修改逻辑：如果没有匹配到值，显示 t.shotFallback (即 "景别") */}
                            {CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || t.shotFallback}
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

                {/* 2. Angle (角度) - 顺便检查一下 */}
                <div className="relative group shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all`}>
                        <Camera size={14} className="text-zinc-500"/>
                        <span className={`text-xs font-bold ${textColor} uppercase whitespace-nowrap`}>
                            {/* 🟢 确保这里也使用了 split 处理中文显示 */}
                            {CAMERA_ANGLES.find(a => a.value === panel.cameraAngle)?.label.split(' ')[1] || t.angle}
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

                {/* 3. Character (角色) */}
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
                            // 🟢 修改逻辑：显示 t.roleFallback (即 "角色")
                            <span className={`text-xs font-bold ${textColor} whitespace-nowrap`}>{t.roleFallback}</span>
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
  // 🟢 辅助函数：智能匹配景别中文 (解决 LONG SHOT 显示英文的问题)
  // 🟢 辅助函数：智能匹配景别中文 (纯中文模式，不带英文括号)
  const getLocalizedShotLabel = (shotType: string) => {
    if (!shotType) return t.shotFallback;
    const upper = shotType.toUpperCase();
    
    // 远景/全景系列
    if (upper.includes("EXTREME LONG") || upper.includes("EXTREME WIDE")) return "大远景";
    if (upper.includes("LONG") || upper.includes("WIDE")) return "全景";
    
    // 中景/全身系列
    if (upper.includes("FULL")) return "全身";
    if (upper.includes("MEDIUM") || upper.includes("MID")) return "中景";
    
    // 特写系列
    if (upper.includes("EXTREME CLOSE")) return "大特写";
    if (upper.includes("CLOSE")) return "特写";
    
    // 默认返回 (如果没有匹配到，尝试去掉下划线并转大写，或者直接显示原值)
    return shotType.replace(/_/g, ' ').toUpperCase();
};
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
  
  // Modals & Popups
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showAtmosphereModal, setShowAtmosphereModal] = useState(false);
  const [uploadedStyleRef, setUploadedStyleRef] = useState<string | null>(null);
  const styleUploadRef = useRef<HTMLInputElement>(null);

  // Lightbox & Casting State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isRepainting, setIsRepainting] = useState(false);
  const [showCastingModal, setShowCastingModal] = useState(false);

  // Modals
  const [showCharModal, setShowCharModal] = useState(false);
  const [activePanelIdForModal, setActivePanelIdForModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta>({ projectName: '', author: '', notes: '' });

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

  const handleScriptKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          if (e.shiftKey) {
          } else {
              e.preventDefault();
              if (!isAnalyzing && script.trim()) {
                  handleAnalyzeScript();
              }
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
        characterIds: [], characterAvatars: []
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

  const handleStyleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const fakeUrl = URL.createObjectURL(file);
          setUploadedStyleRef(fakeUrl);
          toast.success("Style Reference Uploaded");
      }
  };

  const handleOpenCharModal = (panelId: string) => { setActivePanelIdForModal(panelId); setShowCharModal(true); }
  
  const handlePreSelectCharacter = (char: Character) => {
      setBatchTargetChar(char);
      setShowCharModal(false); 
      setShowCastingModal(false); 
      setShowBatchConfirm(true); 
  };

  // 🟢 修改：支持 Lightbox 下的即时重绘
  const executeCharacterInject = async (isBatch: boolean) => {
    if (!activePanelIdForModal || !batchTargetChar) return;
    
    const targetChar = batchTargetChar; // 1. 暂存角色对象，防止被清空
    const targetPanelId = activePanelIdForModal;

    const keywords = targetChar.description.split(' ').filter(w => w.length > 3).slice(0, 3);
    const matchKeyword = targetChar.name.toLowerCase();

    // 2. 更新前端面板数据 (头像、Prompt)
    setPanels(current => current.map(p => {
        // 判定逻辑: 是当前卡片 OR (批量模式 AND 描述含关键词)
        const shouldUpdate = p.id === targetPanelId || (isBatch && (p.description.toLowerCase().includes(matchKeyword) || p.description.toLowerCase().includes('she') || p.description.toLowerCase().includes('he')));
        
        if (shouldUpdate) {
            const currentIds = p.characterIds || [];
            const currentAvatars = p.characterAvatars || [];
            
            let newIds = [...currentIds];
            let newAvatars = [...currentAvatars];

            // 双人逻辑：如果未包含，则追加。超过2人则FIFO替换。
            if (!newIds.includes(targetChar.id)) {
                if (newIds.length >= 2) {
                    newIds.shift(); newAvatars.shift(); 
                }
                newIds.push(targetChar.id);
                newAvatars.push(targetChar.avatar_url || '');
            }

            // Update Prompt
            const charPrompt = `(Character: ${targetChar.name}, ${targetChar.description})`;
            const newPrompt = p.prompt.includes(targetChar.name) ? p.prompt : `${p.prompt} ${charPrompt}`;

            return { ...p, characterIds: newIds, characterAvatars: newAvatars, prompt: newPrompt };
        }
        return p;
    }));

    // 3. 提示成功
    toast.success(isBatch ? `${t.batchLinked}: ${targetChar.name}` : `${t.linked}: ${targetChar.name}`);
    
    // 4. 关闭确认弹窗
    setShowBatchConfirm(false);
    
    // 5. 🟢 关键修复：如果是 Lightbox 模式，立即触发重绘 (并将角色数据传过去)
    // 注意：这里必须把 targetChar 传给 triggerRepaint，因为 state 马上要被清空了
    if (lightboxIndex !== null && panels[lightboxIndex].id === targetPanelId) {
        await triggerRepaint(targetChar); 
    }

    // 6. 清空临时状态
    setBatchTargetChar(null);
    // 如果不在 Lightbox 模式下，才清空选中ID；在 Lightbox 下保留 ID 以便支持连续操作
    if (lightboxIndex === null) {
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

    // 🟢 修正：使用翻译变量 t.rendering (显示 "AI 正在绘图...")
    // 之前可能是 toast.loading("Rendering ...") 硬编码导致的
    const toastId = toast.loading(t.rendering);

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
    toast.dismiss(toastId);
    toast.success(t.genComplete);
  };

  // 🟢 修改：支持传入角色参数 (charOverride)，确保即使 State 被清空也能获取到角色
  const triggerRepaint = async (charOverride?: Character) => {
    // 1. 优先使用传入的参数，如果没传再看 State
    const targetChar = charOverride || batchTargetChar; 
    
    if (lightboxIndex === null || !targetChar) return;
    
    const currentPanel = panels[lightboxIndex]; 
    setIsRepainting(true);
    
    try {
        // 2. 重新构建 Prompt，确保包含新角色的描述
        let actionPrompt = buildActionPrompt(currentPanel);
        const charPrompt = `(Character: ${targetChar.name}, ${targetChar.description})`;
        
        // 防止重复添加
        if (!actionPrompt.includes(targetChar.name)) {
            actionPrompt = `${actionPrompt} ${charPrompt}`;
        }

        const res = await repaintShotWithCharacter(
            currentPanel.id,
            currentPanel.imageUrl!,
            targetChar.id, // 使用 targetChar.id
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
        // 🟢 注意：这里去掉了 setActivePanelIdForModal(null)，防止干扰 Lightbox 状态
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info(t.zipping.replace('素材', 'PDF')); // 复用一下提示，或者写死 "正在生成 PDF..."
      
      const metaData = {
          projectName: exportMeta.projectName || t.defaultFileName, // 🟢 默认名也汉化
          author: exportMeta.author || "Director",
          notes: exportMeta.notes || ""
      };
      
      // 注意：这里我们将 panels 传进去，具体的汉化在 export-pdf.ts 内部处理
      await exportStoryboardPDF(metaData, panels);
      
      // 🟢 修改：使用中文提示
      toast.success(t.pdfExported);
      setShowExportModal(false);
    } catch (error: any) { console.error(error); toast.error('Export failed'); } finally { setIsExporting(false); }
  };

  const handleExportZIP = async () => {
    setIsExporting(true);
    try {
      // 🟢 修改：提示语汉化
      toast.info(t.zipping);
      
      // 🟢 修改：文件名汉化 (如果脚本为空，使用默认中文文件名)
      const fileName = script.slice(0, 20).trim() || t.defaultFileName;
      
      await exportStoryboardZIP(fileName, panels);
      
      // 🟢 修改：成功提示汉化
      toast.success(t.zipDownloaded);
    } catch (error) { 
      toast.error('Export failed'); 
    } finally { 
      setIsExporting(false); 
    }
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
      
      {/* 🟢 Lightbox Pro (大图模式) - 修正：景别/角度数值中文化映射 */}
      {/* 🟢 Lightbox Pro (大图模式) - 修正：移除图标，强制中文显示 */}
      {/* 🟢 Lightbox Pro (大图模式) - 修正：智能景别翻译 */}
      {currentLightboxPanel && currentLightboxPanel.imageUrl && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
              
              {/* 左上角：分镜号 */}
              <div className="absolute top-6 left-6 z-50">
                   <span className="text-white/60 font-black text-2xl font-mono tracking-widest bg-black/30 px-3 py-1 rounded-lg backdrop-blur-md">
                       {t.shotPrefix} {String((lightboxIndex??0) + 1).padStart(2, '0')}
                   </span>
              </div>

              <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-md cursor-pointer"><X size={28} /></button>

              <div className="relative w-full h-[85vh] flex items-center justify-center group">
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex > 0 ? lightboxIndex - 1 : lightboxIndex)} className="absolute left-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronLeft size={32}/></button>
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex < panels.length - 1 ? lightboxIndex + 1 : lightboxIndex)} className="absolute right-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronRight size={32}/></button>

                  <img src={currentLightboxPanel.imageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                  
                  {isRepainting && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"><Loader2 className="animate-spin text-white w-12 h-12"/><span className="text-white font-bold mt-4">{t.loading}</span></div>}

                  {/* 底部信息栏 */}
                  <div className="absolute bottom-0 left-0 right-0 w-full p-10 pt-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex justify-between items-end pointer-events-none rounded-b-lg">
                      <div className="max-w-4xl space-y-3 pointer-events-auto">
                          
                          {/* 1. 描述文字 */}
                          <p className="text-white/95 text-xl font-medium leading-relaxed drop-shadow-md">
                              {currentLightboxPanel.description}
                          </p>
                          
                          {/* 2. 标签信息：使用 getLocalizedShotLabel 函数 */}
                          <div className="flex gap-4 text-white/60 font-mono text-xs font-bold tracking-wider uppercase">
                              <span>
                                  {/* 🟢 使用新函数翻译景别 */}
                                  {t.shotSize}: {getLocalizedShotLabel(currentLightboxPanel.shotType)}
                              </span>
                              <span className="opacity-30">|</span>
                              <span>
                                  {/* 🟢 翻译角度并去图标 */}
                                  {t.angle}: {CAMERA_ANGLES.find(a => a.value === currentLightboxPanel.cameraAngle)?.label.replace('👁️', '').split('(')[0].trim() || currentLightboxPanel.cameraAngle}
                              </span>
                          </div>
                      </div>
                      
                      <div className="pointer-events-auto">
                          <button 
                            onClick={() => { setActivePanelIdForModal(currentLightboxPanel.id); setShowCastingModal(true); }} 
                            disabled={isRepainting}
                            className="px-6 py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer"
                          >
                              <User size={18} /> {t.casting}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 🟢 Batch Confirm Modal (修复：完整内容 + 交互优化) */}
      {showBatchConfirm && batchTargetChar && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className={`w-[400px] ${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} border rounded-3xl p-6 shadow-2xl space-y-6`}>
                  <div className="text-center space-y-3">
                      <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-4 border-blue-500 shadow-lg">
                          <img src={batchTargetChar.avatar_url || ''} className="w-full h-full object-cover"/>
                      </div>
                      <div>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                              {t.apply} {batchTargetChar.name}?
                          </h3>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => executeCharacterInject(false)} 
                          // 按钮：小手光标
                          className={`flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                          {t.onlyThisShot}
                      </button>
                      <button 
                          onClick={() => executeCharacterInject(true)} 
                          // 按钮：小手光标
                          className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                          <Sparkles size={16}/> {t.applyAll}
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* 🟢 风格选择弹窗 (修复：完整内容 + 交互优化) */}
      {showStyleModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowStyleModal(false)}>
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-white/10 flex justify-between items-center">
                      <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-black'}`}>{t.selectStyle}</h3>
                      {/* 关闭按钮：默认箭头 */}
                      <button onClick={() => setShowStyleModal(false)}><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                       {/* 上传区域：小手光标 */}
                       <div className="space-y-3">
                           <label className="text-xs font-bold text-zinc-500 uppercase">{t.uploadRef}</label>
                           <div className={`border-2 border-dashed ${isDark ? 'border-zinc-700 hover:border-zinc-500' : 'border-gray-200 hover:border-gray-400'} rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative`}>
                               <input type="file" ref={styleUploadRef} onChange={handleStyleUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"/>
                               {uploadedStyleRef ? (
                                   <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                       <img src={uploadedStyleRef} className="w-full h-full object-cover" />
                                       <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Check className="text-white drop-shadow-md" size={32}/></div>
                                   </div>
                               ) : (
                                   <>
                                    <Upload className="text-zinc-500 mb-2"/>
                                    <span className="text-xs text-zinc-500 font-medium">{t.clickToUpload}</span>
                                   </>
                               )}
                           </div>
                       </div>

                       {/* 风格列表：小手光标 */}
                       <div className="space-y-3">
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {STYLE_OPTIONS.map(opt => (
                                    <button 
                                        key={opt.value} 
                                        onClick={() => { setStylePreset(opt.value); setShowStyleModal(false); }} 
                                        className={`relative aspect-square rounded-xl border transition-all overflow-hidden group text-left p-3 flex flex-col justify-end cursor-pointer ${stylePreset === opt.value ? 'border-blue-500 ring-2 ring-blue-500' : `${isDark ? 'border-zinc-800' : 'border-gray-200'}`}`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                                        <div className="relative z-10">
                                            <span className={`text-xs font-bold block ${isDark || stylePreset === opt.value ? 'text-white' : 'text-gray-800'}`}>{opt.label}</span>
                                        </div>
                                    </button>
                                ))}
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* 🟢 氛围选择弹窗 (修复：完整内容 + 交互优化) */}
      {showAtmosphereModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowAtmosphereModal(false)}>
            <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-[300px] rounded-2xl border overflow-hidden shadow-2xl flex flex-col`} onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{t.moreAtmosphere}</h3>
                    <button onClick={() => setShowAtmosphereModal(false)}><X size={16}/></button>
                </div>
                <div className="p-2 overflow-y-auto custom-scrollbar max-h-[300px]">
                    {ATMOSPHERE_TAGS.map(tag => (
                        <button 
                            key={tag.label} 
                            onClick={() => toggleAtmosphere(tag.val)} 
                            className={`w-full text-left px-3 py-3 text-xs font-bold border-b border-white/5 flex justify-between items-center cursor-pointer ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            <span>{tag.label}</span>
                            {globalAtmosphere.includes(tag.val) && <Check size={14} className="text-blue-500"/>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* 🟢 Character Library Modal (修复：完整内容 + 交互优化) */}
      {(showCharModal || showCastingModal) && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}>
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[80vh]`} onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-white/10 flex justify-between items-center">
                      <h3 className={`font-bold flex items-center gap-2 text-lg ${isDark ? 'text-white' : 'text-black'}`}><Users size={20} className="text-blue-500"/> {t.charLib}</h3>
                      {/* 关闭按钮：默认箭头 */}
                      <button onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}><X size={20}/></button>
                  </div>
                  <div className="p-6 grid grid-cols-4 gap-4 overflow-y-auto custom-scrollbar">
                      {characters.map(char => (
                          <button 
                              key={char.id} 
                              onClick={() => handlePreSelectCharacter(char)} 
                              // 内容卡片：小手光标
                              className="group relative aspect-square rounded-2xl border border-white/10 overflow-hidden hover:border-blue-500 transition-all shadow-md cursor-pointer"
                          >
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
                    {/* 🟢 修改：Placeholder 汉化 */}
                    <input 
                        value={exportMeta.projectName} 
                        onChange={e => setExportMeta({...exportMeta, projectName: e.target.value})} 
                        className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} 
                        placeholder={t.projNamePlaceholder} 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.author}</label>
                    {/* 🟢 修改：Placeholder 汉化 */}
                    <input 
                        value={exportMeta.author} 
                        onChange={e => setExportMeta({...exportMeta, author: e.target.value})} 
                        className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} 
                        placeholder={t.authorPlaceholder} 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.notes}</label>
                    {/* 🟢 修改：Placeholder 汉化 */}
                    <textarea 
                        value={exportMeta.notes} 
                        onChange={e => setExportMeta({...exportMeta, notes: e.target.value})} 
                        className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-20 resize-none`} 
                        placeholder={t.notesPlaceholder} 
                    />
                 </div>
              </div>
              <div className="flex gap-3 pt-2">
                 {/* 🟢 修改：按钮文字汉化 + 确保 cursor-pointer */}
                 <button onClick={() => setShowExportModal(false)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${buttonBg}`}>
                    {t.cancel}
                 </button>
                 <button onClick={handleExportPDF} disabled={isExporting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    {isExporting ? <Loader2 className="animate-spin w-4 h-4"/> : <Check size={16}/>} {t.confirmExport}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b h-16 flex items-center justify-between px-6 transition-colors duration-300 ${headerBg}`}>
        {/* 🟢 主页Header去横线：headerBg本身带border，如果是主页特有需求，这里是全局的。
            但根据需求 "首页标题上方的横线"，指的可能是输入框容器的顶部边框。
            这里是全局Header，保持原样。 */}
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
             <Link href="/tools/characters" className={`p-2 rounded-full transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-zinc-600'}`}>
                    <User size={18}/>
             </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-40 pb-12 px-6 min-h-screen">
      {step === 'input' && (
           // 🟢 修改1：移除了 '-mt-20'，让整体内容垂直居中（即下移回正中位置）
           <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center min-h-[70vh]">
              
              {/* 🟢 修改2：宽度改为 'w-full max-w-2xl' (比之前的 70% 更窄更精致) */}
              <div className="w-full max-w-2xl space-y-8">
                 
                 <div className="text-center space-y-4 mb-10">
                    {/* 🟢 修改3：字号改为 'text-5xl' (原为 6xl)，稍微缩小 */}
                    <h1 className={`text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t.title}
                    </h1>
                    <p className="text-zinc-500 text-sm mt-2">{t.subtitle}</p>
                 </div>
                 
                 <div className={`relative w-full rounded-3xl shadow-2xl transition-all duration-300 overflow-hidden ${isDark ? 'bg-[#1e1e1e] shadow-black/50' : 'bg-white shadow-blue-900/10'}`}>
                    <textarea 
                      className={`w-full min-h-[240px] p-8 text-lg bg-transparent border-none resize-none outline-none leading-relaxed custom-scrollbar ${isDark ? 'text-gray-200 placeholder-zinc-600' : 'text-gray-800 placeholder-gray-300'}`}
                      placeholder={t.scriptPlaceholder}
                      value={script} 
                      onChange={(e) => setScript(e.target.value)}
                      onKeyDown={handleScriptKeyDown} 
                    />
                    
                    <div className="flex items-center justify-between p-4 pl-6 bg-gradient-to-t from-black/5 to-transparent">
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
           <div className="max-w-[1600px] mx-auto flex gap-8 items-start animate-in fade-in">
              <div className="w-[340px] shrink-0 space-y-6 h-fit sticky top-24">
                 <div className={`${containerBg} p-5 rounded-3xl space-y-6`}>
                 <h2 className="text-xs font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest"><Settings size={12}/> {t.globalSettings}</h2>
                    
                    <div className={`flex ${isDark ? 'bg-black' : 'bg-gray-100'} p-1 rounded-xl mb-4`}>
                        <button onClick={() => setMode('draft')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${mode === 'draft' ? 'bg-white text-black shadow-sm' : 'text-zinc-500'}`}>{t.draftMode}</button>
                        <button onClick={() => setMode('render')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${mode === 'render' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500'}`}>{t.renderMode}</button>
                    </div>

                    {mode === 'render' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.atmosphere}</label>
                                <div className={`flex items-center gap-1`}>
                                    <div className={`flex-1 flex items-center gap-2 ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} p-2.5 rounded-xl focus-within:border-blue-500 transition-colors`}>
                                        <Sparkles size={14} className="text-purple-500 shrink-0"/>
                                        <input value={globalAtmosphere} onChange={(e) => setGlobalAtmosphere(e.target.value)} placeholder={t.atmospherePlaceholder} className={`bg-transparent text-xs ${isDark ? 'text-white' : 'text-gray-900'} placeholder-zinc-500 outline-none w-full font-bold`}/>
                                    </div>
                                    <button 
                                        onClick={() => setShowAtmosphereModal(!showAtmosphereModal)}
                                        // 🟢 修改：添加 cursor-pointer
                                        className={`p-3 rounded-xl border cursor-pointer ${isDark ? 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                    >
                                        <ChevronsUpDown size={16} className="text-zinc-500"/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.style}</label>
                                <button 
                                    onClick={() => setShowStyleModal(true)}
                                    // 🟢 修改：添加 cursor-pointer
                                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between cursor-pointer ${isDark ? 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded bg-gradient-to-br ${STYLE_OPTIONS.find(s => s.value === stylePreset)?.color || 'from-gray-500 to-black'}`}></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">{STYLE_OPTIONS.find(s => s.value === stylePreset)?.label || t.selectStyle}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-500"/>
                                </button>
                            </div>

                            <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${useInstantID ? 'bg-blue-500/10 border-blue-500' : `${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}`}>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold flex items-center gap-1 ${useInstantID ? 'text-blue-500' : 'text-zinc-500'}`}>
                                        <User size={12} /> {t.instantID}
                                    </span>
                                    <span className="text-[8px] opacity-60">{t.instantIDDesc}</span>
                                </div>
                                <button 
                                    onClick={() => setUseInstantID(!useInstantID)}
                                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${useInstantID ? 'bg-blue-500' : 'bg-zinc-600'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${useInstantID ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'draft' && (
                         <div className="space-y-2">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">{t.scene}</label>
                           <div className={`flex items-center gap-2 ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} p-2.5 rounded-xl focus-within:border-blue-500 transition-colors`}>
                              <LayoutGrid size={14} className="text-green-500 shrink-0"/>
                              <input 
    value={sceneDescription} 
    onChange={(e) => setSceneDescription(e.target.value)} 
    placeholder={t.scenePlaceholder} // 🟢 使用翻译变量
    className={`bg-transparent text-xs ${isDark ? 'text-white' : 'text-gray-900'} placeholder-zinc-500 outline-none w-full font-bold`}
/>
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
                    <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
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
                     {/* 🟢 修改 1：返回按钮文字 */}
                     <button onClick={() => setStep('review')} className="text-xs font-bold text-zinc-500 hover:text-blue-500 flex items-center gap-2 transition-colors cursor-pointer">
                        <ArrowLeft size={14}/> {t.backToSetup}
                     </button>
                     
                     <div className="flex items-center gap-4">
                         {/* 🟢 修改 2：统计信息栏 (TOTAL / SHOTS / RATIO) */}
                         <div className="text-xs font-mono text-zinc-500 uppercase">
                             {t.total}: <span className={isDark ? "text-white" : "text-black"}>{panels.length}</span> {t.shotUnit} | {t.ratioLabel}: <span className={isDark ? "text-white" : "text-black"}>{aspectRatio}</span>
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