'use client';

import React, { useState, useEffect, use } from 'react';
import { ArrowLeft, Heart, Share2, Play, Copy, MessageSquare, Send, Eye, Download, Lock, PenTool, FileText, BookOpen, ThumbsUp, Flame, Lightbulb, X, Check } from 'lucide-react';
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
  
  // 📋 复制状态反馈
  const [copied, setCopied] = useState(false);

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
    if (!id) return;
    fetchData();
    fetchComments();
  }, [id]);

  async function fetchData() {
    const { data: videoData } = await supabase.from('videos').select('*').eq('id', id).single();
    if (videoData) {
      setVideo(videoData);
      setLikeCount(videoData.likes || Math.floor(Math.random() * 500));
      
      if (videoData.category) {
        const { data: related } = await supabase.from('videos').select('*').eq('category', videoData.category).neq('id', id).limit(4);
        if (related) setRelatedVideos(related);
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: favData } = await supabase.from('favorites').select('*').eq('video_id', id).eq('user_id', session.user.id).single();
      if (favData) setIsFavorited(true);
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

  const formatViews = (num: number) => {
    if (!num) return '0';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num;
  };

  const popularity = ((video?.views || 0) * 1) + (likeCount * 5) + (comments.length * 10);

  const handleDownloadStoryboard = async () => {
    if (!user) return alert('请先登录后下载！');
    if (!userProfile) return alert('用户信息加载中...');
    if (!video.is_vip) {
      if (userProfile.free_quota > 0) {
        if (confirm(`这是免费资源，将消耗 1 次新人免费机会。\n剩余机会：${userProfile.free_quota} 次`)) {
          const newQuota = userProfile.free_quota - 1;
          const { error } = await supabase.from('profiles').update({ free_quota: newQuota }).eq('id', user.id);
          if (error) return alert(error.message);
          
          setUserProfile({ ...userProfile, free_quota: newQuota });
          await supabase.from('downloads').insert([{ user_id: user.id, video_id: video.id, cost: 0 }]);
          window.open(video.storyboard_url, '_blank');
        }
      } else { alert('您的免费机会已用完！'); }
      return;
    }
    const price = video.price || 10;
    if (userProfile.points >= price) {
      if (confirm(`下载此分镜将消耗 ${price} 积分。\n当前积分：${userProfile.points}`)) {
        const newPoints = userProfile.points - price;
        const { error } = await supabase.from('profiles').update({ points: newPoints }).eq('id', user.id);
        if (error) return alert(error.message);

        setUserProfile({ ...userProfile, points: newPoints });
        await supabase.from('downloads').insert([{ user_id: user.id, video_id: video.id, cost: price }]);
        window.open(video.storyboard_url, '_blank');
      }
    } else { alert(`积分不足！需要 ${price} 积分。`); }
  };

  const handlePostComment = async () => {
    if (!user) return alert('请先登录');
    if (!newComment.trim()) return;
    setCommentLoading(true);
    const { error } = await supabase.from('comments').insert([{ content: newComment, video_id: id, user_id: user.id, user_email: user.email }]);
    if (!error) { setNewComment(''); fetchComments(); }
    setCommentLoading(false);
  };

  const handleToggleFavorite = async () => {
    if (!user) return alert('请先登录');
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('video_id', id).eq('user_id', user.id);
      setIsFavorited(false);
    } else {
      await supabase.from('favorites').insert([{ video_id: id, user_id: user.id }]);
      setIsFavorited(true);
    }
  };

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!video?.prompt) return;
    navigator.clipboard.writeText(video.prompt).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDeleteVideo = async () => {
    if (!confirm('确定删除？')) return;
    await supabase.from('videos').delete().eq('id', id);
    window.location.href = '/';
  };

  const handleLike = () => {
    if (isLiked) { setLikeCount(prev => prev - 1); setIsLiked(false); }
    else { setLikeCount(prev => prev + 1); setIsLiked(true); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => alert('链接已复制，快去分享吧！'));
  };

  if (!video) return <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">加载中...</div>;

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
                <iframe src={video.video_url} className="w-full h-full" scrolling="no" allowFullScreen={true} referrerPolicy="no-referrer"></iframe>
              ) : (
                <video src={video.video_url} poster={video.thumbnail_url} controls className="w-full h-full object-contain" playsInline />
              )
            ) : video.thumbnail_url ? (
              <img src={video.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-50" />
            ) : (
              <Play size={64} className="text-gray-700" />
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-2">
                {video.category && <span className="flex-shrink-0 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded mt-1 shadow-lg shadow-purple-900/30">{video.category}</span>}
                <h1 className="text-2xl font-bold text-white leading-tight">{video.title}</h1>
              </div>
              
              {/* 🕒 这里删除了时长显示，只保留作者、播放量、人气 */}
              <div className="flex items-center gap-6 text-sm text-gray-400 pl-1 mt-3 font-mono">
                <span className="text-gray-300 font-bold font-sans">@{video.author}</span>
                <div className="flex items-center gap-1.5 opacity-80"><Eye size={14} /> {formatViews(video.views)} 播放</div>
                <div className="flex items-center gap-1.5 opacity-80"><Flame size={14} /> {formatViews(popularity)} 人气</div>
              </div>

            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isLiked ? 'bg-purple-600/20 text-purple-400' : 'bg-[#1A1A1A] text-gray-400 hover:bg-white/10 hover:text-white'}`}><ThumbsUp size={16} fill={isLiked ? "currentColor" : "none"} /><span>{formatViews(likeCount)}</span></button>
              <button onClick={handleToggleFavorite} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isFavorited ? 'bg-purple-600/20 text-purple-400' : 'bg-[#1A1A1A] text-gray-400 hover:bg-white/10 hover:text-white'}`}><Heart size={16} fill={isFavorited ? "currentColor" : "none"} /><span>收藏</span></button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#1A1A1A] text-gray-400 hover:bg-white/10 hover:text-white transition-all"><Share2 size={16} /><span>分享</span></button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pb-6 border-b border-white/5 items-center">
            {video.storyboard_url && (
              <button onClick={handleDownloadStoryboard} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-900/20">
                {video.is_vip ? <Lock size={14} /> : <Download size={14} />}
                {video.is_vip ? `下载分镜 (${video.price || 10}积分)` : '免费下载分镜'}
              </button>
            )}
            <div className="h-6 w-px bg-white/10 mx-2"></div>
            <button onClick={() => { setShowToolInfo(!showToolInfo); setShowPromptInfo(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${showToolInfo ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}><PenTool size={14} /> 查看工具</button>
            <button onClick={() => { setShowPromptInfo(!showPromptInfo); setShowToolInfo(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${showPromptInfo ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}><FileText size={14} /> 查看提示词</button>
            
            {video.tutorial_url && (
              <Link 
                href={video.tutorial_url} 
                target={video.tutorial_url.startsWith('/') ? '_self' : '_blank'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-white/10 text-gray-400 hover:border-white/30 hover:text-white transition-all"
              >
                <BookOpen size={14} /> 查看教程
              </Link>
            )}

            {user && video.author === user.email.split('@')[0] && (
              <button onClick={handleDeleteVideo} className="ml-auto text-xs text-red-500 hover:text-red-400 px-3 py-2">删除作品</button>
            )}
          </div>

          {showToolInfo && (
            <div className="bg-[#151515] rounded-xl p-6 border border-white/10 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex justify-between items-start mb-2"><h3 className="text-sm font-bold text-gray-300">使用工具</h3><button onClick={() => setShowToolInfo(false)}><X size={14} className="text-gray-500 hover:text-white" /></button></div>
              <div className="text-sm text-gray-400">{video.tag ? (<div className="flex items-center gap-2"><span className="px-3 py-1 bg-white/5 rounded-md text-white border border-white/10">{video.tag}</span></div>) : "暂无工具信息"}</div>
            </div>
          )}

          {showPromptInfo && (
            <div className="bg-[#151515] rounded-xl p-6 border border-white/10 animate-in slide-in-from-top-2 fade-in duration-200 relative group">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-300">提示词 (Prompt)</h3>
                  <div className="flex gap-2 items-center">
                    {/* 📋 极简风格的复制按钮 */}
                    {video.prompt && (
                        <button 
                            onClick={handleCopyPrompt} 
                            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                            title="复制提示词"
                        >
                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    )}
                    <button onClick={() => setShowPromptInfo(false)} className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"><X size={16} /></button>
                  </div>
              </div>
              <div className="text-sm text-gray-400 font-mono leading-relaxed bg-[#0A0A0A] p-4 rounded-lg border border-white/5 break-words selection:bg-purple-900 selection:text-white">
                {video.prompt || "作者未填写提示词"}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-200"><MessageSquare size={18} /> 评论 ({comments.length})</h3>
            <div className="flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-white/5 overflow-hidden border border-white/10">
                {userProfile?.avatar_url ? (<img src={userProfile.avatar_url} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{user ? user.email?.[0].toUpperCase() : '?'}</div>)}
              </div>
              <div className="flex-1 relative">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={user ? "发表你的观点..." : "请先登录参与讨论"} disabled={!user} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 min-h-[100px] text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none text-gray-300" />
                <button onClick={handlePostComment} disabled={!user || !newComment.trim() || commentLoading} className="absolute bottom-3 right-3 bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2">{commentLoading ? '...' : <><Send size={12} /> 发布</>}</button>
              </div>
            </div>
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center">
                    {/* @ts-ignore */}
                    {comment.profiles?.avatar_url ? (<img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />) : (<span className="text-xs text-gray-500 font-bold">{comment.user_email?.[0].toUpperCase()}</span>)}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-300">{/* @ts-ignore */}{comment.profiles?.username || comment.user_email?.split('@')[0]}</span>
                      <span className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-400">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-fit space-y-6">
          <div className="bg-white/5 rounded-xl border border-white/5 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-200 flex items-center gap-2"><Lightbulb size={18} className="text-gray-400" /> 猜你喜欢</h3>
            <div className="space-y-4">
              {relatedVideos.length > 0 ? relatedVideos.map((item) => (
                <Link href={`/video/${item.id}`} key={item.id} className="group flex gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors border-b border-white/5 pb-4 mb-2 last:border-0 last:mb-0 last:pb-0">
                  <div className="w-24 h-16 bg-gray-900 rounded overflow-hidden flex-shrink-0 relative">
                    {item.thumbnail_url ? (<img src={item.thumbnail_url} referrerPolicy="no-referrer" className="w-full h-full object-cover" />) : (<Play className="text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={20} />)}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div><h4 className="font-bold text-gray-300 text-xs truncate mb-1 group-hover:text-purple-400 transition-colors">{item.title}</h4><p className="text-[10px] text-gray-500">@{item.author}</p></div>
                    {item.category && (<span className="text-[10px] text-gray-600">{item.category}</span>)}
                  </div>
                </Link>
              )) : (<div className="text-gray-500 text-xs text-center py-4">暂无相关推荐</div>)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
