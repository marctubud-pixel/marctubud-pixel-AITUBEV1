'use client'

import React, { useState } from 'react';
import { Film, Clapperboard, Loader2, ArrowLeft, PenTool, Image as ImageIcon } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';

type StoryboardPanel = {
  id: number;
  description: string;
  shotType: string;
  prompt: string;
  imageUrl?: string;
  isLoading: boolean;
}

export default function StoryboardPage() {
  const [script, setScript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [mode, setMode] = useState<'draft' | 'render'>('draft');

  const tempProjectId = "temp_workspace"; 

  const handleGenerate = async () => {
    if (!script.trim()) return;
    
    setIsProcessing(true);
    setPanels([]); 
    
    try {
      // 1. 导演分析
      setStatusMessage('正在拆解剧本...');
      const breakdown = await analyzeScript(script);
      
      const initialPanels: StoryboardPanel[] = breakdown.panels.map((p, index) => ({
        id: index,
        description: p.description,
        shotType: p.shotType,
        prompt: p.visualPrompt,
        isLoading: true, // 这一步无论 Draft 还是 Render 都要 loading，因为都要生成图片
      }));
      
      setPanels(initialPanels);

      // 2. 并行生成画面
      // 根据 mode 决定是 "Turbo线稿" 还是 "Flux精修"
      setStatusMessage(mode === 'draft' ? '正在快速绘制草图...' : '正在进行精细渲染...');
      
      const isDraftMode = mode === 'draft';

      const promises = initialPanels.map(async (panel) => {
        try {
          const tempShotId = `storyboard_${Date.now()}_${panel.id}`;
          
          // ✅ 传入 isDraftMode 参数
          const res = await generateShotImage(tempShotId, panel.prompt, tempProjectId, isDraftMode);

          if (res.success && res.url) {
            setPanels(current => 
                current.map(p => p.id === panel.id 
                  ? { ...p, imageUrl: res.url, isLoading: false } 
                  : p
                )
              );
          } else {
             throw new Error(res.message);
          }

        } catch (error) {
          console.error(`Panel ${panel.id} failed`, error);
          setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
        }
      });

      await Promise.all(promises);
      setStatusMessage(mode === 'draft' ? '草图绘制完成' : '渲染完成');
      toast.success('生成完毕');

    } catch (error: any) {
      console.error(error);
      toast.error('生成失败: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/tools/cineflow" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回工作台
        </Link>
        <div className="text-xs text-zinc-600 border border-zinc-800 px-2 py-1 rounded">
            Story Agent v0.3
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 min-h-[600px]">
        {/* 左侧控制区 */}
        <div className="w-full lg:w-1/3 bg-[#111] p-6 rounded-2xl border border-white/10 flex flex-col gap-6 h-fit">
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clapperboard className="text-yellow-500" />
              智能分镜
            </h2>
            <textarea
              className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-gray-300 focus:border-yellow-500 focus:outline-none resize-none transition-colors placeholder-gray-700"
              placeholder="输入你的故事梗概..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </div>

          <div className="bg-black/30 p-1 rounded-lg flex border border-white/5">
            <button 
                onClick={() => setMode('draft')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${mode === 'draft' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <PenTool className="w-4 h-4" /> 快速草图 (Turbo)
            </button>
            <button 
                onClick={() => setMode('render')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${mode === 'render' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <ImageIcon className="w-4 h-4" /> 精细渲染 (Flux)
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isProcessing || !script.trim()}
            className={`w-full py-4 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                isProcessing ? 'bg-zinc-700 cursor-not-allowed' : 
                mode === 'draft' ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20' : 
                'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20'
            }`}
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Film />}
            {isProcessing ? '正在生成...' : mode === 'draft' ? '生成草图' : '生成渲染图'}
          </button>
          
          {statusMessage && (
            <p className="text-center text-sm text-zinc-400 animate-pulse font-mono">{statusMessage}</p>
          )}
        </div>

        {/* 右侧展示区 */}
        <div className="w-full lg:w-2/3">
          {panels.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-[#111] rounded-2xl border border-dashed border-white/10 text-zinc-600">
              <Film className="w-20 h-20 mb-4 opacity-10" />
              <p className="font-bold text-lg">等待剧本...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {panels.map((panel) => (
                <div key={panel.id} className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-xl group border border-zinc-800">
                  {panel.isLoading ? (
                     <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-zinc-900 text-zinc-500">
                        <Loader2 className="animate-spin" />
                        <span className="text-xs">绘制中...</span>
                     </div>
                  ) : panel.imageUrl ? (
                    <img src={panel.imageUrl} className={`w-full h-full object-cover transition-all ${mode === 'draft' ? 'grayscale contrast-125' : ''}`} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs">生成失败</div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 text-white backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-yellow-500 text-black px-1.5 rounded">{panel.shotType}</span>
                        <span className="text-[10px] font-bold bg-zinc-700 text-zinc-300 px-1.5 rounded uppercase">{mode}</span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">{panel.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}