'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, Clock, Calendar, Share2, Star, ThumbsUp, BookOpen, ExternalLink, TrendingUp, Sparkles, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 定义文章接口
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

// 定义视频接口
interface Video {
  id: string;
  video_url: string;
  thumbnail_url: string;
}

// 推荐文章接口
interface Recommendation {
  id: string;
  title: string;
  created_at: string;
  image_url?: string;
  tags: string | string[] | null;
  duration?: string;
  author?: string;
}

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [article, setArticle] = useState<Article | null>(null);
  const [linkedVideo, setLinkedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  // 侧边栏推荐数据
  const [recommends, setRecommends] = useState<Recommendation[]>([]);
  // AI 总结状态
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

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

  // 获取推荐数据
  async function fetchRecommends() {
    const { data } = await supabase
      .from('articles')
      .select('id, title, created_at, image_url, tags, duration, author')
      .neq('id', id)
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

  // 🏷️ 智能标签解析函数
  const parseTags = (tags: any) => {
    if (!tags) return [];
    let parsed: any[] = [];

    if (Array.isArray(tags)) {
      parsed = tags;
    } else if (typeof tags === 'string') {
      try {
        const json = JSON.parse(tags);
        if (Array.isArray(json)) parsed = json;
        else parsed = tags.split(/[,，]/);
      } catch (e) {
        parsed = tags.split(/[,，]/);
      }
    }

    return parsed
      .map(t => typeof t === 'string' ? t.replace(/[\[\]"'\\]/g, '').trim() : '')
      .filter(Boolean);
  };

  // 资讯和访谈不显示难度
  const shouldShowDifficulty = (cat: string) => {
      return !['商业访谈', '行业资讯'].includes(cat);
  };

  const handleSummarize = async () => {
    if (!article?.content) return;
    setIsSummarizing(true);
    setTimeout(() => {
      setAiSummary("这里是AI帮您总结的文章核心内容：\n\n这篇文章深入探讨了AI漫剧行业的最新趋势，分析了女频化内容的主导地位、'抽卡师'模式的兴起以及全面出海的战略机遇。文章还详细介绍了各大平台如快手、爱奇艺、B站和抖音在推动MCN模式发展方面的政策和激励措施，旨在帮助创作者抓住AI影像时代的红利。");
      setIsSummarizing(false);
    }, 1500);
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

      <main className="max-w-7xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-4 gap-12">

        {/* 左侧主要内容区 */}
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

                        {/* 顶部标签 */}
                        {parseTags(article.tags).map((tag: string, i: number) => (
                            <span key={i} className="bg-white/5 text-gray-400 px-2 py-0.5 rounded text-[10px] font-medium border border-white/5 flex items-center gap-1">
                                # {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </header>

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

        {/* 👉 右侧侧边栏 (Sidebar) */}
        <aside className="lg:col-span-1 space-y-8 hidden lg:block">

            {/* 1. AI 创作小助手 (极简版) */}
            <div className="bg-[#151515] rounded-xl p-5 border border-white/5 sticky top-24">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-gray-400"/> AI 创作小助手
                </h3>
                <div className="space-y-4">
                    {!aiSummary ? (
                        <button
                            onClick={handleSummarize}
                            disabled={isSummarizing}
                            className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-purple-500/30"
                        >
                            {isSummarizing ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    正在总结...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} className="text-purple-400"/> 帮我总结
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-xs text-gray-300 leading-relaxed animate-in fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-400">文章摘要</span>
                                <button onClick={() => setAiSummary('')} className="text-gray-500 hover:text-white">重置</button>
                            </div>
                            <ReactMarkdown className="prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-p:my-1">
                                {aiSummary}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. 相关推荐 (无封面版) */}
            <div className="bg-[#151515] rounded-xl p-5 border border-white/5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-gray-400"/> 相关推荐
                </h3>
                <div className="space-y-6">
                    {recommends.length > 0 ? recommends.map((item) => {
                        return (
                            <Link href={`/academy/${item.id}`} key={item.id} className="group block">
                                {/* 纯文字标题 */}
                                <h4 className="text-sm font-medium text-gray-300 group-hover:text-purple-400 transition-colors line-clamp-2 leading-relaxed mb-2">
                                    {item.title}
                                </h4>
                                {/* ✅ 底部信息：改为极简作者名 + 时间 */}
                                <div className="flex items-center justify-between mt-1">
                                    {/* 作者名 - 极简模式 */}
                                    <span className="text-[10px] text-gray-500 font-medium">
                                        {item.author || 'AI.Tube'}
                                    </span>
                                    
                                    <span className="text-[10px] text-gray-600 flex items-center gap-1 font-mono flex-shrink-0">
                                        <Clock size={10}/> {item.duration || '5m'}
                                    </span>
                                </div>
                            </Link>
                        );
                    }) : (
                        <div className="text-xs text-gray-600 text-center py-4">暂无推荐</div>
                    )}
                </div>
            </div>

        </aside>

      </main>
    </div>
  );
}