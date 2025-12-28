'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation' 
import { createClient } from '@/utils/supabase/client'
import { generateShotImage } from '@/app/actions/generate' 
import { ArrowLeft, Plus, Image as ImageIcon, Wand2, Trash2, Video, Loader2, Save, Play } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'

// ... (类型定义保持不变)
type Shot = {
  id: string
  description: string
  image_prompt: string
  image_url: string | null
  shot_type: string
  sort_order: number
  status?: string // 新增状态字段
}

type Project = {
  id: string
  title: string
  description: string
  user_id: string // 确保类型里有 user_id
}

export default function ProjectEditor() {
  const params = useParams()
  const projectId = Array.isArray(params?.id) ? params?.id[0] : params?.id
  const router = useRouter()
  const supabase = createClient()
  
  const [project, setProject] = useState<Project | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null) // 新增 UserID 状态
  
  // 临时状态
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false) // 批量生成状态

  // 1. 初始化加载
  useEffect(() => {
    const init = async () => {
        // 获取当前用户
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
        } else {
            // 如果没登录，可能需要重定向
            // router.push('/login'); 
            toast.error('未检测到登录用户');
        }

        if (projectId) {
            await fetchProjectData();
        }
    };
    init();
  }, [projectId]);

  const fetchProjectData = async () => {
    if (!projectId) return

    try {
      const { data: pData, error: pError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (pError) throw pError
      setProject(pData)

      const { data: sData, error: sError } = await supabase
        .from('shots')
        .select('*')
        .eq('project_id', projectId) 
        .order('sort_order', { ascending: true })
      
      if (sError) throw sError
      setShots(sData || [])

    } catch (error) {
      console.error(error)
      toast.error('加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  // 2. 添加新镜头
  const handleAddShot = async () => {
    if (!project || !projectId || !userId) {
        toast.error('请稍后重试 (用户未同步)');
        return;
    }

    try {
      const newOrder = shots.length + 1
      const { data, error } = await supabase
        .from('shots')
        .insert({
          project_id: projectId,
          user_id: userId, // ✅ 使用动态 UserID
          sort_order: newOrder,
          description: '',
          shot_type: '中景 (Medium Shot)'
        })
        .select()
        .single()

      if (error) throw error
      setShots([...shots, data])
      toast.success('镜头已添加')
    } catch (error: any) {
      console.error(error)
      toast.error('添加失败: ' + error.message)
    }
  }

  // ... (Update 和 Delete 函数保持不变，直接复制即可)
  const handleUpdateShot = async (id: string, field: string, value: string) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    // 建议加防抖 (Debounce)，否则输入一个字请求一次数据库压力太大。这里暂时保留原样。
    await supabase.from('shots').update({ [field]: value }).eq('id', id)
  }

  const handleDeleteShot = async (id: string) => {
    if(!confirm('确定删除此镜头？')) return
    try {
      await supabase.from('shots').delete().eq('id', id)
      setShots(prev => prev.filter(s => s.id !== id))
      toast.success('已删除')
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 5. 单个生成
  const handleGenerate = async (shot: Shot) => {
    if (!shot.image_prompt) {
      toast.error('请先填写提示词 (Prompt)')
      return
    }
    if (!projectId) return;

    setGeneratingId(shot.id)
    toast.info('正在请求 AI 绘图...')

    try {
        const res = await generateShotImage(shot.id, shot.image_prompt, projectId);

        if (res.success && res.url) {
            setShots(prev => prev.map(s => s.id === shot.id ? { 
                ...s, 
                image_url: res.url,
                status: 'completed' 
            } : s));
            toast.success('生成完成');
        } else {
            toast.error('生成失败: ' + res.message);
        }
    } catch (error: any) {
        toast.error('请求错误');
    } finally {
        setGeneratingId(null);
    }
  }

  // 🔥 6. 新增：批量生成所有未生成的镜头
  const handleBatchGenerate = async () => {
      const pendingShots = shots.filter(s => !s.image_url && s.image_prompt);
      if (pendingShots.length === 0) return toast.info('没有待生成的镜头');

      if (!confirm(`确定要批量生成 ${pendingShots.length} 个镜头吗？这可能需要一些时间。`)) return;

      setIsBatchGenerating(true);
      toast.info('开始批量生成...');

      // 为了不炸 API，限制并发数或者串行，这里简单用并行 Promise.all 
      // (如果你接的是 Gemini 免费版，建议用 for...of 串行，否则会 429 Too Many Requests)
      
      // === 串行模式 (推荐) ===
      for (const shot of pendingShots) {
          await handleGenerate(shot);
          // 稍微停顿一下防止超限
          await new Promise(r => setTimeout(r, 1000));
      }

      setIsBatchGenerating(false);
      toast.success('批量任务结束');
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" /> 加载编辑器...
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <Toaster position="top-center" richColors />

      {/* 顶部导航 */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#111] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/tools/cineflow" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">PROJECT</span>
            <input 
              value={project?.title || ''} 
              onChange={(e) => {
                  setProject(prev => prev ? {...prev, title: e.target.value} : null);
                  // 应该加个 onBlur 保存标题到数据库
              }}
              onBlur={async (e) => {
                  if(projectId) await supabase.from('projects').update({ title: e.target.value }).eq('id', projectId);
              }}
              className="bg-transparent font-bold text-lg focus:outline-none text-white w-64 placeholder-gray-600"
              placeholder="未命名项目..."
            />
          </div>
        </div>
        <div className="flex gap-2">
           {/* 批量生成按钮 */}
           <button 
             onClick={handleBatchGenerate}
             disabled={isBatchGenerating}
             className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-white/10"
           >
             {isBatchGenerating ? <Loader2 className="animate-spin w-4 h-4"/> : <Play className="w-4 h-4" />} 
             {isBatchGenerating ? '生成中...' : '生成全部'}
           </button>

           <button className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20">
             <Video className="w-4 h-4" /> 导出视频
           </button>
        </div>
      </div>

      {/* 主工作区 */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-8 pb-32">
        
        {shots.length === 0 && (
          // ... (空状态保持不变)
          <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5 mt-10">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-gray-500" />
             </div>
             <h3 className="text-lg font-bold mb-2">你的故事板是空的</h3>
             <p className="text-gray-500 mb-6 text-sm">点击下方按钮添加你的第一个镜头</p>
             <button onClick={handleAddShot} className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-full font-bold transition-all">
               + 添加第一个镜头
             </button>
          </div>
        )}

        {shots.map((shot, index) => (
          <div key={shot.id} className="flex flex-col md:flex-row gap-6 bg-[#151515] p-6 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all group relative">
            {/* ... (这里是镜头卡片的 UI，直接用原来的即可，逻辑不需要大改) ... */}
            
            {/* 左侧：序号与操作 */}
            <div className="flex md:flex-col justify-between items-center md:items-start gap-4 md:w-12 border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-4">
              <span className="text-2xl font-black text-white/10 select-none">#{index + 1}</span>
              <button onClick={() => handleDeleteShot(shot.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded hover:bg-white/5">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* 中间：文本脚本 */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">镜头描述 (Story)</label>
                <textarea 
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm focus:border-purple-500 focus:outline-none transition-colors min-h-[80px] resize-y placeholder-gray-700"
                  placeholder="例如：主角站在雨中，抬头望向霓虹灯招牌..."
                  value={shot.description || ''}
                  onChange={(e) => handleUpdateShot(shot.id, 'description', e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-purple-400 uppercase mb-1.5 block flex items-center gap-1.5">
                  <Wand2 className="w-3 h-3" /> AI 提示词 (Prompt)
                </label>
                <textarea 
                  className="w-full bg-purple-900/10 border border-purple-500/20 rounded-lg p-3 text-sm focus:border-purple-500 focus:outline-none transition-colors min-h-[80px] font-mono text-purple-200 placeholder-purple-900/50 resize-y"
                  placeholder="Cinematic shot..."
                  value={shot.image_prompt || ''}
                  onChange={(e) => handleUpdateShot(shot.id, 'image_prompt', e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <select 
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 focus:border-white/30 focus:outline-none"
                  value={shot.shot_type}
                  onChange={(e) => handleUpdateShot(shot.id, 'shot_type', e.target.value)}
                >
                  <option>远景 (Wide Shot)</option>
                  <option>全景 (Full Shot)</option>
                  <option>中景 (Medium Shot)</option>
                  <option>特写 (Close-up)</option>
                  <option>大特写 (Extreme Close-up)</option>
                </select>
              </div>
            </div>

            {/* 右侧：画面预览 */}
            <div className="w-full md:w-[320px] lg:w-[400px] flex-shrink-0">
               <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-white/10 group-hover:border-white/20 transition-colors">
                 {shot.image_url ? (
                   <img src={shot.image_url} className="w-full h-full object-cover" />
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                     <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                     <span className="text-xs font-medium opacity-50">等待生成</span>
                   </div>
                 )}

                 {/* 生成按钮 */}
                 <div className="absolute bottom-4 right-4 z-10">
                   <button 
                     onClick={() => handleGenerate(shot)}
                     disabled={generatingId === shot.id || isBatchGenerating}
                     className="bg-white/90 hover:bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                   >
                     {generatingId === shot.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3 text-purple-600"/>}
                     {generatingId === shot.id ? '生成中...' : '生成画面'}
                   </button>
                 </div>
                 
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none opacity-50"></div>
               </div>
            </div>
            
          </div>
        ))}

        {shots.length > 0 && (
            <button 
            onClick={handleAddShot}
            className="w-full py-6 border border-dashed border-white/10 rounded-xl text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold group"
            >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" /> 添加下一个镜头
            </button>
        )}

      </div>
    </div>
  )
}