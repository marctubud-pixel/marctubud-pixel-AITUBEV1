'use client'

import React, { useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, User, Users, Check, Upload, Sparkles, RefreshCw, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import { StoryboardPanel, Character, ExportMeta } from '../types';
import { CAMERA_ANGLES, STYLE_OPTIONS, ATMOSPHERE_TAGS } from '../constants';
import { toast } from 'sonner';

// 🟢 1. 更新 Interface 定义
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

    // ✨✨✨ 场景锚点属性 (仅保留数据展示，移除设置函数) ✨✨✨
    sceneAnchorImage: string | null;
    // 🟢 [核心修改] 传入更换场景的处理函数
    handleEditScene: (panelId: string, newPrompt: string, refFile: File | null) => Promise<void>;
}

export default function StoryboardModals(props: ModalsProps) {
    const { 
        t, isDark, lightboxIndex, setLightboxIndex, panels, isRepainting, triggerRepaint,
        setActivePanelIdForModal, setShowCastingModal, getLocalizedShotLabel,
        showBatchConfirm, setShowBatchConfirm, batchTargetChar, setBatchTargetChar, executeCharacterInject,
        showStyleModal, setShowStyleModal, handleStyleUpload, uploadedStyleRef, stylePreset, setStylePreset,
        showAtmosphereModal, setShowAtmosphereModal, toggleAtmosphere, globalAtmosphere,
        showCharModal, setShowCharModal, showCastingModal: _showCastingModal, characters, activePanelIdForModal, handlePreSelectCharacter,
        showExportModal, setShowExportModal, exportMeta, setExportMeta, handleExportPDF, isExporting,
        
        // 解构新属性
        sceneAnchorImage, handleEditScene
    } = props;

    // 本地状态：场景编辑
    const [isEditingScene, setIsEditingScene] = useState(false);
    const [newScenePrompt, setNewScenePrompt] = useState("");
    const [sceneRefFile, setSceneRefFile] = useState<File | null>(null);

    const currentLightboxPanel = lightboxIndex !== null ? panels[lightboxIndex] : null;
    const styleUploadRef = useRef<HTMLInputElement>(null);
    const inputBg = isDark ? "bg-[#1e1e1e]" : "bg-white";
    const buttonBg = isDark ? "bg-[#2d2d2d] hover:bg-[#3d3d3d]" : "bg-[#e3e3e3] hover:bg-[#d3d3d3] text-black";

    // 处理场景编辑提交
    const onSubmitSceneEdit = async () => {
        if (!currentLightboxPanel) return;
        if (!newScenePrompt && !sceneRefFile) {
            toast.error("请输入场景描述或上传参考图片");
            return;
        }
        await handleEditScene(currentLightboxPanel.id, newScenePrompt, sceneRefFile);
        setIsEditingScene(false);
        setNewScenePrompt("");
        setSceneRefFile(null);
    };

    return (
        <>
        {/* Lightbox */}
        {currentLightboxPanel && currentLightboxPanel.imageUrl && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
              
              {/* Top Left: Info Tag */}
              <div className="absolute top-6 left-6 z-50 flex items-center gap-4">
                    <span className="text-white/60 font-black text-2xl font-mono tracking-widest bg-black/30 px-3 py-1 rounded-lg backdrop-blur-md">
                        {t.shotPrefix} {String((lightboxIndex??0) + 1).padStart(2, '0')}
                    </span>
                    {/* 🟢 已移除旧的 "Set as Scene Anchor" 按钮 */}
              </div>

              {/* Close Button */}
              <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-md cursor-pointer"><X size={28} /></button>

              {/* Main Canvas */}
              <div className="relative w-full h-[85vh] flex items-center justify-center group">
                  {/* Nav Buttons */}
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex > 0 ? lightboxIndex - 1 : lightboxIndex)} className="absolute left-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronLeft size={32}/></button>
                  <button onClick={() => setLightboxIndex(lightboxIndex !== null && lightboxIndex < panels.length - 1 ? lightboxIndex + 1 : lightboxIndex)} className="absolute right-4 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md z-40"><ChevronRight size={32}/></button>

                  {/* Image */}
                  <img src={currentLightboxPanel.imageUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="lightbox" />
                  
                  {/* Loading Overlay */}
                  {(isRepainting || currentLightboxPanel.isLoading) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg z-50">
                          <Loader2 className="animate-spin text-white w-12 h-12"/>
                          <span className="text-white font-bold mt-4">{isRepainting ? "正在重绘角色..." : "正在处理场景..."}</span>
                      </div>
                  )}

                  {/* 🟢 Bottom Bar */}
                  <div className="absolute bottom-0 left-0 right-0 w-full p-10 pt-32 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex justify-between items-end pointer-events-none rounded-b-lg">
                      {/* Left: Info */}
                      <div className="max-w-3xl space-y-3 pointer-events-auto">
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
                      
                      {/* Right: Actions */}
                      <div className="pointer-events-auto flex items-center gap-3">
                          {/* 🟢 Change Scene Button (汉化) */}
                          <button 
                            onClick={() => setIsEditingScene(true)}
                            disabled={isRepainting || currentLightboxPanel.isLoading}
                            className="px-5 py-3 bg-zinc-800 text-white hover:bg-zinc-700 font-bold rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <RefreshCw size={18} /> 更换场景
                          </button>

                          {/* Casting Button */}
                          <button 
                            onClick={() => { setActivePanelIdForModal(currentLightboxPanel.id); setShowCastingModal(true); }} 
                            disabled={isRepainting || currentLightboxPanel.isLoading}
                            className="px-6 py-3 bg-white text-black hover:bg-zinc-200 font-bold rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <User size={18} /> 角色卡司
                          </button>
                      </div>
                  </div>
              </div>

              {/* 🟢 [新增] 场景编辑面板 (覆盖在 Lightbox 之上) */}
              {isEditingScene && (
                  <div className="absolute z-[250] bg-[#1A1A1A] border border-white/10 p-6 rounded-2xl shadow-2xl w-[400px] animate-in zoom-in-95 duration-200 bottom-32 right-10">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={16} className="text-blue-500"/> 更换场景</h3>
                          <button onClick={() => setIsEditingScene(false)} className="text-zinc-500 hover:text-white"><X size={18}/></button>
                      </div>
                      
                      <div className="space-y-4">
                          {/* Text Input */}
                          <div>
                              <label className="text-xs text-zinc-500 font-bold uppercase mb-1 block">新场景描述</label>
                              <textarea 
                                  value={newScenePrompt}
                                  onChange={(e) => setNewScenePrompt(e.target.value)}
                                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none h-20 resize-none placeholder:text-zinc-600"
                                  placeholder="描述新的背景环境 (例如：赛博朋克街道，下雨天)..."
                              />
                          </div>

                          {/* Image Upload */}
                          <div>
                              <label className="text-xs text-zinc-500 font-bold uppercase mb-1 block">参考图 (可选)</label>
                              <div className="relative group">
                                  <input 
                                      type="file" 
                                      accept="image/*"
                                      onChange={(e) => e.target.files && setSceneRefFile(e.target.files[0])}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                  />
                                  <div className={`flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm transition-colors ${sceneRefFile ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-white/10 hover:bg-white/5 text-zinc-400'}`}>
                                      {sceneRefFile ? <Check size={16} /> : <ImagePlus size={16} />}
                                      {sceneRefFile ? "已选择图片" : "点击上传参考图"}
                                  </div>
                                  {sceneRefFile && <div className="text-xs text-center text-zinc-500 mt-1 truncate">{sceneRefFile.name}</div>}
                              </div>
                          </div>

                          {/* Action Button */}
                          <button 
                              onClick={onSubmitSceneEdit}
                              // 修复逻辑：只要有 Prompt 或者 File 就可以点击，且不在 loading 状态
                              disabled={currentLightboxPanel.isLoading || (!newScenePrompt && !sceneRefFile)}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {currentLightboxPanel.isLoading ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                              立即生成
                          </button>
                      </div>
                  </div>
              )}
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