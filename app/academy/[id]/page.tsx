'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient'; 
import { ArrowLeft, Clock, Calendar, Share2, Star, ThumbsUp, BookOpen, ExternalLink, TrendingUp, PlayCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 定义接口
interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty?: '入门' | '进阶' | '专家';
  is_vip: boolean;
  tags: string | string[];
  author: string; 
  created_at: string;
  duration?: string;
  video_id?: string;
  image_url?: string;
  link_url?: string;
}

interface Video {
  id: string;
  video_url: string;
  thumbnail_url: string;
}

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [article, setArticle] = useState<Article | null>(null);
  const [linkedVideo, setLinkedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 侧边栏推荐数据 (模拟或后续从数据库取)
  const [recommends, setRecommends] = useState<any[]>([]);

  useEffect(() => {
    fetchArticle();
    fetchRecommends();
  }, [id]);

  async function fetchArticle() {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
        console.error("Error fetching article:", error);
        setLoading(false);
        return;
    }

    if (data) {
        setArticle(data);
        if (data.video_id) {
            const { data: videoData } = await supabase
                .from('videos')
                .select('*')
                .eq('id', data.video_id)
                .single();
            if (videoData) setLinkedVideo(videoData);
        }
    }
    setLoading(false);
  }

  // 获取右侧推荐位数据 (目前取最新的5篇)
  async function fetchRecommends() {
    const { data } = await supabase
      .from('articles')
      .select('id, title, created_at')
      .neq('id', id) // 排除当前文章
      .limit(5)
      .order('created_at', { ascending: false });
    
    if (data) setRecommends(data);
  }

  // Bilibili 解析器
  const getBilibiliEmbed = (url: string) => {
    if (!url) return undefined;
    const match = url.match(/(?:bvid=|video\/)(BV\w+)/);
    if (match) {
      return `https://player.bilibili.com/player.html?bvid=${match[1]}&high_quality=1&danmaku=0&autoplay=0`;
    }
    return undefined;
  };

  // 标签解析
  const parseTags = (tags: string | string[] | null) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
      return tags.replace(/[\[\]"]/g, '').split(/[,，]/).map(t => t.trim()).filter(Boolean);
    }
    return [];
  };

  const shouldShowDifficulty = (cat: string) => {
      return !['商业访谈', '行业资讯'].includes(cat);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p>正在加载内容...</p>
    </div>
  );
  
  if (!article) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">文章不存在</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <div className="fixed top-0 left-0 w-full h-1 bg-white/10 z-50">
        <div className="h-full bg-purple-600 w-1/3"></div>
      </div>

      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-40">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <Link href="/academy" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/>
            <span className="font-bold text-sm">返回学院</span>
            </Link>
            <div className="flex gap-4">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Share2 size={18}/></button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Star size={18}/></button>
            </div>
        </div>
      </nav>

      {/* 核心布局调整：改为 Grid 双栏布局 */}
      <main className="max-w-7xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-4 gap-12">
        
        {/* 左侧主要内容区 (占 3/4) */}
        <div className="lg:col-span-3 min-w-0">
            <header className="mb-8 border-b border-white/5 pb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-6 leading-snug text-white tracking-tight">
                    {article.title}
                </h1>

                <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-gray-500 font-mono">
                    <div className="flex items-center gap-1 text-gray-400 font-medium">
                    <span>@</span> {article.author || 'AI.Tube'}
                    </div>
                    
                    <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                        <span className="flex items-center gap-1.5"><Calendar size={12}/> {new Date(article.created_at).toLocaleDateString('zh-CN')}</span>
                        <span className="flex items-center gap-1.5"><Clock size={12}/> {article.duration || '10 min'} 阅读</span>
                    </div>

                    <div className="flex flex-wrap gap-2 md:ml-auto">
                        <span className="bg-white/5 text-gray-300 px-2 py-0.5 rounded text-[10px] font-medium border border-white/10 flex items-center gap-1">
                            <BookOpen size={10}/> {article.category}
                        </span>
                        
                        {article.difficulty && shouldShowDifficulty(article.category) && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                article.difficulty === '入门' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                article.difficulty === '进阶' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                                {article.difficulty}
                            </span>
                        )}

                        {parseTags(article.tags).map((tag: string, i: number) => (
                            <span key={i} className="bg-white/5 text-gray-400 px-2 py-0.5 rounded text-[10px] font-medium border border-white/5 flex items-center gap-1">
                                # {tag.replace(/['"]+/g, '')}
                            </span>
                        ))}
                    </div>
                </div>
            </header>

            {/* 封面/视频 */}
            <div className="w-full rounded-xl overflow-hidden mb-8 border border-white/10 bg-gray-900 shadow-xl">
                {linkedVideo ? (
                    <div className="aspect-video w-full relative group">
                        {linkedVideo.video_url?.includes('bilibili') ? (
                            <iframe 
                                src={getBilibiliEmbed(linkedVideo.video_url || '')} 
                                className="w-full h-full" 
                                frameBorder="0" 
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <video 
                                src={linkedVideo.video_url} 
                                controls 
                                className="w-full h-full" 
                                poster={linkedVideo.thumbnail_url}
                            ></video>
                        )}
                    </div>
                ) : (
                    <div className="aspect-[21/9] w-full relative">
                        {/* ⚠️ 核心修复：添加 referrerPolicy="no-referrer" 以解决微信/B站图片 403 问题 */}
                        <img 
                            src={article.image_url || "/api/placeholder/800/400"} 
                            className="w-full h-full object-cover" 
                            alt={article.title}
                            referrerPolicy="no-referrer" 
                        /> 
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent opacity-60"></div>
                    </div>
                )}
            </div>

            {/* 正文 (字体调小为 text-[15px]) */}
            <article className="prose prose-invert max-w-none 
                prose-headings:text-white prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                prose-p:text-[#CCCCCC] prose-p:leading-7 prose-p:mb-5 prose-p:text-[15px]
                prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-white prose-strong:font-bold
                prose-ul:marker:text-gray-500 prose-li:text-[#CCCCCC] prose-li:text-[15px] prose-li:leading-6
                prose-pre:bg-[#151515] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
                prose-code:text-purple-300 prose-code:bg-purple-900/20 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-img:rounded-xl prose-img:border prose-img:border-white/10"
            >
                {article.content ? (
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // ⚠️ 核心修复：让 Markdown 里的图片也支持防盗链加载
                            img: ({node, ...props}) => <img {...props} referrerPolicy="no-referrer" className="rounded-xl border border-white/5" />
                        }}
                    >
                        {article.content}
                    </ReactMarkdown>
                ) : (
                    <div className="space-y-6 text-gray-300">
                        <p>内容加载中...</p>
                    </div>
                )}
            </article>

            <div className="mt-16 pt-10 border-t border-white/5 flex justify-center">
                <button className="flex flex-col items-center gap-2 group">
                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                        <ThumbsUp size={24} />
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-white transition-colors">很有帮助</span>
                </button>
            </div>
        </div>

        {/* 👉 右侧侧边栏 (Sidebar) - 推荐位 (占 1/4) */}
        <aside className="lg:col-span-1 space-y-8 hidden lg:block">
            {/* 1. 推荐板块 */}
            <div className="bg-[#151515] rounded-xl p-5 border border-white/5 sticky top-24">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-purple-500"/> 相关推荐
                </h3>
                <div className="space-y-4">
                    {recommends.length > 0 ? recommends.map((item) => (
                        <Link href={`/academy/${item.id}`} key={item.id} className="group block">
                            <h4 className="text-sm text-gray-300 group-hover:text-purple-400 transition-colors line-clamp-2 leading-relaxed mb-1">
                                {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <Clock size={10}/> {new Date(item.created_at).toLocaleDateString()}
                            </div>
                        </Link>
                    )) : (
                        <div className="text-xs text-gray-600 text-center py-4">暂无推荐</div>
                    )}
                </div>
            </div>

            {/* 2. 占位广告/活动位 */}
            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-5 border border-white/5">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <PlayCircle size={16} className="text-blue-400"/> 创作实战
                </h3>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    看完教程想练手？试试我们的 AI 分镜工具，一键生成电影级画面。
                </p>
                <Link href="/tools" className="block w-full bg-white text-black text-xs font-bold py-2 rounded text-center hover:bg-gray-200 transition-colors">
                    立即尝试
                </Link>
            </div>
        </aside>

      </main>
    </div>
  );
}