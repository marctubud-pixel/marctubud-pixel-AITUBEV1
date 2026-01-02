'use client'

import React from 'react';
import { Settings, Sparkles, ChevronsUpDown, ChevronRight, User, LayoutGrid, PenTool, Palette, Minus, Plus } from 'lucide-react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { PanelCard, SortablePanelItem } from './PanelCard';
import { StoryboardPanel } from '../types';
import { STYLE_OPTIONS } from '../constants';

interface StepReviewProps {
    isDark: boolean;
    t: any;
    panels: StoryboardPanel[];
    mode: 'draft' | 'render';
    setMode: (m: 'draft' | 'render') => void;
    globalAtmosphere: string;
    setGlobalAtmosphere: (v: string) => void;
    showAtmosphereModal: boolean;
    setShowAtmosphereModal: (v: boolean) => void;
    stylePreset: string;
    showStyleModal: boolean;
    setShowStyleModal: (v: boolean) => void;
    useInstantID: boolean;
    setUseInstantID: (v: boolean) => void;
    sceneDescription: string;
    setSceneDescription: (v: string) => void;
    handleGenerateImages: () => void;
    isDeleteMode: boolean;
    setIsDeleteMode: (v: boolean) => void;
    handleAddPanel: () => void;
    handleDeletePanel: (id: string) => void;
    handleUpdatePanel: (id: string, field: keyof StoryboardPanel, value: any) => void;
    handleOpenCharModal: (id: string) => void;
    setLightboxIndex: (idx: number | null) => void;
    currentRatioClass: string;
    sensors: any;
    handleDragStart: any;
    handleDragEnd: any;
    activeDragId: string | null;
}

export default function StepReview({
    isDark, t, panels, mode, setMode, 
    globalAtmosphere, setGlobalAtmosphere, showAtmosphereModal, setShowAtmosphereModal,
    stylePreset, showStyleModal, setShowStyleModal,
    useInstantID, setUseInstantID, sceneDescription, setSceneDescription,
    handleGenerateImages, isDeleteMode, setIsDeleteMode, handleAddPanel,
    handleDeletePanel, handleUpdatePanel, handleOpenCharModal, setLightboxIndex,
    currentRatioClass, sensors, handleDragStart, handleDragEnd, activeDragId
}: StepReviewProps) {

    const containerBg = isDark ? "bg-[#1e1e1e] border-zinc-800" : "bg-white border-white shadow-sm";
    const inputBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
    const buttonBg = isDark ? "bg-[#2d2d2d] hover:bg-[#3d3d3d]" : "bg-[#e3e3e3] hover:bg-[#d3d3d3] text-black";
    const activePanel = activeDragId ? panels.find(p => p.id === activeDragId) : null;

    return (
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
                              placeholder={t.scenePlaceholder} 
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
                              <SortablePanelItem key={panel.id} panel={panel} idx={idx} step="review" onDelete={handleDeletePanel} onUpdate={handleUpdatePanel} onOpenCharModal={handleOpenCharModal} onImageClick={setLightboxIndex} t={t} isDark={isDark} currentRatioClass={currentRatioClass} isDeleteMode={isDeleteMode}/>
                          ))}
                      </div>
                  </SortableContext>
                  <DragOverlay>
                      {activePanel ? <PanelCard panel={activePanel} idx={panels.findIndex(p => p.id === activePanel.id)} step="review" currentRatioClass={currentRatioClass} isOverlay={true} t={t} isDark={isDark} isDeleteMode={isDeleteMode}/> : null}
                  </DragOverlay>
               </DndContext>
           </div>
        </div>
    );
}