import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    
    // 🍪 你的 Cookie (请确保这里是你最新的 Cookie)
    const MY_COOKIE = `buvid3=072E0F75-3433-544A-DDE5-E465B5E1387645399infoc; b_nut=1765896345; bsource=search_google; _uuid=12383B73-FE510-9F94-CE64-E337B39BD69445942infoc; buvid_fp=b719f562f0dc3417f678618b8d6db4de; buvid4=52C0D220-35EF-3A75-D090-DFFF7E0CE0DF47512-025121622-6jc0mVDKE58A4p9Unqyk4w%3D%3D; theme-tip-show=SHOWED; rpdid=|(Juu)kYRu||0J'u~Yl)mYRuJ; theme-avatar-tip-show=SHOWED; CURRENT_QUALITY=0; DedeUserID=38505796; DedeUserID__ckMd5=cb4054763ac8f0c9; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjY5MzU3MTIsImlhdCI6MTc2NjY3NjQ1MiwicGx0IjotMX0.4iBFzhXpUYkJRcFJP2USRjoemOIE4kXOojDrCZOylMM; bili_ticket_expires=1766935652; b_lsid=EAE6FF6E_19B64591F88; SESSDATA=5b774545%2C1782470157%2Ca4f38%2Ac2CjCs6S-JV3ULy9Q0lvUydQ8n4ZDj5uLWtVTvrUH5DVdxpLsQx-shmnNxhA366q1OuocSVndJcHlRWVh1NVZmcHFhMkpsWU11a3BGQXBaZ1g4NnpsUzFsaDI4OERzWHVMSGRoUDZpR255WE5uYmNZcEx1UFZIZjB2TUtvMmdXUXdMUjBBVHRrNi1RIIEC; bili_jct=af51a72ba5871df6114c8bbd208d37f3; sid=52q9hcpu; home_feed_column=4; bp_t_offset_38505796=1151395648755466240; browser_resolution=657-668; CURRENT_FNVAL=4048`;

    const targetUrl = `https://api.bilibili.com/x/web-interface/search/type?keyword=${encodeURIComponent(keyword || '')}&search_type=video&page=1&page_size=20`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com/',
      'Cookie': MY_COOKIE,
    };

    console.log(`\n--- [START] 开始请求 B站 ---`);
    console.log(`目标URL: ${targetUrl}`);

    const response = await fetch(targetUrl, { headers, cache: 'no-store' });
    const data = await response.json();

    console.log(`HTTP状态: ${response.status}`);
    console.log(`B站返回Code: ${data?.code} (0代表成功)`);

    // 🔬 显微镜：打印数据结构 keys，看看 result 到底去哪了
    if (data && data.data) {
        const dataKeys = Object.keys(data.data);
        console.log(`data层的字段: [${dataKeys.join(', ')}]`);
        
        if (data.data.result) {
            const resultType = Array.isArray(data.data.result) ? '数组' : typeof data.data.result;
            console.log(`result字段类型: ${resultType}`);
            console.log(`result长度: ${data.data.result.length}`);
            
            // 如果长度为0，可能是被风控针对了（软杀）
            if (data.data.result.length === 0) {
                console.log('❌ 严重警告：B站返回了空数组！这通常意味着 Cookie 虽然能登录，但搜索功能被风控限制了。');
            }
        } else {
            console.log('❌ 严重警告：data.result 字段不存在！B站可能返回了验证码结构。');
        }
    } else {
        console.log('❌ 严重警告：data 层完全不存在！');
    }

    const items = data?.data?.result || [];

    // 清洗数据
    const cleanedData = items.map((item: any) => ({
      bvid: item.bvid,
      title: item.title?.replace(/<[^>]+>/g, '') || '无标题',
      author: item.author,
      description: item.description,
      pic: item.pic?.startsWith('//') ? `https:${item.pic}` : item.pic,
      play: item.play,
      duration: item.duration,
      url: `https://www.bilibili.com/video/${item.bvid}`
    }));

    console.log(`最终清洗出 ${cleanedData.length} 条数据`);
    console.log(`--- [END] 请求结束 ---\n`);

    return NextResponse.json({ 
      success: true, 
      count: cleanedData.length,
      data: cleanedData,
      // 把原始 debug 信息也返回给前端，方便你看
      debug_raw: data 
    });

  } catch (error: any) {
    console.error('Spider Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}