'use client'

import React, { useState } from 'react';
import { 
  Film, Clapperboard, Loader2, ArrowLeft, PenTool, 
  Image as ImageIcon, Trash2, Plus, PlayCircle, Save, CheckCircle2 
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';

// 定义分镜面板的数据结构
type StoryboardPanel = {
  id: number;
  description: string; // 画面描述
  shotType: string;    // 景别 (如: MCU, CLOSE-UP)
  prompt: string;      // AI生成的绘画提示词
  imageUrl?: string;   // 生成的图片URL
  isLoading: boolean;  // 该单张是否正在生成
}

type WorkflowStep = 'input' | 'review' | 'generating' | 'done';

export default function StoryboardPage() {
  const [script, setScript] = useState('');
  const [step, setStep] = useState<WorkflowStep>('input');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [mode, setMode] = useState<'draft' | 'render'>('draft'); // 默认为草图模式
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 分析剧本loading
  const [isDrawing, setIsDrawing] = useState(false);     // 绘图loading

  const tempProjectId = "temp_workspace"; 

  // ----------------------------------------------------------------
  // 1. 第一步：AI 导演拆解剧本 (只生成文本，不画图)
  // ----------------------------------------------------------------
  const handleAnalyzeScript = async () => {
    if (!script.trim()) return;
    
    setIsAnalyzing(true);
    setPanels([]); 
    
    try {
      // 调用 director agent
      const breakdown = await analyzeScript(script);
      
      const initialPanels: StoryboardPanel[] = breakdown.panels.map((p: any, index: number) => ({
        id: index,
        description: p.description,
        shotType: p.shotType || 'MID SHOT',
        prompt: p.visualPrompt,
        isLoading: false, // 此时还没开始画
      }));
      
      setPanels(initialPanels);
      setStep('review'); // 进入确认阶段
      toast.success(`成功拆解为 ${initialPanels.length} 个分镜，请确认详情`);

    } catch (error: any) {
      console.error(error);
      toast.error('剧本拆解失败: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ----------------------------------------------------------------
  // 中间交互：用户手动修改分镜 (CRUD)
  // ----------------------------------------------------------------
  const handleUpdatePanel = (id: number, field: keyof StoryboardPanel, value: string) => {
    setPanels(current => 
      current.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  };

  const handleDeletePanel = (id: number) => {
    setPanels(current => current.filter(p => p.id !== id));
  };

  const handleAddPanel = () => {
    const newId = panels.length > 0 ? Math.max(...panels.map(p => p.id)) + 1 : 0;
    setPanels([...panels, {
        id: newId,
        description: "新增镜头...",
        shotType: "WIDE SHOT",
        prompt: "A cinematic shot of...",
        isLoading: false
    }]);
  };

  // ----------------------------------------------------------------
  // 2. 第二步：批量生成画面 (Turbo/Flux)
  // ----------------------------------------------------------------
  const handleGenerateImages = async () => {
    setStep('generating');
    setIsDrawing(true);
    
    // 初始化所有图片为 loading 状态
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));

    const isDraftMode = mode === 'draft';

    // 并行请求
    const promises = panels.map(async (panel) => {
      try {
        const tempShotId = `storyboard_${Date.now()}_${panel.id}`;
        
        // 重新构建 Prompt (因为用户可能修改了描述)
        // 注意：这里简单拼接，实际项目中可能需要再次调用 LLM 优化 prompt，或者直接用描述
        const finalPrompt = `${panel.shotType}, ${panel.description}, ${isDraftMode ? 'rough sketch, storyboard style, black and white line art' : 'cinematic lighting, photorealistic, 8k'}`;

        const res = await generateShotImage(tempShotId, finalPrompt, tempProjectId, isDraftMode);

        if (res.success && res.url) {
          setPanels(current => 
            current.map(p => p.id === panel.id 
              ? { ...p, imageUrl: res.url, isLoading: false } 
              : p
            )
          );
        } else {
           throw new Error(res.message || '生成失败');
        }

      } catch (error) {
        console.error(`Panel ${panel.id} failed`, error);
        setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p)); // 停止 loading
      }
    });

    await Promise.all(promises);
    setIsDrawing(false);
    setStep('done');
    toast.success('所有分镜绘制完成');
  };

  // ----------------------------------------------------------------
  // UI 渲染
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-sans">
      <Toaster position="top-center" richColors />
      
      {/* 顶部导航 */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/tools/cineflow" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回工作台
        </Link>
        <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'input' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>1. 输入剧本</div>
             <div className="w-4 h-[1px] bg-zinc-800"></div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'review' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>2. 确认分镜</div>
             <div className="w-4 h-[1px] bg-zinc-800"></div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'generating' || step === 'done' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>3. 生成画面</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 min-h-[600px]">
        
        {/* === 左侧控制区 (始终可见) === */}
        <div className="w-full lg:w-1/3 bg-[#111] p-6 rounded-2xl border border-white/10 flex flex-col gap-6 h-fit sticky top-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clapperboard className="text-yellow-500" />
              CineFlow 剧本输入
            </h2>
            <textarea
              className="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-gray-300 focus:border-yellow-500 focus:outline-none resize-none transition-colors placeholder-gray-700 leading-relaxed"
              placeholder="例如：一个雨夜，霓虹灯闪烁的街道。侦探（穿着风衣）站在路灯下，点燃了一支烟。镜头慢慢推近他的脸，眼神疲惫..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              disabled={step !== 'input' && step !== 'review'} // 生成时锁定
            />
          </div>

          {/* 模式选择 */}
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

          {/* 动作按钮：根据步骤变化 */}
          {step === 'input' ? (
              <button
                onClick={handleAnalyzeScript}
                disabled={isAnalyzing || !script.trim()}
                className="w-full py-4 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-white text-black hover:bg-gray-200"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" /> : <PlayCircle />}
                {isAnalyzing ? '正在拆解剧本...' : '第一步：分析剧本'}
              </button>
          ) : step === 'review' ? (
              <div className="flex flex-col gap-3">
                 <button
                    onClick={handleGenerateImages}
                    className={`w-full py-4 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${mode === 'draft' ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                  >
                    <PenTool /> 开始绘制 ({panels.length} 张)
                  </button>
                  <button onClick={() => setStep('input')} className="text-zinc-500 text-sm hover:text-white underline">修改剧本</button>
              </div>
          ) : (
             <button
                disabled={isDrawing}
                className="w-full py-4 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 bg-zinc-800 text-zinc-500 cursor-not-allowed"
              >
                {isDrawing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                {isDrawing ? 'AI 正在绘图中...' : '绘制完成'}
              </button>
          )}
        </div>

        {/* === 右侧展示区 (多状态切换) === */}
        <div className="w-full lg:w-2/3">
          
          {/* 状态 0: 等待输入 */}
          {step === 'input' && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-[#111] rounded-2xl border border-dashed border-white/10 text-zinc-600">
              <Film className="w-20 h-20 mb-4 opacity-10" />
              <p className="font-bold text-lg">输入剧本并点击“分析”</p>
              <p className="text-sm opacity-50">AI 将自动拆分镜头、景别与提示词</p>
            </div>
          )}

          {/* 状态 1: 分镜列表确认 (Review List) */}
          {step === 'review' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">分镜拆解确认</h3>
                    <button onClick={handleAddPanel} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"><Plus size={14}/> 添加镜头</button>
                </div>
                
                <div className="grid gap-4">
                    {panels.map((panel, idx) => (
                        <div key={panel.id} className="bg-[#151515] p-4 rounded-xl border border-white/10 flex gap-4 group hover:border-white/30 transition-colors">
                            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center font-mono text-zinc-500 text-lg font-bold flex-shrink-0">
                                {idx + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                                {/* 景别选择 */}
                                <div className="flex gap-2">
                                    <select 
                                        value={panel.shotType}
                                        onChange={(e) => handleUpdatePanel(panel.id, 'shotType', e.target.value)}
                                        className="bg-black border border-zinc-700 text-yellow-500 text-xs font-bold px-2 py-1 rounded focus:outline-none focus:border-yellow-500"
                                    >
                                        <option>EXTREME WIDE SHOT</option>
                                        <option>WIDE SHOT</option>
                                        <option>MID SHOT</option>
                                        <option>CLOSE-UP</option>
                                        <option>EXTREME CLOSE-UP</option>
                                    </select>
                                </div>
                                {/* 描述编辑 */}
                                <textarea 
                                    value={panel.description}
                                    onChange={(e) => handleUpdatePanel(panel.id, 'description', e.target.value)}
                                    className="w-full bg-black/30 text-sm text-gray-300 border border-transparent hover:border-zinc-700 focus:border-yellow-500 rounded p-2 resize-none focus:outline-none"
                                    rows={2}
                                />
                            </div>
                            <button onClick={() => handleDeletePanel(panel.id)} className="text-zinc-600 hover:text-red-500 self-start p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {/* 状态 2: 图片生成结果 (Grid) */}
          {(step === 'generating' || step === 'done') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {panels.map((panel, idx) => (
                <div key={panel.id} className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-xl border border-zinc-800 group">
                  {/* 图片显示区 */}
                  {panel.isLoading ? (
                     <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-zinc-900 text-zinc-500">
                        <Loader2 className="animate-spin w-8 h-8 text-yellow-500" />
                        <span className="text-xs font-mono animate-pulse">正在绘制 Shot {idx + 1}...</span>
                     </div>
                  ) : panel.imageUrl ? (
                    <>
                        <img src={panel.imageUrl} className={`w-full h-full object-cover transition-all duration-700 ${mode === 'draft' ? 'grayscale contrast-125' : ''}`} />
                        {/* 悬停放大图标 */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <a href={panel.imageUrl} target="_blank" className="bg-white/10 backdrop-blur px-4 py-2 rounded-full text-xs font-bold hover:bg-white text-white hover:text-black transition-all">查看大图</a>
                        </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-2">
                        <span className="text-xs">生成失败</span>
                        <button className="text-[10px] bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700">重试</button>
                    </div>
                  )}

                  {/* 底部信息栏 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-8 text-white">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-yellow-500 text-black rounded-full flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                            <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 rounded uppercase">{panel.shotType}</span>
                        </div>
                        {mode === 'draft' && <span className="text-[10px] text-zinc-400 font-mono">DRAFT_MODE</span>}
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-1 opacity-80 group-hover:line-clamp-none transition-all">{panel.description}</p>
                  </div>
                </div>
              ))}
              
              {/* 如果已经完成，显示完成后的操作按钮 */}
              {step === 'done' && (
                  <div className="col-span-1 md:col-span-2 flex justify-center pt-8 pb-12">
                      <button onClick={() => toast.info('下载功能开发中...')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                          <Save size={18}/> 导出分镜表 (PDF)
                      </button>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}