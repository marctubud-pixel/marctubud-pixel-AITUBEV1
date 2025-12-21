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
    return NextResponse.json({
      title: info.title,
      author: info.owner.name,
      thumbnail_url: info.pic.replace('http:', 'https:'),
      video_url: `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=0`,
      description: info.desc,
      // 👇 新增：抓取播放量
      views: info.stat.view 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
