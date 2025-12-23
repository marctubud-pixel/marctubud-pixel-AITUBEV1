'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Wand2, Search, Clapperboard, FileText, Sparkles, Lock } from 'lucide-react';

export default function ToolsPage() {
  const tools = [
    {
      id: 'prompts',
      title: '提示词词典',
      desc: '收录 500+ 光影、镜头、风格专用词汇，点击即可复制，让 AI 更懂你的画面。',
      icon: <FileText size={32} className="text-blue-400" />,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      status: 'Available', // 可用
      link: '/tools/prompts'
    },
    {
      id: 'analyzer',
      title: 'AI 视频拆解',
      desc: '上传视频，AI 自动反推分镜脚本与提示词，一键学习大神运镜。',
      icon: <Search size={32} className="text-purple-400" />,
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      status: 'Coming Soon', // 开发中
      link: '#'
    },
    {
      id: 'storyboard',
      title: '智能分镜生成',
      desc: '输入故事大纲，自动生成 4-6 格标准分镜描述，直接可用于绘图。',
      icon: <Clapperboard size={32} className="text-green-400" />,
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      status: 'VIP Only', // 会员专属
      link: '#'
    },
    {
      id: 'magic',
      title: '画质增强器',
      desc: '将模糊的生成视频提升至 4K 高清画质，修复面部崩坏。',
      icon: <Sparkles size={32} className="text-yellow-400" />,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      status: 'Coming Soon',
      link: '#'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
          <span className="font-bold">返回首页</span>
        </Link>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-pink-900/20">
                <Wand2 fill="white" size={16} />
            </div>
            <span className="text-xl font-bold tracking-tight">灵感工具库</span>
        </div>
        <div className="w-20"></div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-10">
        
        <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">工欲善其事，必先利其器</h1>
            <p className="text-gray-400 max-w-xl mx-auto">
                我们为你准备了一系列强大的 AI 辅助工具，从提示词优化到视频分析，全方位提升你的创作效率。
            </p>
        </div>

        {/* 工具网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tools.map((tool) => (
                <Link 
                    href={tool.link} 
                    key={tool.id}
                    className={`relative p-8 rounded-3xl border transition-all duration-300 group ${tool.bg} ${tool.border} hover:scale-[1.02] hover:shadow-2xl ${tool.status !== 'Available' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                    onClick={(e) => tool.status !== 'Available' && e.preventDefault()}
                >
                    <div className="flex items-start justify-between mb-6">
                        <div className={`w-16 h-16 rounded-2xl ${tool.bg} border ${tool.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                            {tool.icon}
                        </div>
                        {tool.status === 'Coming Soon' && (
                            <span className="text-[10px] font-bold bg-white/10 text-gray-400 px-2 py-1 rounded-full uppercase tracking-wider">开发中</span>
                        )}
                        {tool.status === 'VIP Only' && (
                            <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-yellow-500/20">
                                <Lock size={10} /> VIP专属
                            </span>
                        )}
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-2 group-hover:text-white transition-colors">{tool.title}</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">{tool.desc}</p>

                    {tool.status === 'Available' && (
                        <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <ArrowLeft size={24} className="rotate-180 text-white" />
                        </div>
                    )}
                </Link>
            ))}
        </div>

      </main>
    </div>
  );
}
