'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
// ⚠️ 如果你的 supabase 客户端文件路径不一样，请修改这里，比如 '../lib/supabaseClient'
import { supabase } from '../../lib/supabaseClient'; 
import { ArrowLeft, Clock, Calendar, Share2, Star, ThumbsUp, Tag, ExternalLink, Lock } from 'lucide-react';
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
  author_name: string;
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

  useEffect(() => {
    fetchArticle();
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

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p>正在加载课程内容...</p>
    </div>
  );
  
  if (!article) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">文章不存在</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-purple-500/30">
      <div className="fixed top-0 left-0 w-full h-1 bg-white/10 z-50">
        <div className="h-full bg-purple-600 w-1/3"></div>
      </div>

      <nav className="flex items-center justify-between px-6 py-6 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-40">
        <Link href="/academy" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
          <span className="font-bold">返回学院</span>
        </Link>
        <div className="flex gap-4">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Share2 size={20}/></button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Star size={20}/></button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 md:p-10">
        <header className="mb-10 border-b border-white/5 pb-10">
            <div className="flex flex-wrap gap-3 mb-6">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-purple-900/40">
                    {article.category}
                </span>
                {article.difficulty && (
                    <span className={`bg-white/10 px-3 py-1 rounded-full text-xs font-bold border border-white/10 ${
                        article.difficulty === '入门' ? 'text-green-400 border-green-500/30' : 
                        article.difficulty === '进阶' ? 'text-yellow-400 border-yellow-500/30' : 'text-gray-300'
                    }`}>
                        {article.difficulty}
                    </span>
                )}
                {article.is_vip && (
                    <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Lock size={12}/> VIP 专享
                    </span>
                )}
                {parseTags(article.tags).map((tag: string, i: number) => (
                    <span key={i} className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Tag size={12}/> {tag}
                    </span>
                ))}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {article.author_name?.[0] || 'A'}
                    </div>
                    <span className="text-gray-300">{article.author_name || 'AI.Tube'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar size={14}/> {new Date(article.created_at).toLocaleDateString('zh-CN')}
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={14}/> {article.duration || '10 min'} 阅读
                </div>
            </div>
        </header>

        <div className="w-full rounded-2xl overflow-hidden mb-10 border border-white/10 bg-gray-900 shadow-2xl">
            {linkedVideo ? (
                <div className="aspect-video w-full relative group">
                    {linkedVideo.video_url?.includes('bilibili') ? (
                        <iframe 
                            src={getBilibiliEmbed(linkedVideo.video_url || '')} 
                            className="w-full h-full" 
                            frameBorder="0" 
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
                    <img src={article.image_url || "/api/placeholder/800/400"} className="w-full h-full object-cover" alt={article.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent opacity-60"></div>
                </div>
            )}
        </div>

        <article className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-purple-400 prose-code:text-purple-300 prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
            {article.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {article.content}
                </ReactMarkdown>
            ) : (
                <div className="space-y-6 text-gray-300">
                    <p>内容加载中...</p>
                </div>
            )}
        </article>

        {article.link_url && (
            <div className="mt-12 p-6 bg-[#151515] border border-white/10 rounded-xl flex flex-col md:flex-row items-center justify-between group hover:border-purple-500/50 transition-all gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                        <ExternalLink size={24}/>
                    </div>
                    <div>
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors">外部资源链接</div>
                        <div className="text-sm text-gray-500">点击访问原始文档或下载资源</div>
                    </div>
                </div>
                <a href={article.link_url} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto text-center bg-white text-black px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                    立即访问 <ExternalLink size={16}/>
                </a>
            </div>
        )}

        <div className="mt-20 pt-10 border-t border-white/5 flex justify-center">
            <button className="flex flex-col items-center gap-2 group">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                    <ThumbsUp size={28} />
                </div>
                <span className="text-sm text-gray-500 group-hover:text-white transition-colors">很有帮助</span>
            </button>
        </div>

      </main>
    </div>
  );
}
