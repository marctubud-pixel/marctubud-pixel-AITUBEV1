'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient'; 
import { Video, FileText, Image as ImageIcon, Plus, Trash2, LogOut, ExternalLink, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'videos' | 'articles' | 'banners' | 'jobs'>('videos'); // 增加了 jobs
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 新增数据的表单状态
  const [newItem, setNewItem] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);

  // 1. 安全检查
  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (isAuth !== 'true') {
        router.push('/admin/login');
    } else {
        fetchData(activeTab);
    }
  }, [activeTab]);

  // 2. 退出登录
  const handleLogout = () => {
      localStorage.removeItem('admin_auth');
      router.push('/admin/login');
  };

  // 3. 拉取数据
  async function fetchData(table: string) {
    setLoading(true);
    // 这里做个简单映射，因为 Tab 名字可能跟表名不完全一样，但目前我们保持一致
    const { data: result, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
    
    if (result) setData(result);
    setLoading(false);
  }

  // 4. 删除数据
  async function handleDelete(id: number) {
      if (!confirm('确定要删除这条数据吗？此操作不可恢复。')) return;
      
      const { error } = await supabase.from(activeTab).delete().eq('id', id);
      if (!error) {
          setData(prev => prev.filter(item => item.id !== id));
      } else {
          alert('删除失败: ' + error.message);
      }
  }

  // 5. 新增数据
  async function handleAdd() {
      setIsAdding(true);
      let payload = {};
      
      // 根据不同的 Tab 组装不同的数据
      if (activeTab === 'videos') {
          payload = {
              title: newItem.title || '新视频',
              author: newItem.author || 'Admin',
              video_url: newItem.url,
              category: newItem.category || 'Sora',
              views: 0
          };
      } else if (activeTab === 'articles') {
          payload = {
              title: newItem.title || '新文章',
              category: newItem.category || 'Sora',
              image_url: newItem.image_url || 'https://via.placeholder.com/800x400',
              description: newItem.desc || '暂无简介',
              difficulty: '入门',
              duration: '10 min'
          };
      } else if (activeTab === 'banners') {
          payload = {
              title: newItem.title || 'Banner',
              image_url: newItem.url,
              link_url: newItem.link || '#'
          };
      }

      const { error } = await supabase.from(activeTab).insert(payload);
      
      if (!error) {
          alert('发布成功！');
          setNewItem({}); // 清空表单
          fetchData(activeTab); // 刷新列表
      } else {
          alert('发布失败: ' + error.message);
      }
      setIsAdding(false);
  }

  return (
    <div className="min-h-screen bg-black text-white flex font-sans">
      
      {/* 侧边栏 */}
      <aside className="w-64 bg-[#111] border-r border-white/5 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-white/5">
            <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                AI.Tube 后台
            </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            {[
                { id: 'videos', label: '视频管理', icon: <Video size={18}/> },
                { id: 'articles', label: '学院文章', icon: <FileText size={18}/> },
                { id: 'banners', label: 'Banner 配置', icon: <ImageIcon size={18}/> },
            ].map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === item.id 
                        ? 'bg-white text-black' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {item.icon} {item.label}
                </button>
            ))}
        </nav>

        <div className="p-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-red-500 px-4 py-2 text-sm font-bold hover:bg-red-500/10 rounded-lg transition-colors">
                <LogOut size={16}/> 退出登录
            </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold capitalize">{activeTab === 'videos' ? '视频库' : activeTab === 'articles' ? '文章列表' : '首页轮播图'}</h2>
            <div className="text-gray-500 text-sm">共 {data.length} 条数据</div>
        </div>

        {/* 🚀 快速发布区 */}
        <div className="bg-[#151515] p-6 rounded-2xl border border-white/10 mb-8">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-purple-400"><Plus size={16}/> 快速发布新内容</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input 
                    type="text" 
                    placeholder={activeTab === 'banners' ? "图片 URL" : "标题"} 
                    value={newItem.title || (activeTab === 'banners' ? newItem.url : '')}
                    onChange={e => activeTab === 'banners' ? setNewItem({...newItem, url: e.target.value}) : setNewItem({...newItem, title: e.target.value})}
                    className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none"
                />
                
                {activeTab === 'videos' && (
                    <>
                        <input type="text" placeholder="视频 URL (.mp4)" value={newItem.url || ''} onChange={e => setNewItem({...newItem, url: e.target.value})} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm outline-none"/>
                        <input type="text" placeholder="分类 (Sora/Midjourney...)" value={newItem.category || ''} onChange={e => setNewItem({...newItem, category: e.target.value})} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm outline-none"/>
                    </>
                )}
                
                {activeTab === 'articles' && (
                    <>
                         <input type="text" placeholder="简介/描述" value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm outline-none"/>
                         <input type="text" placeholder="封面图 URL" value={newItem.image_url || ''} onChange={e => setNewItem({...newItem, image_url: e.target.value})} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm outline-none"/>
                    </>
                )}

                {activeTab === 'banners' && (
                    <>
                        <input type="text" placeholder="标题备注" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm outline-none"/>
                        <input type="text" placeholder="跳转链接 (可选)" value={newItem.link || ''} onChange={e => setNewItem({...newItem, link: e.target.value})} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-sm outline-none"/>
                    </>
                )}
            </div>
            <button 
                onClick={handleAdd} 
                disabled={isAdding}
                className="bg-white text-black px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
                {isAdding ? <Loader2 className="animate-spin" size={14}/> : '立即发布'}
            </button>
        </div>

        {/* 📋 数据列表 */}
        {loading ? (
            <div className="text-center py-20 text-gray-500">加载中...</div>
        ) : (
            <div className="bg-[#151515] rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-gray-200 font-bold">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">{activeTab === 'banners' ? '预览' : '标题/内容'}</th>
                            <th className="p-4">信息</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map(item => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-mono text-xs text-gray-600">#{item.id}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {(item.thumbnail_url || item.image_url) && (
                                            <div className="w-16 h-10 bg-gray-800 rounded overflow-hidden">
                                                <img src={item.thumbnail_url || item.image_url} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <span className="font-bold text-white line-clamp-1 max-w-xs">{item.title}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1 text-xs">
                                        {item.category && <span className="bg-white/10 px-2 py-0.5 rounded w-fit">{item.category}</span>}
                                        {item.link_url && <a href={item.link_url} target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">跳转链接 <ExternalLink size={10}/></a>}
                                        <span className="text-gray-600">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && (
                    <div className="text-center py-10 text-gray-600">暂无数据</div>
                )}
            </div>
        )}

      </main>
    </div>
  );
}
