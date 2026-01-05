import { NextResponse } from 'next/server';
import { ProxyAgent } from 'undici';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  // 🟢 新增：支持 page 参数 (默认第1页)
  const page = parseInt(searchParams.get('page') || '1'); 

  if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 });

  const apiKey = process.env.GOOGLE_SEARCH_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

  try {
    const proxyUrl = process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';
    const dispatcher = new ProxyAgent(proxyUrl);
    
    // 🟢 核心逻辑：计算我们要抓哪些数据
    // 如果是第1页，我们要抓前30张 (start=1, 11, 21)
    // 如果是第2页(加载更多)，我们抓接下来的10张 (start=31) 或者也抓30张? 
    // 为了省额度，"加载更多"我们每次抓 10 张；但"首次加载"我们抓 30 张霸屏。
    
    let fetchPromises = [];
    
    if (page === 1) {
        // 并发请求前 30 张 (Google start index 是 1, 11, 21...)
        fetchPromises = [1, 11, 21].map(start => {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&imgSize=huge&num=10&start=${start}&safe=active`;
            return fetch(url, { dispatcher } as any).then(r => r.json());
        });
    } else {
        // 后续页码，每次只加载 10 张 (计算 start: page 2 -> 31, page 3 -> 41)
        // 逻辑：第一页拿了30个(1-30)，所以第二页应该从31开始
        const start = 31 + (page - 2) * 10;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&imgSize=huge&num=10&start=${start}&safe=active`;
        fetchPromises.push(fetch(url, { dispatcher } as any).then(r => r.json()));
    }

    // 等待所有请求完成
    const responses = await Promise.all(fetchPromises);
    
    let allItems: any[] = [];
    responses.forEach(data => {
        if (data.items) allItems = [...allItems, ...data.items];
    });

    if (allItems.length === 0) {
        return NextResponse.json({ results: [] });
    }

    const results = allItems.map((item: any) => ({
      id: item.link,
      url: item.link, // 高清原图
      // 🟢 解决模糊问题：如果原图太大，这里本该用 thumbnail，但 thumbnail 太糊。
      // 我们直接把原图 URL 给前端，让前端 CSS 控制显示（虽然费流量，但清晰度第一）
      thumbnail: item.link, 
      title: item.title,
      width: item.image?.width,
      height: item.image?.height,
      source: 'movie',
      isPremium: true
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error("❌ [Backend Error]", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}