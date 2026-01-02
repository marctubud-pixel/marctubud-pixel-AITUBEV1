// 文件路径: app/tools/storyboard/_components/PanelCard.tsx

import React, { useState } from 'react';
import { Eye, Camera, User, RefreshCw, Loader2, ImageIcon, GripHorizontal, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CINEMATIC_SHOTS, CAMERA_ANGLES } from '../constants'; // 确保路径正确
import { StoryboardPanel } from '../types'; // 确保路径正确

// 🟢 修复 1: 继承 HTMLAttributes 以支持 className, style, onClick 等标准属性
interface PanelCardProps extends React.HTMLAttributes<HTMLDivElement> {
    panel: StoryboardPanel;
    idx: number;
    currentRatioClass: string;
    step: string;
    isOverlay?: boolean;
    // t: any; // 建议给翻译对象一个宽泛的类型，或者具体定义
    t: Record<string, any>; 
    isDark: boolean;
    isDeleteMode: boolean;
    onDelete?: (id: string) => void;
    onUpdate?: (id: string, field: string, value: any) => void;
    onRegenerate?: (id: string) => void;
    onOpenCharModal?: (id: string) => void;
    onImageClick?: (index: number) => void;
}

export const PanelCard = React.forwardRef<HTMLDivElement, PanelCardProps>(({ 
    panel, idx, currentRatioClass, onDelete, onUpdate, onRegenerate, 
    onOpenCharModal, onImageClick, step, isOverlay, t, isDark, isDeleteMode, ...props 
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
                <div 
                    className={`relative rounded-xl overflow-hidden border ${baseClass} ${cardBg} ${currentRatioClass} cursor-pointer group`} 
                    // 🟢 修复 2: 可选链调用
                    onClick={() => onImageClick?.(idx)}
                >
                    
                    {/* 左上角分镜号 */}
                    <div className="absolute top-2 left-2 z-20">
                        <span className="text-white font-bold text-xs font-mono tracking-tight drop-shadow-md bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
                            {shotTitle}
                        </span>
                    </div>

                    {/* 重新生成按钮 */}
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // 🟢 修复 2: 可选链调用
                            onRegenerate?.(panel.id); 
                        }}
                        className="absolute top-2 right-2 z-30 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 backdrop-blur-sm cursor-pointer"
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
                         <button 
                            // 🟢 修复 2: 可选链调用
                            onClick={() => onDelete?.(panel.id)} 
                            className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
                         >
                            <Trash2 size={16} />
                         </button>
                    )}
                 </div>
            </div>

            <div className="flex-1 space-y-3">
                <textarea 
                  value={panel.description} 
                  // 🟢 修复 2: 可选链调用
                  onChange={(e) => onUpdate?.(panel.id, 'description', e.target.value)} 
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
                           // 🟢 修复 2: 可选链调用
                           onChange={(e) => onUpdate?.(panel.id, 'prompt', e.target.value)} 
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
                            {CINEMATIC_SHOTS.find(s => s.value === panel.shotType)?.label.split('(')[0] || t.shotFallback}
                        </span>
                    </div>
                    <select 
                        value={panel.shotType} 
                        // 🟢 修复 2: 可选链调用
                        onChange={(e) => onUpdate?.(panel.id, 'shotType', e.target.value)} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                        {CINEMATIC_SHOTS.map(shot => <option key={shot.value} value={shot.value}>{shot.label}</option>)}
                    </select>
                </div>

                {/* 2. Angle (角度) */}
                <div className="relative group shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${pillBg} cursor-pointer border border-transparent hover:border-zinc-600 transition-all`}>
                        <Camera size={14} className="text-zinc-500"/>
                        <span className={`text-xs font-bold ${textColor} uppercase whitespace-nowrap`}>
                            {CAMERA_ANGLES.find(a => a.value === panel.cameraAngle)?.label.split(' ')[1] || t.angle}
                        </span>
                    </div>
                    <select 
                        value={panel.cameraAngle || 'EYE LEVEL'} 
                        // 🟢 修复 2: 可选链调用
                        onChange={(e) => onUpdate?.(panel.id, 'cameraAngle', e.target.value)} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                        {CAMERA_ANGLES.map(angle => <option key={angle.value} value={angle.value}>{angle.label}</option>)}
                    </select>
                </div>

                {/* 3. Character (角色) */}
                <button 
                    // 🟢 修复 2: 可选链调用
                    onClick={() => onOpenCharModal?.(panel.id)}
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
                            <span className={`text-xs font-bold ${textColor} whitespace-nowrap`}>{t.roleFallback}</span>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
});

PanelCard.displayName = "PanelCard";

// 导出 SortableItem 组件供列表使用
export function SortablePanelItem(props: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.panel.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
    return (<div ref={setNodeRef} style={style} {...attributes} {...listeners}><PanelCard {...props} /></div>);
}