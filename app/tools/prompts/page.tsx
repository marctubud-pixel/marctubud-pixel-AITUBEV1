'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Terminal, Sparkles } from 'lucide-react';

export default function PromptsPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // 词库数据 (你可以随时在这里加词)
  const categories = [
    {
      name: "画质与风格 (Style)",
      tags: ["Photorealistic", "Unreal Engine 5", "8k resolution", "Cinematic", "Cyberpunk", "Anime style", "Studio Ghibli", "Vintage VHS", "Kodak Portra 400", "Polaroid"]
    },
    {
      name: "光影 (Lighting)",
      tags: ["Volumetric lighting", "Cinematic lighting", "Natural light", "Neon lights", "Bioluminescence", "Golden hour", "Soft lighting", "Rembrandt lighting", "God rays"]
    },
    {
      name: "镜头 (Camera)",
      tags: ["Wide angle", "Telephoto lens", "Macro shot", "Drone shot", "First-person view (FPV)", "Low angle", "Over-the-shoulder", "Bokeh", "Depth of field"]
    },
    {
      name: "动作与特效 (Action)",
      tags: ["Slow motion", "Hyperlapse", "Time-lapse", "Explosion", "Particle effects", "Fluid simulation", "Smoke effects", "Motion blur"]
    }
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000); // 2秒后恢复
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      
      {/* 顶部导航 */}
      <nav className="flex items-center gap-4 px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/tools" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
            <Terminal className="text-blue-500" size={20}/>
            <h1 className="text-lg font-bold">提示词词典 <span className="text-gray-500 font-normal text-xs ml-2">点击即可复制</span></h1>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6 pb-20">
        
        {/* 顶部提示 */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-10 flex items-start gap-4">
            <Sparkles className="text-blue-400 shrink-0 mt-1" size={20}/>
            <div>
                <h3 className="font-bold text-blue-100 mb-1">如何使用？</h3>
                <p className="text-sm text-blue-200/70">
                    在生成视频（Sora, Runway, Midjourney）时，将这些“魔法咒语”加到你的描述后面，瞬间提升画面质感。
                </p>
            </div>
        </div>

        {/* 分类展示 */}
        <div className="space-y-12">
            {categories.map((cat, idx) => (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${idx * 100}ms`}}>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                        {cat.name}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {cat.tags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => handleCopy(tag)}
                                className={`group relative px-4 py-2.5 rounded-lg text-sm font-mono border transition-all duration-200 flex items-center gap-2
                                    ${copiedText === tag 
                                        ? 'bg-green-500 border-green-500 text-white scale-105' 
                                        : 'bg-[#151515] border-white/10 text-gray-300 hover:border-blue-500/50 hover:text-white hover:bg-blue-500/10'
                                    }`}
                            >
                                {tag}
                                {copiedText === tag ? (
                                    <Check size={14} className="animate-in zoom-in duration-200"/>
                                ) : (
                                    <Copy size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"/>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>

      </main>

      {/* 底部浮动提示 */}
      <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-500 text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 transition-all duration-300 ${copiedText ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <Check size={18} /> 已复制: {copiedText}
      </div>
    </div>
  );
}
