import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bvid = searchParams.get('bvid');

  if (!bvid) return NextResponse.json({ error: 'Missing bvid' }, { status: 400 });

  try {
    // 1. 获取视频详情
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
    const data = await response.json();
    if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
    const info = data.data;

    // 2. 获取视频标签 (Tags)
    const tagsResponse = await fetch(`https://api.bilibili.com/x/web-interface/view/detail/tag?bvid=${bvid}`);
    const tagsData = await tagsResponse.json();
    const tags = tagsData.data || [];

    // --- 🤖 智能处理逻辑开始 ---

    // A. 标签筛选：只保留 AI 相关工具
    const aiTools = ['Sora', 'Runway', 'Pika', 'Midjourney', 'Stable Diffusion', 'Luma', 'Kling', '可灵', '即梦', 'Vidu', 'Gen-2', 'Gen-3'];
    // 找出 B 站标签里和 AI 工具列表匹配的词
    const matchedTag = tags
      .map((t: any) => t.tag_name)
      .find((tagName: string) => aiTools.some(tool => tagName.toLowerCase().includes(tool.toLowerCase())));
    
    // B. 自动分类：根据标题或标签猜测分类
    let autoCategory = '其他';
    const textToAnalyze = (info.title + (matchedTag || '')).toLowerCase();
    
    if (textToAnalyze.includes('sora')) autoCategory = 'Sora';
    else if (textToAnalyze.includes('runway') || textToAnalyze.includes('gen-')) autoCategory = 'Runway';
    else if (textToAnalyze.includes('pika')) autoCategory = 'Pika';
    else if (textToAnalyze.includes('midjourney') || textToAnalyze.includes('mj')) autoCategory = 'Midjourney';
    else if (textToAnalyze.includes('stable') || textToAnalyze.includes('svd')) autoCategory = 'Stable Video';
    else if (textToAnalyze.includes('可灵') || textToAnalyze.includes('kling')) autoCategory = '可灵AI';
    else if (textToAnalyze.includes('即梦')) autoCategory = '即梦AI';

    // --- 🤖 智能处理逻辑结束 ---

    return NextResponse.json({
      title: info.title,
      author: info.owner.name,
      // 这里的 no-referrer 是前端用的，API 只负责给链接
      thumbnail_url: info.pic.replace('http:', 'https:'),
      video_url: `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=0`,
      description: info.desc,
      views: info.stat.view, // 播放量
      tag: matchedTag || '', // 自动填写的工具标签
      category: autoCategory // 自动判断的分类
    });

  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
