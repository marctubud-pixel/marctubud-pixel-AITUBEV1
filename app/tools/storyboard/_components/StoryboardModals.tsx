'use client'

import React, { useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, User, Check, Upload, Users, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { StoryboardPanel, Character, ExportMeta } from '../types';
import { CAMERA_ANGLES, STYLE_OPTIONS, ATMOSPHERE_TAGS } from '../constants';

interface ModalsProps {
    t: any;
    isDark: boolean;
    // Lightbox Props
    lightboxIndex: number | null;
    setLightboxIndex: (i: number | null) => void;
    panels: StoryboardPanel[];
    isRepainting: boolean;
    triggerRepaint: (char?: Character) => void;
    setActivePanelIdForModal: (id: string | null) => void;
    setShowCastingModal: (v: boolean) => void;
    getLocalizedShotLabel: (s: string) => string;
    
    // Batch Confirm Props
    showBatchConfirm: boolean;
    setShowBatchConfirm: (v: boolean) => void;
    batchTargetChar: Character | null;
    setBatchTargetChar: (c: Character | null) => void;
    executeCharacterInject: (isBatch: boolean) => void;
    
    // Style Modal Props
    showStyleModal: boolean;
    setShowStyleModal: (v: boolean) => void;
    handleStyleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadedStyleRef: string | null;
    stylePreset: string;
    setStylePreset: (v: string) => void;
    
    // Atmosphere Modal Props
    showAtmosphereModal: boolean;
    setShowAtmosphereModal: (v: boolean) => void;
    toggleAtmosphere: (tag: string) => void;
    globalAtmosphere: string;

    // Character Modal Props
    showCharModal: boolean;
    setShowCharModal: (v: boolean) => void;
    showCastingModal: boolean;
    characters: Character[];
    activePanelIdForModal: string | null;
    handlePreSelectCharacter: (c: Character) => void;

    // Export Modal Props
    showExportModal: boolean;
    setShowExportModal: (v: boolean) => void;
    exportMeta: ExportMeta;
    setExportMeta: (m: ExportMeta) => void;
    handleExportPDF: () => void;
    isExporting: boolean;
}

export default function StoryboardModals(props: ModalsProps) {
    const { 
        t, isDark, lightboxIndex, setLightboxIndex, panels, isRepainting, 
        setActivePanelIdForModal, setShowCastingModal, getLocalizedShotLabel,
        showBatchConfirm, setShowBatchConfirm, batchTargetChar, setBatchTargetChar, executeCharacterInject,
        showStyleModal, setShowStyleModal, handleStyleUpload, uploadedStyleRef, stylePreset, setStylePreset,
        showAtmosphereModal, setShowAtmosphereModal, toggleAtmosphere, globalAtmosphere,
        showCharModal, setShowCharModal, showCastingModal: _showCastingModal, characters, activePanelIdForModal, handlePreSelectCharacter,
        showExportModal, setShowExportModal, exportMeta, setExportMeta, handleExportPDF, isExporting
    } = props;

    const currentLightboxPanel = lightboxIndex !== null ? panels[lightboxIndex] : null;
    const styleUploadRef = useRef<HTMLInputElement>(null);
    const inputBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
    const buttonBg = isDark ? "bg-[#2d2d2d] hover:bg-[#3d3d3d]" : "bg-[#e3e3e3] hover:bg-[#d3d3d3] text-black";

    return (
        <>
        {/* Lightbox */}
        {currentLightboxPanel && currentLightboxPanel.imageUrl && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
              
              <div className="absolute top-6 left-6 z-50">
                    <span className="text-white/60 font-black text-2xl font-mono tracking-widest bg-black/30 px-3 py-1 rounded-lg backdrop-blur-md">
                        {t.shotPrefix} {String((lightboxIndex??0) + 1).padStart(2, '0')}
                    </span>
              </div>

              <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-md cursor-pointer"><X size={28} /></button>

              <div className="relative w-full h-[85vh] flex items-center justify-center group">
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex > 0 ? lightboxIndex - 1 : lightboxIndex)} className="absolute left-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronLeft size={32}/></button>
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex < panels.length - 1 ? lightboxIndex + 1 : lightboxIndex)} className="absolute right-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronRight size={32}/></button>

                  <img src={currentLightboxPanel.imageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="lightbox" />
                  
                  {isRepainting && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"><Loader2 className="animate-spin text-white w-12 h-12"/><span className="text-white font-bold mt-4">{t.loading}</span></div>}

                  <div className="absolute bottom-0 left-0 right-0 w-full p-10 pt-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex justify-between items-end pointer-events-none rounded-b-lg">
                      <div className="max-w-4xl space-y-3 pointer-events-auto">
                          <p className="text-white/95 text-xl font-medium leading-relaxed drop-shadow-md">
                              {currentLightboxPanel.description}
                          </p>
                          <div className="flex gap-4 text-white/60 font-mono text-xs font-bold tracking-wider uppercase">
                              <span>
                                  {t.shotSize}: {getLocalizedShotLabel(currentLightboxPanel.shotType)}
                              </span>
                              <span className="opacity-30">|</span>
                              <span>
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

      {/* Batch Confirm */}
      {showBatchConfirm && batchTargetChar && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className={`w-[400px] ${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} border rounded-3xl p-6 shadow-2xl space-y-6`}>
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-4 border-blue-500 shadow-lg bg-gray-100 flex items-center justify-center">
                        {batchTargetChar.avatar_url ? (
                            <img src={batchTargetChar.avatar_url} className="w-full h-full object-cover" alt="char"/>
                        ) : (
                            <User size={32} className="text-gray-400"/>
                        )}
                    </div>
                      <div>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                              {t.apply} {batchTargetChar.name}?
                          </h3>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => { setShowBatchConfirm(false); setBatchTargetChar(null); }}
                          className={`px-4 py-3 rounded-xl font-bold text-sm cursor-pointer border transition-colors ${isDark ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-400' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}
                      >
                          {t.cancel}
                      </button>

                      <button 
                          onClick={() => executeCharacterInject(false)} 
                          className={`flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                          {t.onlyThisShot}
                      </button>
                      <button 
                          onClick={() => executeCharacterInject(true)} 
                          className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                          <Sparkles size={16}/> {t.applyAll}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Style Modal */}
      {showStyleModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowStyleModal(false)}>
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-white/10 flex justify-between items-center">
                      <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-black'}`}>{t.selectStyle}</h3>
                      <button onClick={() => setShowStyleModal(false)}><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase">{t.uploadRef}</label>
                            <div className={`border-2 border-dashed ${isDark ? 'border-zinc-700 hover:border-zinc-500' : 'border-gray-200 hover:border-gray-400'} rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative`}>
                                <input type="file" ref={styleUploadRef} onChange={handleStyleUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"/>
                                {uploadedStyleRef ? (
                                    <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                         <img src={uploadedStyleRef} className="w-full h-full object-cover" alt="ref" />
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

      {/* Atmosphere Modal */}
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

      {/* Char Modal */}
      {(showCharModal || _showCastingModal) && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}>
              <div className={`${isDark ? 'bg-[#1e1e1e] border-zinc-700' : 'bg-white border-gray-200'} w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[80vh]`} onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-white/10 flex justify-between items-center">
                      <h3 className={`font-bold flex items-center gap-2 text-lg ${isDark ? 'text-white' : 'text-black'}`}><Users size={20} className="text-blue-500"/> {t.charLib}</h3>
                      <button onClick={() => {setShowCharModal(false); setShowCastingModal(false);}}><X size={20}/></button>
                  </div>
                  <div className="p-6 grid grid-cols-4 gap-4 overflow-y-auto custom-scrollbar">
                      {characters.map(char => {
                          const activePanel = panels.find(p => p.id === activePanelIdForModal);
                          const isSelected = activePanel?.characterIds?.includes(char.id);

                          return (
                              <button 
                                  key={char.id} 
                                  onClick={() => handlePreSelectCharacter(char)} 
                                  className={`group relative aspect-square rounded-2xl border overflow-hidden transition-all shadow-md cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-white/10 hover:border-blue-500'}`}
                              >
                                  {char.avatar_url ? <Image src={char.avatar_url} alt={char.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500"/> : <User className="text-zinc-700 m-auto"/>}
                                  
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                                      <span className="text-xs font-bold text-white truncate">{char.name}</span>
                                  </div>

                                  {isSelected && (
                                      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg z-10 animate-in zoom-in">
                                          <Check size={12} strokeWidth={4} />
                                      </div>
                                  )}
                              </button>
                          );
                      })}
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
                    <input 
                        value={exportMeta.projectName} 
                        onChange={e => setExportMeta({...exportMeta, projectName: e.target.value})} 
                        className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} 
                        placeholder={t.projNamePlaceholder} 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.author}</label>
                    <input 
                        value={exportMeta.author} 
                        onChange={e => setExportMeta({...exportMeta, author: e.target.value})} 
                        className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none`} 
                        placeholder={t.authorPlaceholder} 
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-zinc-500 mb-1 block">{t.notes}</label>
                    <textarea 
                        value={exportMeta.notes} 
                        onChange={e => setExportMeta({...exportMeta, notes: e.target.value})} 
                        className={`w-full ${inputBg} border ${isDark ? 'border-zinc-700' : 'border-gray-200'} rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-20 resize-none`} 
                        placeholder={t.notesPlaceholder} 
                    />
                 </div>
              </div>
              <div className="flex gap-3 pt-2">
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
      </>
    );
}