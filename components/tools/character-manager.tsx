'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Trash2, Plus, User, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

// 定义角色类型
type Character = {
  id: string
  name: string
  description: string
  avatar_url: string | null
}

export default function CharacterManager() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // 表单状态
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAvatarUrl, setNewAvatarUrl] = useState('')

  const supabase = createClient()

  // 1. 加载用户角色
  const fetchCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCharacters(data || [])
    } catch (error) {
      console.error('Error fetching characters:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCharacters()
  }, [])

  // 2. 处理图片上传 (修复 RLS 权限问题的增强版)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      // [关键修复] 1. 获取并检查当前登录用户
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('系统检测到您未登录，请先登录后再操作！')
      }
      console.log("Current User ID:", user.id)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('请选择一张图片')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      
      // [关键修复] 2. 使用 "用户ID/随机名" 的路径结构
      // 这样符合 owner-based RLS 策略，也更好管理文件
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      
      console.log("Uploading to:", fileName)

      // --- 上传至 'characters' 存储桶 ---
      const { error: uploadError } = await supabase.storage
        .from('characters') 
        .upload(fileName, file, {
          upsert: true // [优化] 允许覆盖
        })

      if (uploadError) {
        console.error("Supabase Upload Error:", uploadError)
        throw uploadError
      }

      // --- 获取链接 ---
      const { data } = supabase.storage.from('characters').getPublicUrl(fileName)
      setNewAvatarUrl(data.publicUrl)

    } catch (error: any) {
      alert(`图片上传失败: ${error.message || '未知错误'}`)
      console.error("Upload process failed:", error)
    } finally {
      setUploading(false)
    }
  }

  // 3. 创建角色
  const handleCreate = async () => {
    if (!newName || !newDesc) return alert('请填写名称和描述')
    
    try {
      setLoading(true)
      
      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登录')

      const { error } = await supabase.from('characters').insert({
        name: newName,
        description: newDesc,
        avatar_url: newAvatarUrl,
        user_id: user.id
      })

      if (error) throw error

      // 重置表单并刷新
      setNewName('')
      setNewDesc('')
      setNewAvatarUrl('')
      fetchCharacters()
      
    } catch (error) {
      console.error('Error creating character:', error)
      alert('创建失败')
    } finally {
      setLoading(false)
    }
  }

  // 4. 删除角色
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个角色吗？')) return

    try {
      const { error } = await supabase.from('characters').delete().match({ id })
      if (error) throw error
      setCharacters(characters.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting character:', error)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      
      {/* 头部区域 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <User className="w-6 h-6 text-yellow-500" />
            角色资产库 (Character Assets)
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            建立你的专属演员表，在分镜生成中保持角色一致性。
          </p>
        </div>
      </div>

      {/* 创建区域 (简单版) */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">新建角色</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* 左侧：图片上传 */}
          <div className="md:col-span-3">
            <label className="block aspect-[3/4] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-yellow-500/50 cursor-pointer relative overflow-hidden group transition-all">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {newAvatarUrl ? (
                <Image 
                  src={newAvatarUrl} 
                  alt="Preview" 
                  fill 
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-300">
                  {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-8 h-8 mb-2" />}
                  <span className="text-xs">{uploading ? '上传中...' : '点击上传参考图'}</span>
                </div>
              )}
            </label>
          </div>

          {/* 右侧：信息录入 */}
          <div className="md:col-span-9 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">角色名称</label>
              <input
                type="text"
                placeholder="例如：赛博朋克女杀手"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                外貌特征描述 (Prompt)
                <span className="text-xs text-yellow-500/80 ml-2">* AI 将根据此描述保持一致性</span>
              </label>
              <textarea
                rows={4}
                placeholder="例如：1girl, solo, cyberpunk jacket, black hair, red eyes, futuristic city background, realistic style..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={loading || uploading || !newName}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                保存到角色库
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 列表区域 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {characters.map((char) => (
          <div key={char.id} className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-yellow-500/30 transition-all">
            {/* 卡片图片 */}
            <div className="aspect-[3/4] relative bg-gray-800">
              {char.avatar_url ? (
                <Image 
                  src={char.avatar_url} 
                  alt={char.name} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                  <User className="w-10 h-10" />
                </div>
              )}
              {/* 删除按钮 (Hover显示) */}
              <button
                onClick={() => handleDelete(char.id)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-red-400 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* 卡片信息 */}
            <div className="p-3">
              <h4 className="font-medium text-gray-200 truncate">{char.name}</h4>
              <p className="text-xs text-gray-500 line-clamp-2 mt-1 h-8">{char.description}</p>
            </div>
          </div>
        ))}

        {/* 占位：如果没有数据 */}
        {!loading && characters.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
            <p>还没有角色，快创建一个吧！</p>
          </div>
        )}
      </div>
    </div>
  )
}