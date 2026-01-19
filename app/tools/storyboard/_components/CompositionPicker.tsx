// app/tools/storyboard/_components/CompositionPicker.tsx
'use client'

import { useState } from 'react'
import { searchComposition } from '@/app/actions/composition' // 确保引用路径正确
import { Search, Image as ImageIcon, Loader2, X } from 'lucide-react'

// 定义新的 Pro Max 数据结构接口
interface CompositionRef {
  id: number
  image_url: string
  source_movie: string
  similarity: number
  meta: {
    technical: { shot_size: string; angle: string }
    environment: { time_of_day: string; weather: string; lighting_type: string }
    subject: { facing: string; action_desc: string }
    mood: { keywords: string }
  }
}

interface Props {
  initialQuery?: string
  onSelect: (ref: CompositionRef) => void
}

export default function CompositionPicker({ initialQuery = '', onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<CompositionRef[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)

    // 调用 Server Action
    const res = await searchComposition(query)

    if (res.success) {
      setResults(res.data)
    }
    setLoading(false)
  }

  // 打开时自动搜索一次
  const openModal = () => {
    setIsOpen(true)
    if (initialQuery && results.length === 0) {
      handleSearch()
    }
  }

  return (
    <>
      {/* 1. 入口按钮 */}
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors"
      >
        <ImageIcon size={14} />
        大师构图库
      </button>

      {/* 2. 弹窗 Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col border border-zinc-200 dark:border-zinc-800">

            {/* 头部搜索栏 */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <Search className="text-zinc-400" size={20} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="描述想要的画面，如：雨夜背影、赛博朋克..."
                className="flex-1 bg-transparent outline-none text-zinc-900 dark:text-zinc-100"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : '搜索'}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-black/20">
              {results.length === 0 && !loading ? (
                <div className="text-center py-20 text-zinc-400">
                  输入关键词，寻找电影级构图灵感
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {results.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelect(item)
                        setIsOpen(false)
                      }}
                      className="group cursor-pointer relative aspect-video bg-zinc-200 rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all"
                    >
                      <img src={item.image_url} className="w-full h-full object-cover" />

                      {/* 悬停显示详情 (利用 Pro Max 数据) */}
                      {/* 悬停显示详情 (利用 Pro Max 数据) */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-[10px] text-zinc-300">
                        <div className="font-bold text-white mb-1">{item.meta.technical.shot_size} · {item.meta.technical.angle}</div>
                        <div className="flex gap-2">
                          <span className="truncate max-w-[50%]">{item.meta.environment.lighting_type}</span>
                          <span className="text-indigo-400 font-bold ml-auto shrink-0">点击应用</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}