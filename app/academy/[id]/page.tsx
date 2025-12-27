'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { 
    ArrowLeft, Clock, Calendar, Share2, Star, ThumbsUp, BookOpen, 
    TrendingUp, Sparkles, Sun, Moon, Layers, GraduationCap, Zap, PlayCircle, Mic, Newspaper
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 类型定义
interface Article {
  id: string; title: string; content: string; category: string;
  difficulty?: string; is_vip: boolean; tags: string | string[];
  author: string; created_at: string; duration?: string;
  video_id?: string; image_url?: string;
}
interface Video { id: string; video_url: string; thumbnail_url: string; }
interface Recommendation {
  id: string; title: string; created_at: string; image_url?: string;
  tags: string | string[] | null; duration?: string; author?: string;
}

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [linkedVideo, setLinkedVideo] = useState<Video | null>(null);
  const [recommends, setRecommends] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // 🌓 阅读模式状态 (默认暗色)
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 📚 分类导航数据
  const categories = [
      { id: '全部', label: '全部内容', icon: <Layers size={18}/> },
      { id: '新手入门', label: '新手入门', icon: <GraduationCap size={18}/> },
      { id: '工具学习', label: '工具学习', icon: <Zap size={18}/> },
      { id: '高阶玩法', label: '高阶玩法', icon: <PlayCircle size={18}/> },
      { id: '干货分享', label: '干货分享', icon: <BookOpen size={18}/> },
      { id: '行业资讯', label: '行业资讯', icon: <Newspaper size={18}/> },
      { id: '商业访谈', label: '商业访谈', icon: <Mic size={18}/> },
  ];

  useEffect(() => { fetchArticle(); fetchRecommends(); }, [id]);

  async function fetchArticle() {
    setLoading(true);
    const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
    if (data) {
        setArticle(data);
        if (data.video_id) {
            const { data: v } = await supabase.from('videos').select('*').eq('id', data.video_id).single();
            if (v) setLinkedVideo(v);
        }
    }
    setLoading(false);
  }

  async function fetchRecommends() {
    const { data } = await supabase.from('articles').select('id, title, created_at, image_url, tags, duration, author').neq('id', id).limit(5).order('created_at', { ascending: false });
    if (data) setRecommends(data);
  }

  const getBilibiliEmbed = (url: string) => {
    const match = url?.match(/(?:bvid=|video\/)(BV\w+)/);
    return match ? `https://player.bilibili.com/player.html?bvid=${match[1]}&high_quality=1&danmaku=0&autoplay=0` : undefined;
  };

  const parseTags = (tags: any) => {
    if (!tags) return [];
    let parsed = Array.isArray(tags) ? tags : [];
    if (typeof tags === 'string') { try { parsed = JSON.parse(tags); } catch { parsed = tags.split(/[,，]/); } }
    return parsed.map((t: string) => t.replace(/[\[\]"'\\]/g, '').trim()).filter(Boolean);
  };

  const handleSummarize = () => {
    if (!article?.content) return;
    setIsSummarizing(true);
    setTimeout(() => {
      setAiSummary("这里是AI帮您总结的文章核心内容：\n\n这篇文章深入探讨了AI漫剧行业的最新趋势，分析了女频化内容的主导地位、'抽卡师'模式的兴起以及全面出海的战略机遇。");
      setIsSummarizing(false);
    }, 1500);
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">加载中...</div>;
  if (!article) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-gray-500">文章不存在</div>;

  // 🎨 动态主题类名
  const bgClass = isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#F9FAFB]';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const cardClass = isDarkMode ? 'bg-[#151515] border-white/5' : 'bg-white border-gray-200 shadow-sm';
  const proseClass = isDarkMode ? 'prose-invert' : 'prose-gray';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-gray-200';

  return (
    <div className={`min-h-screen font-sans selection:bg-purple-500/30 transition-colors duration-300 ${bgClass} ${textClass}`}>
      
      {/* 顶部导航 */}
      <nav className={`sticky top-0 z-40 backdrop-blur-xl border-b px-6 py-4 flex justify-between items-center ${isDarkMode ? 'bg-[#0A0A0A]/90 border-white/5' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center">
            <Link href="/" className={`flex items-center gap-2 text-sm font-bold transition-colors ${subTextClass} hover:${textClass}`}>
                <ArrowLeft size={18}/> 回到首页
            </Link>
            
            <div className="flex gap-3">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-yellow-400' : 'hover:bg-gray-100 text-purple-600'}`}>
                    {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
                </button>
                <button className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}><Share2 size={18}/></button>
                <button className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}><Star size={18}/></button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-12 gap-8">

        {/* 👈 左侧栏：分类导航 (宽度与列表页严格一致: md:w-64) */}
        {/* 这里我们使用 flex 布局的 basis 属性来控制宽度，或者复用 grid col-span-2，但为了像素级对齐，建议改用 flex 布局或保持 col-span-2 (约等于 w-64) */}
        {/* 为了保险，这里我将改为与列表页完全一样的 aside 结构 */}
        <aside className="hidden lg:block col-span-2 sticky top-24 h-fit">
            <h3 className={`text-xl font-bold mb-6 px-4 ${textClass}`}>AI 学院</h3>
            <div className="space-y-1">
                {categories.map(cat => (
                    <Link 
                        href={`/academy?category=${cat.id}`} 
                        key={cat.id} 
                        // ✅ 样式完全对齐列表页：w-full, px-4, py-3, rounded-xl
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                            article.category === cat.id 
                            ? (isDarkMode ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-black text-white shadow-lg') 
                            : (isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-gray-100')
                        }`}
                    >
                        {cat.icon} {cat.label}
                    </Link>
                ))}
            </div>
        </aside>

        {/* 📄 中间栏：文章正文 */}
        <div className="col-span-12 lg:col-span-7 min-w-0">
            <header className={`mb-8 pb-8 border-b ${borderClass}`}>
                <h1 className="text-3xl font-bold mb-6 leading-tight tracking-tight">{article.title}</h1>
                <div className={`flex flex-wrap items-center gap-6 text-xs font-mono ${subTextClass}`}>
                    <span className="flex items-center gap-1 font-medium">@ {article.author || 'AI.Tube'}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={12}/> {new Date(article.created_at).toLocaleDateString('zh-CN')}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12}/> {article.duration || '10 min'} 阅读</span>
                    <div className="flex gap-2 ml-auto">
                        {parseTags(article.tags).map((tag: string, i: number) => (
                            <span key={i} className={`px-2 py-0.5 rounded border ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}># {tag}</span>
                        ))}
                    </div>
                </div>
            </header>

            <div className={`w-full rounded-xl overflow-hidden mb-8 border shadow-sm ${isDarkMode ? 'border-white/10 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                {linkedVideo ? (
                    <div className="aspect-video w-full relative">
                        {linkedVideo.video_url?.includes('bilibili') ? (
                            <iframe src={getBilibiliEmbed(linkedVideo.video_url || '')} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
                        ) : (
                            <video src={linkedVideo.video_url} controls className="w-full h-full" poster={linkedVideo.thumbnail_url}></video>
                        )}
                    </div>
                ) : (
                    <div className="aspect-[21/9] w-full relative">
                        <img src={article.image_url || "/api/placeholder/800/400"} className="w-full h-full object-cover" alt={article.title} referrerPolicy="no-referrer" />
                    </div>
                )}
            </div>

            <article className={`prose max-w-none ${proseClass} 
                prose-headings:font-bold prose-headings:tracking-tight
                prose-p:leading-7 prose-p:mb-6
                prose-img:rounded-xl prose-img:shadow-lg
                ${isDarkMode ? 'prose-a:text-purple-400' : 'prose-a:text-purple-600'}
            `}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({node, ...props}) => <img {...props} referrerPolicy="no-referrer" className="w-full rounded-xl" /> }}>
                    {article.content}
                </ReactMarkdown>
            </article>

            <div className={`mt-16 pt-10 border-t flex justify-center ${borderClass}`}>
                <button className="flex flex-col items-center gap-2 group">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-purple-600 hover:text-white' : 'bg-gray-100 border-gray-200 hover:bg-purple-600 hover:text-white text-gray-500'}`}>
                        <ThumbsUp size={24} />
                    </div>
                    <span className={`text-xs ${subTextClass} group-hover:text-purple-500`}>很有帮助</span>
                </button>
            </div>
        </div>

        {/* 👉 右侧栏：工具与推荐 */}
        <aside className="hidden lg:block col-span-3 space-y-6">
            <div className={`rounded-xl p-5 border ${cardClass} sticky top-24`}>
                <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textClass}`}>
                    <Sparkles size={16} className={textClass}/> AI 创作小助手
                </h3>
                {!aiSummary ? (
                    <button onClick={handleSummarize} disabled={isSummarizing} className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'}`}>
                        {isSummarizing ? '正在总结...' : <> <Sparkles size={14}/> 帮我总结 </>}
                    </button>
                ) : (
                    <div className={`p-4 rounded-lg text-xs leading-relaxed animate-in fade-in ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                        <div className="flex justify-between items-center mb-2"><span className="font-bold">摘要</span><button onClick={()=>setAiSummary('')} className="hover:underline">重置</button></div>
                        {aiSummary}
                    </div>
                )}
            </div>

            <div className={`rounded-xl p-5 border ${cardClass}`}>
                <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textClass}`}>
                    <TrendingUp size={16} className={textClass}/> 相关推荐
                </h3>
                <div className="space-y-5">
                    {recommends.map((item) => (
                        <Link href={`/academy/${item.id}`} key={item.id} className="group block">
                            <h4 className={`text-sm font-medium transition-colors line-clamp-2 leading-relaxed mb-1 ${isDarkMode ? 'text-gray-300 group-hover:text-purple-400' : 'text-gray-700 group-hover:text-purple-600'}`}>
                                {item.title}
                            </h4>
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] ${subTextClass}`}>{item.author || 'AI.Tube'}</span>
                                <span className={`text-[10px] flex items-center gap-1 font-mono ${subTextClass}`}><Clock size={10}/> {item.duration || '5m'}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </aside>

      </main>
    </div>
  );
}