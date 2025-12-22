import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bvid = searchParams.get('bvid');

  if (!bvid) return NextResponse.json({ error: 'Missing bvid' }, { status: 400 });

  try {
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
    const data = await response.json();
    if (data.code !== 0) return NextResponse.json({ error: data.message }, { status: 400 });
    const info = data.data;

    // 获取标签
    const tagsResponse = await fetch(`https://api.bilibili.com/x/web-interface/view/detail/tag?bvid=${bvid}`);
    const tagsData = await tagsResponse.json();
    const tags = tagsData.data || [];

    // 🎯 核心升级：抓取所有匹配的工具，不仅仅是第一个
    const aiTools = ['Sora', 'Runway', 'Pika', 'Midjourney', 'Stable Diffusion', 'Luma', 'Kling', '可灵', '即梦', 'Vidu', 'Gen-2', 'Gen-3', 'Flux', 'Hailuo', '海螺', 'ChatGPT', 'Claude', 'ElevenLabs', 'Sununo'];
    
    // 过滤出所有匹配的标签
    const matchedTools = tags
      .map((t: any) => t.tag_name)
      .filter((tagName: string) => aiTools.some(tool => tagName.toLowerCase().includes(tool.toLowerCase())));
    
    // 如果标签里没找到，再去标题里找一遍
    if (matchedTools.length === 0) {
        aiTools.forEach(tool => {
            if (info.title.toLowerCase().includes(tool.toLowerCase())) {
                matchedTools.push(tool);
            }
        });
    }

    // 去重并取前5个，用逗号连接
    const finalTag = Array.from(new Set(matchedTools)).slice(0, 5).join(', ') || 'AI辅助';

    // 🕒 核心升级：处理时长
    const durationStr = formatDuration(info.duration || 0);

    return NextResponse.json({
      title: info.title,
      author: info.owner.name,
      thumbnail_url: info.pic.replace('http:', 'https:'),
      video_url: `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=0`,
      description: info.desc,
      views: info.stat.view,
      tag: finalTag,
      duration: durationStr, // ✅ 新增：返回格式化后的时长
      // category 不自动识别，留空或默认
    });

  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

// 🛠️ 工具函数：将秒数转换为 MM:SS 或 HH:MM:SS
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  // 如果超过1小时，显示 HH:MM:SS
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  // 否则显示 MM:SS
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
