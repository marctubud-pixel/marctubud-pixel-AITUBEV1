'use client';

import React, { useState, useEffect, use } from 'react';
import { ArrowLeft, Heart, Share2, Play, Copy, MessageSquare, Send, Eye, Download, Lock, PenTool, FileText, ChevronDown, ChevronUp, X, ThumbsUp, Flame, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function VideoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [video, setVideo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [showToolInfo, setShowToolInfo] = useState(false);
  const [showPromptInfo, setShowPromptInfo] = useState(false);

  // 👇 诊断状态：记录每一步的操作
  const [debugSteps, setDebugSteps] = useState<string[]>([]);
  const addStep = (msg: string) => setDebugSteps(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  useEffect(() => {
    async function getUserData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) setUserProfile(data);
      }
    }
    getUserData();
  }, []);

  useEffect(() => {
    if (!id) {
        addStep("ID 不存在，停止加载");
        return;
    }
    fetchData();
    fetchComments();
    setLikeCount(Math.floor(Math.random() * 500) + 10);
  }, [id]);

  async function fetchData() {
    try {
      addStep(`开始加载，视频ID: ${id}`);
      
      // 检查 Supabase 客户端配置
      // @ts-ignore
      const supabaseUrl = supabase['supabaseUrl'] || 'Unknown URL';
      addStep(`Supabase URL: ${supabaseUrl}`);

      addStep("正在请求 videos 表...");
      const { data: videoData, error } = await supabase.from('videos').select('*').eq('id', id).single();
      
      if (error) {
        addStep(`❌ 数据库报错: ${error.message}`);
        console.error(error);
        return;
      }

      if (!videoData) {
        addStep("❌ 数据库返回成功，但数据为空 (videoData is null)");
        return;
      }

      addStep("✅ 成功获取视频数据！");
      setVideo(videoData);

      if (videoData.category) {
        addStep("正在获取推荐视频...");
        const { data: related } = await supabase.from('videos').select('*').eq('category', videoData.category).neq('id', id).limit(4);
        if (related) setRelatedVideos(related);
      }

      addStep("正在检查 Session...");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        addStep("用户已登录，检查收藏状态...");
        const { data: favData } = await supabase.from('favorites').select('*').eq('video_id', id).eq('user_id', session.user.id).single();
        if (favData) setIsFavorited(true);
      } else {
        addStep("用户未登录 (Session is null)");
      }
      
      addStep("全部流程完成");

    } catch (err: any) {
      addStep(`❌ 发生崩溃性错误: ${err.message}`);
    }
  }

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('video_id', id)
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  }

  // 省略中间的处理函数，逻辑不变...
  const handleDownloadStoryboard = async () => {}; // 占位，实际运行时用你原来的逻辑
  const handlePostComment = async () => {}; 
  const handleToggleFavorite = async () => {};
  const handleCopyPrompt = (e: React.MouseEvent) => {};
  const handleDeleteVideo = async () => {};
  const handleLike = () => { if (isLiked) { setLikeCount(prev => prev - 1); setIsLiked(false); } else { setLikeCount(prev => prev + 1); setIsLiked(true); }};
  const handleShare = () => { navigator.clipboard.writeText(window.location.href).then(() => alert('链接已复制！')); };

  const popularity = (likeCount * 5) + (comments.length * 10) + 100;

  // 👇 如果没有视频数据，显示详细的加载日志
  if (!video) return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-8 gap-6">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      <h2 className="text-xl font-bold">加载中...</h2>
      
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-xs text-gray-300">
        <h3 className="text-white font-bold mb-2 border-b border-gray-700 pb-2">诊断日志 (实时):</h3>
        {debugSteps.length === 0 ? (
           <p className="text-gray-500">正在等待 useEffect 触发...</p>
        ) : (
           debugSteps.map((step, index) => (
             <div key={index} className="mb-1 border-l-2 border-purple-500/50 pl-2">
               {step}
             </div>
           ))
        )}
      </div>
      
      <div className="text-gray-500 text-xs mt-4">
        如果一直卡在这里，请截图发给技术支持。
      </div>
      <Link href="/" className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 transition">返回首页</Link>
    </div>
  );

  // 👇 正常渲染界面 (和之前一样)
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span>返回</span>
        </Link>
        <div className="w-8"></div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-white/5 shadow-2xl">
            {video.video_url ? (
              video.video_url.includes('player.bilibili.com') ? (
                <iframe
                  src={video.video_url}
                  className="w-full h-full"
                  scrolling="no"
                  // @ts-ignore
                  border="0"
                  frameBorder="no"
                  framespacing="0"
                  allowFullScreen={true}
                  referrerPolicy="no-referrer"
                ></iframe>
              ) : (
                <video
                  src={video.video_url}
                  poster={video.thumbnail_url}
                  controls
                  className="w-full h-full object-contain"
                  playsInline
                />
              )
            ) : video.thumbnail_url ? (
              <img src={video.thumbnail_url} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <Play size={64} className="text-gray-700" />
            )}
          </div>
           {/* Debug info */}
           <div className="text-[10px] text-gray-700 font-mono bg-black/50 p-1 rounded">Debug ID: {video.id} | URL: {video.video_url?.slice(0,30)}...</div>

          {/* 下面的内容保持不变，为了排版我简化显示，你保留之前的即可 */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
               <h1 className="text-2xl font-bold text-white leading-tight">{video.title}</h1>
               <p className="text-gray-400 text-sm mt-2">@{video.author}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

