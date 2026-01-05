'use client'

import React, { useState } from 'react';
// ✅ 修复点1：确保引入了 ImagePlus 图标
import { RefreshCw, ImageIcon, Loader2, GripHorizontal, Trash2, ChevronDown, ChevronUp, Eye, Camera, User, ImagePlus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StoryboardPanel } from '../types';
import { CINEMATIC_SHOTS, CAMERA_ANGLES } from '../constants';

interface PanelCardProps extends React.HTMLAttributes<HTMLDivElement> {
    panel: StoryboardPanel;
    idx: number;
    currentRatioClass: string;
    onDelete?: (id: string) => void;
    onUpdate?: (id: string, field: keyof StoryboardPanel, value: any) => void;
    onRegenerate?: (id: string) => void;
    onOpenCharModal?: (id: string) => void;
    // 定义接口
    onOpenSearch?: (idx: number) => void;
    onImageClick?: (idx: number) => void;
    step: string;
    isOverlay?: boolean;
    t: any;
    isDark: boolean;
    isDeleteMode?: boolean;
}

// --- PanelCard Component (V6.2 修复版) ---
// ✅ 修复点2：注意下面这行，必须把 onOpenSearch 从 props 里解构出来！
// 如果不写在这里，它就会留在 ...props 里传给 div，导致报错
export const PanelCard = React.forwardRef<HTMLDivElement, PanelCardProps>(({ 
    panel, 
    idx, 
    currentRatioClass, 
    onDelete, 
    onUpdate, 
    onRegenerate, 
    onOpenCharModal, 
    onOpenSearch, // <--- 关键：这里必须把它拿出来
    onImageClick, 
    step, 
    isOverlay, 
    t, 
    isDark, 
    isDeleteMode, 
    ...props // 剩下的 props 才能传给 div
}, ref) => {
    
    const cardBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
    const cardBorder = isDark ? "border-zinc-800" : "border-gray-200";
    const textColor = isDark ? "text-gray-200" : "text-gray-800";
    const subTextColor = isDark ? "text-zinc-500" : "text-gray-400";
    const pillBg = isDark ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-100 hover:bg-gray-200";
    
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const shotTitle = `${t.shotPrefix} ${String(idx + 1).padStart(2, '0')}`;

    // 🟢 状态 1：已生成图片 (Step 3)
    if (step === 'generating' || step === 'done') {
        const baseClass = isOverlay ? "ring-2 ring-blue-500 shadow-2xl scale-105 opacity-90 cursor-grabbing z-50" : `${cardBorder} hover:shadow-md transition-shadow duration-300`;

        return (
            <div ref={ref} {...props} className={`flex flex-col gap-2 group relative`}>
                <div className={`relative rounded-xl overflow-hidden border ${baseClass} ${cardBg} ${currentRatioClass} cursor-pointer group`} onClick={() => onImageClick && onImageClick(idx)}>
                    <div className="absolute top-2 left-2 z-20">
                        <span className="text-white font-bold text-xs font-mono tracking-tight drop-shadow-md bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
                            {shotTitle}
                        </span>
                    </div>

                    {onRegenerate && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRegenerate(panel.id); }}
                            className="absolute top-2 right-2 z-30 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 backdrop-blur-sm"
                        >
                            <RefreshCw size={12}/>
                        </button>
                    )}

                    <div className="w-full h-full relative">
                        {panel.isLoading ? (
                            <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-10 ${isDark ? 'bg-zinc-900/50' : 'bg-white/50'}`}>
                                <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
                                <span className="text-[10px] text-zinc-500 mt-2 font-bold">{t.loading}</span>
                            </div>
                        ) : panel.imageUrl ? (
                            <img src={panel.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" draggable={false} alt="Generated Shot" />
                        ) : (
                            <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
                                <ImageIcon size={24} className={`${isDark ? 'text-zinc-700' : 'text-gray-300'} mb-2`}/><span className="text-[10px] text-zinc-500">{t.waiting}</span>
                            </div>
                        )}
                        
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
                     {isDeleteMode && onDelete && (
                         <button onClick={() => onDelete(panel.id)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer">
                            <Trash2 size={16} />
                         </button>
                    )}
                 </div>
            </div>

            <div className="flex-1 space-y-3">
                <textarea 
                  value={panel.description} 
                  onChange={(e) => onUpdate && onUpdate(panel.id, 'description', e.target.value)} 
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
                           onChange={(e) => onUpdate && onUpdate(panel.id, 'prompt', e.target.value)} 
                           className={`w-full bg-transparent text-[10px] text-zinc-500 placeholder-zinc-600 border ${isDark ? 'border-zinc-800 bg-black/20' : 'border-gray-200 bg-white/50'} rounded-lg p-2 focus:ring-0 focus:border-blue-500/50 resize-none leading-relaxed font-mono h-20 animate-in slide-in-from-top-2`} 
                           placeholder="AI visual details..."
                          />
                      )}
                </div>
            </div>

            {/* ✅ 修复点3：确保这里有 ImagePlus 按钮的 JSX 代码 */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {/* 1. Shot Size */}
                <div className="relative group shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all`}>
                        <Eye size={14} className="text-zinc-500"/>
                        <span className={`text-xs font-bold ${textColor} uppercase whitespace-nowrap`}>
                            {CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || t.shotFallback}
                        </span>
                    </div>
                    <select 
                        value={panel.shotType} 
                        onChange={(e) => onUpdate && onUpdate(panel.id, 'shotType', e.target.value)} 
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
                            {CAMERA_ANGLES.find(a => a.value === panel.cameraAngle)?.label.split(' ')[1] || t.angle}
                        </span>
                    </div>
                    <select 
                        value={panel.cameraAngle || 'EYE LEVEL'} 
                        onChange={(e) => onUpdate && onUpdate(panel.id, 'cameraAngle', e.target.value)} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                        {CAMERA_ANGLES.map(angle => <option key={angle.value} value={angle.value}>{angle.label}</option>)}
                    </select>
                </div>

                {/* 3. Character */}
                <button 
                    onClick={() => onOpenCharModal && onOpenCharModal(panel.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all shrink-0`}
                >
                    <User size={14} className={panel.characterIds?.length ? "text-blue-500" : "text-zinc-500"}/>
                    <div className="flex -space-x-2 overflow-hidden items-center">
                        {panel.characterAvatars && panel.characterAvatars.length > 0 ? (
                            panel.characterAvatars.map((av: string, i: number) => (
                                <div key={i} className={`w-5 h-5 rounded-full ring-2 ${isDark ? 'ring-[#1e1e1e]' : 'ring-white'} relative z-${10-i}`}>
                                    <img src={av} className="w-full h-full object-cover rounded-full" alt="char" />
                                </div>
                            ))
                        ) : (
                            <span className={`text-xs font-bold ${textColor} whitespace-nowrap`}>{t.roleFallback}</span>
                        )}
                    </div>
                </button>

                {/* 🟢 4. [导演搜图按钮] - 修复版 */}
                <button 
                    onClick={(e) => {
                        // 1. 阻止拖拽事件干扰
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // 2. 打印日志，按 F12 看控制台有没有输出
                        console.log("🖱️ 点击了搜图按钮，Index:", idx);

                        // 3. 执行回调
                        if (onOpenSearch) {
                            onOpenSearch(idx);
                        } else {
                            console.error("❌ onOpenSearch 未定义，请检查父组件传参！");
                        }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all shrink-0 ${panel.referenceImage ? 'bg-indigo-500/10 border-indigo-500' : ''}`}
                    title="Search Unsplash Reference"
                >
                    <ImagePlus size={14} className={panel.referenceImage ? "text-indigo-500" : "text-zinc-500"} />
                    {panel.referenceImage ? (
                        <div className="w-4 h-4 rounded-sm overflow-hidden ring-1 ring-indigo-500">
                            <img src={panel.referenceImage} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <span className={`text-xs font-bold ${textColor} whitespace-nowrap`}>参考图</span>
                    )}
                </button>
            </div>
        </div>
    );
});
PanelCard.displayName = "PanelCard";

export function SortablePanelItem(props: PanelCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.panel.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
    return (<div ref={setNodeRef} style={style} {...attributes} {...listeners}><PanelCard {...props} /></div>);
}