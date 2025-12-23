'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Users, Handshake, CheckCircle, Search, Filter, TrendingUp, DollarSign, Clock, ChevronRight, Star } from 'lucide-react';

export default function CollaborationPage() {
  const [activeTab, setActiveTab] = useState<'demands' | 'creators'>('demands');

  // 模拟需求数据 (后续可连接 Supabase 'jobs' 表)
  const demands = [
    {
      id: 1,
      title: "某二次元手游 PV 宣传片制作",
      budget: "¥15,000 - 20,000",
      tags: ["Sora", "UE5", "3D动画"],
      company: "米哈游 (模拟)",
      deadline: "5天后截止",
      status: "urgent", // 急招
      applicants: 12
    },
    {
      id: 2,
      title: "电商产品 AI 模特展示视频",
      budget: "¥3,000 - 5,000",
      tags: ["Runway", "Midjourney", "实拍合成"],
      company: "某知名美妆品牌",
      deadline: "长期招募",
      status: "open",
      applicants: 45
    },
    {
      id: 3,
      title: "科技展会大屏背景视频 loop",
      budget: "¥8,000",
      tags: ["抽象", "粒子特效", "Stable Diffusion"],
      company: "未来科技无限公司",
      deadline: "2天后截止",
      status: "open",
      applicants: 8
    },
    {
      id: 4,
      title: "儿童绘本转 AI 动画短片",
      budget: "¥200 / 秒",
      tags: ["Pika", "SDXL", "风格化"],
      company: "童心出版社",
      deadline: "招满即止",
      status: "closed",
      applicants: 30
    }
  ];

  // 模拟创作者数据
  const creators = [
    { id: 101, name: "NeonMaster", role: "AI 视频专家", skills: ["Sora", "AE"], rating: 4.9, avatar: "N", completed: 32 },
    { id: 102, name: "PixelArt", role: "风格化大师", skills: ["Midjourney", "SD"], rating: 5.0, avatar: "P", completed: 15 },
    { id: 103, name: "FutureVision", role: "商业广告导演", skills: ["Runway", "剪映"], rating: 4.8, avatar: "F", completed: 88 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-blue-500/30">
      
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
          <span className="font-bold">返回首页</span>
        </Link>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Handshake fill="white" size={16} />
            </div>
            <span className="text-xl font-bold tracking-tight">合作中心</span>
        </div>
        <div className="w-20"></div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">

        {/* Hero 区域：数据看板风格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/20 rounded-3xl p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">连接 AI 创意与商业价值</h1>
                    <p className="text-blue-200/60 mb-8 max-w-lg">
                        这里是 AI.Tube 的商业对接大厅。无论你是寻找顶尖 AI 创作者的甲方，还是身怀绝技想要变现的创作者，这里都是你的舞台。
                    </p>
                    <div className="flex gap-4">
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all">
                            <Briefcase size={18}/> 发布需求
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all">
                            <Users size={18}/> 入驻接单
                        </button>
                    </div>
                </div>
                {/* 背景装饰 */}
                <Handshake className="absolute bottom-[-20px] right-[-20px] text-blue-500/10 w-64 h-64 -rotate-12" />
            </div>

            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col justify-center space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500"><DollarSign size={24}/></div>
                    <div>
                        <div className="text-2xl font-bold font-mono">¥245w+</div>
                        <div className="text-xs text-gray-500">平台累计交易额</div>
                    </div>
                </div>
                <div className="w-full h-px bg-white/5"></div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500"><Briefcase size={24}/></div>
                    <div>
                        <div className="text-2xl font-bold font-mono">1,280</div>
                        <div className="text-xs text-gray-500">发布中的需求</div>
                    </div>
                </div>
                <div className="w-full h-px bg-white/5"></div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500"><Users size={24}/></div>
                    <div>
                        <div className="text-2xl font-bold font-mono">500+</div>
                        <div className="text-xs text-gray-500">认证 AI 创作者</div>
                    </div>
                </div>
            </div>
        </div>

        {/* 筛选与 Tab */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="bg-[#151515] p-1 rounded-xl flex gap-1 border border-white/5">
                <button 
                    onClick={() => setActiveTab('demands')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'demands' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    需求大厅
                </button>
                <button 
                    onClick={() => setActiveTab('creators')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'creators' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    创作者库
                </button>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                    <input type="text" placeholder="搜索需求或标签..." className="w-full bg-[#151515] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"/>
                </div>
                <button className="bg-[#151515] border border-white/10 p-2 rounded-full text-gray-400 hover:text-white hover:border-white/30"><Filter size={18}/></button>
            </div>
        </div>

        {/* 列表内容 */}
        {activeTab === 'demands' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                {demands.map(item => (
                    <div key={item.id} className="group bg-[#121212] border border-white/5 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col md:flex-row gap-6 md:items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                {item.status === 'urgent' && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded font-bold border border-red-500/20">急招</span>}
                                {item.status === 'closed' && <span className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded font-bold">已结束</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {item.tags.map(t => <span key={t} className="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded">{t}</span>)}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Briefcase size={12}/> {item.company}</span>
                                <span className="flex items-center gap-1"><Clock size={12}/> {item.deadline}</span>
                                <span className="flex items-center gap-1"><Users size={12}/> {item.applicants} 人已投递</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[150px]">
                            <div className="text-xl font-bold text-blue-400 font-mono">{item.budget}</div>
                            <button className="bg-white/10 hover:bg-white text-white hover:text-black px-5 py-2 rounded-full text-sm font-bold transition-all w-full md:w-auto">
                                立即沟通
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {creators.map(creator => (
                    <div key={creator.id} className="bg-[#121212] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all text-center">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-2xl font-bold mb-4 border-2 border-white/10">
                            {creator.avatar}
                        </div>
                        <h3 className="text-lg font-bold mb-1">{creator.name}</h3>
                        <p className="text-blue-400 text-xs font-bold mb-4">{creator.role}</p>
                        
                        <div className="flex justify-center gap-2 mb-6">
                            {creator.skills.map(s => <span key={s} className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400">{s}</span>)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4 mb-4">
                            <div>
                                <div className="font-bold text-white">{creator.rating}</div>
                                <div className="text-[10px] text-gray-500">评分</div>
                            </div>
                            <div>
                                <div className="font-bold text-white">{creator.completed}</div>
                                <div className="text-[10px] text-gray-500">成交单数</div>
                            </div>
                        </div>

                        <button className="w-full border border-white/20 hover:bg-white hover:text-black text-white py-2 rounded-lg text-sm font-bold transition-all">
                            查看作品集
                        </button>
                    </div>
                ))}
            </div>
        )}

      </main>
    </div>
  );
}
