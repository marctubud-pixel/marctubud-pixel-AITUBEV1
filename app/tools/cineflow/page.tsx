'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Film, Trash2, Loader2, Calendar, ArrowRight } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'

// 定义项目类型
type Project = {
  id: string
  title: string
  description: string | null
  updated_at: string
}

export default function CineFlowDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // 1. 加载项目列表
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      // 尝试获取用户，但就算获取失败也不要跳转
      const { data: { user } } = await supabase.auth.getUser()
      
      // 🛑 之前的强制跳转逻辑已移除，防止死循环
      // if (!user) router.push('/login') 

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('加载失败:', error)
      // toast.error('无法加载项目列表') // 可选：屏蔽报错以免太吵
    } finally {
      setLoading(false)
    }
  }

  // 2. 新建项目 (核心修改：硬编码 ID)
  const handleCreateProject = async () => {
    try {
      setIsCreating(true)
      
      // =========================================================
      // 🛑 绕过 Auth 检查，使用硬编码 ID
      // =========================================================
      
      // 👇👇👇 【重要】请把下面的字符串换成你的真实 User UUID 👇👇👇
      const userId = 'cec386b5-e80a-4105-aa80-d8d5b8b0a9bf'; 
      
      // =========================================================

      if (userId.includes('请在这里')) {
        toast.error('请先在代码里填入你的 User UUID！');
        return;
      }

      // 创建一个默认项目
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId, // <--- 使用强制 ID
          title: '未命名分镜项目',
          description: '这是一个新的创意...',
          status: 'draft'
        })
        .select()
        .single()

      if (error) throw error

      toast.success('项目创建成功！')
      // 跳转到编辑器页面
      router.push(`/tools/cineflow/${data.id}`)

    } catch (error: any) {
      console.error('创建失败:', error)
      toast.error(error.message || '创建项目失败')
    } finally {
      setIsCreating(false)
    }
  }

  // 3. 删除项目
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault() 
    if (!confirm('确定要删除这个项目吗？删除后无法恢复。')) return

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      
      setProjects(prev => prev.filter(p => p.id !== id))
      toast.success('已删除')
    } catch (error) {
      toast.error('删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
              CineFlow 工作台
            </h1>
            <p className="text-gray-400">管理你的 AI 分镜项目</p>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* 新增：手动登录入口 (防止无路可退) */}
            <Link href="/login" className="text-gray-500 hover:text-white text-sm transition-colors">
               登录 / 切换账号
            </Link>

            <button
              onClick={handleCreateProject}
              disabled={isCreating}
              className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="animate-spin w-4 h-4"/> : <Plus className="w-4 h-4"/>}
              新建项目
            </button>
          </div>
        </div>

        {/* 列表区域 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
          </div>
        ) : projects.length === 0 ? (
          // 空状态
          <div className="text-center py-20 border border-white/10 rounded-2xl bg-white/5 border-dashed">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">还没有项目</h3>
            <p className="text-gray-500 mb-6">创建一个新项目，开始你的导演之路</p>
            <button
              onClick={handleCreateProject}
              className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 mx-auto"
            >
              立即创建 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // 项目网格
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Link 
                href={`/tools/cineflow/${project.id}`} 
                key={project.id}
                className="group relative bg-[#151515] border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition-all hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Film className="w-5 h-5" />
                  </div>
                  <button 
                    onClick={(e) => handleDelete(project.id, e)}
                    className="text-gray-600 hover:text-red-500 p-2 transition-colors"
                    title="删除项目"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                  {project.title}
                </h3>
                <p className="text-gray-500 text-sm mb-6 line-clamp-2 min-h-[40px]">
                  {project.description || '暂无描述'}
                </p>

                <div className="flex items-center text-xs text-gray-600 pt-4 border-t border-white/5">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>更新于 {new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
