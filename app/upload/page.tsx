'use client';

import React, { useState } from 'react';
// ⚠️ 注意这里：是 ../ 不是 ../../
import { supabase } from '../lib/supabaseClient'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [bilibiliLink, setBilibiliLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);

  // 1. 抓取 B 站信息
  const handleFetchInfo = async () => {
    if (!bilibiliLink) return alert('请填入链接');
    const match = bilibiliLink.match(/(BV\w+)/);
    const bvid = match ? match[1] : null;
    if (!bvid) return alert('无效 BV 号');

    setLoading(true);
    try {
      const res = await fetch(`/api/fetch-bilibili?bvid=${bvid}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVideoInfo(data); // 暂存抓取到的信息
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. 确认并发布
  const handlePublish = async () => {
    if (!videoInfo) return;
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('请先登录');
        router.push('/login');
        return;
    }

    // 构造写入数据
    const payload = {
        title: videoInfo.title,
        author: videoInfo.author, // 这里存的是 B 站作者名
        video_url: videoInfo.video_url,
        thumbnail_url: videoInfo.thumbnail_url,
        description: videoInfo.description,
        views: videoInfo.views || 0,
        tag: videoInfo.tag,
        duration: videoInfo.duration,
        category: '创意短片', // 默认分类，或者你可以加个下拉框让用户选
        created_at: new Date().toISOString(),
        // 关键：把当前登录用户的邮箱前缀作为 owner，方便在个人中心筛选
        // 注意：这里我们借用 author 字段存 B 站UP主，但在个人中心筛选时可能需要增加一个字段 user_id 来关联
        // 为了简单起见，我们目前逻辑是：如果是用户上传的，我们在 author 字段存 "B站UP主"，
        // 但我们需要另一个字段来标记这是谁上传的。
        // *修正方案*：根据我们之前的个人中心代码，我们是查 `author` 字段等于 `email前缀`。
        // 所以为了让作品出现在你的个人中心，我们需要把 `author` 设为你的名字。
        // 但这样会丢失 B 站原作者名。
        // 建议：暂时先把 author 设为你的用户名，把 B 站原作者写在简介里。
        author: session.user.email?.split('@')[0] 
    };

    const { error } = await supabase.from('videos').insert([payload]);

    if (!error) {
        alert('发布成功！');
        router.push('/profile'); // 发布完跳回个人中心
    } else {
        alert('发布失败: ' + error.message);
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans p-6">
      <nav className="mb-8">
        <Link href="/profile" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span>返回个人中心</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Upload className="text-purple-500"/> 发布新作品
        </h1>

        {/* 第一步：输入链接 */}
        <div className="space-y-4 mb-8">
            <label className="text-sm text-gray-400">Bilibili 视频链接</label>
            <div className="flex gap-2">
                <input 
                    value={bilibiliLink}
                    onChange={(e) => setBilibiliLink(e.target.value)}
                    placeholder="粘贴 https://www.bilibili.com/video/BV..."
                    className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-3 focus:border-purple-500 outline-none transition-colors"
                />
                <button 
                    onClick={handleFetchInfo}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-500 px-6 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <LinkIcon size={18}/>}
                    抓取
                </button>
            </div>
        </div>

        {/* 第二步：预览并发布 */}
        {videoInfo && (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 border-t border-white/10 pt-6">
                <div className="flex gap-4">
                    <img src={videoInfo.thumbnail_url} className="w-32 h-20 object-cover rounded-lg bg-gray-800"/>
                    <div>
                        <h3 className="font-bold line-clamp-1">{videoInfo.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">原作者: {videoInfo.author}</p>
                        <p className="text-xs text-gray-500">标签: {videoInfo.tag}</p>
                    </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-xs text-yellow-500">
                    ⚠️ 注意：发布后，作者名将显示为您当前登录的用户名，以便在个人中心管理。
                </div>

                <button 
                    onClick={handlePublish}
                    disabled={uploading}
                    className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="animate-spin"/> : <Upload size={18}/>}
                    确认发布
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
