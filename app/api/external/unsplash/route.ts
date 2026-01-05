import { NextResponse } from 'next/server';

// 强制动态模式，防止缓存
export const dynamic = 'force-dynamic';

// 模拟数据：当没有 API Key 或网络错误时返回这些图片
const MOCK_IMAGES = [
  {
    id: 'mock-1',
    width: 1920,
    height: 1080,
    color: '#262626',
    urls: {
      regular: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1080&auto=format&fit=crop',
      small: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=400&auto=format&fit=crop',
    },
    user: {
      name: 'Cyberpunk Mock',
      username: 'mock_artist',
    },
  },
  {
    id: 'mock-2',
    width: 1920,
    height: 1080,
    color: '#000000',
    urls: {
      regular: 'https://images.unsplash.com/photo-1535025183041-0991a977e25b?q=80&w=1080&auto=format&fit=crop',
      small: 'https://images.unsplash.com/photo-1535025183041-0991a977e25b?q=80&w=400&auto=format&fit=crop',
    },
    user: {
      name: 'Sci-Fi Scene',
      username: 'mock_director',
    },
  },
  {
    id: 'mock-3',
    width: 1920,
    height: 1080,
    color: '#4a4a4a',
    urls: {
      regular: 'https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=1080&auto=format&fit=crop',
      small: 'https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=400&auto=format&fit=crop',
    },
    user: {
      name: 'Anime Style',
      username: 'mock_painter',
    },
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    // 如果前端传了 mock=true，强制返回模拟数据
    const forceMock = searchParams.get('mock') === 'true';

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    // --- 上帝模式拦截 (Mock Mode) ---
    // 如果没有 Key，或者被显式要求 Mock，直接返回假数据
    if (forceMock || !accessKey) {
      console.log('[Unsplash] Running in MOCK MODE');
      // 模拟一点网络延迟，更真实
      await new Promise((resolve) => setTimeout(resolve, 800));
      return NextResponse.json({
        results: MOCK_IMAGES,
        total: MOCK_IMAGES.length,
        total_pages: 1,
      });
    }

    // --- 真实 API 调用 ---
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Unsplash API Error]', error);
    // 降级策略：接口挂了也返回 Mock 数据，保证演示不崩
    return NextResponse.json({
      results: MOCK_IMAGES,
      isFallback: true
    });
  }
}