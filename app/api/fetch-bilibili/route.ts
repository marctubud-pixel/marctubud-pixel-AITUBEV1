import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bvid = searchParams.get('bvid');

  if (!bvid) {
    return NextResponse.json({ error: 'Missing bvid' }, { status: 400 });
  }

  try {
    // 调用 B 站官方接口获取信息
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const data = await response.json();

    if (data.code !== 0) {
      return NextResponse.json({ error: data.message || 'B站接口报错' }, { status: 400 });
    }

    const info = data.data;

    // 组装我们需要的数据
    const result = {
      title: info.title,
      author: info.owner.name,
      // 将 http 图片链接转为 https
      thumbnail_url: info.pic.replace('http:', 'https:'), 
      // 构造嵌入式播放器链接
      video_url: `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=0`,
      description: info.desc
    };

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
