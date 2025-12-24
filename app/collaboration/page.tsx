'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // ⚠️ 路径检查：app/collaboration/page.tsx -> ../lib
import { Search, MapPin, DollarSign, Clock, Filter, Briefcase, ChevronRight, Star, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export default function CollaborationPage() {
  const [activeTab, setActiveTab] = useState('广场');
  
  // 1. 动态数据状态
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. 初始化：获取需求列表
  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false }); // 新发布的在前面
    
    if (data) setJobs(data);
    if (error) console.error('Error fetching jobs:', error);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      
      {/* 顶部导航 */}
      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ChevronRight size={20} className="rotate-180 group-hover:-translate-x-1 transition-transform"/>
          <span className="font-bold">返回首页</span>
        </Link>
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Briefcase fill="white" size={16} />
            </div>
            <span className="text-xl font-bold tracking-tight">合作中心</span>
        </div>
        <div className="w-20"></div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-8 mt-6">
        
        {/* 左侧筛选栏 */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
            {/* 主要功能切换 */}
            <div className="bg-[#151515] rounded-2xl p-2 border border-white/5">
                {['广场', '我的接单', '消息'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* 筛选器 */}
            <div className="bg-[#151515] rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">筛选需求</h3>
                    <Filter size={14} className="text-gray-500"/>
                </div>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm text-gray-300 hover:text-white cursor-pointer group">
                        <div className="w-4 h-4 rounded border border-white/20 group-hover:border-blue-500 transition-colors"></div>
                        仅看高预算 (¥10k+)
                    </label>
                    <label className="flex items-center gap-3 text-sm text-gray-300 hover:text-white cursor-pointer group">
                        <div className="w-4 h-4 rounded border border-white/20 group-hover:border-blue-500 transition-colors"></div>
                        仅看远程协作
                    </label>
                    <label className="flex items-center gap-3 text-sm text-gray-300 hover:text-white cursor-pointer group">
                        <div className="w-4 h-4 rounded border border-white/20 group-hover:border-blue-500 transition-colors"></div>
                        急需 (Urgent)
                    </label>
                </div>
            </div>
        </aside>

        {/* 右侧列表区域 */}
        <div className="flex-1">
            
            {/* 搜索栏 */}
            <div className="flex gap-4 mb-8">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                    <input type="text" placeholder="搜索需求：例如 'Sora PV' 或 '电商视频'..." className="w-full bg-[#151515] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all shadow-xl"/>
                </div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2">
                    发布需求
                </button>
            </div>

            {/* 需求列表 */}
            <div className="space-y-4">
                {loading ? (
                    // 加载骨架屏
                    [1,2,3].map(i => <div key={i} className="h-40 bg-[#151515] rounded-2xl animate-pulse border border-white/5"></div>)
                ) : jobs.length > 0 ? (
                    jobs.map((job) => (
                        <div key={job.id} className="bg-[#151515] border border-white/5 rounded-2xl p-6 hover:border-blue-500/50 transition-all group relative overflow-hidden">
                            {/* 状态标签 */}
                            {job.status === 'urgent' && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                                    <Zap size={10} fill="currentColor"/> 急需
                                </div>
                            )}
                            {job.status === 'closed' && (
                                <div className="absolute top-0 right-0 bg-gray-700 text-gray-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                                    已结束
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                        {job.title}
                                        {job.status === 'open' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1"><Briefcase size={14}/> {job.company}</span>
                                        <span className="flex items-center gap-1"><Clock size={14}/> {job.deadline}</span>
                                        <span className="flex items-center gap-1"><Users size={14}/> {job.applicants} 人已投递</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-400 flex items-center justify-end gap-1">
                                        {job.budget}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">预算范围</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                                <div className="flex gap-2">
                                    {job.tags && job.tags.map((tag: string, i: number) => (
                                        <span key={i} className="bg-white/5 border border-white/10 text-gray-300 text-xs px-3 py-1 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <button className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${
                                    job.status === 'closed' 
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                    : 'bg-white text-black hover:bg-gray-200'
                                }`}>
                                    {job.status === 'closed' ? '停止招募' : '立即沟通'}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 text-gray-500 bg-[#151515] rounded-2xl border border-dashed border-white/5">
                        <Briefcase size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>暂无相关需求</p>
                    </div>
                )}
            </div>

        </div>
      </main>
    </div>
  );
}
