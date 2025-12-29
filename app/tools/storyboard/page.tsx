'use client'

import React, { useState, useEffect } from 'react';
import { 
  Film, Clapperboard, Loader2, ArrowLeft, PenTool, 
  Image as ImageIcon, Trash2, Plus, PlayCircle, Save, CheckCircle2, User, MapPin, Camera, Palette, Monitor, Paperclip, Download, Upload, RefreshCw
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { analyzeScript } from '@/app/actions/director';
import { generateShotImage } from '@/app/actions/generate';
import { createClient } from '@/utils/supabase/client';
import { exportStoryboardPDF } from '@/utils/export-pdf';

type StoryboardPanel = {
  id: number;
  description: string; 
  shotType: string;    
  environment?: string; // 👈 新增：单镜头环境覆盖
  prompt: string;      
  imageUrl?: string;   
  isLoading: boolean;  
}

type Character = {
  id: string;
  name: string;
  avatar_url: string | null;
}

type CharacterImage = {
  id: string;
  image_url: string;
  description: string | null;
}

type WorkflowStep = 'input' | 'review' | 'generating' | 'done';

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
  { value: "OVER-THE-SHOULDER SHOT", label: "过肩镜头" },
];

const STYLE_OPTIONS = [
  { value: "realistic", label: "🎥 电影实拍 (Realistic)" },
  { value: "anime_jp", label: "🇯🇵 日本动画 (Anime)" },
  { value: "anime_us", label: "🇺🇸 美漫风格 (Comics)" },
  { value: "cyberpunk", label: "🤖 赛博朋克 (Cyberpunk)" },
  { value: "noir", label: "🕵️‍♂️ 黑色电影 (Noir)" },
  { value: "pixar", label: "🧸 皮克斯 3D (Pixar)" },
  { value: "watercolor", label: "🎨 水彩手绘 (Watercolor)" },
  { value: "ink", label: "🖌️ 中国水墨 (Ink)" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "🖥️ 横屏电影 (16:9)", cssClass: "aspect-video" },
  { value: "9:16", label: "📱 竖屏短剧 (9:16)", cssClass: "aspect-[9/16]" },
  { value: "1:1", label: "🔲 正方形 (1:1)", cssClass: "aspect-square" },
  { value: "2.39:1", label: "🎬 宽银幕 (2.39:1)", cssClass: "aspect-[2.39/1]" },
  { value: "4:3", label: "📺 复古电视 (4:3)", cssClass: "aspect-[4/3]" },
];

export default function StoryboardPage() {
  const [script, setScript] = useState('');
  const [sceneDescription, setSceneDescription] = useState(''); // 全局场景文本
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null); // 👈 全局场景图
  const [isUploadingScene, setIsUploadingScene] = useState(false);

  const [step, setStep] = useState<WorkflowStep>('input');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  
  const [mode, setMode] = useState<'draft' | 'render'>('draft'); 
  const [stylePreset, setStylePreset] = useState<string>('realistic');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');

  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [isDrawing, setIsDrawing] = useState(false);     
  const [isExporting, setIsExporting] = useState(false);
  
  // 角色相关状态
  const [characters, setCharacters] = useState<Character[]>([]); 
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null); 
  const [refImages, setRefImages] = useState<CharacterImage[]>([]);
  const [selectedRefImage, setSelectedRefImage] = useState<string | null>(null);

  const supabase = createClient();
  const tempProjectId = "temp_workspace"; 

  // 1. 加载角色列表
  useEffect(() => {
    const fetchCharacters = async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, avatar_url')
        .order('created_at', { ascending: false });
      if (!error) setCharacters(data || []);
    };
    fetchCharacters();
  }, []);

  // 2. 监听角色选择 -> 加载参考图
  useEffect(() => {
    if (selectedCharacterId) {
      const fetchRefImages = async () => {
        const { data, error } = await supabase
          .from('character_images')
          .select('id, image_url, description')
          .eq('character_id', selectedCharacterId)
          .order('created_at', { ascending: false });
        
        if (!error) {
           setRefImages(data || []);
           setSelectedRefImage(null); 
        }
      };
      fetchRefImages();
    } else {
      setRefImages([]);
      setSelectedRefImage(null);
    }
  }, [selectedCharacterId]);

  // 🔥 场景图上传逻辑 (修正版：自动重命名解决中文报错)
  const handleSceneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    setIsUploadingScene(true);
    try {
        const file = e.target.files[0];
        const user = (await supabase.auth.getUser()).data.user;
        
        // 1. 获取文件后缀 (例如 .png)
        const fileExt = file.name.split('.').pop();
        // 2. 生成纯英文/数字的安全文件名 (例如 scene_173556789.png)
        // 这样就彻底避开了中文乱码和非法字符问题
        const safeName = `scene_${Date.now()}.${fileExt}`;
        const filePath = `scene_refs/${user?.id || 'guest'}/${safeName}`;

        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
        setSceneImageUrl(publicUrl);
        toast.success("场景参考图上传成功");
    } catch (error: any) {
        console.error(error);
        toast.error("上传失败: " + error.message);
    } finally {
        setIsUploadingScene(false);
    }
  };

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
        environment: '', // 默认空，表示跟随全局
        prompt: p.visualPrompt,
        isLoading: false, 
      }));
      setPanels(initialPanels);
      setStep('review'); 
      toast.success(`剧本拆解完成`);
    } catch (error: any) {
      console.error(error);
      toast.error('拆解失败: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdatePanel = (id: number, field: keyof StoryboardPanel, value: string) => {
    setPanels(current => current.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const handleDeletePanel = (id: number) => {
    setPanels(current => current.filter(p => p.id !== id));
  };
  const handleAddPanel = () => {
    const newId = panels.length > 0 ? Math.max(...panels.map(p => p.id)) + 1 : 0;
    setPanels([...panels, {
        id: newId, description: "...", shotType: "MID SHOT", environment: "", prompt: "", isLoading: false
    }]);
  };

  const handleGenerateImages = async () => {
    if (!sceneDescription.trim() && !sceneImageUrl) toast.warning('建议填写“场景设定”或上传参考图');

    setStep('generating');
    setIsDrawing(true);
    setPanels(current => current.map(p => ({ ...p, isLoading: true })));

    const promises = panels.map(async (panel) => {
      try {
        const tempShotId = `storyboard_${Date.now()}_${panel.id}`;
        
        // 🔥 核心逻辑：环境优先级 (单镜覆盖 > 全局文字)
        const effectiveEnv = panel.environment && panel.environment.trim() !== '' 
            ? panel.environment 
            : sceneDescription;

        const scenePart = effectiveEnv ? `(Environment: ${effectiveEnv}), ` : '';
        const actionPrompt = `${scenePart}${panel.description}`; 

        const res = await generateShotImage(
          tempShotId, 
          actionPrompt, 
          tempProjectId, 
          mode === 'draft', 
          stylePreset,
          aspectRatio,
          panel.shotType, 
          selectedCharacterId || undefined,
          selectedRefImage || undefined,
          sceneImageUrl || undefined // 👈 传递全局场景图
        );

        if (res.success && res.url) {
          setPanels(current => current.map(p => p.id === panel.id ? { ...p, imageUrl: res.url, isLoading: false } : p));
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      toast.info('正在打包 PDF，请稍候...');
      await exportStoryboardPDF(script || "Untitled Project", panels);
      toast.success('PDF 导出成功！');
    } catch (error) {
      console.error(error);
      toast.error('导出失败，可能是网络图片跨域问题');
    } finally {
      setIsExporting(false);
    }
  };

  const currentRatioClass = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.cssClass || "aspect-video";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 font-sans">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/tools" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回工作台
        </Link>
        <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'input' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>1. 剧本</div>
             <div className="w-4 h-[1px] bg-zinc-800"></div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'review' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>2. 设置</div>
             <div className="w-4 h-[1px] bg-zinc-800"></div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold ${step === 'generating' || step === 'done' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>3. 成片</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 min-h-[600px]">
        
        {/* === 左侧控制区 === */}
        <div className="w-full lg:w-1/3 bg-[#111] p-6 rounded-2xl border border-white/10 flex flex-col gap-6 h-fit sticky top-6">
          
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

          <div className="bg-black/30 p-1 rounded-lg flex border border-white/5">
            <button 
                onClick={() => setMode('draft')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'draft' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <PenTool className="w-3 h-3" /> 草图 (Turbo)
            </button>
            <button 
                onClick={() => setMode('render')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${mode === 'render' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <ImageIcon className="w-3 h-3" /> 渲染 (Flux)
            </button>
          </div>

          {(step === 'input' || step === 'review') && (
            <div className="space-y-4 border-t border-white/10 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <Monitor className="w-3 h-3 text-orange-500" />
                  画幅比例 (Aspect Ratio)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ASPECT_RATIOS.map(ratio => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`text-[10px] py-2 px-1 rounded-lg border transition-all ${
                        aspectRatio === ratio.value 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-500 font-bold' 
                        : 'bg-black/30 border-white/5 text-zinc-500 hover:border-white/20'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'render' && (
                <div className="animate-in zoom-in-95 duration-200">
                  <label className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                    <Palette className="w-3 h-3 text-purple-500" />
                    渲染风格 (Art Style)
                  </label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:border-purple-500 focus:outline-none appearance-none"
                  >
                    {STYLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <User className="w-3 h-3 text-blue-500" />
                  固定主角 (Character)
                </label>
                <select
                  value={selectedCharacterId || ''}
                  onChange={(e) => setSelectedCharacterId(e.target.value || null)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="">-- 不指定 --</option>
                  {characters.map(char => (
                    <option key={char.id} value={char.id}>{char.name}</option>
                  ))}
                </select>

                {selectedCharacterId && refImages.length > 0 && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                      <Paperclip className="w-3 h-3 text-blue-400" />
                      视觉参考 (Visual Anchor)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {refImages.map(img => (
                        <div 
                          key={img.id}
                          onClick={() => setSelectedRefImage(selectedRefImage === img.image_url ? null : img.image_url)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedRefImage === img.image_url 
                            ? 'border-blue-500 ring-2 ring-blue-500/50' 
                            : 'border-transparent hover:border-white/30 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <Image src={img.image_url} alt="Ref" fill className="object-cover" />
                          {selectedRefImage === img.image_url && (
                             <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-white drop-shadow-md" />
                             </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedCharacterId && refImages.length === 0 && (
                   <div className="mt-2 text-[10px] text-zinc-600 flex items-center gap-1">
                      该角色暂无参考图，<Link href="/tools/characters" className="text-blue-500 underline">去上传</Link>
                   </div>
                )}
              </div>

              {/* 🔥 场景设定 (大升级) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-green-500" />
                    固定场景 (Global Scene)
                  </label>
                  {/* 上传按钮 */}
                  <label className="cursor-pointer text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded flex items-center gap-1 transition">
                     {isUploadingScene ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                     {sceneImageUrl ? '更换场景图' : '上传参考图'}
                     <input type="file" className="hidden" accept="image/*" onChange={handleSceneUpload} disabled={isUploadingScene}/>
                  </label>
                </div>
                
                {/* 场景图预览 */}
                {sceneImageUrl && (
                  <div className="mb-2 relative w-full h-24 rounded-lg overflow-hidden border border-green-500/30 group">
                    <Image src={sceneImageUrl} alt="Scene Ref" fill className="object-cover opacity-60 group-hover:opacity-100 transition" />
                    <button onClick={() => setSceneImageUrl(null)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 p-1 rounded-full text-white"><Trash2 size={12}/></button>
                  </div>
                )}

                <input
                  type="text"
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="例如：赛博朋克街道，雨夜..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
          )}

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

        {/* === 右侧展示区 (保持动态布局) === */}
        <div className="w-full lg:w-2/3">
          
          {step === 'input' && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-[#111] rounded-2xl border border-dashed border-white/10 text-zinc-600">
              <Film className="w-20 h-20 mb-4 opacity-10" />
              <p className="font-bold">输入剧本 &rarr; 配置 &rarr; AI 绘制</p>
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
                            {/* 第一行：序号 + 景别 + 删除 */}
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center font-mono text-zinc-500 font-bold flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <select 
                                    value={panel.shotType}
                                    onChange={(e) => handleUpdatePanel(panel.id, 'shotType', e.target.value)}
                                    className="bg-black border border-zinc-700 text-yellow-500 text-xs font-bold px-2 py-2 rounded focus:outline-none focus:border-yellow-500"
                                >
                                    {CINEMATIC_SHOTS.map(shot => (
                                      <option key={shot.value} value={shot.value}>{shot.label}</option>
                                    ))}
                                </select>
                                <div className="flex-1"></div>
                                <button onClick={() => handleDeletePanel(panel.id)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>
                            
                            {/* 第二行：动作描述 + 环境覆盖 (并排) */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-zinc-500 mb-1 block">动作描述 (Action)</label>
                                    <textarea 
                                        value={panel.description}
                                        onChange={(e) => handleUpdatePanel(panel.id, 'description', e.target.value)}
                                        className="w-full bg-black/30 text-sm text-gray-300 border border-transparent hover:border-zinc-700 focus:border-yellow-500 rounded p-2 resize-none focus:outline-none"
                                        rows={3}
                                        placeholder="角色在做什么..."
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-zinc-500 mb-1 block flex items-center gap-1">
                                        <MapPin size={10} className={panel.environment ? "text-green-500" : ""} />
                                        场景/环境 (Environment Override)
                                    </label>
                                    <textarea 
                                        value={panel.environment || ''}
                                        onChange={(e) => handleUpdatePanel(panel.id, 'environment', e.target.value)}
                                        className={`w-full bg-black/30 text-sm text-gray-300 border rounded p-2 resize-none focus:outline-none ${panel.environment ? 'border-green-500/50 bg-green-500/5' : 'border-transparent hover:border-zinc-700 focus:border-green-500'}`}
                                        rows={3}
                                        placeholder={sceneDescription ? `默认：${sceneDescription}` : "例如：突然切换到街道..."}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {(step === 'generating' || step === 'done') && (
            <div className={`grid gap-6 ${aspectRatio === '9:16' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              {panels.map((panel, idx) => (
                <div key={panel.id} className={`relative bg-black rounded-xl overflow-hidden shadow-xl border border-zinc-800 group ${currentRatioClass}`}>
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
                        {/* 如果有环境覆盖，显示小图标 */}
                        {panel.environment && <span className="text-[10px] bg-green-900/50 text-green-400 px-1.5 rounded flex items-center gap-1"><MapPin size={8}/> 场景切换</span>}
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-1 opacity-80">{panel.description}</p>
                  </div>
                </div>
              ))}
              
              {step === 'done' && (
                  <div className={`flex justify-center pt-8 pb-12 ${aspectRatio === '9:16' ? 'col-span-2 md:col-span-3' : 'col-span-1 md:col-span-2'}`}>
                      <button 
                        onClick={handleExportPDF} 
                        disabled={isExporting}
                        className="bg-white hover:bg-gray-200 text-black px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl transition-all hover:scale-105"
                      >
                          {isExporting ? <Loader2 className="animate-spin w-5 h-5"/> : <Download size={20}/>}
                          {isExporting ? '正在打包...' : '导出商业分镜 PDF'}
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