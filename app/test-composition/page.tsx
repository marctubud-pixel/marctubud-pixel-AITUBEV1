// app/test-composition/page.tsx
'use client'

import { useState } from 'react'
import { searchComposition } from '@/app/actions/composition'

export default function TestPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    // 调用 Server Action
    const res = await searchComposition(query)
    if (res.success) {
      setResults(res.data)
    }
    setLoading(false)
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">大师构图搜索引擎 (测试版)</h1>
      
      <div className="flex gap-2 mb-8">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="描述你想要的画面感，例如：压抑的雨夜双人对峙"
          className="border p-2 flex-1 rounded text-black"
        />
        <button 
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {results.map((item) => (
          <div key={item.id} className="border rounded-lg overflow-hidden bg-gray-50">
            <img 
              src={item.image_url} 
              alt="ref" 
              className="w-full h-48 object-cover"
            />
            <div className="p-3 text-sm text-gray-700">
              <p className="font-bold text-blue-600 mb-1">相似度: {(item.similarity * 100).toFixed(1)}%</p>
              <div className="space-y-1">
                <p>🎥 <span className="font-medium">Angle:</span> {item.meta.angle}</p>
                <p>📐 <span className="font-medium">Comp:</span> {item.meta.composition}</p>
                <p>😶 <span className="font-medium">Mood:</span> {item.meta.mood}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}