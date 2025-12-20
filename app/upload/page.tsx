'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Link as LinkIcon, FileText, Layers, Image as ImageIcon, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    thumbnail_url: '',
    tag: 'Sora',
    category: '动画短片',
    prompt: '',
    storyboard_url: '' // 👈 改名：这里填下载链接
  });

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('请先登录再投稿！');
        router.push('/login');
      } else {
        setUser(session.user);
      }
    }
    checkUser();
  }, []);

  const handleSubmit = async () => {
    if (!formData.title || !formData.video_url) {
      alert('标题和视频链接是必填的！');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('videos').insert([{
      title: formData.title,
      video_url: formData.video_url,
      thumbnail_url: formData.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      tag: formData.tag,
      category: formData.category,
      prompt: formData.prompt,
      storyboard_url: formData.storyboard_url, // 存入 storyboard_url 字段
      author: user.email.split('@')[0],
      views: 0
    }]);

    if (error) {
      alert('发布失败: ' + error.message);
    } else {
      // 加分逻辑
      try {
        const { data: profile } = await supabase.from('profiles').select('points').eq('id', user.id).single();
        if (profile) {
          const newPoints = (profile.points || 0) + 50;
          await supabase.from('profiles').update({ points: newPoints }).eq('id', user.id);
          alert(`发布成功！系统奖励您 50 积分已到账！🎉`);
        } else {
          alert('发布成功！');
        }
      } catch (err) { console.error(err); }

      router.push('/');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-6 selection:bg-purple-500/30">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <Link href="/" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-100">发布新作品</h1>
        </div>

        <div className="space-y-6">
          {/* 1. 必填信息 */}
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-300">作品标题 *</label>
            <input 
              type="text" 
              className="w-full bg-[#121212] border border-white/10 rounded-xl p-4 focus:border-purple-500/50 focus:outline-none text-gray-200 transition-colors"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-300">
                <LinkIcon size={16} /> B站视频链接 *
              </label>
              <input 
                type="text" 
                className="w-full bg-[#121212] border border-white/10 rounded-xl p-4 focus:border-purple-500/50 focus:outline-none text-sm text-gray-200 transition-colors"
                value={formData.video_url}
                onChange={e => setFormData({...formData, video_url: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-300">
                <ImageIcon size={16} /> 封面图链接
              </label>
              <input 
                type="text" 
                className="w-full bg-[#121212] border border-white/10 rounded-xl p-4 focus:border-purple-500/50 focus:outline-none text-sm text-gray-200 transition-colors"
                placeholder="https://..."
                value={formData.thumbnail_url}
                onChange={e => setFormData({...formData, thumbnail_url: e.target.value})}
              />
            </div>
          </div>

          {/* 2. 选择标签 */}
          <div className="bg-white/5 p-6 rounded-xl border border-white/10 space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-300">使用工具 (Tool)</label>
              <div className="flex gap-2 flex-wrap">
                {["Sora", "Runway", "Pika", "Midjourney", "Kling", "Luma", "ComfyUI"].map(t => (
                  <button
                    key={t}
                    onClick={() => setFormData({...formData, tag: t})}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      formData.tag === t
                      ? 'bg-purple-600 text-white border-purple-600 font-bold' 
                      : 'bg-[#121212] text-gray-400 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 text-gray-300">内容分类 (Category)</label>
              <div className="flex gap-2 flex-wrap">
                {["动画短片", "音乐MV", "写实短片", "创意短片", "AI教程", "创意广告"].map(c => (
                  <button
                    key={c}
                    onClick={() => setFormData({...formData, category: c})}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      formData.category === c
                      ? 'bg-purple-600 text-white border-purple-600 font-bold' 
                      : 'bg-[#121212] text-gray-400 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. 会员资源 (分镜下载链) */}
          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-300">
              <Download size={16} /> 分镜文件下载链接 <span className="text-xs text-gray-500 font-normal">(供会员下载)</span>
            </label>
            <input 
              type="text" 
              className="w-full bg-[#121212] border border-white/10 rounded-xl p-4 focus:border-purple-500/50 focus:outline-none text-sm text-gray-200 transition-colors"
              placeholder="https://pan.quark.cn/..."
              value={formData.storyboard_url}
              onChange={e => setFormData({...formData, storyboard_url: e.target.value})}
            />
          </div>

          {/* 4. 提示词 (放在最后，选填) */}
          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-gray-300">
              <FileText size={16} /> 提示词 (Prompt) <span className="text-xs text-gray-500 font-normal">(选填)</span>
            </label>
            <textarea 
              className="w-full bg-[#121212] border border-white/10 rounded-xl p-4 min-h-[120px] focus:border-purple-500/50 focus:outline-none text-sm text-gray-200 transition-colors"
              placeholder="在这里分享你的 Prompt..."
              value={formData.prompt}
              onChange={e => setFormData({...formData, prompt: e.target.value})}
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
          >
            {loading ? '发布中...' : <><Upload size={20} /> 立即发布作品</>}
          </button>
        </div>
      </div>
    </div>
  );
}
