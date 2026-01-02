'use client'

import React, { useRef } from 'react';
import { Paperclip, Ratio, Sparkles, Loader2 } from 'lucide-react';
import { ASPECT_RATIOS } from '../constants';

interface StepInputProps {
    isDark: boolean;
    t: any;
    script: string;
    setScript: (s: string) => void;
    handleAnalyzeScript: () => void;
    isAnalyzing: boolean;
    handleScriptKeyDown: (e: React.KeyboardEvent) => void;
    handleScriptFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    aspectRatio: string;
    setAspectRatio: (r: string) => void;
    showRatioMenu: boolean;
    setShowRatioMenu: (v: boolean) => void;
}

export default function StepInput({ 
    isDark, t, script, setScript, handleAnalyzeScript, isAnalyzing, 
    handleScriptKeyDown, handleScriptFileUpload, aspectRatio, setAspectRatio,
    showRatioMenu, setShowRatioMenu 
}: StepInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-4 mb-10">
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
                 <p className="text-center text-xs text-zinc-400 font-medium opacity-60">CineFlow V6.0 Evolution</p>
            </div>
        </div>
    );
}