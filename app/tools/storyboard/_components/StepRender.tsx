'use client'

import React from 'react';
import { ArrowLeft, Loader2, Download, Package, RotateCcw } from 'lucide-react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { PanelCard, SortablePanelItem } from './PanelCard';
import { StoryboardPanel } from '../types';

interface StepRenderProps {
    isDark: boolean;
    t: any;
    panels: StoryboardPanel[];
    aspectRatio: string;
    setStep: (s: any) => void;
    setScript: (s: string) => void;
    setPanels: (p: StoryboardPanel[]) => void;
    handleGenerateSingleImage: (id: string) => void;
    setLightboxIndex: (idx: number | null) => void;
    handleExportPDF: () => void;
    handleExportZIP: () => void;
    isExporting: boolean;
    setShowExportModal: (v: boolean) => void;
    currentRatioClass: string;
    sensors: any;
    handleDragStart: any;
    handleDragEnd: any;
    activeDragId: string | null;
    step: string;
}

export default function StepRender({
    isDark, t, panels, aspectRatio, setStep, setScript, setPanels,
    handleGenerateSingleImage, setLightboxIndex, handleExportPDF, handleExportZIP,
    isExporting, setShowExportModal, currentRatioClass, sensors,
    handleDragStart, handleDragEnd, activeDragId, step
}: StepRenderProps) {
    
    const activePanel = activeDragId ? panels.find(p => p.id === activeDragId) : null;

    return (
        <div className="max-w-[1920px] mx-auto animate-in fade-in space-y-8">
             <div className="flex justify-between items-center px-4">
                 <button onClick={() => setStep('review')} className="text-xs font-bold text-zinc-500 hover:text-blue-500 flex items-center gap-2 transition-colors cursor-pointer">
                    <ArrowLeft size={14}/> {t.backToSetup}
                 </button>
                 
                 <div className="flex items-center gap-4">
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
    );
}