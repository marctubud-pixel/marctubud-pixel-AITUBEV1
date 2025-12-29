'use client'

import React, { useState, useEffect } from 'react';
import { 
  Film, Clapperboard, Loader2, ArrowLeft, PenTool, 
  Image as ImageIcon, Trash2, Plus, PlayCircle, Save, CheckCircle2, User, MapPin, Camera 
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { createClient } from '@/utils/supabase/client';

// 定义分镜面板的数据结构
type StoryboardPanel = {
  id: number;
  description: string; // 动作描述 (Action)
  shotType: string;    // 景别/运镜 (Camera)
  prompt: string;      // AI生成的绘画提示词
  imageUrl?: string;   // 生成的图片URL
  isLoading: boolean;  // 该单张是否正在生成
}

// 定义角色数据结构
type Character = {
  id: string;
  name: string;
  avatar_url: string | null;
}

type WorkflowStep = 'input' | 'review' | 'generating' | 'done';

// 🎬 电影级运镜库
const CINEMATIC_SHOTS = [
  { value: "EXTREME WIDE SHOT", label: "大远景 (EWS)" },
  { value: "WIDE SHOT", label: "全景 (Wide)" },
  { value: "FULL SHOT", label: "全身 (Full)" },
  { value: "MID SHOT", label: "中景 (Mid)" },
  { value: "CLOSE-UP", label: "特写 (Close-Up)" },
  { value: "EXTREME CLOSE-UP", label: "大特写 (ECU)" },
  { value: "LOW ANGLE", label: "仰视/低机位" },
  { value: "HIGH ANGLE", label: "俯视/高机位" },
  { value: "OVERHEAD SHOT", label: "上帝视角 (Top Down)" },
  { value: "DUTCH ANGLE", label: "荷兰倾斜 (不安感)" },
  { value: "OVER-THE-SHOULDER SHOT", label: "过肩镜头 (对话)" },
];

export default function StoryboardPage() {
  const [script, setScript] = useState('');
  const [sceneDescription, setSceneDescription] = useState(''); // 🔒 场景锁
  const [step, setStep] = useState<WorkflowStep>('input');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [mode, setMode] = useState<'draft' | 'render'>('draft'); 
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDrawing, setIsDrawing] = useState(false);     
  const [characters, setCharacters] = useState<Character[]>([]); 
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null); 
  const supabase = createClient();

  const tempProjectId = "temp_workspace"; 

  // 加载角色列表
  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, avatar_url')
        .order('created_at', { ascending: false });
      
      if (error) {
        toast.error('无法加载角色列表');
      } else {
        setCharacters(data || []);
      }
    };
    fetchCharacters();
  }, []);

  // ----------------------------------------------------------------
  // 1. 第一步：AI 导演拆解剧本
  // ----------------------------------------------------------------
  const handleAnalyzeScript = async () => {
    if (!script.trim()) return;
    
    setIsAnalyzing(true);
    setPanels([]); 
    
    try {
      const breakdown = await analyzeScript(script);
      
      const initialPanels: StoryboardPanel[] = breakdown.panels.map((p: any, index: number) => ({
        id: index,
        description: p.description,
        shotType: p.shotType || 'MID SHOT',
        prompt: p.visualPrompt,
        isLoading: false, 
      }));
      
      setPanels(initialPanels);
      setStep('review'); 
      toast.success(`剧本拆解完成，请配置场景与运镜`);

    } catch (error: any) {
      console.error(error);
      toast.error('剧本拆解失败: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ----------------------------------------------------------------
  // 中间交互：CRUD
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
        description: "动作描述...",
        shotType: "MID SHOT",
        prompt: "",
        isLoading: false
    }]);
  };

  // ----------------------------------------------------------------
  // 2. 第二步：批量生成画面 (Scene Lock + Character Lock)
  // ----------------------------------------------------------------
  const handleGenerateImages = async () => {
    if (!sceneDescription.trim()) {
      toast.warning('建议填写“场景设定”以保证背景一致性');
    }

    setStep('generating');
    setIsDrawing(true);
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));

    const isDraftMode = mode === 'draft';

    // 并行请求
    const promises = panels.map(async (panel) => {
      try {
        const tempShotId = `storyboard_${Date.now()}_${panel.id}`;
        
        // 🏗️ 商业级 Prompt 组装逻辑：
        // 1. [角色] (后端注入)
        // 2. [环境] (前端 sceneDescription) -> 确保背景一致
        // 3. [运镜] (前端 panel.shotType) -> 确保角度准确
        // 4. [动作] (前端 panel.description) -> 确保剧情对
        // 5. [风格] (前端 mode)
        
        const scenePart = sceneDescription ? `(Environment: ${sceneDescription}), ` : '';
        const shotPart = `(Camera Angle: ${panel.shotType}), `;
        const actionPart = `${panel.description}, `;
        const stylePart = isDraftMode 
          ? 'rough sketch, storyboard style, black and white line art' 
          : 'cinematic lighting, photorealistic, 8k, masterpiece';

        // 最终发送给后端的 Prompt (后端会在最前面再拼上角色 Character)
        const finalPrompt = `${scenePart}${shotPart}${actionPart}${stylePart}`;

        const res = await generateShotImage(
          tempShotId, 
          finalPrompt, 
          tempProjectId, 
          isDraftMode,
          selectedCharacterId || undefined 
        );

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
        setPanels(current => current.map(p => p.id === panel.id ? { ...p, isLoading: false } : p)); 
      }
    });

    await Promise.all(promises);
    setIsDrawing(false);
    setStep('done');
    toast.success('商业级分镜绘制完成');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-sans">
      <Toaster position="top-center" richColors />
      
      {/* 顶部导航 */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/tools/cineflow" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回工作台
        </Link>
        <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'input' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>1. 剧本</div>
             <div className="w-4 h-[1px] bg-zinc-800"></div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'review' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>2. 运镜</div>
             <div className="w-4 h-[1px] bg-zinc-800"></div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'generating' || step === 'done' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>3. 成片</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 min-h-[600px]">
        
        {/* === 左侧控制区 === */}
        <div className="w-full lg:w-1/3 bg-[#111] p-6 rounded-2xl border border-white/10 flex flex-col gap-6 h-fit sticky top-6">
          
          {/* 1. 剧本输入 */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clapperboard className="text-yellow-500" />
              CineFlow 输入
            </h2>
            <textarea
              className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-gray-300 focus:border-yellow-500 focus:outline-none resize-none transition-colors placeholder-gray-700 leading-relaxed text-sm"
              placeholder="输入剧本..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              disabled={step !== 'input' && step !== 'review'} 
            />
          </div>

          {/* 2. 核心控制台 (仅在输入/确认阶段显示) */}
          {(step === 'input' || step === 'review') && (
            <div className="space-y-4 border-t border-white/10 pt-4">
              
              {/* 主角选择 (Character Lock) */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <User className="w-3 h-3 text-blue-500" />
                  固定主角 (Character Lock)
                </label>
                <select
                  value={selectedCharacterId || ''}
                  onChange={(e) => setSelectedCharacterId(e.target.value || null)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- 不指定 --</option>
                  {characters.map(char => (
                    <option key={char.id} value={char.id}>{char.name}</option>
                  ))}
                </select>
              </div>

              {/* 场景设定 (Scene Lock) - 新增功能 */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-green-500" />
                  固定场景 (Scene Lock)
                </label>
                <input
                  type="text"
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="例如：赛博朋克街道，雨夜，霓虹灯..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:border-green-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">填写后，所有镜头将保持在该场景中，确保背景一致。</p>
              </div>
            </div>
          )}

          {/* 模式选择 */}
          <div className="bg-black/30 p-1 rounded-lg flex border border-white/5">
            <button 
                onClick={() => setMode('draft')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'draft' ? 'bg-yellow-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <PenTool className="w-3 h-3" /> 草图 (Turbo)
            </button>
            <button 
                onClick={() => setMode('render')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'render' ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <ImageIcon className="w-3 h-3" /> 渲染 (Flux)
            </button>
          </div>

          {/* 按钮区域 */}
          {step === 'input' ? (
              <button
                onClick={handleAnalyzeScript}
                disabled={isAnalyzing || !script.trim()}
                className="w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 transition-colors"
              >
                {isAnalyzing ? <Loader2 className="animate-spin w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                {isAnalyzing ? '分析中...' : '拆解剧本'}
              </button>
          ) : step === 'review' ? (
              <div className="flex flex-col gap-3">
                 <button
                    onClick={handleGenerateImages}
                    className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg ${mode === 'draft' ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                  >
                    <PenTool className="w-4 h-4" /> 开始绘制 ({panels.length} 镜头)
                  </button>
                  <button onClick={() => setStep('input')} className="text-zinc-500 text-xs hover:text-white underline">返回修改</button>
              </div>
          ) : (
             <button disabled className="w-full py-3 font-bold rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center gap-2 cursor-not-allowed">
                {isDrawing ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {isDrawing ? '绘制中...' : '完成'}
              </button>
          )}
        </div>

        {/* === 右侧展示区 === */}
        <div className="w-full lg:w-2/3">
          
          {step === 'input' && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-[#111] rounded-2xl border border-dashed border-white/10 text-zinc-600">
              <Film className="w-20 h-20 mb-4 opacity-10" />
              <p className="font-bold">输入剧本 &rarr; 配置场景 &rarr; AI 绘制</p>
            </div>
          )}

          {step === 'review' && (
             <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Camera className="w-4 h-4 text-yellow-500"/> 运镜与动作确认</h3>
                    <button onClick={handleAddPanel} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors"><Plus size={14}/> 添加镜头</button>
                </div>
                
                <div className="grid gap-4">
                    {panels.map((panel, idx) => (
                        <div key={panel.id} className="bg-[#151515] p-4 rounded-xl border border-white/10 flex flex-col md:flex-row gap-4 group hover:border-white/30 transition-colors">
                            <div className="flex items-center gap-4 md:w-48 flex-shrink-0">
                                <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center font-mono text-zinc-500 font-bold">
                                    {idx + 1}
                                </div>
                                {/* 🎬 高级运镜选择 */}
                                <select 
                                    value={panel.shotType}
                                    onChange={(e) => handleUpdatePanel(panel.id, 'shotType', e.target.value)}
                                    className="w-full bg-black border border-zinc-700 text-yellow-500 text-xs font-bold px-2 py-2 rounded focus:outline-none focus:border-yellow-500"
                                >
                                    {CINEMATIC_SHOTS.map(shot => (
                                      <option key={shot.value} value={shot.value}>{shot.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex-1">
                                <textarea 
                                    value={panel.description}
                                    onChange={(e) => handleUpdatePanel(panel.id, 'description', e.target.value)}
                                    className="w-full bg-black/30 text-sm text-gray-300 border border-transparent hover:border-zinc-700 focus:border-yellow-500 rounded p-2 resize-none focus:outline-none"
                                    placeholder="描述画面中的动作..."
                                    rows={2}
                                />
                            </div>
                            <button onClick={() => handleDeletePanel(panel.id)} className="text-zinc-600 hover:text-red-500 self-center md:self-start p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {(step === 'generating' || step === 'done') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {panels.map((panel, idx) => (
                <div key={panel.id} className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-xl border border-zinc-800 group">
                  {panel.isLoading ? (
                     <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-zinc-900 text-zinc-500">
                        <Loader2 className="animate-spin w-8 h-8 text-yellow-500" />
                        <span className="text-xs font-mono animate-pulse">绘制中...</span>
                     </div>
                  ) : panel.imageUrl ? (
                    <>
                        <img src={panel.imageUrl} className={`w-full h-full object-cover transition-all duration-700 ${mode === 'draft' ? 'grayscale contrast-125' : ''}`} />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <a href={panel.imageUrl} target="_blank" className="bg-white/10 backdrop-blur px-4 py-2 rounded-full text-xs font-bold hover:bg-white text-white hover:text-black transition-all">查看大图</a>
                        </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-2">
                        <span className="text-xs">生成失败</span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-8 text-white">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-yellow-500 text-black rounded-full flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                            <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 rounded uppercase max-w-[100px] truncate">{CINEMATIC_SHOTS.find(s=>s.value===panel.shotType)?.label || panel.shotType}</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-1 opacity-80">{panel.description}</p>
                  </div>
                </div>
              ))}
              
              {step === 'done' && (
                  <div className="col-span-1 md:col-span-2 flex justify-center pt-8 pb-12">
                      <button onClick={() => toast.info('下载功能开发中...')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                          <Save size={18}/> 导出分镜
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