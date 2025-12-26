'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation' // ✅ 必须引入 useParams
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Plus, Image as ImageIcon, Wand2, Trash2, Video, Loader2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'

// 定义类型
type Shot = {
  id: string
  description: string
  image_prompt: string
  image_url: string | null
  shot_type: string
  sort_order: number
}

type Project = {
  id: string
  title: string
  description: string
}

export default function ProjectEditor() {
  // ✅ 修复点1：使用 useParams 钩子安全获取 ID (解决"项目未加载"报错)
  const params = useParams()
  // 确保 id 是字符串
  const projectId = Array.isArray(params?.id) ? params?.id[0] : params?.id

  const router = useRouter()
  const supabase = createClient()
  
  const [project, setProject] = useState<Project | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [loading, setLoading] = useState(true)
  
  // 临时状态
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  // 1. 初始化加载
  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId]) // 当 ID 准备好时才执行

  const fetchProjectData = async () => {
    if (!projectId) return

    try {
      console.log('正在加载项目 ID:', projectId) 

      // 获取项目信息
      const { data: pData, error: pError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId) // ✅ 使用钩子获取的 ID
        .single()
      
      if (pError) throw pError
      setProject(pData)

      // 获取镜头列表
      const { data: sData, error: sError } = await supabase
        .from('shots')
        .select('*')
        .eq('project_id', projectId) 
        .order('sort_order', { ascending: true })
      
      if (sError) throw sError
      setShots(sData || [])

    } catch (error) {
      console.error(error)
      toast.error('加载项目失败，ID可能无效')
    } finally {
      setLoading(false)
    }
  }

  // 2. 添加新镜头
  const handleAddShot = async () => {
    if (!project || !projectId) {
        toast.error('项目未加载完成，请稍后再试');
        return;
    }

    try {
      // =========================================================
      // ✅ 已自动填充你的 User UUID
      // =========================================================
      const userId = 'cec386b5-e80a-4105-aa80-d8d5b8b0a9bf'; 
      // =========================================================
      
      const newOrder = shots.length + 1
      const { data, error } = await supabase
        .from('shots')
        .insert({
          project_id: projectId, // ✅ 使用正确的 ID
          user_id: userId,       // ✅ 使用自动填充的 ID
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
      toast.error('添加失败: ' + (error.message || '未知错误'))
    }
  }

  // 3. 更新镜头内容
  const handleUpdateShot = async (id: string, field: string, value: string) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    await supabase.from('shots').update({ [field]: value }).eq('id', id)
  }

  // 4. 删除镜头
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

  // 5. 模拟 AI 生成
  const handleGenerate = async (shot: Shot) => {
    if (!shot.image_prompt) {
      toast.error('请先填写提示词 (Prompt)')
      return
    }
    
    setGeneratingId(shot.id)
    toast.info('正在请求 AI 生成...')

    // 模拟等待
    await new Promise(r => setTimeout(r, 2000))

    const mockImage = `https://picsum.photos/seed/${shot.id}/800/450`
    
    await supabase.from('shots').update({ 
      image_url: mockImage,
      status: 'completed'
    }).eq('id', shot.id)

    setShots(prev => prev.map(s => s.id === shot.id ? { ...s, image_url: mockImage } : s))
    setGeneratingId(null)
    toast.success('画面生成完成！')
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
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#111]">
        <div className="flex items-center gap-4">
          <Link href="/tools/cineflow" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">PROJECT</span>
            <input 
              value={project?.title || ''} 
              onChange={(e) => {
                if(project) setProject({...project, title: e.target.value})
              }}
              className="bg-transparent font-bold text-lg focus:outline-none text-white w-64 placeholder-gray-600"
              placeholder="未命名项目..."
            />
          </div>
        </div>
        <div className="flex gap-2">
           <button className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
             <Video className="w-4 h-4" /> 导出视频
           </button>
        </div>
      </div>

      {/* 主工作区 */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-8 pb-32">
        
        {shots.length === 0 && (
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
                  placeholder="Cinematic shot, cyberpunk city, rain, neon lights, medium shot..."
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
                     disabled={generatingId === shot.id}
                     className="bg-white/90 hover:bg-white text-black px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                   >
                     {generatingId === shot.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3 text-purple-600"/>}
                     {generatingId === shot.id ? '生成中...' : '生成画面'}
                   </button>
                 </div>
                 
                 {/* 遮罩 */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none opacity-50"></div>
               </div>
            </div>

          </div>
        ))}

        {/* 底部添加按钮 */}
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
